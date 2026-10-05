import type { UnitName } from '@/lib/units';
import { stripAccents } from '@/services/base';
import type { AttendanceSummary } from '@/types/attendance';
import type { PatientFilters, PatientSortField, PagedResult, Patient, SortDir } from '@/types/patient';
import { PATIENT_COLUMNS } from '@/types/patient';

/**
 * Dados de demonstração com o formato real da coleção
 * `frequenciaescolar_pacientes` (exportação e-SUS / ESF).
 * Usados apenas em desenvolvimento quando o PocketBase não está acessível.
 */
export const MOCK_PATIENTS: readonly Patient[] = [
  {
    id: 'mock-001',
    name: 'Ana Beatriz Souza',
    cns: '700 0000 0000 0001',
    motherName: 'Maria de Souza',
    healthUnit: 'UBS Jardim América',
    healthTeam: 'ESF 01',
    microarea: '01',
    situation: 'Ativo',
    sex: 'Feminino',
    raceColor: 'Parda',
    birthDate: '18/04/2014',
    age: '12',
    schoolAttendanceRaw: 'SIM',
    attendanceStatus: 'frequenta',
    createdAt: '2026-01-12T10:00:00.000Z',
    updatedAt: '2026-09-30T18:00:00.000Z',
  },
  {
    id: 'mock-002',
    name: 'Carlos Eduardo Lima',
    cns: '700 0000 0000 0002',
    motherName: 'José Carlos Lima',
    healthUnit: 'UBS Vila Nova',
    healthTeam: 'ESF 03',
    microarea: '03',
    situation: 'Ativo',
    sex: 'Masculino',
    raceColor: 'Branca',
    birthDate: '02/09/2013',
    age: '13',
    schoolAttendanceRaw: '',
    attendanceStatus: 'pendente',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-09-29T18:00:00.000Z',
  },
  {
    id: 'mock-003',
    name: 'Fernanda Oliveira Rocha',
    cns: '700 0000 0000 0003',
    motherName: 'Patrícia Oliveira',
    healthUnit: 'UBS Jardim América',
    healthTeam: 'ESF 01',
    microarea: '02',
    situation: 'Ativo',
    sex: 'Feminino',
    raceColor: 'Parda',
    birthDate: '25/02/2015',
    age: '11',
    schoolAttendanceRaw: '',
    attendanceStatus: 'pendente',
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-08-10T12:00:00.000Z',
  },
  {
    id: 'mock-004',
    name: 'Gabriel Martins Silva',
    cns: '700 0000 0000 0004',
    motherName: 'Aparecida Martins',
    healthUnit: 'UBS Centro',
    healthTeam: 'ESF 05',
    microarea: '05',
    situation: 'Ativo',
    sex: 'Masculino',
    raceColor: 'Preta',
    birthDate: '11/12/2012',
    age: '13',
    schoolAttendanceRaw: 'SIM',
    attendanceStatus: 'frequenta',
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-10-01T18:00:00.000Z',
  },
  {
    id: 'mock-005',
    name: 'Helena Costa Ferreira',
    cns: '700 0000 0000 0005',
    motherName: 'Ricardo Costa',
    healthUnit: 'UBS Vila Nova',
    healthTeam: 'ESF 03',
    microarea: '04',
    situation: 'Ativo',
    sex: 'Feminino',
    raceColor: 'Branca',
    birthDate: '30/06/2016',
    age: '10',
    schoolAttendanceRaw: 'NÃO',
    attendanceStatus: 'nao_frequenta',
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-07-22T09:30:00.000Z',
  },
  {
    id: 'mock-006',
    name: 'João Pedro Almeida',
    cns: '700 0000 0000 0006',
    motherName: 'Sandra Almeida',
    healthUnit: 'UBS Jardim América',
    healthTeam: 'ESF 01',
    microarea: '01',
    situation: 'Ativo',
    sex: 'Masculino',
    raceColor: 'Parda',
    birthDate: '08/11/2014',
    age: '11',
    schoolAttendanceRaw: '',
    attendanceStatus: 'pendente',
    createdAt: '2026-03-18T10:00:00.000Z',
    updatedAt: '2026-09-28T18:00:00.000Z',
  },
  {
    id: 'mock-007',
    name: 'Larissa Gomes Pereira',
    cns: '700 0000 0000 0007',
    motherName: 'Marcos Gomes',
    healthUnit: 'UBS Centro',
    healthTeam: 'ESF 05',
    microarea: '06',
    situation: 'Ativo',
    sex: 'Feminino',
    raceColor: 'Amarela',
    birthDate: '14/08/2015',
    age: '11',
    schoolAttendanceRaw: '',
    attendanceStatus: 'pendente',
    createdAt: '2026-04-02T10:00:00.000Z',
    updatedAt: '2026-06-30T15:00:00.000Z',
  },
  {
    id: 'mock-008',
    name: 'Mateus Rodrigues Dias',
    cns: '700 0000 0000 0008',
    motherName: 'Elaine Rodrigues',
    healthUnit: 'UBS Vila Nova',
    healthTeam: 'ESF 03',
    microarea: '03',
    situation: 'Ativo',
    sex: 'Masculino',
    raceColor: 'Branca',
    birthDate: '22/03/2013',
    age: '13',
    schoolAttendanceRaw: 'SIM',
    attendanceStatus: 'frequenta',
    createdAt: '2026-04-14T10:00:00.000Z',
    updatedAt: '2026-09-30T18:00:00.000Z',
  },
  {
    id: 'mock-009',
    name: 'Isabela Ferreira Santos',
    cns: '700 0000 0000 0009',
    motherName: 'Denise Ferreira',
    healthUnit: 'UBS Jardim América',
    healthTeam: 'ESF 01',
    microarea: '02',
    situation: 'Ativo',
    sex: 'Feminino',
    raceColor: 'Parda',
    birthDate: '19/01/2016',
    age: '10',
    schoolAttendanceRaw: '',
    attendanceStatus: 'pendente',
    createdAt: '2026-05-07T10:00:00.000Z',
    updatedAt: '2026-05-07T10:00:00.000Z',
  },
  {
    id: 'mock-010',
    name: 'Rafael Nunes Carvalho',
    cns: '700 0000 0000 0010',
    motherName: 'Luciana Nunes',
    healthUnit: 'UBS Centro',
    healthTeam: 'ESF 05',
    microarea: '05',
    situation: 'Ativo',
    sex: 'Masculino',
    raceColor: 'Preta',
    birthDate: '05/07/2012',
    age: '14',
    schoolAttendanceRaw: '',
    attendanceStatus: 'pendente',
    createdAt: '2026-05-21T10:00:00.000Z',
    updatedAt: '2026-09-27T18:00:00.000Z',
  },
] as const satisfies readonly Patient[];

