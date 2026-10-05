import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';

interface SearchFiltersProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
}

export function SearchFilters({
  search,
  onSearchChange,
}: SearchFiltersProps): React.JSX.Element {
  return (
    <section aria-label="Filtros" className="flex flex-col gap-3">
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
    </section>
  );
}
