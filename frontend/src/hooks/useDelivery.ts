import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  Courier,
  CustomerAddress,
  DeliveryOrder,
  DeliveryStatus,
  EligibleOrder,
} from '../types/api';

const deliveryKey = ['deliveries'];
const couriersKey = ['couriers'];
const tabDeliveriesKey = ['delivery-tabs'];

export function useDeliveries() {
  return useQuery({
    queryKey: deliveryKey,
    queryFn: async () =>
      (await api.get<DeliveryOrder[]>('/delivery-orders')).data,
    refetchInterval: 15_000,
  });
}

// Comandas do PDV (balcão/mesa) marcadas como delivery — ainda sem
// Order/DeliveryOrder formal (só ao fechar a comanda no caixa).
export interface TabDeliveryRow {
  id: string;
  label: string | null;
  total: string;
  itemCount: number;
  customer: { id: string; name: string; phone: string } | null;
  address: CustomerAddress | null;
  courier: { id: string; name: string; phone: string } | null;
  openedAt: string;
}

export function useTabDeliveries() {
  return useQuery({
    queryKey: tabDeliveriesKey,
    queryFn: async () =>
      (await api.get<TabDeliveryRow[]>('/delivery-orders/tabs')).data,
    refetchInterval: 15_000,
  });
}

export function useEligibleOrders() {
  return useQuery({
    queryKey: ['eligible-orders'],
    queryFn: async () =>
      (await api.get<EligibleOrder[]>('/delivery-orders/eligible-orders')).data,
  });
}

export function useCouriers(availableOnly = false) {
  return useQuery({
    queryKey: [...couriersKey, availableOnly],
    queryFn: async () =>
      (
        await api.get<Courier[]>('/couriers', {
          params: availableOnly ? { available: 'true' } : undefined,
        })
      ).data,
  });
}

function useInvalidating<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  keys: unknown[][],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}

export function useCreateCourier() {
  return useInvalidating(
    (dto: { name: string; phone: string }) =>
      api.post('/couriers', dto).then((r) => r.data),
    [couriersKey],
  );
}

export function useUpdateCourier() {
  return useInvalidating(
    (vars: { id: string; dto: Partial<Courier> }) =>
      api.patch(`/couriers/${vars.id}`, vars.dto).then((r) => r.data),
    [couriersKey],
  );
}

export function useCreateDelivery() {
  return useInvalidating(
    (dto: {
      orderId: string;
      customerAddressId: string;
      deliveryFee?: number;
      estimatedTime?: number;
    }) => api.post('/delivery-orders', dto).then((r) => r.data),
    [deliveryKey, ['eligible-orders']],
  );
}

export function useAssignCourier() {
  return useInvalidating(
    (vars: { id: string; courierId: string }) =>
      api
        .patch(`/delivery-orders/${vars.id}/assign-courier`, {
          courierId: vars.courierId,
        })
        .then((r) => r.data),
    [deliveryKey, couriersKey],
  );
}

// ---- Configuração de taxa e bairros ----

export interface DeliverySettings {
  deliveryFee: string;
  deliveryMinOrder: string;
  deliveryFreeAbove: string | null;
  zones: { id: string; neighborhood: string; fee: string; active: boolean }[];
}

const settingsKey = ['delivery-settings'];

export function useDeliverySettings() {
  return useQuery({
    queryKey: settingsKey,
    queryFn: async () =>
      (await api.get<DeliverySettings>('/delivery-orders/settings')).data,
  });
}

export function useUpdateDeliverySettings() {
  return useInvalidating(
    (dto: {
      deliveryFee?: number;
      deliveryMinOrder?: number;
      deliveryFreeAbove?: number | null;
    }) => api.patch('/delivery-orders/settings', dto).then((r) => r.data),
    [settingsKey],
  );
}

export function useUpsertZone() {
  return useInvalidating(
    (dto: { neighborhood: string; fee: number; active?: boolean }) =>
      api.put('/delivery-orders/settings/zones', dto).then((r) => r.data),
    [settingsKey],
  );
}

export function useRemoveZone() {
  return useInvalidating(
    (id: string) =>
      api.delete(`/delivery-orders/settings/zones/${id}`).then((r) => r.data),
    [settingsKey],
  );
}

export function useUpdateDeliveryStatus() {
  return useInvalidating(
    (vars: { id: string; status: DeliveryStatus }) =>
      api
        .patch(`/delivery-orders/${vars.id}/status`, { status: vars.status })
        .then((r) => r.data),
    [deliveryKey, couriersKey],
  );
}
