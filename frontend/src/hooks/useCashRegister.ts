import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface CashStatus {
  open: boolean;
  id?: string;
  openedAt?: string;
  openingAmount?: string;
  operator?: { id: string; name: string };
  movements?: number;
}

export const cashKey = ['cash-register', 'current'];

// enabled=false para quem não tem a permissão "financeiro" — evita disparar
// requisição que o backend recusaria (403).
export function useCashStatus(enabled = true) {
  return useQuery({
    queryKey: cashKey,
    queryFn: async () =>
      (await api.get<CashStatus>('/cash-register/current')).data,
    refetchInterval: 30_000,
    enabled,
  });
}

function useCashMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: cashKey }),
  });
}

export function useOpenCash() {
  return useCashMutation((vars: { openingAmount: number }) =>
    api.post('/cash-register/open', vars).then((r) => r.data),
  );
}

export interface CloseCashResult {
  expected: string;
  counted: string;
  difference: string;
}

export function useCloseCash() {
  return useCashMutation((vars: { countedAmount: number }) =>
    api
      .post<CloseCashResult>('/cash-register/close', vars)
      .then((r) => r.data),
  );
}

export function useCashMovement() {
  return useCashMutation(
    (vars: {
      type: 'WITHDRAWAL' | 'DEPOSIT';
      amount: number;
      description?: string;
    }) => api.post('/cash-register/movements', vars).then((r) => r.data),
  );
}
