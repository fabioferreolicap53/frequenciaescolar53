import { COLLECTIONS, pb } from '@/lib/pocketbase';
import { UNITS, type UnitName } from '@/lib/units';

/**
 * Mapa de ocupação: unidade → verdadeiro se já existe usuário cadastrado.
 * Consulta a coleção de usuários sem autenticação (listRule pública).
 * Se a API negar ou falhar, devolve `null` — a UI mostra o mapa como
 * "indisponível" em vez de bloquear o cadastro.
 */
export async function fetchUnitOccupancy(): Promise<ReadonlyMap<UnitName, boolean> | null> {
  try {
    const result = await pb
      .collection(COLLECTIONS.users)
      .getFullList({ fields: 'unidade', requestKey: 'unidades-ocupacao' });

    const occupied = new Map<UnitName, boolean>();

    for (const unit of UNITS) {
      occupied.set(unit, false);
    }

    for (const record of result) {
      const value = (record as unknown as Record<string, unknown>)['unidade'];
      if (typeof value === 'string') {
        // Valores fora da lista oficial (contas antigas) são ignorados no mapa.
        const match = UNITS.find((unit) => unit === value);
        if (match !== undefined) {
          occupied.set(match, true);
        }
      }
    }

    return occupied;
  } catch (error) {
    console.warn('[units.service] Mapa de ocupação indisponível.', error);
    return null;
  }
}
