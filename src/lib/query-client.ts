import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    summary: (unit: string) => [...queryKeys.dashboard.all, 'summary', unit] as const,
    attendance: (params: { page: number; search: string; status: string; unit: string }) =>
      [...queryKeys.dashboard.all, 'attendance', params] as const,
  },
  import: {
    all: ['import'] as const,
    history: () => [...queryKeys.import.all, 'history'] as const,
  },
} as const;
