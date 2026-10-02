import { COLLECTIONS, pb } from '@/lib/pocketbase';
import { toDateISO } from '@/lib/csv';
import { pushImportHistory } from '@/lib/import-history';
import { matchUnit, type UnitName } from '@/lib/units';
import type {
  CsvImportOptions,
  ImportControl,
  ImportHistoryEntry,
  ImportProgress,
  ImportReport,
  PatientImportDraft,
} from '@/types/import';

/**
 * Tamanho do lote — precisa ser <= `batch.maxRequests` do PocketBase
 * (default: 50). Um lote acima desse limite é rejeitado e joga TODAS as
 * gravações no caminho de contingência (registro a registro), que é
 * ordens de grandeza mais lento.
 */
const BATCH_SIZE = 50;

/** Nº máximo de mensagens de erro guardadas para exibição. */
const MAX_ERROR_SAMPLES = 5;

/**
 * Rate limits do servidor (Settings > Rate limits):
 * - `*:create`: 200 requisições por 5s (elevado de 50/5s com moderação).
 *   CADA registro criado dentro de um batch consome esse orçamento — é o
 *   gargalo real da importação.
 * - `/api/batch`: 10 requisições por 1s.
 *
 * O "pacer" enfileira os envios nessas janelas deslizantes para evitar 429,
 * usando uma folga (~10%) sobre o limite de criação para absorver o jitter
 * das janelas do servidor.
 */
const REQUEST_WINDOW_MS = 1000;
const REQUEST_WINDOW_MAX = 8;
const CREATE_WINDOW_MS = 5500;
const CREATE_WINDOW_MAX = 200;

/** Reenvio com backoff exponencial quando o servidor responde 429. */
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 1000;

/** Espera antes de reenviar um lote inteiro barrado por rate limit. */
const RATE_LIMIT_COOLDOWN_MS = 6000;

/**
 * Resolve a unidade gravada no registro:
 * 1. CSV com unidade conhecida → unidade canônica da lista.
 * 2. CSV com unidade fora da lista → valor original preservado.
 * 3. CSV sem unidade → unidade do admin importador.
 */
function resolveUnit(rawUnit: string, defaultUnit: UnitName | null): string {
  const matched = matchUnit(rawUnit);

  if (matched !== null) {
    return matched;
  }

  if (rawUnit.trim() !== '') {
    return rawUnit.trim();
  }

  return defaultUnit ?? '';
}

