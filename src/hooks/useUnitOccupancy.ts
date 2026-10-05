import { useQuery } from '@tanstack/react-query';

import type { UnitName } from '@/lib/units';
import { fetchUnitOccupancy } from '@/services/units.service';

/**
 * Mapa de ocupação das unidades (público — usado na tela de cadastro).
 * `null` no dado = API indisponível → UI mostra estado de "indisponível".
 */
export function useUnitOccupancy(): {
  readonly data: ReadonlyMap<UnitName, boolean> | null | undefined;
  readonly isPending: boolean;
} {
  const query = useQuery({
    queryKey: ['unidades', 'ocupacao'],
    queryFn: fetchUnitOccupancy,
    staleTime: 60_000,
  });

  return { data: query.data, isPending: query.isPending };
}
