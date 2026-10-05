import type { AttendanceStatus } from '@/types/patient';

const LOCAL_OVERRIDES_KEY = 'frequenciaescolar.localOverrides';

/** Overrides de frequência salvos localmente (otimistas / sem PocketBase). */
export function readLocalOverrides(): Record<string, AttendanceStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_OVERRIDES_KEY);
    return raw === null ? {} : (JSON.parse(raw) as Record<string, AttendanceStatus>);
  } catch {
    return {};
  }
}

export function writeLocalOverrides(overrides: Record<string, AttendanceStatus>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(overrides));
}
