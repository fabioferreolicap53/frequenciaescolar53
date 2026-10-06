import { BookOpenCheck, GraduationCap, ShieldCheck, Users } from 'lucide-react';

import { SYSTEM_CREDIT } from '@/lib/utils';

interface AuthScreenProps {
  readonly subtitle: string;
  readonly children: React.ReactNode;
}

const HIGHLIGHTS = [
  { icon: Users, title: 'Prontuário em foco', text: 'Registre se o paciente em idade escolar frequenta a escola ou não.' },
  { icon: ShieldCheck, title: 'Acesso por unidade', text: 'Cada equipe enxerga e atualiza o que lhe compete.' },
  { icon: BookOpenCheck, title: 'Informação sempre atual', text: 'Marque SIM ou NÃO e mantenha o dado do prontuário em dia.' },
] as const;

/**
 * Moldura das telas de acesso (login, cadastro e vinculação de unidade).
 * Layout em duas colunas: painel de marca (desktop) + área do formulário.
 * Sem navbar nem rodapé do sistema.
 */
export function AuthScreen({ subtitle, children }: AuthScreenProps): React.JSX.Element {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca — visível apenas em telas grandes */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />
        <div
          aria-hidden="true"
          className="animate-auth-float pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary-foreground/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="animate-auth-float-slow pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-sky-400/25 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">Frequência Escolar</p>
            <p className="text-xs text-primary-foreground/70">Atenção Primária · AP 53</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Quem está na escola, a gente acompanha.
          </h1>
          <p className="mt-3 text-sm text-primary-foreground/75">
            Sistema para ajudar no registro, no prontuário, dos pacientes em idade escolar:
            registre se frequenta a escola ou não e mantenha essa informação sempre atualizada
            para a sua equipe.
          </p>

          <ul className="mt-9 flex flex-col gap-5">
            {HIGHLIGHTS.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <li key={highlight.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{highlight.title}</p>
                    <p className="text-xs text-primary-foreground/70">{highlight.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative z-10 flex flex-col gap-1">
          <p className="text-xs text-primary-foreground/60">{subtitle}</p>
          <p className="text-[11px] text-primary-foreground/45">{SYSTEM_CREDIT}</p>
        </div>
      </aside>

      {/* Área do formulário */}
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl"
        />

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6">
          {/* Marca compacta — visível apenas em telas pequenas */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-primary">
              Frequência Escolar
            </span>
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          </div>

          {children}

          {/* Assinatura do desenvolvedor — visível em todas as telas de acesso */}
          <p
            className="relative z-10 pt-1 text-center text-[11px] text-muted-foreground/70"
            title={SYSTEM_CREDIT}
          >
            {SYSTEM_CREDIT}
          </p>
        </div>
      </main>
    </div>
  );
}
