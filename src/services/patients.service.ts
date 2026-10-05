import { COLLECTIONS, pb } from '@/lib/pocketbase';
import type { UnitName } from '@/lib/units';
import { clampSearchTerm, mapPatientRecord } from '@/services/base';
import type { AttendanceStatus, AttendanceSummary } from '@/types/attendance';
import type {
  PagedResult,
  Patient,
  PatientColumnFilters,
  PatientFilters,
  PatientSortField,
  SortDir,
} from '@/types/patient';
import { PATIENT_COLUMNS } from '@/types/patient';

interface ListOptions {
  page: number;
  perPage: number;
  sort: string;
  fields: string;
  filter?: string;
  requestKey?: string;
}

/**
 * Filtros server-side sobre o campo `FREQUENTA_ESCOLA`
 * (preenchido no frontend com "SIM" ou "NÃO").
 */
const ATTENDANCE_FILTERS: Readonly<Record<Exclude<AttendanceStatus, 'pendente'>, string>> = {
  frequenta: 'FREQUENTA_ESCOLA = "SIM"',
  nao_frequenta: 'FREQUENTA_ESCOLA = "NÃO"',
};

const PENDING_FILTER = '(FREQUENTA_ESCOLA = "" || FREQUENTA_ESCOLA = null)';

/**
 * Restringe a consulta à unidade do usuário autenticado.
 * `null` (administrador) não aplica filtro de unidade — enxerga todas.
 */
function unitFilter(unit: UnitName | null): string | null {
  if (unit === null) {
    return null;
  }

  return `NOME_UNIDADE_DE_SAUDE = "${unit.replace(/"/g, '\\"')}"`;
}

const PATIENT_FIELDS =
  'id,NOME_DA_PESSOA_CADASTRADA,N_CNS_DA_PESSOA_CADASTRADA,NOME_DA_MAE_PESSOA_CADASTRADA,NOME_UNIDADE_DE_SAUDE,NOME_EQUIPE_DE_SAUDE,CODIGO_MICROAREA,SITUACAO_USUARIO,SEXO,RACA_COR,DATA_DE_NASCIMENTO,IDADE,FREQUENTA_ESCOLA,created,updated';

/**
 * Mapeia coluna → campo da coleção. Serve tanto para ordenação (`sort`)
 * quanto para os filtros duplos por coluna (`~` / `!~`).
 */
const SORT_FIELDS: Readonly<Record<PatientSortField, string>> = {
  paciente: 'NOME_DA_PESSOA_CADASTRADA',
  unidade: 'NOME_UNIDADE_DE_SAUDE',
  equipe: 'NOME_EQUIPE_DE_SAUDE',
  microarea: 'CODIGO_MICROAREA',
  frequenta: 'FREQUENTA_ESCOLA',
};

/** Monta string de sort do PocketBase. */
function buildSort(field: PatientSortField, dir: SortDir): string {
  return `${dir === 'asc' ? '' : '-'}${SORT_FIELDS[field]}`;
}

/** Escapa aspas e barras para injeção segura em filtros do PocketBase. */
function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Constrói os filtros duplos multi-termo por coluna.
 * `include` → `(campo ~ "a" || campo ~ "b")` (contém qualquer termo).
 * `exclude` → `campo !~ "a" && campo !~ "b"` (não contém nenhum).
 */
function buildColumnFilterParts(filters: PatientColumnFilters): string[] {
  const parts: string[] = [];

  PATIENT_COLUMNS.forEach((field) => {
    const column = SORT_FIELDS[field];

    const includes = filters[field].include
      .map((term) => clampSearchTerm(term))
      .filter((term) => term !== '');

    if (includes.length > 0) {
      const orParts = includes.map((term) => `${column} ~ "${escapeFilterValue(term)}"`);
      parts.push(`(${orParts.join(' || ')})`);
    }

    filters[field].exclude
      .map((term) => clampSearchTerm(term))
      .filter((term) => term !== '')
      .forEach((term) => {
        parts.push(`${column} !~ "${escapeFilterValue(term)}"`);
      });
  });

  return parts;
}

/** Monta a string de filtro combinando unidade, busca, status e colunas. */
function buildFilterString(filters: PatientFilters): string | null {
  const search = clampSearchTerm(filters.search);
  const scope = unitFilter(filters.unit);
  const columnFilterParts = buildColumnFilterParts(filters.columnFilters);

  const filterParts: string[] = [];

  if (scope !== null) {
    filterParts.push(scope);
  }

  if (search !== '') {
    filterParts.push(
      `(NOME_DA_PESSOA_CADASTRADA ~ "${search}" || N_CNS_DA_PESSOA_CADASTRADA ~ "${search}" || NOME_DA_MAE_PESSOA_CADASTRADA ~ "${search}")`,
    );
  }

  if (filters.status === 'frequenta' || filters.status === 'nao_frequenta') {
    filterParts.push(ATTENDANCE_FILTERS[filters.status]);
  } else if (filters.status === 'pendente') {
    filterParts.push(PENDING_FILTER);
  }

  filterParts.push(...columnFilterParts);

  return filterParts.length > 0 ? filterParts.join(' && ') : null;
}

/**
 * Lista paginada de pacientes.
 * Estratégia de performance para VM com 1GB de RAM:
 * paginação sempre ativa, fields mínimo, requestKey explícito.
 */