function draftToPayload(
  draft: PatientImportDraft,
  defaultUnit: UnitName | null,
): Record<string, string> {
  return {
    NOME_DA_PESSOA_CADASTRADA: draft.name,
    N_CNS_DA_PESSOA_CADASTRADA: draft.cns,
    NOME_DA_MAE_PESSOA_CADASTRADA: draft.motherName,
    NOME_UNIDADE_DE_SAUDE: resolveUnit(draft.healthUnit, defaultUnit),
    NOME_EQUIPE_DE_SAUDE: draft.healthTeam,
    CODIGO_MICROAREA: draft.microarea,
    SITUACAO_USUARIO: draft.situation,
    SEXO: draft.sex,
    RACA_COR: draft.raceColor,
    DATA_DE_NASCIMENTO: toDateISO(draft.birthDateDisplay),
    IDADE: draft.age,
    FREQUENTA_ESCOLA: '',
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Aguarda a vez de enviar um lote, respeitando os rate limits do servidor. */
type Pacer = (creates: number) => Promise<void>;

/**
 * Cria um controlador de ritmo para `POST /api/batch`. Enfileira os envios
 * respeitando duas janelas deslizantes:
 * 1. `/api/batch` — no máximo {@link REQUEST_WINDOW_MAX} requisições por
 *    {@link REQUEST_WINDOW_MS}.
 * 2. `*:create` — no máximo {@link CREATE_WINDOW_MAX} registros criados por
 *    {@link CREATE_WINDOW_MS}. Deletes passam `creates = 0`.
 */
function createBatchPacer(): Pacer {
  let requests: number[] = [];
  let creates: { at: number; count: number }[] = [];

  return async (createCount: number): Promise<void> => {
    for (;;) {
      const now = Date.now();

      requests = requests.filter((sentAt) => now - sentAt < REQUEST_WINDOW_MS);
      creates = creates.filter((entry) => now - entry.at < CREATE_WINDOW_MS);

      const createsUsed = creates.reduce((sum, entry) => sum + entry.count, 0);
      const requestOk = requests.length < REQUEST_WINDOW_MAX;
      const createOk = createsUsed + createCount <= CREATE_WINDOW_MAX;

      if (requestOk && createOk) {
        requests.push(now);
        creates.push({ at: now, count: createCount });
        return;
      }

      const waits: number[] = [];

      if (!requestOk && requests.length > 0) {
        waits.push(requests[0] + REQUEST_WINDOW_MS - now);
      }

      if (!createOk && creates.length > 0) {
        waits.push(creates[0].at + CREATE_WINDOW_MS - now);
      }

      await delay(Math.max(Math.min(...waits), 10));
    }
  };
}

/** Extrai mensagem legível de um erro do SDK / rede. */
function describeError(reason: unknown): string {
  if (reason instanceof Error && reason.message !== '') {
    return reason.message;
  }

  return 'Falha desconhecida ao gravar o registro.';
}

function pushErrorSample(samples: string[], message: string): void {
  if (samples.length < MAX_ERROR_SAMPLES && !samples.includes(message)) {
    samples.push(message);
  }
}

/**
 * Detecta rate limit (429). O PocketBase responde 429 direto, mas dentro de
 * um batch o sub-request é barrado e o batch inteiro falha com status 400 —
 * com o 429 aninhado em `data.requests.*.response.status`. Sem essa checagem
 * o retry nunca disparava e o lote ainda era dividido, amplificando o 429.
 */
function isRateLimit(reason: unknown): boolean {
  if (typeof reason !== 'object' || reason === null) {
    return false;
  }

  const { status, data } = reason as { status?: unknown; data?: unknown };

  if (status === 429) {
    return true;
  }

  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const { requests } = data as { requests?: unknown };

  if (typeof requests !== 'object' || requests === null) {
    return false;
  }

  return Object.values(requests as Record<string, unknown>).some((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }

    const response = (entry as { response?: unknown }).response;

    return (
      typeof response === 'object' &&
      response !== null &&
      (response as { status?: unknown }).status === 429
    );
  });
}

/**
 * Reexecuta a operação com backoff exponencial quando o servidor responde
 * 429 (rate limit). Os demais erros são propagados imediatamente.
 */
async function withRateLimitRetry<T>(
  operation: () => Promise<T>,
  control: ImportControl,
): Promise<T> {
  let attempt = 0;

  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (control.cancelled || !isRateLimit(error) || attempt >= MAX_RETRIES) {
        throw error;
      }

      attempt += 1;
      await delay(RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }
}

/**
 * Limpa a coleção `frequenciaescolar_pacientes` para nova importação.
 * Usa a batch API do PocketBase (1 requisição por lote) e respeita o
 * rate limit. Respeita o cancelamento.
 */
async function clearExistingPatients(control: ImportControl, pace: Pacer): Promise<void> {
  for (;;) {
    if (control.cancelled) {
      return;
    }

    const page = await withRateLimitRetry(
      () => pb.collection(COLLECTIONS.pacientes).getList(1, BATCH_SIZE, { fields: 'id' }),
      control,
    );

    if (page.items.length === 0) {
      return;
    }

    const batch = pb.createBatch();
    const collection = batch.collection(COLLECTIONS.pacientes);

    for (const item of page.items) {
      collection.delete(item.id);
    }

    await withRateLimitRetry(async () => {
      await pace(0);
      return batch.send();
    }, control);
  }
}

/** Envia um lote atômico (1 requisição). Lança se qualquer registro falhar. */
async function sendBatch(
  batchDrafts: readonly PatientImportDraft[],
  defaultUnit: UnitName | null,
  control: ImportControl,
  pace: Pacer,
): Promise<void> {
  const batch = pb.createBatch();
  const collection = batch.collection(COLLECTIONS.pacientes);

  for (const draft of batchDrafts) {
    collection.create(draftToPayload(draft, defaultUnit));
  }

  await withRateLimitRetry(async () => {
    await pace(batchDrafts.length);
    return batch.send();
  }, control);
}

/**
 * Envia um lote atômico; se falhar por dados inválidos (ex.: 1 registro com
 * defeito), divide o lote ao meio e tenta os sub-lotes, isolando o(s)
 * registro(s) problemático(s).
 *
 * Rate limit NÃO entra nesse caminho: um lote barrado por 429 é reenviado
 * inteiro após aguardar a janela do servidor, pois dividir multiplicaria as
 * requisições e agravaria o problema.
 *
 * Em vez de reenviar N registros um a um (O(N) requisições), isola as
 * falhas em ~O(k·log N) lotes — onde k é o nº de registros inválidos.
 * Retorna quantos registros foram criados.
 */
async function sendAndSplit(
  batchDrafts: readonly PatientImportDraft[],
  defaultUnit: UnitName | null,
  control: ImportControl,
  errorSamples: string[],
  pace: Pacer,
): Promise<number> {
  if (control.cancelled) {
    return 0;
  }

  while (control.paused && !control.cancelled) {
    await delay(150);
  }

  if (control.cancelled) {
    return 0;
  }

  for (;;) {
    try {
      await sendBatch(batchDrafts, defaultUnit, control, pace);
      return batchDrafts.length;
    } catch (error) {
      if (control.cancelled) {
        return 0;
      }

      // Rate limit: aguarda a janela do servidor e reenvia o MESMO lote.
      if (isRateLimit(error)) {
        await delay(RATE_LIMIT_COOLDOWN_MS);
        continue;
      }

      // Registro único que falhou: guarda a mensagem real do servidor.
      if (batchDrafts.length === 1) {
        const draft = batchDrafts[0];
        pushErrorSample(
          errorSamples,
          `Linha ${String(draft.sourceRow)}: ${describeError(error)}`,
        );
        return 0;
      }

      // Lote com pelo menos um registro inválido: isola dividindo ao meio.
      const middle = Math.floor(batchDrafts.length / 2);
      const left = await sendAndSplit(
        batchDrafts.slice(0, middle),
        defaultUnit,
        control,
        errorSamples,
        pace,
      );
      const right = await sendAndSplit(
        batchDrafts.slice(middle),
        defaultUnit,
        control,
        errorSamples,
        pace,
      );

      return left + right;
    }
  }
}

/**
 * Importa os rascunhos extraídos do CSV para o PocketBase, em lotes,
 * reportando progresso a cada lote e respeitando pause/cancelamento.
 *
 * Os lotes são enviados na velocidade máxima permitida pelo rate limit do
 * servidor (via {@link createBatchPacer}). Se um lote falhar, ele é
 * subdividido para isolar os registros inválidos.
 */
export async function importPatientsFromDrafts(
  drafts: readonly PatientImportDraft[],
  options: CsvImportOptions,
  control: ImportControl,
  onProgress: (progress: ImportProgress) => void,
): Promise<ImportReport> {
  const startedAt = Date.now();
  const defaultUnit = options.defaultUnit ?? null;
  const errorSamples: string[] = [];
  const total = drafts.length;
  const pace = createBatchPacer();

  let created = 0;
  let errors = 0;

  if (control.cancelled) {
    return {
      created,
      errors,
      cleared: false,
      cancelled: true,
      elapsedSec: 0,
      mode: 'pocketbase',
      errorSamples,
    };
  }

  let cleared = false;

  if (options.clearExisting) {
    await clearExistingPatients(control, pace);
    cleared = true;
  }

  for (let index = 0; index < total; index += BATCH_SIZE) {
    if (control.cancelled) {
      return {
        created,
        errors,
        cleared,
        cancelled: true,
        elapsedSec: Math.round((Date.now() - startedAt) / 1000),
        mode: 'pocketbase',
        errorSamples,
      };
    }

    while (control.paused && !control.cancelled) {
      await delay(150);
    }

    if (control.cancelled) {
      return {
        created,
        errors,
        cleared,
        cancelled: true,
        elapsedSec: Math.round((Date.now() - startedAt) / 1000),
        mode: 'pocketbase',
        errorSamples,
      };
    }

    const batchDrafts = drafts.slice(index, index + BATCH_SIZE);
    const batchCreated = await sendAndSplit(
      batchDrafts,
      defaultUnit,
      control,
      errorSamples,
      pace,
    );

    created += batchCreated;
    errors += batchDrafts.length - batchCreated;

    onProgress({ processed: created + errors, total, errors });
  }

  return {
    created,
    errors,
    cleared,
    cancelled: false,
    elapsedSec: Math.round((Date.now() - startedAt) / 1000),
    mode: 'pocketbase',
    errorSamples,
  };
}

/**
 * Registra a importação no histórico local.
 */
export function registerImportHistory(
  fileName: string,
  report: ImportReport,
): ImportHistoryEntry[] {
  const entry: ImportHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName,
    created: report.created,
    errors: report.errors,
    elapsedSec: report.elapsedSec,
    cancelled: report.cancelled,
    cleared: report.cleared,
    mode: report.mode,
    at: new Date().toISOString(),
  };

  return pushImportHistory(entry);
}
