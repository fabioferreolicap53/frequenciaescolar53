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
import type { PatientColumnFilter, PatientColumnFilters, PatientSortField, SortDir } from '@/types/patient';
import { createEmptyColumnFilters } from '@/types/patient';

type StatusFilterValue = AttendanceStatus | 'todos';

export function DashboardPage(): React.JSX.Element {
  const { isAuthenticated, unit, canViewAllUnits } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<StatusFilterValue>('todos');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<PatientSortField>('paciente');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [columnFilters, setColumnFilters] = useState<PatientColumnFilters>(createEmptyColumnFilters);

  const debouncedSearch = useDebouncedValue(searchInput, 300);
  // Digitação instantânea na UI; consulta dispara com atraso para não sobrecarregar a VM.
  const debouncedColumnFilters = useDebouncedValue(columnFilters, 400);

  // doc_ordenacao_tabelas.md §3 — mesma coluna inverte direção, outra coluna começa ascendente.
  const handleSort = (field: PatientSortField): void => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleColumnFilterChange = (field: PatientSortField, value: PatientColumnFilter): void => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const handleClearColumnFilters = (): void => {
    setColumnFilters(createEmptyColumnFilters());
    setPage(1);
  };

  // Cartões da métrica funcionam como filtro: clicar de novo volta para "todos".
  const handleStatusSelect = (value: StatusFilterValue): void => {
    setStatus((prev) => (value === 'todos' || prev === value ? 'todos' : value));
    setPage(1);
  };

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
      sortField,
      sortDir,
      columnFilters: debouncedColumnFilters,
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
        <section aria-label="Cabeçalho da página" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-7 w-1.5 rounded-full bg-gradient-to-b from-primary to-primary/40" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Visão geral · Atenção Primária AP 53
            </span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">
                Painel de Frequência Escolar
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Acompanhe quais pacientes frequentam a escola e identifique casos que necessitam
                de intervenção da equipe de saúde. Marque <strong className="font-semibold text-foreground">SIM</strong> ou{' '}
                <strong className="font-semibold text-foreground">NÃO</strong> para cada paciente.
              </p>
            </div>

            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
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

        <MetricsCards
          summary={summary}
          isLoading={summaryQuery.isPending}
          status={status}
          onStatusSelect={handleStatusSelect}
        />

        <div className="flex flex-col gap-4">
          <SearchFilters
            search={searchInput}
            onSearchChange={(value) => {
              setSearchInput(value);
              setPage(1);
            }}
          />

          <PatientTable
            patients={pageData?.items ?? []}
            isLoading={patientsQuery.isPending}
            page={pageData?.page ?? page}
            totalPages={pageData?.totalPages ?? 1}
            totalItems={pageData?.totalItems ?? 0}
            onPageChange={setPage}
            canEdit={canQuery}
            sortField={sortField}
            sortDir={sortDir}
            onSortChange={handleSort}
            columnFilters={columnFilters}
            onColumnFilterChange={handleColumnFilterChange}
            onClearColumnFilters={handleClearColumnFilters}
          />
        </div>
      </div>
    </AppShell>
  );
}
