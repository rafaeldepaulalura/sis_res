import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationKind = 'online_order' | 'item_ready' | 'kitchen';

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail?: string;
  // Para onde levar quando o usuário clicar no aviso.
  link?: string;
  at: number;
  read: boolean;
}

interface State {
  items: Notification[];
  // Som do aviso de pedido novo. Fica salvo entre sessões.
  muted: boolean;
  push: (n: Omit<Notification, 'id' | 'at' | 'read'>) => void;
  markAllRead: () => void;
  clear: () => void;
  toggleMute: () => void;
}

// Guarda os últimos avisos para quem não estava olhando a tela na hora.
const LIMIT = 40;

export const useNotificationStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      muted: false,
      push: (n) =>
        set((s) => ({
          items: [
            {
              ...n,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              at: Date.now(),
              read: false,
            },
            ...s.items,
          ].slice(0, LIMIT),
        })),
      markAllRead: () =>
        set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      clear: () => set({ items: [] }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
    }),
    {
      name: 'restaurante-notificacoes',
      // Só a preferência de som persiste; a lista é do expediente atual.
      partialize: (s) => ({ muted: s.muted }) as unknown as State,
    },
  ),
);