export async function fetchPatients(filters: PatientFilters): Promise<PagedResult<Patient>> {
  const unit = filters.unit;
  const search = clampSearchTerm(filters.search);

  const options: ListOptions = {
    page: filters.page,
    perPage: filters.perPage,
    sort: buildSort(filters.sortField, filters.sortDir),
    fields: PATIENT_FIELDS,
    requestKey: `pacientes-${unit ?? 'todas'}-${filters.page}-${filters.perPage}-${search}-${filters.status}-${filters.sortField}-${filters.sortDir}`,
  };

  const filter = buildFilterString(filters);
  if (filter !== null) {
    options.filter = filter;
  }

  const result = await pb.collection(COLLECTIONS.pacientes).getList(filters.page, filters.perPage, options);
  return {
    items: result.items.map(mapPatientRecord),
    page: result.page,
    perPage: result.perPage,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  };
}

const EXPORT_PER_PAGE = 200;

/**
 * Busca TODOS os pacientes com os filtros atuais (exportação/impressão).
 * Pagina em lotes até completar, sem carregar a coleção inteira de uma vez.
 */
export async function fetchAllPatients(filters: PatientFilters): Promise<PagedResult<Patient>> {
  const sort = buildSort(filters.sortField, filters.sortDir);
  const filter = buildFilterString(filters);
  const unitKey = filters.unit ?? 'todas';

  const baseOptions = {
    sort,
    fields: PATIENT_FIELDS,
    ...(filter !== null ? { filter } : {}),
  };

  const first = await pb
    .collection(COLLECTIONS.pacientes)
    .getList(1, EXPORT_PER_PAGE, { ...baseOptions, requestKey: `pacientes-export-${unitKey}-1` });

  const items = [...first.items.map(mapPatientRecord)];

  for (let page = 2; page <= first.totalPages; page += 1) {
    const result = await pb
      .collection(COLLECTIONS.pacientes)
      .getList(page, EXPORT_PER_PAGE, { ...baseOptions, requestKey: `pacientes-export-${unitKey}-${page}` });
    items.push(...result.items.map(mapPatientRecord));
  }

  return {
    items,
    page: 1,
    perPage: EXPORT_PER_PAGE,
    totalItems: first.totalItems,
    totalPages: first.totalPages,
  };
}

/**
 * Atualiza o campo `FREQUENTA_ESCOLA` de um paciente.
 * Valores escritos: "SIM", "NÃO" ou "" (pendente).
 */
export async function updatePatientAttendance(
  patientId: string,
  status: AttendanceStatus,
): Promise<Patient> {
  const raw = status === 'frequenta' ? 'SIM' : status === 'nao_frequenta' ? 'NÃO' : '';

  const record = await pb.collection(COLLECTIONS.pacientes).update(patientId, {
    FREQUENTA_ESCOLA: raw,
  });

  return mapPatientRecord(record);
}

/** Junta os filtros de escopo (opcional) e de status com `&&`. */
function combineFilters(scope: string | null, statusFilter: string): string {
  return scope === null ? statusFilter : `${scope} && ${statusFilter}`;
}

async function countPatientsByStatus(
  status: Exclude<AttendanceStatus, 'pendente'>,
  unit: UnitName | null,
): Promise<number> {
  const result = await pb.collection(COLLECTIONS.pacientes).getList(1, 1, {
    filter: combineFilters(unitFilter(unit), ATTENDANCE_FILTERS[status]),
    fields: 'id',
    requestKey: `pacientes-count-${unit ?? 'todas'}-${status}`,
  });

  return result.totalItems;
}

async function countPendingPatients(unit: UnitName | null): Promise<number> {
  const result = await pb.collection(COLLECTIONS.pacientes).getList(1, 1, {
    filter: combineFilters(unitFilter(unit), PENDING_FILTER),
    fields: 'id',
    requestKey: `pacientes-count-${unit ?? 'todas'}-pendente`,
  });

  return result.totalItems;
}

/**
 * Resumo agregado do painel, restrito à unidade do usuário
 * (administrador sem unidade enxerga todas).
 * Quatro contagens leves (totalItems de buscas de 1 registro)
 * em vez de baixar a coleção inteira — essencial para a VM com 1GB de RAM.
 */
export async function fetchAttendanceSummary(unit: UnitName | null): Promise<AttendanceSummary> {
  const scope = unitFilter(unit);
  const scopeKey = unit ?? 'todas';

  const [total, attending, notAttending, pending] = await Promise.all([
    pb.collection(COLLECTIONS.pacientes).getList(1, 1, {
      filter: scope ?? undefined,
      fields: 'id',
      requestKey: `pacientes-count-${scopeKey}-total`,
    }),
    countPatientsByStatus('frequenta', unit),
    countPatientsByStatus('nao_frequenta', unit),
    countPendingPatients(unit),
  ]);

  const totalPatients = total.totalItems;
  const attendanceRate = totalPatients === 0 ? 0 : (attending / totalPatients) * 100;

  return {
    totalPatients,
    attendingStudents: attending,
    notAttendingStudents: notAttending,
    pendingStudents: pending,
    attendanceRate,
    lastSyncAt: new Date().toISOString(),
  };
}
