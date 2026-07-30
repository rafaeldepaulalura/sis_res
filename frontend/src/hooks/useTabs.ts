import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { tablesKey } from './useTables';
import { cashKey } from './useCashRegister';
import type { PaymentMethod, Tab, TabType } from '../types/api';

export const tabKey = (id: string) => ['tab', id];

export function useTab(id: string | undefined) {
  return useQuery({
    queryKey: tabKey(id ?? ''),
    queryFn: async () => (await api.get<Tab>(`/tabs/${id}`)).data,
    enabled: !!id,
  });
}

export function useOpenTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      type: TabType;
      tableId?: string;
      label?: string;
      waiterId?: string;
      noWaiter?: boolean;
    }) => (await api.post<Tab>('/tabs', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: tablesKey }),
  });
}

// Fábrica de mutações que operam sobre uma comanda e revalidam o cache dela.
function useTabMutation<TVars>(
  tabId: string,
  fn: (vars: TVars) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tabKey(tabId) });
      qc.invalidateQueries({ queryKey: tablesKey });
    },
  });
}

export function useAddItem(tabId: string) {
  return useTabMutation(
    tabId,
    (vars: {
      productId: string;
      // 2º sabor da pizza meia a meia (categoria com allowsHalf).
      halfProductId?: string;
      // Complementos escolhidos (adicionais, ponto da carne...).
      modifierOptionIds?: string[];
      quantity?: number;
      notes?: string;
    }) => api.post(`/tabs/${tabId}/items`, vars),
  );
}

// authPin viaja junto quando o restaurante exige autorização do gerente.
export function useUpdateItem(tabId: string) {
  return useTabMutation(
    tabId,
    (vars: {
      itemId: string;
      quantity?: number;
      notes?: string;
      cancel?: boolean;
      authPin?: string;
    }) => {
      const { itemId, ...body } = vars;
      return api.patch(`/tabs/${tabId}/items/${itemId}`, body);
    },
  );
}

export function useSetFulfillment(tabId: string) {
  return useTabMutation(
    tabId,
    (vars: {
      isDelivery: boolean;
      courierId?: string;
      customerId?: string;
      deliveryAddressId?: string;
    }) => api.patch(`/tabs/${tabId}/fulfillment`, vars),
  );
}

export function useSendToKitchen(tabId: string) {
  return useTabMutation(tabId, () =>
    api.post(`/tabs/${tabId}/send-to-kitchen`),
  );
}

export function useAddPayment(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { method: PaymentMethod; amount: number }) =>
      api.post(`/tabs/${tabId}/payments`, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tabKey(tabId) });
      qc.invalidateQueries({ queryKey: cashKey });
    },
  });
}

export function useCloseTab(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      discount?: number;
      payments?: { method: PaymentMethod; amount: number }[];
      // Exigido quando o restaurante trava desconto com PIN do gerente.
      authPin?: string;
    }) => api.post(`/tabs/${tabId}/close`, vars).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tabKey(tabId) });
      qc.invalidateQueries({ queryKey: tablesKey });
      qc.invalidateQueries({ queryKey: cashKey });
    },
  });
}
