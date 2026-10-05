import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { UnitName } from '@/lib/units';
import { pb, restoreAuthStore } from '@/lib/pocketbase';
import {
  loginWithPassword as loginService,
  logout as logoutService,
  recordToAuthUser,
  registerWithPassword as registerService,
  updateUserUnit,
} from '@/services/auth.service';
import type { AuthUser, RegistrationInput } from '@/types/user';

interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly isAuthenticated: boolean;
  readonly isAdmin: boolean;
  /** Unidade do usuário — gravada no servidor durante o cadastro. */
  readonly unit: UnitName | null;
  /**
   * Usuário autenticado sem unidade vinculada.
   * Administradores não possuem unidade e enxergam todas as unidades.
   */
  readonly needsUnitSetup: boolean;
  /** Admin: acesso irrestrito a todos os registros. */
  readonly canViewAllUnits: boolean;
  readonly login: (email: string, password: string) => Promise<void>;
  readonly register: (input: RegistrationInput) => Promise<void>;
  readonly setUnit: (unit: UnitName) => Promise<void>;
  readonly logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Lê a sessão persistida de forma síncrona (executada antes do 1º render),
 * evitando o redirect indevido para /login ao recarregar a página (F5).
 */
function readInitialUser(): AuthUser | null {
  restoreAuthStore();

  if (pb.authStore.isValid && pb.authStore.record !== null) {
    return recordToAuthUser(pb.authStore.record);
  }

  return null;
}

export function AuthProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(readInitialUser);

  useEffect(() => {
    // Mantém o estado em sincronia quando o SDK limpa/renova a sessão.
    return pb.authStore.onChange(() => {
      if (pb.authStore.isValid && pb.authStore.record !== null) {
        setUser(recordToAuthUser(pb.authStore.record));
        return;
      }

      setUser(null);
    });
  }, []);

  const setUnit = useCallback(
    async (nextUnit: UnitName): Promise<void> => {
      if (user === null) {
        return;
      }

      await updateUserUnit(user.id, nextUnit);
      setUser({ ...user, unit: nextUnit });
    },
    [user],
  );

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const session = await loginService(email, password);
    setUser(session.record);
  }, []);

  const register = useCallback(async (input: RegistrationInput): Promise<void> => {
    // Cria a conta e dispara o e-mail de confirmação — sem autenticar.
    // O login só passa depois que o usuário confirmar o e-mail.
    await registerService(input.email, input.password, input.passwordConfirm, input.unit);
  }, []);

  const logout = useCallback((): void => {
    logoutService();
    setUser(null);
  }, []);

  const unit = user?.unit ?? null;
  const canViewAllUnits = user?.role === 'admin';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'admin',
      unit,
      needsUnitSetup: user !== null && unit === null && !canViewAllUnits,
      canViewAllUnits,
      login,
      register,
      setUnit,
      logout,
    }),
    [user, unit, canViewAllUnits, login, register, setUnit, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }

  return context;
}
