import { useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Info, Loader2, Lock, Sparkles } from 'lucide-react';

import { useUnitOccupancy } from '@/hooks/useUnitOccupancy';
import { unitKind, unitLabel, UNITS, type UnitName } from '@/lib/units';

type OccupancyFilter = 'todas' | 'livres' | 'ocupadas';

interface UnitStatusMapProps {
  readonly selectedUnit: UnitName | null;
  readonly onSelect: (unit: UnitName) => void;
}

const FILTER_OPTIONS: readonly {
  readonly value: OccupancyFilter;
  readonly label: string;
}[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'livres', label: 'Livres' },
  { value: 'ocupadas', label: 'Com cadastro' },
] as const;

const FILTER_KEYS: Readonly<Record<OccupancyFilter, string>> = {
  todas: 'todas as unidades',
  livres: 'unidades livres',
  ocupadas: 'unidades com cadastro',
};

/**
 * Mapa criativo da ocupação das unidades (AP 53):
 * cada unidade aparece como um "chip" de presença — livre para cadastro
 * (clique seleciona a unidade no formulário) ou já com um usuário.
 * Uma unidade admite apenas UM cadastro (índice único no servidor).
 */
export function UnitStatusMap({ selectedUnit, onSelect }: UnitStatusMapProps): React.JSX.Element {
  const { data, isPending } = useUnitOccupancy();
  const [filter, setFilter] = useState<OccupancyFilter>('todas');

  const { occupiedCount, freeCount, total } = useMemo(() => {
    if (data === undefined || data === null) {
      return { occupiedCount: 0, freeCount: 0, total: UNITS.length };
    }

    let occupied = 0;
    for (const unit of UNITS) {
      if (data.get(unit) === true) occupied += 1;
    }
    const total: number = UNITS.length;
    return { occupiedCount: occupied, freeCount: total - occupied, total };
  }, [data]);

  const occupancyPercent = total === 0 ? 0 : Math.round((occupiedCount / total) * 100);

  const visibleUnits = useMemo(() => {
    if (data === undefined || data === null) return UNITS;

    if (filter === 'livres') {
      return UNITS.filter((unit) => data.get(unit) === false);
    }
    if (filter === 'ocupadas') {
      return UNITS.filter((unit) => data.get(unit) === true);
    }
    return UNITS;
  }, [data, filter]);

  return (
    <section
      aria-label="Mapa de ocupação das unidades"
      className="flex flex-col gap-4 rounded-xl border border-primary/15 bg-primary/5 p-3.5"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Mapa das unidades
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            1 cadastro por unidade
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Veja quais unidades já têm acesso no sistema e quais ainda estão livres. Clique numa
          unidade livre para selecioná-la no formulário.
        </p>
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
          Consultando o status das unidades...
        </div>
      ) : data === null ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Não foi possível consultar o status agora. Você ainda pode escolher qualquer unidade —
          se ela já tiver cadastro, o sistema avisará na hora de concluir.
        </div>
      ) : (
        <>
          {/* Barra de presença: quanto da AP 53 já está no sistema */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {occupiedCount} de {total} unidades com cadastro
              </span>
              <span className="text-muted-foreground">{occupancyPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Percentual de unidades com cadastro"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={occupancyPercent}
              className="h-1.5 overflow-hidden rounded-full bg-primary/10"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700 ease-out"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>

          {/* Filtros do mapa */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar mapa de unidades">
            {FILTER_OPTIONS.map((option) => {
              const isActive = filter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
            <span className="ml-auto text-[11px] text-muted-foreground">
              exibindo {visibleUnits.length} {FILTER_KEYS[filter]}
            </span>
          </div>

          {/* Chips de presença — um por unidade */}
          {visibleUnits.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-4 text-xs text-muted-foreground">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Nenhuma unidade neste filtro — {freeCount > 0 ? `restam ${freeCount} livres.` : 'todas já têm cadastro!'}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {visibleUnits.map((unit) => {
                const isOccupied = data?.get(unit) === true;
                const isSelected = selectedUnit === unit;

                return (
                  <button
                    key={unit}
                    type="button"
                    disabled={isOccupied}
                    title={
                      isOccupied
                        ? `${unitLabel(unit)} — unidade já com usuário cadastrado`
                        : `${unitLabel(unit)} — unidade livre, clique para selecionar`
                    }
                    onClick={() => {
                      if (!isOccupied) onSelect(unit);
                    }}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all duration-200 ${
                      isOccupied
                        ? 'cursor-not-allowed border-destructive/20 bg-destructive/5 opacity-80'
                        : isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                          : 'cursor-pointer border-emerald-500/30 bg-emerald-50 hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-600/15'
                    }`}
                  >
                    {isOccupied ? (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
                    ) : (
                      <CircleCheck
                        className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`}
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-xs font-medium ${isSelected ? 'text-white' : 'text-foreground'}`}
                      >
                        {unitLabel(unit)}
                      </p>
                      <p
                        className={`text-[10px] ${isSelected ? 'text-white/80' : isOccupied ? 'text-destructive/80' : 'text-emerald-700'}`}
                      >
                        {isOccupied ? 'já tem um usuário' : isSelected ? 'selecionada' : 'livre para cadastro'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${
                        isSelected ? 'bg-white/20 text-white' : isOccupied ? 'bg-destructive/10 text-destructive' : 'bg-emerald-600/10 text-emerald-700'
                      }`}
                    >
                      {unitKind(unit)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck className="h-3 w-3 text-emerald-600" aria-hidden="true" />
              livre para cadastro
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-destructive" aria-hidden="true" />
              unidade já com usuário
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3 w-3 text-primary" aria-hidden="true" />
              clique num chip livre para selecionar
            </span>
          </div>
        </>
      )}
    </section>
  );
}
