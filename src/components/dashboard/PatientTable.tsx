import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleX,
  Download,
  Eraser,
  ListFilter,
  Loader2,
  Minus,
  Plus,
  Printer,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { readLocalOverrides, writeLocalOverrides } from '@/lib/attendance-overrides';
import { isConfigured } from '@/lib/pocketbase';
import { queryClient, queryKeys } from '@/lib/query-client';
import {
  buildCsvContent,
  buildPrintDocument,
  buildTableFileName,
  buildTableRows,
  downloadTextFile,
  printDocument,
} from '@/lib/table-export';
import { updatePatientAttendance } from '@/services/patients.service';
import type { UnitName } from '@/lib/units';
import type {
  AttendanceStatus,
  PagedResult,
  Patient,
  PatientColumnFilter,
  PatientColumnFilters,
  PatientSortField,
  SortDir,
} from '@/types/patient';
import { countColumnFilter, PATIENT_COLUMNS } from '@/types/patient';

/** Colunas na ordem exata da tabela — usadas nos cabeçalhos e na linha de filtros. */
const COLUMNS: readonly {
  readonly field: PatientSortField;
  readonly label: string;
  readonly centered?: boolean;
}[] = [
  { field: 'paciente', label: 'Paciente' },
  { field: 'unidade', label: 'Unidade' },
  { field: 'equipe', label: 'Equipe' },
  { field: 'microarea', label: 'Microárea' },
  { field: 'frequenta', label: 'Frequenta escola', centered: true },
];

/**
 * Abrevia o nome da unidade para exibição compacta:
 * remove o prefixo "SMS " e o sufixo " AP 53" (o título mantém o nome completo).
 */
function abbrevUnit(unit: string): string {
  return unit.replace(/^SMS\s+/i, '').replace(/\s+AP\s+\d+$/i, '');
}

interface PatientTableProps {
  readonly patients: readonly Patient[];
  readonly isLoading: boolean;
  readonly page: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly onPageChange: (page: number) => void;
  readonly canEdit: boolean;
  readonly sortField: PatientSortField;
  readonly sortDir: SortDir;
  readonly onSortChange: (field: PatientSortField) => void;
  readonly columnFilters: PatientColumnFilters;
  readonly onColumnFilterChange: (field: PatientSortField, value: PatientColumnFilter) => void;
  readonly onClearColumnFilters: () => void;
  /** Busca TODOS os pacientes com os filtros atuais (impressão e CSV). */
  readonly fetchExportPatients: () => Promise<PagedResult<Patient>>;
  /** Unidade do usuário — impressão do relatório. */
  readonly unit: UnitName | null;
}

const TERM_INPUT_STYLES = {
  include: {
    icon: Plus,
    iconClass: 'text-emerald-600',
    chipClass: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700',
    borderClass: 'border-emerald-600/60',
    placeholder: 'contém…',
  },
  exclude: {
    icon: Minus,
    iconClass: 'text-destructive',
    chipClass: 'border-destructive/40 bg-destructive/10 text-destructive',
    borderClass: 'border-destructive/60',
    placeholder: 'não contém…',
  },
} as const;

/**
 * Campo de filtro multi-termo: digite e pressione Enter (ou vírgula) para empilhar termos.
 * Backspace com o campo vazio remove o último termo; cada chip tem um "x" para remover.
 */
