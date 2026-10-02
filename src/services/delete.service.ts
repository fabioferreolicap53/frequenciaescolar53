import { COLLECTIONS, pb } from '@/lib/pocketbase';
import type { DeleteControl, DeleteProgress, DeleteReport, DeleteStage } from '@/types/delete';

/**
 * Exclusão total da coleção de pacientes.
 *
 * Camada 1 (principal): DROP + RECREATE. O `DELETE .../truncate` nativo roda numa
 * única transação e sofre ROLLBACK quando o cliente desiste — em bases grandes ele
 * "dá sucesso" sem apagar nada. Apagar a coleção (`DELETE /api/collections/{id}`) é
 * instantâneo no SQLite e não sofre rollback; recriamos com o MESMO `id` logo depois.
 *
 * Camada 2 (rede de segurança): exclusão em lotes de IDs, só entra em cena se, após
 * a camada 1, a contagem da coleção não for 0.
 */

const PATIENTS_COLLECTION = COLLECTIONS.pacientes;

// Camada 1 — DROP + RECREATE
const REBUILD_DROP_TIMEOUT_MS = 300_000;
const REBUILD_CREATE_TIMEOUT_MS = 90_000;
const REBUILD_RETRY_LIMIT = 3;
const REBUILD_RETRY_BACKOFF_MS = 2_500;
const REBUILD_BACKUP_KEY = 'frequenciaescolar_collection_backup';

// Camada 2 — lotes
const DELETE_REQUEST_TIMEOUT_MS = 60_000;
const DELETE_LOT_SIZE = 100;
const BATCH_PAUSE_MS = 150;
const ZERO_SUCCESS_ABORT = 3;

// Autenticação
const AUTH_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Token de superuser mantido em memória — NÃO usamos `pb.authStore` aqui para não
 * disparar o `onChange` do SDK e derrubar a sessão do usuário comum na aplicação.
 */
let superuserToken: string | null = null;
let authPromise: Promise<string> | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function recordsUrl(query: string): string {
  return `/api/collections/${encodeURIComponent(PATIENTS_COLLECTION)}/records${query}`;
}

function authHeader(): Record<string, string> {
  return superuserToken !== null ? { Authorization: superuserToken } : {};
}

interface ApiRequestInit {
  readonly method: string;
  readonly body?: string;
}

/** Lê um trecho do corpo de erro (as respostas de erro do PocketBase são curtas). */
async function readErrorBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return '';
  }
}

async function collectionError(response: Response, action: string): Promise<string> {
  if (response.status === 401 || response.status === 403) {
    return 'Sem permissão de superuser no PocketBase. Confira VITE_DB_LOGIN e VITE_DB_PASSWORD.';
  }

  return `Falha ao ${action} (${response.status}): ${await readErrorBody(response)}`;
}

/**
 * `fetch` com timeout real (`AbortSignal.timeout`) e retry para erros transitórios
 * (`>= 500`). O SDK ignora `AbortSignal` em servidores sobrecarregados, por isso
 * as chamadas críticas passam por aqui.
 */
