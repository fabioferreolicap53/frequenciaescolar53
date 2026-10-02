import { useCallback, useEffect, useRef, useState } from 'react';

import { parseCsvToPatientDrafts } from '@/lib/csv';
import { readImportHistory, removeImportHistoryEntry, clearImportHistory } from '@/lib/import-history';
import { queryClient, queryKeys } from '@/lib/query-client';
import { formatDuration } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { importPatientsFromDrafts, registerImportHistory } from '@/services/import.service';
import type {
  CsvParseResult,
  ImportControl,
  ImportHistoryEntry,
  ImportProgress,
} from '@/types/import';

export type ImportRunState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface ImportSummary {
  readonly created: number;
  readonly errors: number;
  readonly elapsedSec: number;
  readonly cancelled: boolean;
  readonly cleared: boolean;
  readonly errorSamples: readonly string[];
}

export interface UseImportPacientesResult {
  readonly parseResult: CsvParseResult | null;
  readonly parseError: string | null;
  readonly handleFile: (file: File) => void;
  readonly clearPreview: () => void;
  readonly runState: ImportRunState;
  readonly progress: ImportProgress;
  readonly elapsedSec: number;
  readonly eta: string;
  readonly summary: ImportSummary | null;
  readonly runError: string | null;
  readonly startImport: (clearExisting: boolean) => void;
  readonly pauseResume: () => void;
  readonly cancel: () => void;
  readonly resetRun: () => void;
  readonly history: readonly ImportHistoryEntry[];
  readonly refreshHistory: () => void;
  readonly removeHistoryEntry: (id: string) => void;
  readonly clearHistory: () => void;
}

const EMPTY_PROGRESS: ImportProgress = { processed: 0, total: 0, errors: 0 };

/**
 * Fluxo de importação de CSV na página de configurações.
 * 1. Usuário seleciona o arquivo → parse e prévia.
 * 2. Confirmação → criação em lote no PocketBase com FREQUENTA_ESCOLA em branco.
 * 3. Pausa/continua/interrompe durante a execução, com métricas ao vivo.
 * 4. Cache do React Query é invalidado para atualizar o painel.
 */
export function useImportPacientes(): UseImportPacientesResult {
  const { unit } = useAuth();
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [history, setHistory] = useState<readonly ImportHistoryEntry[]>(readImportHistory);
  const [runState, setRunState] = useState<ImportRunState>('idle');
  const [progress, setProgress] = useState<ImportProgress>(EMPTY_PROGRESS);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [eta, setEta] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // Controle do loop assíncrono — NÃO é estado React.
  const flagsRef = useRef<ImportControl>({ paused: false, cancelled: false });
  const startTimeRef = useRef(0);
  const progressRef = useRef<ImportProgress>(EMPTY_PROGRESS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((): void => {
    stopTimer();
    timerRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setElapsedSec(elapsed);

      const current = progressRef.current;

      if (current.processed > 0 && current.processed < current.total && elapsed > 0) {
        const rate = current.processed / elapsed;
        const remaining = Math.max(0, Math.round((current.total - current.processed) / rate));
        setEta(formatDuration(remaining));
      }
    }, 1000);
  }, [stopTimer]);

  // Cleanup ao desmontar: cancela o loop e zera o cronômetro.
  useEffect(
    (): (() => void) => () => {
      flagsRef.current.cancelled = true;
      stopTimer();
    },
    [stopTimer],
  );

  const refreshHistory = useCallback((): void => {
    setHistory(readImportHistory());
  }, []);

  const removeHistoryEntry = useCallback((id: string): void => {
    setHistory(removeImportHistoryEntry(id));
  }, []);

  const clearHistory = useCallback((): void => {
    setHistory(clearImportHistory());
  }, []);

  const handleFile = useCallback((file: File): void => {
    setParseError(null);
    setParseResult(null);
    setSummary(null);
    setRunError(null);
    setRunState('idle');

    const reader = new FileReader();

    reader.onload = (): void => {
      const content = typeof reader.result === 'string' ? reader.result : '';

      try {
        const result = parseCsvToPatientDrafts(file.name, content);

        if (result.drafts.length === 0) {
          setParseError('Nenhuma linha válida encontrada no arquivo (coluna de nome obrigatória).');
          return;
        }

        setParseResult(result);
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Falha ao processar o arquivo CSV.');
      }
    };

    reader.onerror = (): void => {
      setParseError('Falha ao ler o arquivo. Tente novamente.');
    };

    reader.readAsText(file, 'utf-8');
  }, []);

  const clearPreview = useCallback((): void => {
    setParseResult(null);
    setParseError(null);
  }, []);

  const resetRun = useCallback((): void => {
    setSummary(null);
    setRunError(null);
    setRunState('idle');
    setProgress(EMPTY_PROGRESS);
    progressRef.current = EMPTY_PROGRESS;
    setElapsedSec(0);
    setEta('');
  }, []);

  const startImport = useCallback(
    (clearExisting: boolean): void => {
      if (parseResult === null || runState === 'running' || runState === 'paused') {
        return;
      }

      const total = parseResult.drafts.length;
      const { drafts, fileName } = parseResult;

      flagsRef.current = { paused: false, cancelled: false };
      progressRef.current = { processed: 0, total, errors: 0 };
      startTimeRef.current = Date.now();

      setSummary(null);
      setRunError(null);
      setProgress({ processed: 0, total, errors: 0 });
      setElapsedSec(0);
      setEta('');
      setRunState('running');
      startTimer();

      const handleProgress = (next: ImportProgress): void => {
        progressRef.current = next;
        setProgress(next);
      };

      void (async (): Promise<void> => {
        try {
          const report = await importPatientsFromDrafts(
            drafts,
            { clearExisting, defaultUnit: unit },
            flagsRef.current,
            handleProgress,
          );

          registerImportHistory(fileName, report);
          refreshHistory();
          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

          setSummary({
            created: report.created,
            errors: report.errors,
            elapsedSec: report.elapsedSec,
            cancelled: report.cancelled,
            cleared: report.cleared,
            errorSamples: report.errorSamples,
          });
          setRunState('completed');
        } catch (error) {
          setRunError(
            error instanceof Error ? error.message : 'Falha na comunicação com o servidor.',
          );
          setRunState('error');
        } finally {
          stopTimer();
          setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000));
        }
      })();
    },
    [parseResult, refreshHistory, runState, startTimer, stopTimer, unit],
  );

  const pauseResume = useCallback((): void => {
    if (flagsRef.current.paused) {
      flagsRef.current.paused = false;
      setRunState('running');
      return;
    }

    flagsRef.current.paused = true;
    setRunState('paused');
  }, []);

  const cancel = useCallback((): void => {
    flagsRef.current.cancelled = true;
    flagsRef.current.paused = false;
  }, []);

  return {
    parseResult,
    parseError,
    handleFile,
    clearPreview,
    runState,
    progress,
    elapsedSec,
    eta,
    summary,
    runError,
    startImport,
    pauseResume,
    cancel,
    resetRun,
    history,
    refreshHistory,
    removeHistoryEntry,
    clearHistory,
  };
}
