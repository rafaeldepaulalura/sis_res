import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TabStatus, TabType } from '../types/api';

export interface OpenTabSummary {
  id: string;
  type: TabType;
  status: TabStatus;
  label: string | null;
  table: { number: number } | null;
  waiter: { name: string } | null;
  openedAt: string;
  itemCount: number;
  totals: { subtotal: string; total: string };
}

export function useOpenTabs() {
  return useQuery({
    queryKey: ['tabs', 'open'],
    queryFn: async () => (await api.get<OpenTabSummary[]>('/tabs')).data,
    refetchInterval: 15_000,
  });
}
