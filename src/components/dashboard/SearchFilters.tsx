import { Filter, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import type { AttendanceStatus } from '@/types/attendance';

type StatusFilterValue = AttendanceStatus | 'todos';

interface SearchFiltersProps {
  readonly search: string;
  readonly status: StatusFilterValue;
  readonly onSearchChange: (value: string) => void;
  readonly onStatusChange: (value: StatusFilterValue) => void;
}

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilterValue; label: string }> = [
  { value: 'todos', label: 'Todas as situações' },
  { value: 'frequenta', label: 'Frequentam a escola' },
  { value: 'nao_frequenta', label: 'Não frequentam' },
  { value: 'pendente', label: 'Pendentes de análise' },
];

export function SearchFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: SearchFiltersProps): React.JSX.Element {
  return (
    <section aria-label="Filtros" className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden={true}
        />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nome, CNS ou nome da mãe..."
          aria-label="Buscar pacientes"
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden={true} />
        <label htmlFor="status-filter" className="sr-only">
          Filtrar por situação
        </label>
        <select
          id="status-filter"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as StatusFilterValue)}
          className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
