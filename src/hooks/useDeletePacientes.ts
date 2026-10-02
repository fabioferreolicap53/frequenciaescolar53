import { useCallback, useEffect, useRef, useState } from 'react';

import { queryClient, queryKeys } from '@/lib/query-client';
import { formatDuration } from '@/lib/utils';
import { countPatients, deleteAllPatients } from '@/services/delete.service';
import type { DeleteControl, DeleteProgress, DeleteReport } from '@/types/delete';

export type DeleteRunState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface UseDeletePacientesResult {
  readonly state: DeleteRunState;
  readonly progress: DeleteProgress;
  readonly elapsedSec: number;
  readonly eta: string;
  readonly report: DeleteReport | null;
  readonly error: string | null;
  readonly count: number | null;
  readonly countError: string | null;
  readonly countLoading: boolean;
  readonly refreshCount: () => void;
  readonly start: () => void;
  readonly pauseResume: () => void;
  readonly cancel: () => void;
  readonly reset: () => void;
}

const EMPTY_PROGRESS: DeleteProgress = {
  stage: 'auth',
  removed: 0,
  total: 0,
  batches: 0,
  failures: 0,
};

/**
 * Fluxo de exclusão total da coleção de pacientes.
 *
 * Controle imperativo (pause/cancel) em `useRef` — não em state — para o loop de
 * lotes reagir na hora. `runTokenRef` protege contra setState após desmontar/realocar.
 */
export function useDeletePacientes(): UseDeletePacientesResult {
  const [state, setState] = useState<DeleteRunState>('idle');
  const [progress, setProgress] = useState<DeleteProgress>(EMPTY_PROGRESS);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [eta, setEta] = useState('');
  const [report, setReport] = useState<DeleteReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const flagsRef = useRef<DeleteControl>({ paused: false, cancelled: false });
  const startTimeRef = useRef(0);
  const progressRef = useRef<DeleteProgress>(EMPTY_PROGRESS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runTokenRef = useRef(0);
  const mountedRef = useRef(true);

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

      if (current.removed > 0 && current.total > current.removed && elapsed > 0) {
        const rate = current.removed / elapsed;
        const remaining = Math.max(0, Math.round((current.total - current.removed) / rate));
        setEta(formatDuration(remaining));
      }
    }, 1000);
  }, [stopTimer]);

  useEffect((): (() => void) => {
    // Restaura na (re)montagem: o StrictMode em dev roda setup -> cleanup -> setup,
    // e o cleanup abaixo deixa mountedRef=false. Sem isto o run nunca conclui.
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      flagsRef.current.cancelled = true;
      stopTimer();
    };
  }, [stopTimer]);

  const isCurrentRun = useCallback(
    (token: number): boolean => mountedRef.current && runTokenRef.current === token,
    [],
  );

  const refreshCount = useCallback((): void => {
    setCountLoading(true);
    setCountError(null);

    void (async (): Promise<void> => {
      try {
        const value = await countPatients();

        if (mountedRef.current) {
          setCount(value);
        }
      } catch (err) {
        if (mountedRef.current) {
          setCountError(
            err instanceof Error ? err.message : 'Falha ao consultar os registros da coleção.',
          );
        }
      } finally {
        if (mountedRef.current) {
          setCountLoading(false);
        }
      }
    })();
  }, []);

  // Carga inicial da contagem (prova visual do estado antes da exclusão).
  // Agendada fora do commit do efeito para não disparar setState síncrono.
  useEffect((): (() => void) => {
    const timer = window.setTimeout(refreshCount, 0);

    return (): void => window.clearTimeout(timer);
  }, [refreshCount]);

  const start = useCallback((): void => {
    if (state === 'running' || state === 'paused') {
      return;
    }

    const token = runTokenRef.current + 1;
    runTokenRef.current = token;
    flagsRef.current = { paused: false, cancelled: false };
    progressRef.current = EMPTY_PROGRESS;
    startTimeRef.current = Date.now();

    setReport(null);
    setError(null);
    setProgress(EMPTY_PROGRESS);
    setElapsedSec(0);
    setEta('');
    setState('running');
    startTimer();

    const handleStage = (stage: DeleteProgress['stage']): void => {
      if (!isCurrentRun(token)) {
        return;
      }

      progressRef.current = { ...progressRef.current, stage };
      setProgress(progressRef.current);
    };

    const handleProgress = (next: DeleteProgress): void => {
      if (!isCurrentRun(token)) {
        return;
      }

      progressRef.current = next;
      setProgress(next);
    };

    void (async (): Promise<void> => {
      try {
        const result = await deleteAllPatients({
          control: flagsRef.current,
          onStage: handleStage,
          onProgress: handleProgress,
        });

        if (!isCurrentRun(token)) {
          return;
        }

        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        setReport(result);
        setState('completed');
        setCount(result.finalCount);
      } catch (err) {
        if (!isCurrentRun(token)) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Falha na exclusão dos dados.');
        setState('error');
      } finally {
        if (isCurrentRun(token)) {
          stopTimer();
          setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000));
        }
      }
    })();
  }, [isCurrentRun, startTimer, state, stopTimer]);

  const pauseResume = useCallback((): void => {
    if (flagsRef.current.paused) {
      flagsRef.current.paused = false;
      setState('running');
      return;
    }

    flagsRef.current.paused = true;
    setState('paused');
  }, []);

  const cancel = useCallback((): void => {
    flagsRef.current.cancelled = true;
    flagsRef.current.paused = false;
  }, []);

  const reset = useCallback((): void => {
    runTokenRef.current += 1;
    flagsRef.current = { paused: false, cancelled: false };
    progressRef.current = EMPTY_PROGRESS;
    stopTimer();

    setState('idle');
    setProgress(EMPTY_PROGRESS);
    setReport(null);
    setError(null);
    setElapsedSec(0);
    setEta('');
    refreshCount();
  }, [refreshCount, stopTimer]);

  return {
    state,
    progress,
    elapsedSec,
    eta,
    report,
    error,
    count,
    countError,
    countLoading,
    refreshCount,
    start,
    pauseResume,
    cancel,
    reset,
  };
}
