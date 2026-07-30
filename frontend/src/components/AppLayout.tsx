import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useEstablishmentBranding } from '../hooks/useEstablishmentBranding';
import { useNotifications } from '../hooks/useNotifications';
import { getSocket } from '../lib/socket';
import { applyPrimaryColor, resetPrimaryColor } from '../lib/theme';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface Toast {
  id: number;
  text: string;
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { data: branding } = useEstablishmentBranding();
  // Alimenta o sino da barra superior com os eventos do servidor.
  useNotifications();

  // Aplica a marca do restaurante (cor salva em Configurações). Precisa rodar
  // a cada carga da página: sem isso o F5 voltava para o vermelho padrão.
  useEffect(() => {
    if (branding?.primaryColor) applyPrimaryColor(branding.primaryColor);
    else resetPrimaryColor();
  }, [branding?.primaryColor]);

  // Notificação do garçom: item pronto na cozinha.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onReady = (payload: { productName: string; table: unknown }) => {
      const id = Date.now();
      const where = payload.table ? ` (${payload.table})` : '';
      setToasts((t) => [
        ...t,
        { id, text: `🔔 ${payload.productName} pronto${where}` },
      ]);
      setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        6000,
      );
    };
    socket.on('waiter:item_ready', onReady);
    return () => {
      socket.off('waiter:item_ready', onReady);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto bg-gray-50 p-4">
          <Outlet />
        </main>
      </div>

      {/* Toasts de notificação (garçom) */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
