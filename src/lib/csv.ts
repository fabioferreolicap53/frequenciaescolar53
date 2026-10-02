import type { CsvParseResult, PatientImportDraft } from '@/types/import';

const BOM = '\uFEFF';

type DraftKey =
  | 'name'
  | 'cns'
  | 'motherName'
  | 'healthUnit'
  | 'healthTeam'
  | 'microarea'
  | 'situation'
  | 'sex'
  | 'raceColor'
  | 'birthDateDisplay'
  | 'age';

/**
 * Cabeçalhos aceitos no CSV (normalizados: sem acentos, caixa alta, `_`).
 * Inclui os nomes exatos da exportação e-SUS e variações comuns.
 */
const COLUMN_ALIASES: Readonly<Record<string, DraftKey>> = {
  NOME_DA_PESSOA_CADASTRADA: 'name',
  NOME: 'name',
  NOME_COMPLETO: 'name',
  N_CNS_DA_PESSOA_CADASTRADA: 'cns',
  CNS: 'cns',
  NOME_DA_MAE_PESSOA_CADASTRADA: 'motherName',
  MAE: 'motherName',
  NOME_UNIDADE_DE_SAUDE: 'healthUnit',
  UNIDADE_DE_SAUDE: 'healthUnit',
  UNIDADE: 'healthUnit',
  NOME_EQUIPE_DE_SAUDE: 'healthTeam',
  EQUIPE_DE_SAUDE: 'healthTeam',
  EQUIPE: 'healthTeam',
  CODIGO_MICROAREA: 'microarea',
  MICROAREA: 'microarea',
  SITUACAO_USUARIO: 'situation',
  SITUACAO: 'situation',
  SEXO: 'sex',
  RACA_COR: 'raceColor',
  RACA: 'raceColor',
  DATA_DE_NASCIMENTO: 'birthDateDisplay',
  DATA_NASCIMENTO: 'birthDateDisplay',
  IDADE: 'age',
};

export interface CsvTable {
  readonly headers: string[];
  readonly rows: string[][];
  readonly delimiter: string;
}

function normalizeHeader(header: string): string {
  return header
    .replace(BOM, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function detectDelimiter(sampleLine: string): string {
  const candidates = [';', ',', '\t', '|'] as const;
  let best = ',';
  let bestCount = -1;

  for (const candidate of candidates) {
    let count = 0;
    let inQuotes = false;

    for (const char of sampleLine) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === candidate && !inQuotes) {
        count += 1;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }

  return best;
}

/**
 * Parser CSV tolerante: detecta delimitador (; , tab |), suporta aspas,
 * BOM e quebras de linha misturadas (\r\n e \n).
 */
export function parseCsv(content: string): CsvTable {
  const text = content.replace(BOM, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) {
    rows.push(row);
  }

  const [headerRow = [], ...dataRows] = rows;
  const headers = headerRow.map((cell) => cell.trim());

  return { headers, rows: dataRows, delimiter };
}

/**
 * Formata valor numérico em CPF (11 dígitos) ou CNS (15 dígitos).
 * Valores não reconhecidos são retornados sem máscara.
 */
export function toDocumentNumber(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  if (digits.length === 15) {
    return digits.replace(/^(\d{3})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4');
  }

  return value.trim();
}

/**
 * Converte datas comuns em ISO (yyyy-MM-dd).
 * Aceita dd/MM/yyyy, dd-MM-yyyy e yyyy-MM-dd. Valores inválidos viram ''.
 */
export function toDateISO(value: string): string {
  const trimmed = value.trim();

  if (trimmed === '') {
    return '';
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch !== null) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = /^(\d{2})[/-](\d{2})[/-](\d{4})/.exec(trimmed);
  if (brMatch !== null) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  return '';
}

/** Converte data ISO (yyyy-MM-dd) para exibição dd/MM/yyyy. */
export function formatBirthDateDisplay(value: string): string {
  const iso = toDateISO(value);

  if (iso === '') {
    return value.trim();
  }

  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Converte o conteúdo de um CSV em rascunhos de pacientes.
 * Linhas sem nome são ignoradas (contabilizadas em skippedRows).
 */
export function parseCsvToPatientDrafts(fileName: string, content: string): CsvParseResult {
  const table = parseCsv(content);

  const keyByHeaderIndex = table.headers.map((header) => COLUMN_ALIASES[normalizeHeader(header)]);
  const hasNameColumn = keyByHeaderIndex.includes('name');

  if (!hasNameColumn) {
    throw new Error(
      'Coluna de nome não encontrada. Use um dos cabeçalhos: NOME_DA_PESSOA_CADASTRADA, NOME ou NOME_COMPLETO.',
    );
  }

  const drafts: PatientImportDraft[] = [];
  let skippedRows = 0;

  for (const row of table.rows) {
    const draft: Record<DraftKey, string> = {
      name: '',
      cns: '',
      motherName: '',
      healthUnit: '',
      healthTeam: '',
      microarea: '',
      situation: '',
      sex: '',
      raceColor: '',
      birthDateDisplay: '',
      age: '',
    };

    for (let columnIndex = 0; columnIndex < keyByHeaderIndex.length; columnIndex += 1) {
      const key = keyByHeaderIndex[columnIndex];

      if (key === undefined) {
        continue;
      }

      const cell = row[columnIndex]?.trim() ?? '';

      if (cell !== '') {
        draft[key] = cell;
      }
    }

    if (draft.name === '') {
      skippedRows += 1;
      continue;
    }

    drafts.push({
      ...draft,
      cns: toDocumentNumber(draft.cns),
      birthDateDisplay: formatBirthDateDisplay(draft.birthDateDisplay),
      sourceRow: drafts.length + 2, // +2: linha 1 = cabeçalho
    });
  }

  return {
    fileName,
    drafts,
    totalRows: table.rows.length,
    skippedRows,
  };
}
