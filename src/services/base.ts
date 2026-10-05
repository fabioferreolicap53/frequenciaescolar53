import type { RecordModel } from 'pocketbase';

import { formatBirthDateDisplay, toDocumentNumber } from '@/lib/csv';
import type { AttendanceStatus, Patient } from '@/types/patient';

const MAX_QUERY_LENGTH = 80;

export function clampSearchTerm(term: string): string {
  return term.trim().slice(0, MAX_QUERY_LENGTH);
}

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza o valor bruto do campo `FREQUENTA_ESCOLA`.
 *
 * O campo nasce em branco no PocketBase e é preenchido pelo frontend
 * com SIM ou NÃO. Também aceita variações da exportação e-SUS
 * ("Frequenta", "Não frequenta") para compatibilidade com dados legados.
 */
export function toAttendanceStatus(value: unknown): AttendanceStatus {
  if (typeof value !== 'string' || value.trim() === '') {
    return 'pendente';
  }

  const normalized = stripAccents(value.trim().toUpperCase());

  if (normalized === 'SIM' || normalized.startsWith('FREQUENTA')) {
    return 'frequenta';
  }

  if (normalized === 'NÃO' || normalized === 'NAO' || normalized.includes('NAO FREQUENTA')) {
    return 'nao_frequenta';
  }

  return 'pendente';
}

/**
 * Mapeia o Record da coleção `frequenciaescolar_pacientes`
 * para a interface de domínio `Patient`.
 */
export function mapPatientRecord(record: RecordModel): Patient {
  const data = record as unknown as Record<string, unknown>;

  const readString = (key: string): string => (typeof data[key] === 'string' ? (data[key] as string) : '');

  const rawSchoolAttendance = readString('FREQUENTA_ESCOLA');
  const birthDate = readString('DATA_DE_NASCIMENTO');

  return {
    id: record.id,
    name: readString('NOME_DA_PESSOA_CADASTRADA') || 'Sem nome',
    cns: toDocumentNumber(readString('N_CNS_DA_PESSOA_CADASTRADA')),
    motherName: readString('NOME_DA_MAE_PESSOA_CADASTRADA') || '—',
    healthUnit: readString('NOME_UNIDADE_DE_SAUDE') || '—',
    healthTeam: readString('NOME_EQUIPE_DE_SAUDE') || '—',
    microarea: readString('CODIGO_MICROAREA') || '—',
    situation: readString('SITUACAO_USUARIO') || '—',
    sex: readString('SEXO') || '—',
    raceColor: readString('RACA_COR') || '—',
    birthDate: formatBirthDateDisplay(birthDate),
    age: readString('IDADE'),
    schoolAttendanceRaw: rawSchoolAttendance,
    attendanceStatus: toAttendanceStatus(rawSchoolAttendance),
    createdAt: record.created,
    updatedAt: record.updated,
  };
}
