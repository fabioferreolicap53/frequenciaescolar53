import type { ImportHistoryEntry } from '@/types/import';

const IMPORT_HISTORY_KEY = 'frequenciaescolar.imports';
const MAX_HISTORY_ENTRIES = 20;

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Lê o histórico do localStorage, normalizando entradas antigas que não
 * possuem os campos adicionados depois (erros, duração, cancelamento).
 */
export function readImportHistory(): ImportHistoryEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(IMPORT_HISTORY_KEY);

    if (raw === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is Record<string, unknown> => {
      if (typeof entry !== 'object' || entry === null) {
        return false;
      }

      const candidate = entry as Record<string, unknown>;

      return (
        typeof candidate['id'] === 'string' &&
        typeof candidate['fileName'] === 'string' &&
        typeof candidate['created'] === 'number' &&
        typeof candidate['at'] === 'string'
      );
    }).map((candidate) => ({
      id: candidate['id'] as string,
      fileName: candidate['fileName'] as string,
      created: candidate['created'] as number,
      errors: toNumber(candidate['errors'], 0),
      elapsedSec: toNumber(candidate['elapsedSec'], 0),
      cancelled: candidate['cancelled'] === true,
      cleared: candidate['cleared'] === true,
      mode: candidate['mode'] === 'pocketbase' ? 'pocketbase' : 'mock',
      at: candidate['at'] as string,
    }));
  } catch {
    return [];
  }
}

function writeImportHistory(history: readonly ImportHistoryEntry[]): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(history));
  }
}

export function pushImportHistory(entry: ImportHistoryEntry): ImportHistoryEntry[] {
  const history = [entry, ...readImportHistory()].slice(0, MAX_HISTORY_ENTRIES);
  writeImportHistory(history);

  return history;
}

/** Remove um registro do histórico e devolve a lista atualizada. */
export function removeImportHistoryEntry(id: string): ImportHistoryEntry[] {
  const history = readImportHistory().filter((entry) => entry.id !== id);
  writeImportHistory(history);

  return history;
}

/** Esvazia o histórico de importações. */
export function clearImportHistory(): ImportHistoryEntry[] {
  writeImportHistory([]);

  return [];
}
