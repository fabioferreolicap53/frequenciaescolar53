import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { UnitStatusMap } from '@/components/auth/UnitStatusMap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UnitPicker } from '@/components/units/UnitPicker';
import { useAuth } from '@/hooks/useAuth';
import { markUnitOccupied } from '@/services/units.service';
import type { UnitName } from '@/lib/units';

/**
 * Cadastro de usuário: e-mail, senha e a unidade de atuação.
 * A unidade só é escolhida aqui e fica vinculada ao usuário.
 */
export function SignUpCard(): React.JSX.Element {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [unit, setUnit] = useState<UnitName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  /** E-mail confirmado no envio — mostra a tela de "confirme seu e-mail". */
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (unit === null) {
      setError('Selecione a unidade de atuação para concluir o cadastro.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      await register({ email: email.trim(), password, passwordConfirm, unit });
      // Atualiza o mapa de ocupação (fire-and-forget: não bloqueia o fluxo).
      void markUnitOccupied(unit);
      // Não loga: o acesso só é liberado após clicar no link do e-mail.
      setRegisteredEmail(email.trim());
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message !== ''
          ? cause.message
          : 'Não foi possível concluir o cadastro. Verifique os dados e tente novamente.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Cadastro criado — instrução clara de confirmação pelo e-mail.
  if (registeredEmail !== null) {
    return (
      <AuthScreen subtitle="Cadastro de usuário · AP 53">
        <Card className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border-border/70 shadow-xl shadow-primary/5">
          <CardHeader className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10">
              <MailCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <CardTitle className="text-2xl text-emerald-700">Confirme seu e-mail</CardTitle>
            <CardDescription>
              Cadastro criado com sucesso. Falta só um passo para ativar o acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900">
              Enviamos um e-mail de confirmação para{' '}
              <strong className="break-all">{registeredEmail}</strong>.{' '}
              <strong>
                Clique no botão contido nesse e-mail para ativar o cadastro
              </strong>{' '}
              — só depois disso você poderá entrar no sistema.
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Não recebeu? Espere alguns minutos e verifique a caixa de <strong>spam</strong>.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={() => navigate('/login')}
                className="h-10 w-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Já confirmei — ir para o login
              </Button>
              <Link
                to="/cadastro"
                onClick={() => setRegisteredEmail(null)}
                className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Fazer outro cadastro
              </Link>
            </div>
          </CardContent>
        </Card>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen subtitle="Cadastro de usuário · AP 53">
      <Card className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border-border/70 shadow-xl shadow-primary/5">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary-foreground/10">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <CardTitle className="text-2xl text-primary">Criar acesso</CardTitle>
          <CardDescription>
            Defina suas credenciais e a unidade que você irá acompanhar. Este sistema ajuda no
            registro, no prontuário, da frequência escolar dos pacientes em idade escolar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-email" className="text-sm font-medium">
                E-mail
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="signup-email"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="signup-password" className="text-sm font-medium">
                  Senha
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
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

              <div className="flex flex-col gap-1.5">
                <label htmlFor="signup-password-confirm" className="text-sm font-medium">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="signup-password-confirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    placeholder="Repita a senha"
                    className="h-10 pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm((current) => !current)}
                    aria-label={showPasswordConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPasswordConfirm ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3.5">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  Unidade de atuação
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    definida no cadastro
                  </span>
                </div>
                <UnitPicker value={unit} onChange={setUnit} />
              </div>

              {/* Mapa de ocupação: quais unidades já têm cadastro / estão livres */}
              <UnitStatusMap selectedUnit={unit} onSelect={setUnit} />
            </div>

            {error !== null && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading || unit === null}
              className="mt-1 h-10 w-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20 transition-all hover:to-primary/70"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              )}
              {isLoading ? 'Cadastrando...' : 'Criar acesso'}
            </Button>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Já tenho acesso — entrar
            </Link>
          </form>
        </CardContent>
      </Card>
    </AuthScreen>
  );
}
