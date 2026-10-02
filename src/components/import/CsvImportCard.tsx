import { useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Square,
  TriangleAlert,
  Upload,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useImportPacientes } from '@/hooks/useImportPacientes';
import { useAuth } from '@/hooks/useAuth';
import { formatDuration } from '@/lib/utils';

interface MetricCellProps {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'default' | 'ok' | 'danger';
}

function MetricCell({ label, value, tone = 'default' }: MetricCellProps): React.JSX.Element {
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

export function CsvImportCard(): React.JSX.Element {
  const { isAdmin } = useAuth();
  const {
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
  } = useImportPacientes();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isAdmin) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 px-5 py-6">
          <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-destructive">Acesso restrito</p>
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem importar a base de pacientes via CSV.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isBusy = runState === 'running' || runState === 'paused';
  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;

  const handleStart = (): void => {
    setIsCancelling(false);
    startImport(clearExisting);
  };

  const handleCancel = (): void => {
    setIsCancelling(true);
    cancel();
  };

  const handleBack = (): void => {
    setIsCancelling(false);
    resetRun();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Importação da base de pacientes</CardTitle>
        <CardDescription>
          Envie o arquivo CSV exportado do e-SUS. O campo{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">FREQUENTA_ESCOLA</code> será criado
          em branco e preenchido no painel com <strong>SIM</strong> ou <strong>NÃO</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {runState === 'idle' && (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-label="Selecionar arquivo CSV"
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-all ${
                isDragging
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                  : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-card'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files[0];
                if (file !== undefined) {
                  handleFile(file);
                }
              }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileSpreadsheet className="h-6 w-6 text-primary" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isDragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo CSV aqui'}
                </p>
                <p className="text-xs text-muted-foreground">
                  ou clique para navegar · delimitadores aceitos: <strong>;</strong>,{' '}
                  <strong>,</strong>, tab
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file !== undefined) {
                    handleFile(file);
                  }
                  event.target.value = '';
                }}
              />
              <Button type="button" variant="outline" size="sm">
                <Upload className="h-4 w-4" aria-hidden="true" />
                Selecionar arquivo CSV
              </Button>
            </div>

            {parseError !== null && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{parseError}</span>
              </div>
            )}

            {parseResult !== null && (
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{parseResult.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(parseResult.drafts.length)} registro(s) válido(s) ·{' '}
                        {String(parseResult.skippedRows)} linha(s) ignorada(s)
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearPreview}>
                    Limpar prévia
                  </Button>
                </div>

                <div className="max-h-64 overflow-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-2 font-semibold">Nome</th>
                        <th className="px-3 py-2 font-semibold">CNS</th>
                        <th className="px-3 py-2 font-semibold">Unidade</th>
                        <th className="px-3 py-2 font-semibold">Nasc.</th>
                        <th className="px-3 py-2 font-semibold">Idade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parseResult.drafts.slice(0, 30).map((draft) => (
                        <tr key={draft.sourceRow}>
                          <td className="px-3 py-1.5 font-medium text-foreground">{draft.name}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{draft.cns || '—'}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {draft.healthUnit || '—'}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {draft.birthDateDisplay || '—'}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{draft.age || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={clearExisting}
                      onChange={(event) => setClearExisting(event.target.checked)}
                      className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                    />
                    Limpar a coleção atual antes de importar
                  </label>

                  <Button type="button" onClick={handleStart}>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    Importar {String(parseResult.drafts.length)} registro(s)
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {isBusy && (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <strong className="text-foreground">{String(progress.processed)}</strong> /{' '}
                {String(progress.total)} registros
              </span>
              <span className="font-semibold tabular-nums text-primary">{String(percent)}%</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-[width] duration-300 ease-out"
                style={{ width: `${String(percent)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricCell label="Tempo" value={formatDuration(elapsedSec)} />
              <MetricCell
                label="Erros"
                value={String(progress.errors)}
                tone={progress.errors === 0 ? 'ok' : 'danger'}
              />
              <MetricCell
                label={runState === 'paused' ? 'Restante' : 'Estimado'}
                value={eta === '' ? '…' : eta}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {runState === 'running' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                    Importando
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
                    Pausado
                  </>
                )}
              </span>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-amber-500 text-white hover:bg-amber-600"
                  onClick={pauseResume}
                >
                  {runState === 'paused' ? (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  )}
                  {runState === 'paused' ? 'Continuar' : 'Pausar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCancelling}
                  onClick={handleCancel}
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  {isCancelling ? 'Interrompendo…' : 'Interromper'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {runState === 'completed' && summary !== null && (
          <div className="flex flex-col gap-4">
            <div
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                summary.cancelled
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-emerald-100 bg-emerald-50'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                  summary.cancelled ? 'bg-amber-500 shadow-amber-200' : 'bg-emerald-500 shadow-emerald-200'
                }`}
              >
                {summary.cancelled ? (
                  <TriangleAlert className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div>
                <p
                  className={`text-sm font-bold uppercase tracking-wide ${
                    summary.cancelled ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {summary.cancelled ? 'Importação interrompida' : 'Importação concluída'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.cleared
                    ? 'A coleção foi substituída pela nova base.'
                    : 'Os registros foram adicionados à base existente.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3">
              <MetricCell label="Registros" value={String(summary.created)} />
              <MetricCell label="Duração" value={formatDuration(summary.elapsedSec)} />
              <MetricCell
                label="Falhas"
                value={String(summary.errors)}
                tone={summary.errors > 0 ? 'danger' : 'ok'}
              />
            </div>

            {summary.errorSamples.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                {summary.errorSamples.map((sample) => (
                  <li key={sample} className="flex items-start gap-2">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{sample}</span>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Button type="button" variant="secondary" onClick={handleBack}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Voltar
              </Button>
            </div>
          </div>
        )}

        {runState === 'error' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-4 text-rose-700">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm shadow-rose-200">
                <TriangleAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide">Falha na importação</p>
                <p className="text-xs">{runError ?? 'Erro inesperado.'}</p>
              </div>
            </div>

            <div>
              <Button type="button" variant="secondary" onClick={handleBack}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Voltar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
