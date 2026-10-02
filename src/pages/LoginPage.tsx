import { Navigate } from 'react-router-dom';

import { LoginCard } from '@/components/auth/LoginCard';
import { UnitSetupCard } from '@/components/auth/UnitSetupCard';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage(): React.JSX.Element {
  const { isAuthenticated, unit, needsUnitSetup } = useAuth();

  if (isAuthenticated && unit !== null) {
    return <Navigate to="/" replace />;
  }

  // Sessão ativa sem unidade vinculada → etapa única de configuração.
  if (needsUnitSetup) {
    return <UnitSetupCard />;
  }

  // Tela de acesso isolada — sem navbar nem rodapé do sistema.
  return <LoginCard />;
}