function TermInput({
  label,
  mode,
  terms,
  onChange,
}: {
  readonly label: string;
  readonly mode: 'include' | 'exclude';
  readonly terms: readonly string[];
  readonly onChange: (terms: readonly string[]) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState('');
  const styles = TERM_INPUT_STYLES[mode];
  const Icon = styles.icon;
  const isInclude = mode === 'include';

  const commitDraft = (): void => {
    const value = draft.trim();
    setDraft('');
    if (value === '' || terms.includes(value)) return;
    onChange([...terms, value]);
  };

  return (
    <div className="flex flex-col gap-1">
      {terms.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {terms.map((term) => (
            <span
              key={term}
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${styles.chipClass}`}
            >
              {term}
              <button
                type="button"
                aria-label={`Remover termo ${term}`}
                onClick={() => onChange(terms.filter((item) => item !== term))}
                className="rounded-sm hover:opacity-70"
              >
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Icon
          className={`pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 ${styles.iconClass}`}
          aria-hidden="true"
        />
        <Input
          aria-label={`${label}: ${isInclude ? 'contém' : 'não contém'}`}
          title="Digite e pressione Enter (ou vírgula) para adicionar mais de um termo"
          placeholder={styles.placeholder}
          value={draft}
          onChange={(event) => {
            const value = event.target.value;

            // Vírgula separa vários termos colados de uma vez.
            if (value.includes(',')) {
              const next = [...terms];
              value
                .split(',')
                .map((piece) => piece.trim())
                .filter((piece) => piece !== '')
                .forEach((piece) => {
                  if (!next.includes(piece)) next.push(piece);
                });
              if (next.length !== terms.length) onChange(next);
              setDraft('');
              return;
            }

            setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commitDraft();
            } else if (event.key === 'Backspace' && draft === '' && terms.length > 0) {
              onChange(terms.slice(0, -1));
            }
          }}
          onBlur={commitDraft}
          className={`h-7 pl-6 text-xs ${terms.length > 0 ? styles.borderClass : ''}`}
        />
      </div>
    </div>
  );
}

/**
 * Filtro duplo multi-termo de uma coluna: `+ contém` (OU entre termos) e
 * `− não contém` (remove quem tiver qualquer um dos termos).
 */
function ColumnFilterInputs({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: PatientColumnFilter;
  readonly onChange: (value: PatientColumnFilter) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <TermInput
        label={label}
        mode="include"
        terms={value.include}
        onChange={(terms) => onChange({ ...value, include: terms })}
      />
      <TermInput
        label={label}
        mode="exclude"
        terms={value.exclude}
        onChange={(terms) => onChange({ ...value, exclude: terms })}
      />
    </div>
  );
}

/** Cabeçalho ordenável — doc_ordenacao_tabelas.md §5 (seta só na coluna ativa). */
function SortableHead({
  field,
  label,
  sortField,
  sortDir,
  onSortChange,
  centered = false,
  activeFilterCount = 0,
}: {
  readonly field: PatientSortField;
  readonly label: string;
  readonly sortField: PatientSortField;
  readonly sortDir: SortDir;
  readonly onSortChange: (field: PatientSortField) => void;
  readonly centered?: boolean;
  readonly activeFilterCount?: number;
}): React.JSX.Element {
  const isActive = sortField === field;

  return (
    <TableHead className={centered ? 'text-center' : undefined}>
      <button
        type="button"
        onClick={() => onSortChange(field)}
        aria-label={`Ordenar por ${label}`}
        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`flex select-none items-center gap-1 transition-colors ${
          centered ? 'w-full justify-center' : ''
        } ${isActive ? 'text-foreground' : 'cursor-pointer hover:text-foreground'}`}
      >
        {label}
        {isActive && (
          <ChevronUp
            className={`h-3 w-3 transition-all duration-300 ${sortDir === 'desc' ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        )}
        {activeFilterCount > 0 && (
          <span
            className="ml-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"
            aria-label={`${String(activeFilterCount)} filtro(s) ativo(s)`}
          />
        )}
      </button>
    </TableHead>
  );
}

const STATUS_CONFIG: Readonly<
  Record<
    AttendanceStatus,
    {
      label: string;
      variant: 'success' | 'destructive' | 'warning';
      icon: React.ComponentType<{ className?: string }>;
    }
  >
> = {
  frequenta: { label: 'Frequenta', variant: 'success', icon: CircleCheck },
  nao_frequenta: { label: 'Não frequenta', variant: 'destructive', icon: CircleX },
  pendente: { label: 'Pendente', variant: 'warning', icon: CircleAlert },
};

/**
 * Controles de frequência (SIM / NÃO / pendente) ou o badge de status
 * quando o usuário não pode editar. Compartilhado entre a lista mobile
 * (cards) e a tabela desktop.
 */
function AttendanceToggle({
  current,
  isSaving,
  canEdit,
  onSelect,
}: {
  readonly current: AttendanceStatus;
  readonly isSaving: boolean;
  readonly canEdit: boolean;
  readonly onSelect: (status: AttendanceStatus) => void;
}): React.JSX.Element {
  if (!canEdit) {
    const cfg = STATUS_CONFIG[current];
    const Icon = cfg.icon;

    return (
      <Badge variant={cfg.variant}>
        <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
        {cfg.label}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {(['pendente', 'frequenta', 'nao_frequenta'] as const).map((option) => {
        const optionCfg = STATUS_CONFIG[option];
        const OptionIcon = optionCfg.icon;
        const isActive = current === option;
        const label =
          option === 'frequenta' ? 'SIM' : option === 'nao_frequenta' ? 'NÃO' : '—';

        return (
          <button
            key={option}
            type="button"
            disabled={isSaving}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) onSelect(option);
            }}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:scale-95 ${
              isActive
                ? option === 'frequenta'
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : option === 'nao_frequenta'
                    ? 'border-destructive bg-destructive text-white shadow-sm shadow-destructive/30'
                    : 'border-amber-500 bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:bg-accent hover:text-foreground'
            } ${isSaving ? 'cursor-wait' : ''}`}
          >
            <OptionIcon className="h-3 w-3" aria-hidden="true" />
            {label}
          </button>
        );
      })}
      {isSaving && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
      )}
    </div>
  );
}

export function PatientTable({
  patients,
  isLoading,
  page,
  totalPages,
  totalItems,
  onPageChange,
  canEdit,
  sortField,
  sortDir,
  onSortChange,
  columnFilters,
  onColumnFilterChange,
  onClearColumnFilters,
  fetchExportPatients,
  unit,
}: PatientTableProps): React.JSX.Element {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, AttendanceStatus>>(readLocalOverrides);
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  // Exportação: mesma consulta dos filtros atuais, página completa (lotes de 200).
  const exportMutation = useMutation({ mutationFn: fetchExportPatients });

  const activeColumnFilters = PATIENT_COLUMNS.reduce(
    (total, field) => total + countColumnFilter(columnFilters[field]),
    0,
  );

  const exportDisabled = exportMutation.isPending || isLoading;

  /** Carrega a base completa com os filtros atuais e devolve as linhas. */
  const loadExportRows = async () => {
    const result = await exportMutation.mutateAsync();
    return { rows: buildTableRows(result.items), totalItems: result.totalItems };
  };

  const handlePrint = async (): Promise<void> => {
    if (exportDisabled) return;
    try {
      const { rows } = await loadExportRows();
      printDocument(buildPrintDocument(rows, unit));
    } catch (error) {
      console.error('[PatientTable] Falha ao montar a impressão.', error);
    }
  };

  const handleDownloadCsv = async (): Promise<void> => {
    if (exportDisabled) return;
    try {
      const { rows } = await loadExportRows();
      downloadTextFile(buildTableFileName(), buildCsvContent(rows), 'text/csv;charset=utf-8;');
    } catch (error) {
      console.error('[PatientTable] Falha ao gerar o CSV.', error);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ patientId, status }: { patientId: string; status: AttendanceStatus }) => {
      if (!isConfigured()) return { patientId, status };
      return updatePatientAttendance(patientId, status);
    },
    onMutate: ({ patientId, status }) => {
      const previous = readLocalOverrides();
      const next = { ...previous, [patientId]: status };
      writeLocalOverrides(next);
      setOverrides(next);
      setPendingIds((prev) => new Set(prev).add(patientId));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context !== undefined) {
        writeLocalOverrides(context.previous);
        setOverrides(context.previous);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    onSettled: (_data, _error, variables) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.patientId);
        return next;
      });
    },
  });

  const handleSelectStatus = (patientId: string, status: AttendanceStatus): void => {
    updateMutation.mutate({ patientId, status });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-primary">Pacientes e frequência escolar</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Carregando registros...'
              : `${totalItems.toLocaleString('pt-BR')} registro(s) · página ${page.toLocaleString('pt-BR')} de ${totalPages.toLocaleString('pt-BR')}`}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" disabled={exportDisabled} onClick={handlePrint}>
            {exportMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Imprimir
          </Button>
          <Button variant="outline" size="sm" disabled={exportDisabled} onClick={handleDownloadCsv}>
            {exportMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Baixar CSV
          </Button>
          <Button
            variant={showColumnFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowColumnFilters((value) => !value)}
            aria-pressed={showColumnFilters}
          >
            <ListFilter className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Filtros por coluna
            {activeColumnFilters > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeColumnFilters}
              </Badge>
            )}
          </Button>
          {activeColumnFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearColumnFilters}>
              <Eraser className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Limpar filtros
            </Button>
          )}
          {canEdit && (
            <p className="hidden text-xs text-muted-foreground sm:block">
              Marque <span className="font-medium text-foreground">SIM</span> ou{' '}
              <span className="font-medium text-foreground">NÃO</span> para cada paciente
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Filtros por coluna — fora da tabela para não comprimir em telas menores */}
        {showColumnFilters && (
          <div className="grid grid-cols-1 gap-3 border-b border-border px-4 py-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {COLUMNS.map((column) => (
              <div key={column.field} className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {column.label}
                </span>
                <ColumnFilterInputs
                  label={column.label}
                  value={columnFilters[column.field]}
                  onChange={(value) => onColumnFilterChange(column.field, value)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Ordenação — acessível também no mobile (sem colunas de cabeçalho) */}
        <div className="flex items-center gap-2 px-4 pt-3 lg:hidden">
          <span className="text-xs text-muted-foreground">Ordenar por</span>
          <select
            value={sortField}
            onChange={(event) => onSortChange(event.target.value as PatientSortField)}
            aria-label="Ordenar pacientes por"
            className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            {COLUMNS.map((column) => (
              <option key={column.field} value={column.field}>
                {column.label}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-muted-foreground">
            {sortDir === 'asc' ? 'A → Z' : 'Z → A'}
          </span>
        </div>

        {/* Lista mobile/tablet — cards empilhados, sem colunas cortadas */}
        <div className="px-4 pb-2 pt-2 lg:hidden">
          {isLoading ? (
            <ul className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <li
                  key={`card-skeleton-${String(index)}`}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 p-3"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-7 w-40" />
                </li>
              ))}
            </ul>
          ) : patients.length === 0 ? (
            <p className="rounded-lg border border-border/70 bg-card px-3 py-8 text-center text-sm text-muted-foreground">
              Nenhum paciente encontrado com os filtros atuais.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {patients.map((patient) => {
                const current = overrides[patient.id] ?? patient.attendanceStatus;
                const isSaving = pendingIds.has(patient.id);

                return (
                  <li
                    key={patient.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-foreground">
                        {patient.name}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {patient.sex} · Nasc. {patient.birthDate}
                        {patient.age !== '' && ` · ${patient.age} anos`}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        CNS {patient.cns || '—'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="max-w-full truncate" title={patient.healthUnit}>
                        Unidade: <span className="text-foreground/80">{abbrevUnit(patient.healthUnit)}</span>
                      </span>
                      <span>
                        Equipe: <span className="text-foreground/80">{patient.healthTeam}</span>
                      </span>
                      <span>
                        Microárea: <span className="text-foreground/80">{patient.microarea || '—'}</span>
                      </span>
                    </div>

                    <AttendanceToggle
                      current={current}
                      isSaving={isSaving}
                      canEdit={canEdit}
                      onSelect={(status) => handleSelectStatus(patient.id, status)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Tabela desktop — com abreviações para caber nas colunas */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <SortableHead
                    key={column.field}
                    field={column.field}
                    label={column.label}
                    centered={column.centered}
                    activeFilterCount={countColumnFilter(columnFilters[column.field])}
                    sortField={sortField}
                    sortDir={sortDir}
                    onSortChange={onSortChange}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <TableRow key={`skeleton-${String(index)}`}>
                    {Array.from({ length: 5 }, (__, cellIndex) => (
                      <TableCell key={`cell-${String(cellIndex)}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhum paciente encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => {
                  const current = overrides[patient.id] ?? patient.attendanceStatus;
                  const isSaving = pendingIds.has(patient.id);

                  return (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex max-w-[260px] flex-col">
                          <span className="line-clamp-2 font-medium text-foreground">
                            {patient.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {patient.sex} · Nasc.: {patient.birthDate} · Idade: {patient.age || '—'}
                          </span>
                          <span className="text-xs text-muted-foreground">{patient.cns || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[140px]">
                        <span
                          className="line-clamp-1 text-muted-foreground"
                          title={patient.healthUnit}
                        >
                          {abbrevUnit(patient.healthUnit)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[110px]">
                        <span
                          className="line-clamp-1 whitespace-nowrap text-muted-foreground"
                          title={patient.healthTeam}
                        >
                          {patient.healthTeam}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {patient.microarea || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <AttendanceToggle
                          current={current}
                          isSaving={isSaving}
                          canEdit={canEdit}
                          onSelect={(status) => handleSelectStatus(patient.id, status)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Exibindo página {page.toLocaleString('pt-BR')} de {totalPages.toLocaleString('pt-BR')}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={isLoading || page <= 1} onClick={() => onPageChange(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={isLoading || page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
