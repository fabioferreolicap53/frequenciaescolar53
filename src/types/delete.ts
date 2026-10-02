/** Etapa atual da execução da exclusão total. */
export type DeleteStage = 'auth' | 'rebuild' | 'delete';

/** Camada que efetivamente removeu os registros. */
export type DeleteMethod = 'rebuild' | 'batch';

/**
 * Sinal de controle do fluxo assíncrono (mutável por {@link useRef}).
 * Não é estado React — permite pausar/interromper no meio do loop de lotes.
 */
export interface DeleteControl {
  paused: boolean;
  cancelled: boolean;
}

/** Progresso parcial reportado a cada lote / troca de etapa. */
export interface DeleteProgress {
  readonly stage: DeleteStage;
  readonly removed: number;
  readonly total: number;
  readonly batches: number;
  readonly failures: number;
}

/** Resultado final da exclusão. */
export interface DeleteReport {
  readonly removed: number;
  readonly total: number;
  readonly elapsedSec: number;
  readonly cancelled: boolean;
  readonly method: DeleteMethod;
  readonly finalCount: number;
}
