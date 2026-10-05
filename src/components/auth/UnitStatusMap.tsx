import { useMemo, useState } from 'react';
import { ChevronDown, CircleAlert, Loader2, Sparkles } from 'lucide-react';

import { useUnitOccupancy } from '@/hooks/useUnitOccupancy';
import { unitLabel, UNITS, type UnitName } from '@/lib/units';

interface UnitStatusMapProps {
  readonly selectedUnit: UnitName | null;
  readonly onSelect: (unit: UnitName) => void;
}

/**
 * Mapa compacto de ocupação das unidades (AP 53): uma linha de resumo
 * (quantas unidades já têm cadastro) e a lista de unidades em chips
 * densos, recolhida por padrão para não alongar a tela de cadastro.
 * Uma unidade admite apenas UM cadastro (índice único no servidor).
 */
export function UnitStatusMap({ selectedUnit, onSelect }: UnitStatusMapProps): React.JSX.Element {
  const { data, isPending } = useUnitOccupancy();
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    const total: number = UNITS.length;

    if (data === undefined || data === null) {
      return { occupiedCount: 0, total, known: false };
    }

    let occupiedCount = 0;
    for (const unit of UNITS) {
      if (data.get(unit) === true) occupiedCount += 1;
    }
    return { occupiedCount, total, known: true };
  }, [data]);

  const occupancyPercent =
    stats.total === 0 ? 0 : Math.round((stats.occupiedCount / stats.total) * 100);

  return (
    <section
      aria-label="Mapa de ocupação das unidades"
      className="flex flex-col gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3"
    >
      {/* Cabeçalho com resumo + controle de expansão */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="text-xs font-medium text-primary">Mapa das unidades</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {isPending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" aria-hidden="true" />
              consultando...
            </>
          ) : stats.known ? (
            <>
              <span className="font-medium text-foreground">{stats.occupiedCount}</span>
              de {stats.total} com cadastro
            </>
          ) : (
            <>status indisponível</>
          )}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Ocultar lista de unidades' : 'Ver lista de unidades'}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
        >
          unidades
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Barra de presença — uma única linha */}
      <div
        role="progressbar"
        aria-label="Percentual de unidades com cadastro"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={occupancyPercent}
        className="h-1 overflow-hidden rounded-full bg-primary/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700 ease-out"
          style={{ width: `${stats.known ? occupancyPercent : 0}%` }}
        />
      </div>

      {/* Aviso quando a API de ocupação não responde */}
      {!isPending && !stats.known && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-800">
          <CircleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          Não foi possível consultar o status agora — escolha qualquer unidade; se já tiver
          cadastro, o sistema avisará ao concluir.
        </p>
      )}

      {/* Lista densa de unidades — visível só quando expandida */}
      {expanded && (
        <>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {UNITS.map((unit) => {
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
                  aria-label={
                    isOccupied
                      ? `${unitLabel(unit)}: unidade já com usuário cadastrado`
                      : `${unitLabel(unit)}: unidade livre, clique para selecionar`
                  }
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (!isOccupied) onSelect(unit);
                  }}
                  className={`flex items-center gap-1.5 truncate rounded-md border px-2 py-1 text-left text-[11px] transition-colors duration-150 ${
                    isOccupied
                      ? 'cursor-not-allowed border-destructive/20 bg-destructive/5 text-muted-foreground/70'
                      : isSelected
                        ? 'border-emerald-600 bg-emerald-600 font-medium text-white shadow-sm shadow-emerald-600/25'
                        : 'cursor-pointer border-emerald-500/30 bg-emerald-50 text-foreground hover:border-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      isOccupied ? 'bg-destructive/60' : 'bg-emerald-500'
                    } ${isSelected ? 'ring-2 ring-white/40' : ''}`}
                  />
                  <span className="truncate">{unitLabel(unit)}</span>
                </button>
              );
            })}
          </div>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              livre para cadastro
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive/60" aria-hidden="true" />
              já tem um usuário
            </span>
            <span>clique num chip livre para selecionar</span>
          </p>
        </>
      )}
    </section>
  );
}
