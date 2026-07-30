import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TableMap } from '../types/api';

export const tablesKey = ['tables'];

export function useTables() {
  return useQuery({
    queryKey: tablesKey,
    queryFn: async () => (await api.get<TableMap[]>('/tables')).data,
    refetchInterval: 10_000, // mantém o mapa atualizado
  });
}

// Move a comanda para uma mesa livre.
export function useTransferTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { fromTableId: string; toTableId: string }) =>
      (
        await api.post(`/tables/${vars.fromTableId}/transfer`, {
          toTableId: vars.toTableId,
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: tablesKey }),
  });
}

// Junta esta mesa na de destino: os itens vão para lá e esta fica livre.
export function useMergeTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { fromTableId: string; toTableId: string }) =>
      (
        await api.post(`/tables/${vars.fromTableId}/merge`, {
          toTableId: vars.toTableId,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tablesKey });
      qc.invalidateQueries({ queryKey: ['tabs'] });
    },
  });
}