/**
 * Restringe os dados de demonstração à unidade selecionada,
 * espelhando o comportamento do filtro server-side.
 * `null` (administrador) devolve todos os registros.
 */
function scopedMockPatients(unit: UnitName | null): readonly Patient[] {
  if (unit === null) {
    return MOCK_PATIENTS;
  }

  return MOCK_PATIENTS.map((patient) => ({ ...patient, healthUnit: unit }));
}

export function buildMockSummary(unit: UnitName | null): AttendanceSummary {
  const scoped = scopedMockPatients(unit);
  const totalPatients = scoped.length;
  const attendingStudents = scoped.filter((p) => p.attendanceStatus === 'frequenta').length;
  const notAttendingStudents = scoped.filter(
    (p) => p.attendanceStatus === 'nao_frequenta',
  ).length;
  const pendingStudents = totalPatients - attendingStudents - notAttendingStudents;

  return {
    totalPatients,
    attendingStudents,
    notAttendingStudents,
    pendingStudents,
    attendanceRate: totalPatients === 0 ? 0 : (attendingStudents / totalPatients) * 100,
    lastSyncAt: new Date().toISOString(),
  };
}

/** Texto comparável: sem acentos e minúsculo (espelha o `~` do PocketBase). */
function normalizeText(value: string): string {
  return stripAccents(value).toLowerCase();
}

/** Valor de cada coluna usado pelos filtros duplos. */
function columnFilterValue(patient: Patient, field: PatientSortField): string {
  switch (field) {
    case 'unidade':
      return patient.healthUnit;
    case 'equipe':
      return patient.healthTeam;
    case 'microarea':
      return patient.microarea;
    case 'frequenta':
      return patient.schoolAttendanceRaw;
    default:
      return patient.name;
  }
}

/**
 * Ordena dados de demonstração conforme doc_ordenacao_tabelas.md (§4/§10):
 * `localeCompare("pt-BR")` para textos, comparação aritmética para idade.
 */
function sortMockPatients(
  list: readonly Patient[],
  field: PatientSortField,
  dir: SortDir,
): readonly Patient[] {
  const sorted = [...list].sort((a, b) => {
    let cmp: number;

    switch (field) {
      case 'unidade':
        cmp = a.healthUnit.localeCompare(b.healthUnit, 'pt-BR', { sensitivity: 'base' });
        break;
      case 'equipe':
        cmp = a.healthTeam.localeCompare(b.healthTeam, 'pt-BR', { sensitivity: 'base' });
        break;
      case 'microarea':
        cmp = a.microarea.localeCompare(b.microarea, 'pt-BR', { sensitivity: 'base' });
        break;
      case 'frequenta':
        cmp = a.attendanceStatus.localeCompare(b.attendanceStatus, 'pt-BR', {
          sensitivity: 'base',
        });
        break;
      default:
        cmp = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        break;
    }

    return dir === 'asc' ? cmp : -cmp;
  });

  return sorted;
}

export function buildMockPatients(filters: PatientFilters): PagedResult<Patient> {
  const search = filters.search.trim().toLowerCase();

  let filtered = [...scopedMockPatients(filters.unit)];

  if (filters.status !== 'todos') {
    filtered = filtered.filter((patient) => patient.attendanceStatus === filters.status);
  }

  if (search !== '') {
    filtered = filtered.filter(
      (patient) =>
        patient.name.toLowerCase().includes(search) ||
        patient.cns.toLowerCase().includes(search) ||
        patient.motherName.toLowerCase().includes(search),
    );
  }

  // Filtros duplos multi-termo: contém (OU entre termos) e não contém (nenhum termo).
  PATIENT_COLUMNS.forEach((field) => {
    const includes = filters.columnFilters[field].include
      .map((term) => normalizeText(term))
      .filter((term) => term !== '');
    const excludes = filters.columnFilters[field].exclude
      .map((term) => normalizeText(term))
      .filter((term) => term !== '');

    if (includes.length > 0) {
      filtered = filtered.filter((patient) => {
        const value = normalizeText(columnFilterValue(patient, field));
        return includes.some((term) => value.includes(term));
      });
    }

    excludes.forEach((term) => {
      filtered = filtered.filter(
        (patient) => !normalizeText(columnFilterValue(patient, field)).includes(term),
      );
    });
  });

  // Paginação aplicada depois da ordenação (doc §7).
  const sorted = sortMockPatients(filtered, filters.sortField, filters.sortDir);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.perPage));
  const page = Math.min(filters.page, totalPages);
  const start = (page - 1) * filters.perPage;

  return {
    items: sorted.slice(start, start + filters.perPage),
    page,
    perPage: filters.perPage,
    totalItems,
    totalPages,
  };
}
