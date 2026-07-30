import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useNotificationStore } from '../stores/notificationStore';

const ICON: Record<string, string> = {
  online_order: '🛎️',
  item_ready: '✅',
  kitchen: '👨‍🍳',
};

function quando(at: number): string {
  const min = Math.floor((Date.now() - at) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  return new Date(at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationBell() {
  const items = useNotificationStore((s) => s.items);
  const muted = useNotificationStore((s) => s.muted);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clear = useNotificationStore((s) => s.clear);
  const toggleMute = useNotificationStore((s) => s.toggleMute);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unread = items.filter((i) => !i.read).length;

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markAllRead();
        }}
        title="Notificações"
        className="relative rounded-full p-2 text-gray-400 hover:bg-gray-100"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-medium text-gray-800">Avisos</span>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={toggleMute}
                title={
                  muted
                    ? 'Som desligado — pedido novo entra em silêncio'
                    : 'Som ligado para pedido novo'
                }
                className="text-gray-500 hover:text-primary"
              >
                {muted ? '🔇 som off' : '🔊 som on'}
              </button>
              {items.length > 0 && (
                <button
                  onClick={clear}
                  className="text-gray-400 hover:text-red-500"
                >
                  limpar
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (n.link) {
                    navigate(n.link);
                    setOpen(false);
                  }
                }}
                disabled={!n.link}
                className={clsx(
                  'flex w-full items-start gap-2.5 border-b border-gray-50 px-3 py-2.5 text-left',
                  n.link ? 'hover:bg-gray-50' : 'cursor-default',
                )}
              >
                <span className="text-base leading-none">
                  {ICON[n.kind] ?? '🔔'}
                </span>
                <span className="flex-1">
                  <span className="block text-sm text-gray-800">{n.title}</span>
                  {n.detail && (
                    <span className="block text-xs text-gray-500">
                      {n.detail}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] text-gray-400">
                  {quando(n.at)}
                </span>
              </button>
            ))}
            {items.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-gray-400">
                Nenhum aviso ainda.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
