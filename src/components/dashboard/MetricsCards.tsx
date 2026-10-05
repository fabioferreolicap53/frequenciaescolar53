import { AlertTriangle, CircleCheck, Hourglass, School, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercent } from '@/lib/utils';
import type { AttendanceStatus, AttendanceSummary } from '@/types/attendance';

type StatusFilterValue = AttendanceStatus | 'todos';

interface MetricsCardsProps {
  readonly summary: AttendanceSummary | undefined;
  readonly isLoading: boolean;
  readonly status: StatusFilterValue;
  readonly onStatusSelect: (value: StatusFilterValue) => void;
}

interface MetricItem {
  readonly id: string;
  readonly status: StatusFilterValue;
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  readonly iconClassName: string;
  readonly valueClassName: string;
  readonly stripClassName: string;
}

export function MetricsCards({
  summary,
  isLoading,
  status,
  onStatusSelect,
}: MetricsCardsProps): React.JSX.Element {
  const items: MetricItem[] = [
    {
      id: 'total',
      status: 'todos',
      label: 'Total de pacientes',
      value: summary ? summary.totalPatients.toLocaleString('pt-BR') : '—',
      hint: 'Acompanhados pela equipe de saúde',
      icon: Users,
      iconClassName: 'bg-primary/10 text-primary ring-primary/20',
      valueClassName: 'text-primary',
      stripClassName: 'from-primary/70 to-primary/10',
    },
    {
      id: 'attending',
      status: 'frequenta',
      label: 'Frequentam a escola',
      value: summary ? summary.attendingStudents.toLocaleString('pt-BR') : '—',
      hint: 'Frequência escolar confirmada',
      icon: School,
      iconClassName: 'bg-emerald-600/10 text-emerald-700 ring-emerald-600/20',
      valueClassName: 'text-emerald-700',
      stripClassName: 'from-emerald-600/70 to-emerald-600/10',
    },
    {
      id: 'not-attending',
      status: 'nao_frequenta',
      label: 'Não frequentam',
      value: summary ? summary.notAttendingStudents.toLocaleString('pt-BR') : '—',
      hint: 'Frequência não confirmada',
      icon: AlertTriangle,
      iconClassName: 'bg-destructive/10 text-destructive ring-destructive/20',
      valueClassName: 'text-destructive',
      stripClassName: 'from-destructive/70 to-destructive/10',
    },
    {
      id: 'pending',
      status: 'pendente',
      label: 'Pendentes de análise',
      value: summary ? summary.pendingStudents.toLocaleString('pt-BR') : '—',
      hint: 'Aguardando registro da equipe',
      icon: Hourglass,
      iconClassName: 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
      valueClassName: 'text-amber-700',
      stripClassName: 'from-amber-500/70 to-amber-500/10',
    },
  ];

  const rate = summary?.attendanceRate ?? 0;
  const ratePercent = Math.min(100, Math.max(0, rate * 100));

  return (
    <section aria-label="Indicadores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const isActive = status === item.status;

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isActive}
            aria-label={`Filtrar tabela: ${item.label}`}
            onClick={() => onStatusSelect(item.status)}
            className={`group relative overflow-hidden rounded-2xl border bg-card p-0 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isActive
                ? 'border-primary/50 shadow-lg shadow-primary/15 ring-2 ring-primary/35'
                : 'border-border/70 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/10'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.stripClassName}`}
            />
            <span className="flex flex-col gap-3 p-5 pt-6">
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-200 group-hover:scale-110 ${item.iconClassName}`}
                >
                  <item.icon className="h-5 w-5" aria-hidden={true} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
              </span>
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <span
                  className={`text-3xl font-bold tabular-nums tracking-tight ${item.valueClassName}`}
                >
                  {item.value}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{item.hint}</span>
            </span>
          </button>
        );
      })}

      <Card className="col-span-full relative overflow-hidden rounded-2xl border-sky-700/20 bg-gradient-to-r from-sky-50/70 via-card to-card">
        <CardContent className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600/10 text-sky-700 ring-1 ring-inset ring-sky-600/20">
              <CircleCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Taxa de frequência escolar
              </p>
              <p className="text-xs text-muted-foreground">
                {summary === undefined
                  ? 'Calculando...'
                  : 'Em relação ao total de pacientes acompanhados.'}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              role="progressbar"
              aria-label="Taxa de frequência escolar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(ratePercent)}
              className="h-2 flex-1 overflow-hidden rounded-full bg-sky-600/10"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-700 transition-all duration-700 ease-out"
                style={{ width: `${ratePercent}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-lg font-bold tabular-nums text-sky-700">
              {summary === undefined ? '—' : formatPercent(summary.attendanceRate)}
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
