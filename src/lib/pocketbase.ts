import PocketBase, { type BaseModel, type RecordModel } from 'pocketbase';

export const pb = new PocketBase(import.meta.env['VITE_POCKETBASE_URL'] ?? 'http://127.0.0.1:8090');

// Cancelamento automático desabilitado para não invalidar consultas em paralelo.
pb.autoCancellation(false);

export const COLLECTIONS = {
  pacientes: 'frequenciaescolar_pacientes',
  users: 'frequenciaescolar_users',
  /**
   * View pública de ocupação das unidades (1 cadastro por unidade).
   * Projeta apenas `unidade` de `frequenciaescolar_users` — por ser uma
   * view sobre a coleção de usuários, fica sempre sincronizada.
   */
  unidadesOcupadas: 'frequenciaescolar_unidades_ocupadas',
} as const;

export function isConfigured(): boolean {
  return import.meta.env['VITE_POCKETBASE_URL'] !== undefined;
}

/**
 * Sessão persistida no localStorage.
 * Em desenvolvimento o SDK não grava no localStorage, então a sessão
 * é gerenciada manualmente para sobreviver ao reload do Vite.
 */
const AUTH_STORAGE_KEY = 'frequenciaescolar.auth';

interface StoredAuth {
  readonly token: string;
  readonly record: BaseModel;
}

export function readAuthStore(): StoredAuth | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const { token, record } = parsed as { token?: unknown; record?: unknown };

    if (typeof token !== 'string' || typeof record !== 'object' || record === null) {
      return null;
    }

    return { token, record: record as BaseModel };
  } catch {
    return null;
  }
}

export function saveAuthStore(data: StoredAuth): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function clearAuthStore(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Restaura a sessão do localStorage no authStore do SDK.
 * Chamado uma vez na inicialização da aplicação.
 */
export function restoreAuthStore(): void {
  const data = readAuthStore();

  if (data !== null) {
    pb.authStore.save(data.token, data.record as unknown as RecordModel);
  }
}
