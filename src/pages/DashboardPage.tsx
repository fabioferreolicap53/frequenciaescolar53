import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MapPin, ShieldCheck } from 'lucide-react';

import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { PatientTable } from '@/components/dashboard/PatientTable';
import { SearchFilters } from '@/components/dashboard/SearchFilters';
import { AppShell } from '@/components/layout/AppShell';
import { useAttendanceSummary } from '@/hooks/useAttendanceSummary';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePatients } from '@/hooks/usePatients';
import type { AttendanceStatus } from '@/types/attendance';

type StatusFilterValue = AttendanceStatus | 'todos';

export function DashboardPage(): React.JSX.Element {
  const { isAdmin, isAuthenticated, unit, canViewAllUnits } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<StatusFilterValue>('todos');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Usuário com unidade ou administrador (todas as unidades) pode consultar.
  const canQuery = isAuthenticated && (unit !== null || canViewAllUnits);

  const summaryQuery = useAttendanceSummary(unit, canQuery);
  const patientsQuery = usePatients(
    {
      page,
      perPage: 10,
      search: debouncedSearch,
      status,
      unit,
    },
    canQuery,
  );

  const summary = summaryQuery.data;
  const pageData = patientsQuery.data;

  if (!canQuery) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <section aria-label="Cabeçalho da página" className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary">
              Painel de Frequência Escolar
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Acompanhe quais pacientes frequentam a escola e identifique casos que necessitam
              de intervenção da equipe de saúde. Marque <strong>SIM</strong> ou{' '}
              <strong>NÃO</strong> para cada paciente.
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary">
              {unit !== null ? (
                <>
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Exibindo apenas registros de: {unit}
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Administrador — exibindo registros de todas as unidades
                </>
              )}
            </p>
          </div>
        </section>

        <MetricsCards summary={summary} isLoading={summaryQuery.isPending} />

        <div className="flex flex-col gap-4">
          <SearchFilters
            search={searchInput}
            status={status}
            onSearchChange={(value) => {
              setSearchInput(value);
              setPage(1);
            }}
            onStatusChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />

          <PatientTable
            patients={pageData?.items ?? []}
            isLoading={patientsQuery.isPending || patientsQuery.isFetching}
            page={pageData?.page ?? page}
            totalPages={pageData?.totalPages ?? 1}
            totalItems={pageData?.totalItems ?? 0}
            onPageChange={setPage}
            canEdit={isAdmin}
          />
        </div>
      </div>
    </AppShell>
  );
}
