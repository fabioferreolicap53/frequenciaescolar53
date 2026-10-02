import { Navigate } from 'react-router-dom';

import { SignUpCard } from '@/components/auth/SignUpCard';
import { useAuth } from '@/hooks/useAuth';

export function CadastroPage(): React.JSX.Element {
  const { isAuthenticated, unit } = useAuth();

  if (isAuthenticated && unit !== null) {
    return <Navigate to="/" replace />;
  }

  // Tela de cadastro isolada — sem navbar nem rodapé do sistema.
  return <SignUpCard />;
}
