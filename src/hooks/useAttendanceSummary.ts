import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import type { UnitName } from '@/lib/units';
import { fetchAttendanceSummary } from '@/services/patients.service';
import { buildMockSummary } from '@/services/mock-data';
import type { AttendanceSummary } from '@/types/attendance';

/**
 * Resumo de métricas do painel, restrito à unidade do usuário
 * (administrador sem unidade enxerga todas).
 * Em desenvolvimento, usa dados de demonstração quando o PocketBase
 * não está acessível para permitir visualização imediata do painel.
 */
export function useAttendanceSummary(
  unit: UnitName | null,
  enabled: boolean,
): UseQueryResult<AttendanceSummary> {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(unit ?? 'todas'),
    enabled,
    queryFn: async () => {
      if (!import.meta.env.DEV) {
        return fetchAttendanceSummary(unit);
      }

      try {
        return await fetchAttendanceSummary(unit);
      } catch (error) {
        console.warn(
          '[useAttendanceSummary] PocketBase indisponível — usando dados de demonstração.',
          error,
        );
        return buildMockSummary(unit);
      }
    },
    staleTime: 2 * 60_000,
  });
}
