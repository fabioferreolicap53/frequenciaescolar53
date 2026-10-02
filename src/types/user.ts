import type { UnitName } from '@/lib/units';

export type UserRole = 'admin' | 'user';

/**
 * Dados do cadastro de um novo usuário.
 * A unidade é escolhida somente neste momento e fica vinculada ao usuário.
 */
export interface RegistrationInput {
  readonly email: string;
  readonly password: string;
  readonly passwordConfirm: string;
  readonly unit: UnitName;
}

/**
 * Usuário autenticado da coleção `frequenciaescolar_users`.
 */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly verified: boolean;
  readonly role: UserRole;
  /** Unidade vinculada ao usuário — gravada no cadastro. */
  readonly unit: UnitName | null;
}

/**
 * Sessão autenticada persistida no authStore do PocketBase.
 */
export interface AuthSession {
  readonly token: string;
  readonly record: AuthUser;
}
