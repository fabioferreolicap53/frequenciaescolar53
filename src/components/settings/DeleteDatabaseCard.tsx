import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Square,
  Trash2,
  TriangleAlert,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useDeletePacientes } from '@/hooks/useDeletePacientes';
import { formatDuration } from '@/lib/utils';
import type { DeleteStage } from '@/types/delete';

const CONFIRMATION_PHRASE = 'EXCLUIR BASE';

function stageLabel(stage: DeleteStage): string {
  switch (stage) {
    case 'auth':
      return 'Autenticando administrador';
    case 'rebuild':
      return 'Limpando a coleção (DROP + RECREATE)';
    case 'delete':
      return 'Excluindo registros em lotes';
  }
}

interface StatProps {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'default' | 'ok' | 'danger';
}

function Stat({ label, value, tone = 'default' }: StatProps): React.JSX.Element {
  const valueClass =
    tone === 'ok' ? 'text-emerald-600' : tone === 'danger' ? 'text-rose-600' : 'text-foreground';

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

export function DeleteDatabaseCard(): React.JSX.Element {
  const { isAdmin } = useAuth();
  const {
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
  } = useDeletePacientes();

  const [phrase, setPhrase] = useState('');

  if (!isAdmin) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 px-5 py-6">
          <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-destructive">Acesso restrito</p>
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem excluir a base de pacientes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isBusy = state === 'running' || state === 'paused';
  const phraseMatches = phrase.trim().toUpperCase() === CONFIRMATION_PHRASE;
  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.removed / progress.total) * 100)) : 0;

  const handleStart = (): void => {
    setPhrase('');
    start();
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          Zona de risco — Exclusão da base
        </CardTitle>
        <CardDescription>
          Apaga <strong>todos</strong> os registros da coleção{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">frequenciaescolar_pacientes</code>.
          A estrutura da coleção é preservada. A ação é <strong>irreversível</strong> e não há backup
          automático dos dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Registros na coleção
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {count === null ? '—' : count.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={countLoading || isBusy}
            onClick={refreshCount}
          >
            <RefreshCw
              className={`h-4 w-4 ${countLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Atualizar
          </Button>
        </div>

        {countError !== null && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{countError}</span>
          </div>
        )}

        {state === 'idle' && (
          <>
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Para liberar a exclusão, digite a frase <strong>{CONFIRMATION_PHRASE}</strong> abaixo.
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                placeholder={CONFIRMATION_PHRASE}
                aria-label="Frase de confirmação"
                className="sm:max-w-xs"
              />
              <Button
                type="button"
                variant="destructive"
                disabled={!phraseMatches}
                onClick={handleStart}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Excluir todos os registros
              </Button>
            </div>
          </>
        )}

        {isBusy && (
          <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-destructive">
                {state === 'running' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
                )}
                {state === 'paused' ? 'Pausado' : stageLabel(progress.stage)}
              </span>
              {progress.stage === 'delete' && progress.total > 0 && (
                <span className="font-semibold tabular-nums text-destructive">
                  {String(percent)}%
                </span>
              )}
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-muted">
              {progress.stage === 'delete' ? (
                <div
                  className="h-full rounded-full bg-gradient-to-r from-destructive to-destructive/60 transition-[width] duration-300 ease-out"
                  style={{ width: `${String(percent)}%` }}
                />
              ) : (
                <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-destructive/40 via-destructive to-destructive/40" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Removidos" value={progress.removed.toLocaleString('pt-BR')} tone="ok" />
              <Stat label="Lotes" value={String(progress.batches)} />
              <Stat
                label="Falhas"
                value={String(progress.failures)}
                tone={progress.failures === 0 ? 'default' : 'danger'}
              />
              <Stat label="Tempo" value={formatDuration(elapsedSec)} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                {progress.stage === 'delete' && eta !== ''
                  ? `Tempo restante estimado: ${eta}`
                  : 'Aguardando o servidor concluir a operação atual…'}
              </span>

              <div className="flex gap-3">
                {progress.stage === 'rebuild' ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    Não é possível interromper nesta etapa.
                  </span>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="bg-amber-500 text-white hover:bg-amber-600"
                      onClick={pauseResume}
                    >
                      {state === 'paused' ? (
                        <Play className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Pause className="h-4 w-4" aria-hidden="true" />
                      )}
                      {state === 'paused' ? 'Continuar' : 'Pausar'}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancel}>
                      <Square className="h-4 w-4" aria-hidden="true" />
                      Interromper
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {state === 'completed' && report !== null && (
          <div className="flex flex-col gap-4">
            <div
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                report.finalCount === 0
                  ? 'border-emerald-100 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                  report.finalCount === 0
                    ? 'bg-emerald-500 shadow-emerald-200'
                    : 'bg-amber-500 shadow-amber-200'
                }`}
              >
                {report.finalCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div>
                <p
                  className={`text-sm font-bold uppercase tracking-wide ${
                    report.finalCount === 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {report.cancelled ? 'Exclusão interrompida' : 'Exclusão concluída'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {report.finalCount === 0
                    ? 'A coleção está vazia. Estrutura preservada.'
                    : `Restam ${report.finalCount.toLocaleString('pt-BR')} registro(s) na coleção.`}{' '}
                  {report.method === 'rebuild'
                    ? 'Limpeza atômica (DROP + RECREATE).'
                    : 'Exclusão em lotes.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
              <Stat label="Removidos" value={report.removed.toLocaleString('pt-BR')} tone="ok" />
              <Stat label="Restantes" value={report.finalCount.toLocaleString('pt-BR')} />
              <Stat
                label="Falhas"
                value={String(progress.failures)}
                tone={progress.failures > 0 ? 'danger' : 'ok'}
              />
              <Stat label="Duração" value={formatDuration(report.elapsedSec)} />
            </div>

            <div>
              <Button type="button" variant="secondary" onClick={reset}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Concluir
              </Button>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-4 text-rose-700">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm shadow-rose-200">
                <XCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide">Falha na exclusão</p>
                <p className="text-xs">{error ?? 'Erro inesperado.'}</p>
              </div>
            </div>

            <div>
              <Button type="button" variant="secondary" onClick={reset}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Voltar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
