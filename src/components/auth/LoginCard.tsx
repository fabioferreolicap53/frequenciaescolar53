import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

/**
 * Tela de acesso padrão: apenas e-mail e senha.
 * A unidade é definida uma única vez, no cadastro.
 */
export function LoginCard(): React.JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (cause) {
      // authRule "verified = true" violada → PocketBase responde 403.
      // Credenciais inválidas / e-mail inexistente → 400.
      const status = typeof cause === 'object' && cause !== null && 'status' in cause
        ? Number((cause as { status: unknown }).status)
        : 0;

      if (status === 403) {
        setError(
          'Seu e-mail ainda não foi confirmado. Acesse a caixa de entrada (ou spam) do e-mail cadastrado e clique no botão "Confirmar meu e-mail" da mensagem enviada pelo sistema — só depois disso você poderá entrar.',
        );
      } else if (status === 400) {
        setError('E-mail ou senha incorretos. Verifique os dados e tente novamente.');
      } else {
        setError(
          cause instanceof Error && cause.message !== ''
            ? cause.message
            : 'Falha na autenticação. Verifique suas credenciais.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthScreen subtitle="Acesso restrito · AP 53">
      <Card className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border-border/70 shadow-xl shadow-primary/5">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary-foreground/10">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <CardTitle className="text-2xl text-primary">Acesso ao sistema</CardTitle>
          <CardDescription>
            Informe seu e-mail e senha para entrar. Sistema para ajudar no registro, no prontuário,
            da frequência escolar de pacientes em idade escolar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-sm font-medium">
                E-mail
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@exemplo.com"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium">
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-10 pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error !== null && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-1 h-10 w-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20 transition-all hover:to-primary/70"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              )}
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="flex flex-col items-center gap-1 border-t border-border pt-4 text-center">
              <span className="text-xs text-muted-foreground">Primeiro acesso?</span>
              <Link
                to="/cadastro"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Cadastrar usuário e unidade
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthScreen>
  );
}
