import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Loader2, LogOut, MapPin } from 'lucide-react';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitPicker } from '@/components/units/UnitPicker';
import { useAuth } from '@/hooks/useAuth';
import type { UnitName } from '@/lib/units';

/**
 * Etapa única de definição da unidade.
 * Exibida apenas quando o usuário autenticado ainda não tem unidade vinculada
 * (ex.: cadastro feito fora deste fluxo). Depois disso, nunca mais é solicitada.
 */
export function UnitSetupCard(): React.JSX.Element {
  const { setUnit, user, logout } = useAuth();
  const navigate = useNavigate();
  const [unit, setPickedUnit] = useState<UnitName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (unit === null) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await setUnit(unit);
      navigate('/');
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message !== ''
          ? cause.message
          : 'Não foi possível vincular a unidade. Tente novamente.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthScreen subtitle="Configuração inicial · AP 53">
      <Card className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border-border/70 shadow-xl shadow-primary/5">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary-foreground/10">
            <Building2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <CardTitle className="text-2xl text-primary">Vincular sua unidade</CardTitle>
          <CardDescription>
            {user !== null ? `${user.email} — ` : ''}
            defina uma única vez a unidade que você irá acompanhar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Unidade de atuação
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  vinculada ao seu usuário
                </span>
              </div>
              <UnitPicker value={unit} onChange={setPickedUnit} />
            </div>

            {error !== null && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={unit === null || isLoading}
              className="mt-1 h-10 w-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20 transition-all hover:to-primary/70"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              {isLoading ? 'Vinculando...' : 'Confirmar unidade'}
            </Button>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair da conta
            </button>
          </form>
        </CardContent>
      </Card>
    </AuthScreen>
  );
}
