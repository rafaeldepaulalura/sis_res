import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';
import { playAlert } from '../lib/sound';
import { useNotificationStore } from '../stores/notificationStore';
import { useCan } from '../lib/permissions';

interface OnlineOrder {
  tabId: string;
  label: string | null;
  canal: 'mesa' | 'retirada' | 'entrega';
  itemCount: number;
}

const CANAL_LABEL: Record<OnlineOrder['canal'], string> = {
  mesa: 'Pedido na mesa (QR)',
  retirada: 'Pedido para retirada',
  entrega: 'Pedido para entrega',
};

// Liga os eventos do servidor ao sino da barra superior. Roda uma vez, no
// layout do PDV — não em cada página.
export function useNotifications() {
  const push = useNotificationStore((s) => s.push);
  const qc = useQueryClient();
  const can = useCan();
  // Quem não vê Delivery nem Comandas não precisa ser avisado de pedido novo.
  const querAvisoDePedido = can('delivery') || can('comandas') || can('balcao');

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onOnline = (p: OnlineOrder) => {
      if (!querAvisoDePedido) return;
      push({
        kind: 'online_order',
        title: CANAL_LABEL[p.canal] ?? 'Pedido novo',
        detail: [p.label, `${p.itemCount} item(ns)`]
          .filter(Boolean)
          .join(' · '),
        link: `/comanda/${p.tabId}`,
      });
      // Pedido novo é o único que toca som: é o que não pode passar batido.
      if (!useNotificationStore.getState().muted) playAlert();
      // Atualiza as listas que mostram o pedido.
      qc.invalidateQueries({ queryKey: ['tabs'] });
      qc.invalidateQueries({ queryKey: ['deliveries'] });
    };

    const onReady = (p: { productName: string; table: unknown }) => {
      push({
        kind: 'item_ready',
        title: `${p.productName} pronto`,
        detail: p.table ? String(p.table) : undefined,
      });
    };

    socket.on('order:new_online', onOnline);
    socket.on('waiter:item_ready', onReady);
    return () => {
      socket.off('order:new_online', onOnline);
      socket.off('waiter:item_ready', onReady);
    };
  }, [push, qc, querAvisoDePedido]);
}
