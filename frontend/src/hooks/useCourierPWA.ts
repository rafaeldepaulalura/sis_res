import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/api';
import type { Courier, CustomerAddress, DeliveryOrder, DeliveryStatus } from '../types/api';

// Sem interceptor de auth — o motoboy acessa por link (courierId) — mas com
// a MESMA base da api autenticada (ver comentário em lib/api.ts).
const publicApi = axios.create({ baseURL: API_BASE_URL });

// Comanda montada direto no PDV (balcão/mesa) marcada como delivery — ainda
// sem Order/DeliveryOrder formal (só ao fechar a comanda no caixa).
export interface TabDelivery {
  id: string;
  label: string | null;
  total: string;
  customer: { id: string; name: string; phone: string } | null;
  address: CustomerAddress | null;
  openedAt: string;
}

interface CourierFeed {
  courier: Pick<Courier, 'id' | 'name'> & {
    establishment?: { name: string; logoUrl: string | null; primaryColor: string | null };
  };
  deliveries: DeliveryOrder[];
  tabDeliveries: TabDelivery[];
}

export function useCourierDeliveries(courierId: string) {
  return useQuery({
    queryKey: ['courier-pwa', courierId],
    queryFn: async () =>
      (await publicApi.get<CourierFeed>(`/public/courier/${courierId}`)).data,
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useCourierStatus(courierId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: DeliveryStatus }) =>
      publicApi
        .patch(`/public/courier/${courierId}/deliveries/${vars.id}/status`, {
          status: vars.status,
        })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['courier-pwa', courierId] }),
  });
}
