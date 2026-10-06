import { AppHeader } from '@/components/layout/AppHeader';
import { SYSTEM_CREDIT } from '@/lib/utils';

interface AppShellProps {
  readonly children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Frequência Escolar — registro no prontuário da frequência escolar de pacientes em idade escolar</span>
          <span className="text-muted-foreground/70">Fonte: e-SUS APS · via PocketBase</span>
        </div>
        {/* Assinatura do desenvolvedor — selo discreto no rodapé */}
        <div className="border-t border-border/60 bg-muted/40">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-0.5 px-4 py-2.5 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary/80"
              title={SYSTEM_CREDIT}
            >
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-primary/60" />
              {SYSTEM_CREDIT}
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
              Atenção Primária · AP 53
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
