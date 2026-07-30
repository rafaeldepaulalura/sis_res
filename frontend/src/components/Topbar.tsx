import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useCashStatus } from '../hooks/useCashRegister';
import { NotificationBell } from './NotificationBell';
import { useCan } from '../lib/permissions';
import { disconnectSocket } from '../lib/socket';
import { useAuthStore } from '../stores/authStore';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  CASHIER: 'Caixa',
  WAITER: 'Garçom',
  KITCHEN: 'Cozinha',
  COURIER: 'Motoboy',
};

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const can = useCan();
  // O saldo do caixa é informação financeira: só aparece para quem tem acesso.
  const showCash = can('financeiro');
  const { data: cash } = useCashStatus(showCash);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4">
      <div className="text-sm text-gray-500">
        {now.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
        })}{' '}
        <span className="font-medium text-gray-700">
          {now.toLocaleTimeString('pt-BR')}
        </span>
      </div>

      {/* Status do caixa */}
      {showCash && (
        <button
          onClick={() => navigate('/financeiro')}
          className={clsx(
            'rounded-full px-3 py-1 text-xs font-medium',
            cash?.open
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-500',
          )}
        >
          Caixa: {cash?.open ? 'Aberto' : 'Fechado'}
        </button>
      )}

      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <div className="text-right">
          <div className="text-sm font-medium text-gray-800">
            {user?.name}
          </div>
          <div className="text-xs text-gray-500">
            {user ? ROLE_LABEL[user.role] : ''}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
