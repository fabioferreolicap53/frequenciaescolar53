import type { UnitName } from '@/lib/units';
import type { AttendanceStatus } from '@/types/attendance';

export type { AttendanceStatus };

/**
 * Domínio do paciente mapeado a partir dos campos da coleção
 * `frequenciaescolar_pacientes` (exportação e-SUS / ESF).
 */
export interface Patient {
  readonly id: string;
  readonly name: string;
  readonly cns: string;
  readonly motherName: string;
  readonly healthUnit: string;
  readonly healthTeam: string;
  readonly microarea: string;
  readonly situation: string;
  readonly sex: string;
  readonly raceColor: string;
  readonly birthDate: string;
  readonly age: string;
  readonly schoolAttendanceRaw: string;
  readonly attendanceStatus: AttendanceStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type SortDir = 'asc' | 'desc';

/** Colunas da tabela do Painel — usadas para ordenação E filtros por coluna. */
export const PATIENT_COLUMNS = ['paciente', 'unidade', 'equipe', 'microarea', 'frequenta'] as const;

export type PatientSortField = (typeof PATIENT_COLUMNS)[number];

/**
 * Filtro duplo de uma coluna, com múltiplos termos por lado:
 * - `include` (contém): o registro passa se contiver QUALQUER termo (OU).
 * - `exclude` (não contém): o registro é removido se contiver QUALQUER termo.
 */
export interface PatientColumnFilter {
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

export type PatientColumnFilters = Readonly<Record<PatientSortField, PatientColumnFilter>>;

export function createEmptyColumnFilters(): PatientColumnFilters {
  return {
    paciente: { include: [], exclude: [] },
    unidade: { include: [], exclude: [] },
    equipe: { include: [], exclude: [] },
    microarea: { include: [], exclude: [] },
    frequenta: { include: [], exclude: [] },
  };
}

/** Serializa os filtros para compor a queryKey (estável e determinística). */
export function serializeColumnFilters(filters: PatientColumnFilters): string {
  return PATIENT_COLUMNS.map((field) => `${field}:${JSON.stringify(filters[field])}`).join(';');
}

/** Total de termos ativos numa coluna (soma de inclusões e exclusões). */
export function countColumnFilter(filter: PatientColumnFilter): number {
  return filter.include.length + filter.exclude.length;
}

export interface PatientFilters {
  readonly page: number;
  readonly perPage: number;
  readonly search: string;
  readonly status: AttendanceStatus | 'todos';
  /** Unidade do usuário autenticado — escopo obrigatório das consultas. */
  readonly unit: UnitName | null;
  readonly sortField: PatientSortField;
  readonly sortDir: SortDir;
  /** Filtros duplos (contém / não contém) aplicados por coluna. */
  readonly columnFilters: PatientColumnFilters;
}

export interface PagedResult<T> {
  readonly items: T[];
  readonly page: number;
  readonly perPage: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface UpdateAttendanceInput {
  readonly patientId: string;
  readonly status: AttendanceStatus;
}
