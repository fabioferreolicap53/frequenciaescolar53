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

export interface PatientFilters {
  readonly page: number;
  readonly perPage: number;
  readonly search: string;
  readonly status: AttendanceStatus | 'todos';
  /** Unidade do usuário autenticado — escopo obrigatório das consultas. */
  readonly unit: UnitName | null;
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
