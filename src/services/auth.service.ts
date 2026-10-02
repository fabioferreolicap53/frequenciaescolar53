import type { BaseModel } from 'pocketbase';

import { COLLECTIONS, pb, saveAuthStore, clearAuthStore } from '@/lib/pocketbase';
import { isUnit, type UnitName } from '@/lib/units';
import type { AuthSession, AuthUser, UserRole } from '@/types/user';

const UNIT_FIELD = 'unidade';

function toUserRole(value: unknown): UserRole {
  return value === 'admin' ? 'admin' : 'user';
}

function toUnit(value: unknown): UnitName | null {
  return isUnit(value) ? value : null;
}

export function recordToAuthUser(record: BaseModel): AuthUser {
  const data = record as unknown as Record<string, unknown>;

  return {
    id: record.id,
    email: typeof data['email'] === 'string' ? data['email'] : '',
    verified: data['verified'] === true,
    role: toUserRole(data['role']),
    unit: toUnit(data[UNIT_FIELD]),
  };
}

/**
 * Autentica o usuário na coleção `frequenciaescolar_users`.
 * A sessão é persistida manualmente no localStorage para sobreviver
 * ao reload em desenvolvimento.
 */
export async function loginWithPassword(email: string, password: string): Promise<AuthSession> {
  const authData = await pb.collection(COLLECTIONS.users).authWithPassword(email, password);
  const user = recordToAuthUser(authData.record);

  const session: AuthSession = {
    token: pb.authStore.token,
    record: user,
  };

  saveAuthStore({ token: session.token, record: authData.record });

  return session;
}

export function logout(): void {
  pb.authStore.clear();
  clearAuthStore();
}

/**
 * Cadastra um novo usuário em `frequenciaescolar_users` e já o autentica.
 * A unidade é gravada uma única vez, no cadastro (validada pela API rule
 * `@request.body.role = "user"`).
 */
export async function registerWithPassword(
  email: string,
  password: string,
  passwordConfirm: string,
  unit: UnitName,
): Promise<AuthSession> {
  await pb.collection(COLLECTIONS.users).create({
    email,
    password,
    passwordConfirm,
    role: 'user',
    [UNIT_FIELD]: unit,
  });

  return loginWithPassword(email, password);
}

/**
 * Grava a unidade no próprio registro do usuário autenticado.
 * Usado apenas no fluxo de vinculação (contas antigas sem unidade).
 */
export async function updateUserUnit(userId: string, unit: UnitName): Promise<void> {
  const record = await pb.collection(COLLECTIONS.users).update(userId, { [UNIT_FIELD]: unit });

  pb.authStore.save(pb.authStore.token, record);
  saveAuthStore({ token: pb.authStore.token, record });
}
