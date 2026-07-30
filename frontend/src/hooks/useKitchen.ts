import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { TabItemStatus } from '../types/api';

export interface KitchenItem {
  id: string;
  quantity: number;
  notes: string | null;
  status: TabItemStatus;
  createdAt: string;
  product: { name: string };
  // 2º sabor quando é pizza meia a meia.
  halfProduct: { name: string } | null;
  // Complementos escolhidos — a cozinha precisa ver para montar certo.
  modifiers: { groupName: string; name: string; priceDelta: string }[];
  tab: {
    id: string;
    label: string | null;
    table: { number: number } | null;
    waiter: { id: string; name: string } | null;
  };
}

const queueKey = ['kitchen', 'queue'];

export function useKitchenQueue() {
  const qc = useQueryClient();

  // Atualiza a fila em tempo real via WebSocket.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refetch = () => qc.invalidateQueries({ queryKey: queueKey });
    socket.on('kitchen:new_item', refetch);
    socket.on('kitchen:item_status_changed', refetch);
    return () => {
      socket.off('kitchen:new_item', refetch);
      socket.off('kitchen:item_status_changed', refetch);
    };
  }, [qc]);

  return useQuery({
    queryKey: queueKey,
    queryFn: async () => (await api.get<KitchenItem[]>('/kitchen/queue')).data,
    refetchInterval: 15_000, // fallback caso o socket caia
  });
}

export function useUpdateKitchenStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      itemId: string;
      status: 'SENT_TO_KITCHEN' | 'PREPARING' | 'READY' | 'DELIVERED';
    }) => api.patch(`/kitchen/items/${vars.itemId}/status`, { status: vars.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queueKey }),
  });
}
