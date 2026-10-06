import { useEffect } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { CsvImportCard } from '@/components/import/CsvImportCard';
import { ImportHistoryTable } from '@/components/import/ImportHistoryTable';
import { TemplateDownloadCard } from '@/components/import/TemplateDownloadCard';
import { AppShell } from '@/components/layout/AppShell';
import { DeleteDatabaseCard } from '@/components/settings/DeleteDatabaseCard';
import { useAuth } from '@/hooks/useAuth';
import { useImportPacientes } from '@/hooks/useImportPacientes';
import { SYSTEM_CREDIT } from '@/lib/utils';

export function ConfiguracoesPage(): React.JSX.Element {
  const { isAuthenticated, isAdmin } = useAuth();
  const { history, refreshHistory, removeHistoryEntry, clearHistory } = useImportPacientes();

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <section aria-label="Cabeçalho da página">
          <NavLink
            to="/"
            className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar ao painel
          </NavLink>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-primary">Configurações</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Importe a base de pacientes via CSV. O campo{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">FREQUENTA_ESCOLA</code> nasce em
            branco no PocketBase e será preenchido no painel com <strong>SIM</strong> ou{' '}
            <strong>NÃO</strong>.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3 [&>*]:h-full">
            <CsvImportCard />
          </div>
          <div className="xl:col-span-2 [&>*]:h-full">
            <TemplateDownloadCard />
          </div>
          <div className="xl:col-span-3 [&>*]:h-full">
            <ImportHistoryTable
              history={history}
              onRemove={removeHistoryEntry}
              onClear={clearHistory}
            />
          </div>
          <div className="xl:col-span-2 [&>*]:h-full">
            <DeleteDatabaseCard />
          </div>
        </div>

        {/* Assinatura técnica — crédito do desenvolvedor */}
        <section
          aria-label="Sobre o sistema"
          className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Sobre o sistema</p>
            <p className="text-xs text-muted-foreground">
              Painel de registro, no prontuário, da frequência escolar de pacientes em idade
              escolar — Atenção Primária da AP 53.
            </p>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary/85"
            title={SYSTEM_CREDIT}
          >
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-primary/60" />
            {SYSTEM_CREDIT}
          </span>
        </section>
      </div>
    </AppShell>
  );
}
