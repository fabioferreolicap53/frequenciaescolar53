import type { UnitName } from '@/lib/units';

/**
 * Rascunho de paciente extraído de uma linha do CSV importado.
 */
export interface PatientImportDraft {
  readonly name: string;
  readonly cns: string;
  readonly motherName: string;
  readonly healthUnit: string;
  readonly healthTeam: string;
  readonly microarea: string;
  readonly situation: string;
  readonly sex: string;
  readonly raceColor: string;
  readonly birthDateDisplay: string;
  readonly age: string;
  readonly sourceRow: number;
}

export interface CsvParseResult {
  readonly fileName: string;
  readonly drafts: readonly PatientImportDraft[];
  readonly totalRows: number;
  readonly skippedRows: number;
}

export interface CsvImportOptions {
  readonly clearExisting: boolean;
  /** Unidade do admin importador — usada quando o CSV não trouxer unidade. */
  readonly defaultUnit?: UnitName | null;
}

/**
 * Sinal de controle do fluxo assíncrono (mutável por {@link useRef}).
 * Não é estado React — permite pausar/interromper no meio do loop de lotes.
 */
export interface ImportControl {
  paused: boolean;
  cancelled: boolean;
}

/** Progresso parcial reportado a cada lote processado. */
export interface ImportProgress {
  readonly processed: number;
  readonly total: number;
  readonly errors: number;
}

export interface ImportReport {
  readonly created: number;
  readonly errors: number;
  readonly cleared: boolean;
  readonly cancelled: boolean;
  readonly elapsedSec: number;
  readonly mode: 'pocketbase' | 'mock';
  /** Amostra das primeiras falhas (mensagem por registro), para exibição. */
  readonly errorSamples: readonly string[];
}

export interface ImportHistoryEntry {
  readonly id: string;
  readonly fileName: string;
  readonly created: number;
  readonly errors: number;
  readonly elapsedSec: number;
  readonly cancelled: boolean;
  readonly cleared: boolean;
  readonly mode: 'pocketbase' | 'mock';
  readonly at: string;
}
