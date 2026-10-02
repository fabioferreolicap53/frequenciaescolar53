import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, CircleX, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isConfigured } from '@/lib/pocketbase';
import { queryClient, queryKeys } from '@/lib/query-client';
import { updatePatientAttendance } from '@/services/patients.service';
import type { AttendanceStatus, Patient } from '@/types/patient';

interface PatientTableProps {
  readonly patients: readonly Patient[];
  readonly isLoading: boolean;
  readonly page: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly onPageChange: (page: number) => void;
  readonly canEdit: boolean;
}

const STATUS_CONFIG: Readonly<
  Record<
    AttendanceStatus,
    {
      label: string;
      variant: 'success' | 'destructive' | 'warning';
      icon: React.ComponentType<{ className?: string }>;
    }
  >
> = {
  frequenta: { label: 'Frequenta', variant: 'success', icon: CircleCheck },
  nao_frequenta: { label: 'Não frequenta', variant: 'destructive', icon: CircleX },
  pendente: { label: 'Pendente', variant: 'warning', icon: CircleAlert },
};

const LOCAL_OVERRIDES_KEY = 'frequenciaescolar.localOverrides';

function readLocalOverrides(): Record<string, AttendanceStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_OVERRIDES_KEY);
    return raw === null ? {} : (JSON.parse(raw) as Record<string, AttendanceStatus>);
  } catch {
    return {};
  }
}

function writeLocalOverrides(overrides: Record<string, AttendanceStatus>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function PatientTable({
  patients,
  isLoading,
  page,
  totalPages,
  totalItems,
  onPageChange,
  canEdit,
}: PatientTableProps): React.JSX.Element {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, AttendanceStatus>>(readLocalOverrides);

  const updateMutation = useMutation({
    mutationFn: async ({ patientId, status }: { patientId: string; status: AttendanceStatus }) => {
      if (!isConfigured()) return { patientId, status };
      return updatePatientAttendance(patientId, status);
    },
    onMutate: ({ patientId, status }) => {
      const previous = readLocalOverrides();
      const next = { ...previous, [patientId]: status };
      writeLocalOverrides(next);
      setOverrides(next);
      setPendingIds((prev) => new Set(prev).add(patientId));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context !== undefined) {
        writeLocalOverrides(context.previous);
        setOverrides(context.previous);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    onSettled: (_data, _error, variables) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.patientId);
        return next;
      });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-primary">Pacientes e frequência escolar</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Carregando registros...'
              : `${totalItems} registro(s) · página ${page} de ${totalPages}`}
          </CardDescription>
        </div>
        {canEdit && (
          <p className="text-xs text-muted-foreground">
            Marque <span className="font-medium text-foreground">SIM</span> ou{' '}
            <span className="font-medium text-foreground">NÃO</span> para cada paciente
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>CNS</TableHead>
              <TableHead>Unidade / Equipe</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Frequenta escola</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={`skeleton-${String(index)}`}>
                  {Array.from({ length: 5 }, (__, cellIndex) => (
                    <TableCell key={`cell-${String(cellIndex)}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Nenhum paciente encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => {
                const current = overrides[patient.id] ?? patient.attendanceStatus;
                const cfg = STATUS_CONFIG[current];
                const Icon = cfg.icon;
                const isSaving = pendingIds.has(patient.id);

                return (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{patient.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {patient.sex} · Nasc.: {patient.birthDate}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {patient.cns || '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-col">
                        <span className="line-clamp-1 text-muted-foreground">
                          {patient.healthUnit}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {patient.healthTeam} · Microárea {patient.microarea}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {patient.age || '—'}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <div className="flex items-center gap-1.5">
                          {(['pendente', 'frequenta', 'nao_frequenta'] as const).map((option) => {
                            const optionCfg = STATUS_CONFIG[option];
                            const OptionIcon = optionCfg.icon;
                            const isActive = current === option;
                            const label =
                              option === 'frequenta' ? 'SIM' : option === 'nao_frequenta' ? 'NÃO' : '—';

                            return (
                              <button
                                key={option}
                                type="button"
                                disabled={isSaving}
                                aria-pressed={isActive}
                                onClick={() => {
                                  if (!isActive) updateMutation.mutate({ patientId: patient.id, status: option });
                                }}
                                className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:scale-95 ${
                                  isActive
                                    ? option === 'frequenta'
                                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                                      : option === 'nao_frequenta'
                                        ? 'border-destructive bg-destructive text-white shadow-sm shadow-destructive/30'
                                        : 'border-amber-500 bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                                    : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:bg-accent hover:text-foreground'
                                } ${isSaving ? 'cursor-wait' : ''}`}
                              >
                                <OptionIcon className="h-3 w-3" aria-hidden="true" />
                                {label}
                              </button>
                            );
                          })}
                          {isSaving && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                          )}
                        </div>
                      ) : (
                        <Badge variant={cfg.variant}>
                          <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
                          {cfg.label}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Exibindo página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={isLoading || page <= 1} onClick={() => onPageChange(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={isLoading || page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
