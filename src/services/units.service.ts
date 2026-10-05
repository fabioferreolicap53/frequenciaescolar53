import { COLLECTIONS, pb } from '@/lib/pocketbase';
import { UNITS, type UnitName } from '@/lib/units';

/**
 * Mapa de ocupação: unidade → verdadeiro se já existe usuário cadastrado.
 * Lê a collection pública `frequenciaescolar_unidades_status` (listRule
 * aberta) — a collection de usuários não é listável sem autenticação.
 * Se a API negar ou falhar, devolve `null` — a UI mostra o mapa como
 * "indisponível" em vez de bloquear o cadastro.
 */
export async function fetchUnitOccupancy(): Promise<ReadonlyMap<UnitName, boolean> | null> {
  try {
    const result = await pb
      .collection(COLLECTIONS.unidadesStatus)
      .getFullList({ fields: 'unidade,status', requestKey: 'unidades-ocupacao' });

    const occupied = new Map<UnitName, boolean>();

    for (const unit of UNITS) {
      occupied.set(unit, false);
    }

    for (const record of result) {
      const data = record as unknown as Record<string, unknown>;
      const unit = data['unidade'];
      const status = data['status'];

      if (typeof unit === 'string' && status === true) {
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

/**
 * Marca a unidade como ocupada (status=true) após a criação da conta.
 * Atualiza o registro existente ou cria um novo. Falha aqui não impede
 * o acesso — o índice único no servidor continua sendo a proteção real.
 */
export async function markUnitOccupied(unit: UnitName): Promise<void> {
  const service = pb.collection(COLLECTIONS.unidadesStatus);

  try {
    const record = await service.getFirstListItem(`unidade = "${unit.replace(/"/g, '\\"')}"`, {
      requestKey: `unidades-marcar-${unit}`,
    });
    await service.update(record.id, { status: true });
    return;
  } catch {
    // Registro não existe ainda — cria abaixo.
  }

  try {
    await service.create({ unidade: unit, status: true });
  } catch (error) {
    console.warn('[units.service] Falha ao marcar unidade como ocupada.', error);
  }
}
