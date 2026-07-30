import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../hooks/useAdmin';
import { useOpenTab } from '../hooks/useTabs';
import { apiErrorMessage } from '../lib/api';
import type { Role } from '../types/api';

const ROLE_LABEL: Partial<Record<Role, string>> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  CASHIER: 'Caixa',
  WAITER: 'Garçom',
};

// Só faz sentido abrir comanda vinculada a papéis de atendimento.
const ATTENDANT_ROLES: Role[] = ['WAITER', 'CASHIER', 'MANAGER', 'ADMIN'];

export function BalcaoPage() {
  const { data: users } = useUsers();
  const openTab = useOpenTab();
  const navigate = useNavigate();
  const [label, setLabel] = useState('');
  const [noWaiter, setNoWaiter] = useState(false);

  const attendants = (users ?? []).filter(
    (u) => u.active && ATTENDANT_ROLES.includes(u.role),
  );

  const openFor = (
    type: 'COUNTER' | 'INDIVIDUAL',
    extra?: { waiterId?: string; label?: string },
  ) => {
    openTab.mutate(
      {
        type,
        label: extra?.label ?? label ?? undefined,
        waiterId: extra?.waiterId,
        noWaiter: !extra?.waiterId && noWaiter,
      },
      {
        onSuccess: (tab) => navigate(`/comanda/${tab.id}`),
        onError: (err) => alert(apiErrorMessage(err, 'Erro ao abrir comanda')),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Balcão</h1>

      {/* Abrir direto pelo atendente */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-medium text-gray-800">Abrir por atendente</h2>
        {attendants.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nenhum atendente cadastrado. Cadastre em Configurações → Equipe.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {attendants.map((u) => (
              <button
                key={u.id}
                onClick={() => openFor('COUNTER', { waiterId: u.id, label: u.name })}
                disabled={openTab.isPending}
                className="flex flex-col items-start rounded-lg border border-gray-200 px-3 py-2.5 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-50"
              >
                <span className="text-sm font-medium text-gray-800">
                  {u.name}
                </span>
                <span className="text-xs text-gray-400">
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Abrir manualmente */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-medium text-gray-800">Abrir manualmente</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Identificação (opcional)
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: João, Senha 42…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={noWaiter}
            onChange={(e) => setNoWaiter(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          Abrir sem atendente vinculado
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => openFor('COUNTER')}
            disabled={openTab.isPending}
            className="rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
          >
            🧾 Comanda de balcão
          </button>
          <button
            onClick={() => openFor('INDIVIDUAL')}
            disabled={openTab.isPending}
            className="rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            👤 Comanda individual
          </button>
        </div>
      </div>
    </div>
  );
}
