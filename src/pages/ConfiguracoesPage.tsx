import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

import { CsvImportCard } from '@/components/import/CsvImportCard';
import { ImportHistoryTable } from '@/components/import/ImportHistoryTable';
import { TemplateDownloadCard } from '@/components/import/TemplateDownloadCard';
import { AppShell } from '@/components/layout/AppShell';
import { DeleteDatabaseCard } from '@/components/settings/DeleteDatabaseCard';
import { useAuth } from '@/hooks/useAuth';
import { useImportPacientes } from '@/hooks/useImportPacientes';

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
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Configurações</h1>
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
      </div>
    </AppShell>
  );
}
