import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import { fetchPatients } from '@/services/patients.service';
import { buildMockPatients } from '@/services/mock-data';
import type { PagedResult, Patient, PatientFilters } from '@/types/patient';
import { serializeColumnFilters } from '@/types/patient';

const PER_PAGE = 10;

/**
 * Lista paginada de pacientes da unidade do usuário autenticado.
 * `enabled` controla o disparo: usuário com unidade ou administrador (todas).
 * Em desenvolvimento, usa dados de demonstração quando o PocketBase
 * não está acessível para permitir visualização imediata do painel.
 */
export function usePatients(
  filters: PatientFilters,
  enabled: boolean,
): UseQueryResult<PagedResult<Patient>> {
  return useQuery({
    queryKey: queryKeys.dashboard.attendance({
      page: filters.page,
      search: filters.search,
      status: filters.status,
      unit: filters.unit ?? 'todas',
      sortField: filters.sortField,
      sortDir: filters.sortDir,
      columnFilters: serializeColumnFilters(filters.columnFilters),
    }),
    enabled,
    queryFn: async () => {
      const effectiveFilters: PatientFilters = { ...filters, perPage: PER_PAGE };

      if (!import.meta.env.DEV) {
        return fetchPatients(effectiveFilters);
      }

      try {
        return await fetchPatients(effectiveFilters);
      } catch (error) {
        console.warn('[usePatients] PocketBase indisponível — usando dados de demonstração.', error);
        return buildMockPatients(effectiveFilters);
      }
    },
    placeholderData: (previousData) => previousData,
  });
}