async function apiRequest(
  path: string,
  init: ApiRequestInit,
  timeoutMs: number,
  retryLimit = REBUILD_RETRY_LIMIT,
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    try {
      const response = await fetch(pb.buildUrl(path), {
        method: init.method,
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        ...(init.body !== undefined ? { body: init.body } : {}),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status >= 500 && attempt < retryLimit) {
        lastError = new Error(`O servidor respondeu ${response.status}.`);
        await delay(REBUILD_RETRY_BACKOFF_MS * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= retryLimit) {
        break;
      }

      await delay(REBUILD_RETRY_BACKOFF_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Falha de comunicação com o PocketBase.');
}

async function requestSuperuserToken(): Promise<string> {
  const identity = import.meta.env['VITE_DB_LOGIN'];
  const password = import.meta.env['VITE_DB_PASSWORD'];

  if (
    typeof identity !== 'string' ||
    typeof password !== 'string' ||
    identity === '' ||
    password === ''
  ) {
    throw new Error(
      'Credenciais de superuser ausentes. Defina VITE_DB_LOGIN e VITE_DB_PASSWORD no .env.',
    );
  }

  const response = await fetch(pb.buildUrl('/api/collections/_superusers/auth-with-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, password }),
    signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Autenticação de superuser falhou (${response.status}): ${await readErrorBody(response)}`,
    );
  }

  const data: unknown = await response.json();

  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as { token?: unknown }).token !== 'string'
  ) {
    throw new Error('Resposta de autenticação inválida do PocketBase.');
  }

  return (data as { token: string }).token;
}

/** Autentica como superuser (reaproveita o token em memória e chamadas em voo). */
export async function authenticateSuperuser(): Promise<void> {
  if (superuserToken !== null) {
    return;
  }

  authPromise ??= requestSuperuserToken();

  try {
    superuserToken = await authPromise;
  } finally {
    authPromise = null;
  }
}

/**
 * Monta o payload de recriação reaproveitando a ESTRUTURA da coleção (nada de dados).
 * O ponto mais crítico: o PocketBase v0.23+ renomeou `schema` -> `fields`; enviar a
 * chave errada recria a coleção SEM campos.
 */
function buildCollectionRebuildPayload(
  collection: Record<string, unknown>,
): Record<string, unknown> {
  const rawFields = collection['fields'];
  const rawSchema = collection['schema'];
  const usesFieldsKey = Array.isArray(rawFields);

  const sourceFields: unknown[] = usesFieldsKey
    ? (rawFields as unknown[])
    : Array.isArray(rawSchema)
      ? (rawSchema as unknown[])
      : [];

  if (sourceFields.length === 0) {
    throw new Error(
      'Não foi possível ler a estrutura da coleção. Recriação abortada para não perder o schema.',
    );
  }

  return {
    id: collection['id'],
    name: collection['name'],
    type: collection['type'],
    ...(usesFieldsKey ? { fields: sourceFields } : { schema: sourceFields }),
    indexes: collection['indexes'] ?? [],
    listRule: collection['listRule'] ?? null,
    viewRule: collection['viewRule'] ?? null,
    createRule: collection['createRule'] ?? null,
    updateRule: collection['updateRule'] ?? null,
    deleteRule: collection['deleteRule'] ?? null,
    options: collection['options'] ?? {},
  };
}

/**
 * Camada 1 — limpeza atômica: GET meta -> DROP -> RECREATE (mesmo `id`).
 * Aceita `404` no DROP (coleção já não existia) e salva backup local se o RECREATE falhar.
 */
export async function truncateCollection(): Promise<void> {
  await authenticateSuperuser();

  const metaPath = `/api/collections/${encodeURIComponent(PATIENTS_COLLECTION)}`;
  const metaResponse = await apiRequest(metaPath, { method: 'GET' }, DELETE_REQUEST_TIMEOUT_MS);

  if (!metaResponse.ok) {
    throw new Error(await collectionError(metaResponse, 'ler a coleção'));
  }

  const collection: unknown = await metaResponse.json();

  if (typeof collection !== 'object' || collection === null) {
    throw new Error('Metadados da coleção inválidos.');
  }

  const payload = buildCollectionRebuildPayload(collection as Record<string, unknown>);

  // DROP: libera a tabela inteira e os nomes globais dos índices.
  const dropResponse = await apiRequest(
    `/api/collections/${encodeURIComponent(String(payload['id']))}`,
    { method: 'DELETE' },
    REBUILD_DROP_TIMEOUT_MS,
  );

  if (!dropResponse.ok && dropResponse.status !== 404) {
    throw new Error(await collectionError(dropResponse, 'apagar a coleção'));
  }

  // RECREATE vazia com o mesmo id — falha aqui deixa o app sem a coleção: backup local.
  const createResponse = await apiRequest(
    '/api/collections',
    { method: 'POST', body: JSON.stringify(payload) },
    REBUILD_CREATE_TIMEOUT_MS,
  );

  if (!createResponse.ok) {
    try {
      window.localStorage.setItem(REBUILD_BACKUP_KEY, JSON.stringify(payload));
    } catch {
      /* localStorage indisponível */
    }

    throw new Error(
      `A coleção foi apagada mas não pôde ser recriada (${createResponse.status}): ` +
        `${await readErrorBody(createResponse)}. A estrutura original foi salva em "${REBUILD_BACKUP_KEY}".`,
    );
  }
}

/** Conta os registros da coleção (usa `perPage=1` + `fields=id` para payload mínimo). */
export async function countPatients(): Promise<number> {
  await authenticateSuperuser();

  const response = await apiRequest(
    recordsUrl('?perPage=1&fields=id'),
    { method: 'GET' },
    DELETE_REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Falha ao contar os registros (${response.status}).`);
  }

  const data: unknown = await response.json();
  const total =
    typeof data === 'object' && data !== null
      ? (data as { totalItems?: unknown }).totalItems
      : undefined;

  return typeof total === 'number' ? total : 0;
}

/** Lista os IDs da página 1 — cada chamada revela a próxima fila de exclusão. */
export async function listPatientIds(
  limit = DELETE_LOT_SIZE,
): Promise<{ ids: string[]; totalItems: number }> {
  await authenticateSuperuser();

  const response = await apiRequest(
    recordsUrl(`?perPage=${String(limit)}&fields=id`),
    { method: 'GET' },
    DELETE_REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Falha ao listar os registros (${response.status}).`);
  }

  const data: unknown = await response.json();
  const items =
    typeof data === 'object' && data !== null ? (data as { items?: unknown }).items : undefined;
  const total =
    typeof data === 'object' && data !== null
      ? (data as { totalItems?: unknown }).totalItems
      : undefined;

  const ids = Array.isArray(items)
    ? items
        .map((item) =>
          typeof item === 'object' && item !== null ? (item as { id?: unknown }).id : undefined,
        )
        .filter((id): id is string => typeof id === 'string')
    : [];

  return { ids, totalItems: typeof total === 'number' ? total : 0 };
}

async function deletePatient(id: string): Promise<void> {
  const response = await fetch(
    pb.buildUrl(
      `/api/collections/${encodeURIComponent(PATIENTS_COLLECTION)}/records/${encodeURIComponent(id)}`,
    ),
    {
      method: 'DELETE',
      headers: authHeader(),
      signal: AbortSignal.timeout(DELETE_REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

export interface BatchDeleteResult {
  readonly successCount: number;
  readonly failureCount: number;
}

/**
 * Camada 2 — exclui o lote em paralelo com `Promise.allSettled`. Usa `fetch` direto
 * (sem `/api/batch`, que no ambiente testado respondia 200 sem apagar nada).
 */
export async function deletePatientsBatch(ids: readonly string[]): Promise<BatchDeleteResult> {
  let successCount = 0;
  let failureCount = 0;

  const results = await Promise.allSettled(ids.map((id) => deletePatient(id)));

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount += 1;
      return;
    }

    failureCount += 1;
    console.warn(`Falha ao excluir o registro ${ids[index] ?? ''}:`, result.reason);
  });

  return { successCount, failureCount };
}

export interface DeleteRunHandlers {
  readonly control: DeleteControl;
  readonly onStage: (stage: DeleteStage) => void;
  readonly onProgress: (progress: DeleteProgress) => void;
}

/**
 * Orquestra a exclusão total: auth -> baseline -> camada 1 -> confirmação ->
 * (se necessário) camada 2 em lotes, com progresso, pause e interrupção cooperativa.
 */
export async function deleteAllPatients(handlers: DeleteRunHandlers): Promise<DeleteReport> {
  const { control, onStage, onProgress } = handlers;
  const startedAt = Date.now();

  const makeReport = (
    removed: number,
    total: number,
    method: DeleteReport['method'],
    finalCount: number,
  ): DeleteReport => ({
    removed,
    total,
    elapsedSec: Math.round((Date.now() - startedAt) / 1000),
    cancelled: control.cancelled,
    method,
    finalCount,
  });

  onStage('auth');
  await authenticateSuperuser();
  const baseline = await countPatients();

  if (control.cancelled) {
    return makeReport(0, baseline, 'rebuild', baseline);
  }

  // Camada 1 — limpeza atômica.
  onStage('rebuild');
  let rebuildError: unknown = null;

  try {
    await truncateCollection();
  } catch (error) {
    rebuildError = error;
  }

  let currentCount: number;

  try {
    currentCount = await countPatients();
  } catch (error) {
    throw rebuildError instanceof Error ? rebuildError : error;
  }

  if (currentCount === 0) {
    return makeReport(baseline, baseline, 'rebuild', 0);
  }

  // Camada 2 — exclusão em lotes (rede de segurança).
  onStage('delete');

  let removed = Math.max(0, baseline - currentCount);
  let total = baseline;
  let batches = 0;
  let failures = 0;
  let zeroSuccessStreak = 0;

  const emit = (): void => {
    onProgress({ stage: 'delete', removed, total, batches, failures });
  };

  emit();

  for (;;) {
    if (control.cancelled) {
      break;
    }

    while (control.paused && !control.cancelled) {
      await delay(200);
    }

    if (control.cancelled) {
      break;
    }

    const page = await listPatientIds();

    if (page.ids.length === 0) {
      break;
    }

    const result = await deletePatientsBatch(page.ids);
    removed += result.successCount;
    failures += result.failureCount;
    batches += 1;

    // Total recalibrado a cada lote: removidos + o que ainda resta na coleção.
    total = removed + Math.max(0, page.totalItems - result.successCount);

    zeroSuccessStreak = result.successCount === 0 ? zeroSuccessStreak + 1 : 0;

    emit();

    if (zeroSuccessStreak >= ZERO_SUCCESS_ABORT) {
      throw new Error(
        `O servidor recusou ${String(ZERO_SUCCESS_ABORT)} lotes seguidos. ` +
          'Exclusão interrompida para evitar loop infinito.',
      );
    }

    await delay(BATCH_PAUSE_MS);
  }

  let finalCount = Math.max(0, total - removed);

  if (!control.cancelled) {
    try {
      finalCount = await countPatients();
    } catch {
      /* mantém a estimativa quando a contagem final falha */
    }
  }

  return makeReport(removed, total, 'batch', finalCount);
}
