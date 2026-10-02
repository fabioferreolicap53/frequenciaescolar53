import { ChevronDown, MapPin } from 'lucide-react';

import { UNITS, type UnitName } from '@/lib/units';

interface UnitPickerProps {
  readonly value: UnitName | null;
  readonly onChange: (unit: UnitName) => void;
}

/**
 * Campo de unidade em lista suspensa (select nativo).
 * Usado no login e no menu do header para trocar de unidade.
 */
export function UnitPicker({ value, onChange }: UnitPickerProps): React.JSX.Element {
  return (
    <div className="relative">
      <MapPin
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
        aria-hidden="true"
      />
      <select
        value={value ?? ''}
        onChange={(event) => {
          const nextUnit = event.target.value;

          if (nextUnit !== '') {
            onChange(nextUnit as UnitName);
          }
        }}
        aria-label="Selecionar unidade"
        className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        <option value="" disabled>
          Selecione uma unidade...
        </option>
        {UNITS.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
