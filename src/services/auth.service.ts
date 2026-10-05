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
 * Cadastra um novo usuário em `frequenciaescolar_users` e envia o e-mail de
 * confirmação. NÃO autentica: o acesso só é liberado após o usuário clicar
 * no link de verificação (a collection exige `verified = true` no login).
 * A unidade é gravada uma única vez, no cadastro (validada pela API rule
 * `@request.body.role = "user"`).
 */
/** Traduz o erro de unicidade da unidade (índice único no servidor) em aviso claro. */
function unitTakenError(cause: unknown): Error {
  const data =
    typeof cause === 'object' && cause !== null && 'data' in cause
      ? (cause as { data?: Record<string, { code?: string } | undefined> }).data
      : undefined;

  if (data?.[UNIT_FIELD]?.code === 'validation_not_unique') {
    return new Error(
      'Esta unidade já tem um cadastro no sistema. Cada unidade admite apenas um usuário — escolha outra unidade ou entre em contato com o administrador da área.',
    );
  }

  if (data?.['email']?.code === 'email_already_used') {
    return new Error(
      'Este e-mail já está cadastrado no sistema. Use outro e-mail ou faça login com a senha existente.',
    );
  }

  if (data !== undefined && Object.keys(data).length > 0) {
    // Erro de validação de campo — mostra o campo e a mensagem traduzida.
    const firstField = Object.keys(data)[0] ?? '';
    const code = data[firstField]?.code ?? '';

    const messages: Readonly<Record<string, string>> = {
      validation_failed: 'Verifique os dados informados.',
      validation_is_required: 'Preencha todos os campos obrigatórios.',
      validation_invalid_email: 'O e-mail informado não é válido.',
      validation_min_length: 'A senha deve ter no mínimo 8 caracteres.',
      validation_invalid_password: 'A senha não atende aos requisitos mínimos.',
      validation_mismatch: 'As senhas não coincidem.',
    };

    const message = messages[code];

    if (message !== undefined) {
      return new Error(message);
    }

    // Mensagem genérica do servidor quando não há tradução específica.
    return new Error(
      'Não foi possível concluir o cadastro. Verifique os dados informados e tente novamente.',
    );
  }

  return new Error('Não foi possível concluir o cadastro. Tente novamente em instantes.');
}

export async function registerWithPassword(
  email: string,
  password: string,
  passwordConfirm: string,
  unit: UnitName,
): Promise<void> {
  try {
    await pb.collection(COLLECTIONS.users).create({
      email,
      password,
      passwordConfirm,
      role: 'user',
      [UNIT_FIELD]: unit,
    });
  } catch (cause) {
    throw unitTakenError(cause);
  }

  // O PocketBase NÃO envia e-mail de verificação no create.
  // É preciso disparar manualmente via endpoint `request-verification`
  // (obrigatoriamente application/x-www-form-urlencoded).
  try {
    await fetch(`${pb.baseURL}/api/collections/${COLLECTIONS.users}/request-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email }),
    });
  } catch {
    // Falha no envio não pode impedir o cadastro — o usuário já está criado.
  }
}

/**
 * Grava a unidade no próprio registro do usuário autenticado.
 * Usado apenas no fluxo de vinculação (contas antigas sem unidade).
 */
export async function updateUserUnit(userId: string, unit: UnitName): Promise<void> {
  let record;
  try {
    record = await pb.collection(COLLECTIONS.users).update(userId, { [UNIT_FIELD]: unit });
  } catch (cause) {
    throw unitTakenError(cause);
  }

  pb.authStore.save(pb.authStore.token, record);
  saveAuthStore({ token: pb.authStore.token, record });
}
