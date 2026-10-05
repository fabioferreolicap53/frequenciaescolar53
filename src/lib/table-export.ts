import { readLocalOverrides } from '@/lib/attendance-overrides';
import type { UnitName } from '@/lib/units';
import type { AttendanceStatus, Patient } from '@/types/patient';

const CSV_BOM = '\uFEFF';
const CSV_DELIMITER = ';';

/** Rótulos humanos da frequência escolar (impressão e CSV). */
const ATTENDANCE_LABELS: Readonly<Record<AttendanceStatus, string>> = {
  frequenta: 'Frequenta a escola',
  nao_frequenta: 'Não frequenta a escola',
  pendente: 'Aguardando registro',
};

const EXPORT_HEADERS: readonly string[] = [
  'Paciente',
  'Sexo',
  'Data de nascimento',
  'Idade',
  'CNS',
  'Unidade',
  'Equipe',
  'Microárea',
  'Frequência escolar',
];

export interface ExportRow {
  readonly name: string;
  readonly sex: string;
  readonly birthDate: string;
  readonly age: string;
  readonly cns: string;
  readonly healthUnit: string;
  readonly healthTeam: string;
  readonly microarea: string;
  readonly attendanceLabel: string;
}

/**
 * Converte pacientes em linhas de exportação, aplicando os overrides
 * locais de frequência (mesma lógica exibida na tabela).
 */
export function buildTableRows(patients: readonly Patient[]): ExportRow[] {
  const overrides = readLocalOverrides();

  return patients.map((patient) => {
    const status = overrides[patient.id] ?? patient.attendanceStatus;

    return {
      name: patient.name,
      sex: patient.sex,
      birthDate: patient.birthDate,
      age: patient.age || '—',
      cns: patient.cns || '—',
      healthUnit: patient.healthUnit,
      healthTeam: patient.healthTeam,
      microarea: patient.microarea || '—',
      attendanceLabel: ATTENDANCE_LABELS[status],
    };
  });
}

function toCsvCell(value: string): string {
  if (
    value.includes('"') ||
    value.includes(CSV_DELIMITER) ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowToCells(row: ExportRow): string[] {
  return [
    row.name,
    row.sex,
    row.birthDate,
    row.age,
    row.cns,
    row.healthUnit,
    row.healthTeam,
    row.microarea,
    row.attendanceLabel,
  ];
}

/** Conteúdo CSV com BOM e `;` — abre direto no Excel em pt-BR. */
export function buildCsvContent(rows: readonly ExportRow[]): string {
  const lines = [EXPORT_HEADERS.map(toCsvCell).join(CSV_DELIMITER)];

  rows.forEach((row) => {
    lines.push(rowToCells(row).map(toCsvCell).join(CSV_DELIMITER));
  });

  return `${CSV_BOM}${lines.join('\r\n')}\r\n`;
}

export function buildTableFileName(): string {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return `frequencia-escolar-${date}.csv`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Documento HTML autônomo para impressão (janela de impressão do navegador). */
export function buildPrintDocument(rows: readonly ExportRow[], unit: UnitName | null): string {
  const emittedAt = new Date().toLocaleString('pt-BR');
  const unitLabel = unit ?? 'Todas as unidades';

  const headerCells = EXPORT_HEADERS.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${rowToCells(row)
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Painel de Frequência Escolar</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { margin: 0; color: #1e293b; font-family: 'Segoe UI', system-ui, Arial, sans-serif; font-size: 12px; }
  header { margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
  h1 { margin: 0 0 4px; font-size: 18px; color: #0f172a; }
  .meta { margin: 0; color: #475569; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #334155; }
  tbody tr:nth-child(even) { background: #f8fafc; }
</style>
</head>
<body>
<header>
  <h1>Painel de Frequência Escolar</h1>
  <p class="meta">Unidade: <strong>${escapeHtml(unitLabel)}</strong> · Registros: <strong>${String(rows.length)}</strong> · Emitido em: ${escapeHtml(emittedAt)}</p>
</header>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
</body>
</html>`;
}

/** Dispara download de arquivo texto no navegador. */
export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Imprime HTML via iframe oculta: não sofre bloqueio de pop-up e não
 * interrompe a aplicação (iframe é removido após a impressão).
 */
export function printDocument(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document ?? null;
  if (doc === null) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  window.setTimeout(() => {
    const win = iframe.contentWindow;
    win?.focus();
    win?.print();
    window.setTimeout(() => iframe.remove(), 1000);
  }, 250);
}
