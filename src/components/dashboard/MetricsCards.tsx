import { AlertTriangle, CircleCheck, Hourglass, School, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercent } from '@/lib/utils';
import type { AttendanceSummary } from '@/types/attendance';

interface MetricsCardsProps {
  readonly summary: AttendanceSummary | undefined;
  readonly isLoading: boolean;
}

interface MetricItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  readonly iconClassName: string;
}

export function MetricsCards({ summary, isLoading }: MetricsCardsProps): React.JSX.Element {
  const items: MetricItem[] = [
    {
      id: 'total',
      label: 'Total de pacientes',
      value: summary ? String(summary.totalPatients) : '—',
      hint: 'Importados via CSV',
      icon: Users,
      iconClassName: 'bg-primary/10 text-primary',
    },
    {
      id: 'attending',
      label: 'Frequentam a escola',
      value: summary ? String(summary.attendingStudents) : '—',
      hint: 'FREQUENTA_ESCOLA = SIM',
      icon: School,
      iconClassName: 'bg-emerald-600/10 text-emerald-700',
    },
    {
      id: 'not-attending',
      label: 'Não frequentam',
      value: summary ? String(summary.notAttendingStudents) : '—',
      hint: 'FREQUENTA_ESCOLA = NÃO',
      icon: AlertTriangle,
      iconClassName: 'bg-destructive/10 text-destructive',
    },
    {
      id: 'pending',
      label: 'Pendentes de análise',
      value: summary ? String(summary.pendingStudents) : '—',
      hint: 'FREQUENTA_ESCOLA em branco',
      icon: Hourglass,
      iconClassName: 'bg-amber-500/10 text-amber-700',
    },
  ];

  return (
    <section aria-label="Indicadores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-start gap-4 p-5">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${item.iconClassName}`}
            >
              <item.icon className="h-5 w-5" aria-hidden={true} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-16" />
              ) : (
                <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">{item.value}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="col-span-full border-sky-700/20 bg-sky-50/60">
        <CardContent className="flex items-center gap-3 px-5 py-4">
          <CircleCheck className="h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {summary === undefined
              ? 'Calculando taxa de frequência...'
              : `Taxa de frequência escolar: ${formatPercent(summary.attendanceRate)} sobre o total de pacientes importados.`}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
