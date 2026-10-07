import { COLLECTIONS, pb } from '@/lib/pocketbase';
import { UNITS, type UnitName } from '@/lib/units';

/**
 * Mapa de ocupação: unidade → verdadeiro se já existe usuário cadastrado.
 *
 * Lê a view pública `frequenciaescolar_unidades_ocupadas`, que projeta apenas
 * o campo `unidade` de `frequenciaescolar_users`. Por ser uma view sobre a
 * própria coleção de usuários, o mapa fica sempre sincronizado com a fonte da
 * verdade — não há cópia paralela que possa desatualizar.
 *
 * A coleção de usuários não é listável sem autenticação; a view expõe somente
 * os nomes de unidade (nenhum dado pessoal).
 *
 * Se a API falhar, devolve `null` — a UI mostra o mapa como "indisponível"
 * em vez de bloquear o cadastro.
 */
export async function fetchUnitOccupancy(): Promise<ReadonlyMap<UnitName, boolean> | null> {
  try {
    const result = await pb
      .collection(COLLECTIONS.unidadesOcupadas)
      .getFullList({ fields: 'unidade', requestKey: 'unidades-ocupacao' });

    const occupied = new Map<UnitName, boolean>();

    for (const unit of UNITS) {
      occupied.set(unit, false);
    }

    for (const record of result) {
      const data = record as unknown as Record<string, unknown>;
      const unit = data['unidade'];

      if (typeof unit === 'string') {
        // Valores fora da lista oficial são ignorados no mapa.
        const match = UNITS.find((candidate) => candidate === unit);
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
