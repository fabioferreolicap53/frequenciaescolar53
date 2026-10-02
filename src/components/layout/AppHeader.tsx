import {
  Bell,
  Building2,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { UnitPicker } from '@/components/units/UnitPicker';
import { useAuth } from '@/hooks/useAuth';
import { unitLabel } from '@/lib/units';

const NAV_ITEMS = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true, adminOnly: false },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, end: false, adminOnly: true },
] as const;

export function AppHeader(): React.JSX.Element {
  const { user, isAuthenticated, isAdmin, logout, unit, setUnit } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const unitMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen && !unitMenuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent): void {
      if (menuOpen && menuRef.current !== null && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }

      if (
        unitMenuOpen &&
        unitMenuRef.current !== null &&
        !unitMenuRef.current.contains(event.target as Node)
      ) {
        setUnitMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, unitMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-primary/20 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide">Frequência Escolar</span>
            <span className="text-xs text-primary-foreground/70">Acompanhamento ESF · e-SUS</span>
          </span>
        </NavLink>

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-primary-foreground/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notificações"
            className="relative text-primary-foreground hover:bg-white/10 hover:text-white"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </Button>

          {isAuthenticated && unit === null && isAdmin && (
            <span
              title="Administrador — todos os registros do sistema"
              className="flex items-center gap-2 rounded-md border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1.5 text-xs font-medium text-emerald-200"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Todas as unidades</span>
            </span>
          )}

          {isAuthenticated && unit === null && !isAdmin && (
            <NavLink
              to="/login"
              className="flex items-center gap-2 rounded-md border border-amber-300/40 bg-amber-400/15 px-2.5 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-400/25"
            >
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Selecionar unidade</span>
            </NavLink>
          )}

          {isAuthenticated && unit !== null && (
            <div className="relative hidden sm:block" ref={unitMenuRef}>
              <button
                type="button"
                onClick={() => setUnitMenuOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={unitMenuOpen}
                title={unit}
                className="flex max-w-[240px] items-center gap-2 rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs transition-colors hover:bg-white/20"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate font-medium">{unitLabel(unit)}</span>
                <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
              </button>

              {unitMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card p-3 text-foreground shadow-lg"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-xs font-semibold text-primary">
                      Unidade de atuação
                    </span>
                  </div>
                  <UnitPicker
                    value={unit}
                    onChange={(nextUnit) => {
                      setUnit(nextUnit);
                      setUnitMenuOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {isAuthenticated && user !== null ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs transition-colors hover:bg-white/20"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold uppercase">
                  {user.email.slice(0, 2)}
                </span>
                <span className="hidden max-w-[140px] truncate lg:inline">{user.email}</span>
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-lg"
                >
                  <div className="flex items-center gap-2 border-b border-border px-3 py-3">
                    <ShieldCheck
                      className={`h-4 w-4 ${isAdmin ? 'text-emerald-600' : 'text-primary'}`}
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">{user.email}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {isAdmin ? 'Administrador' : 'Operador'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Encerrar sessão
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink
              to="/login"
              className="flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Entrar
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
