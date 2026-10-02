import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eraser, FileCheck2, History, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDuration } from '@/lib/utils';
import type { ImportHistoryEntry } from '@/types/import';

interface ImportHistoryTableProps {
  readonly history: readonly ImportHistoryEntry[];
  readonly onRemove: (id: string) => void;
  readonly onClear: () => void;
}

function formatDateTime(value: string): string {
  try {
    return format(new Date(value), 'dd/MM/yy HH:mm', { locale: ptBR });
  } catch {
    return value;
  }
}

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function ImportHistoryTable({
  history,
  onRemove,
  onClear,
}: ImportHistoryTableProps): React.JSX.Element {
  const isEmpty = history.length === 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-6 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold text-primary">
            Histórico de importações
          </CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={isEmpty}
          aria-label="Limpar todo o histórico de importações"
          className="text-muted-foreground hover:text-destructive"
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
          Limpar
        </Button>
      </CardHeader>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[25%] px-2 text-center">Arquivo</TableHead>
            <TableHead className="w-[12%] px-2 text-center">Regs.</TableHead>
            <TableHead className="w-[10%] px-2 text-center">Falhas</TableHead>
            <TableHead className="w-[14%] px-2 text-center">Duração</TableHead>
            <TableHead className="w-[16%] px-2 text-center">Status</TableHead>
            <TableHead className="w-[15%] px-2 text-center">Data</TableHead>
            <TableHead className="w-[8%] px-2 text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell colSpan={7} className="h-20 px-2 text-center text-muted-foreground">
                Nenhuma importação registrada ainda.
              </TableCell>
            </TableRow>
          ) : (
            history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="px-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <FileCheck2
                      className="h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate font-medium" title={entry.fileName}>
                      {entry.fileName}
                    </span>
                  </div>
                  {entry.cleared && (
                    <span className="mt-1 inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700">
                      Substituiu base
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-2 text-center text-muted-foreground">
                  {formatCount(entry.created)}
                </TableCell>
                <TableCell
                  className={`px-2 text-center ${
                    entry.errors > 0 ? 'font-medium text-rose-600' : 'text-muted-foreground'
                  }`}
                >
                  {String(entry.errors)}
                </TableCell>
                <TableCell className="px-2 text-center text-muted-foreground">
                  {formatDuration(entry.elapsedSec)}
                </TableCell>
                <TableCell className="px-2 text-center">
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      entry.cancelled
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {entry.cancelled ? 'Interrompida' : 'Concluída'}
                  </span>
                </TableCell>
                <TableCell className="px-2 text-center text-xs text-muted-foreground">
                  {formatDateTime(entry.at)}
                </TableCell>
                <TableCell className="px-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onRemove(entry.id);
                    }}
                    aria-label={`Excluir registro da importação ${entry.fileName}`}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
