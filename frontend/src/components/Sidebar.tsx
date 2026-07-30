import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useEstablishmentBranding } from '../hooks/useEstablishmentBranding';
import { useCan, type Permission } from '../lib/permissions';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  enabled: boolean;
  // Permissão que libera o item para o sub-usuário.
  permission: Permission;
}

// Módulos do sistema. Os desabilitados chegam nos próximos blocos.
const NAV: NavItem[] = [
  { label: 'Mesas', icon: '🍽️', path: '/mesas', enabled: true, permission: 'mesas' },
  { label: 'Balcão', icon: '🧾', path: '/balcao', enabled: true, permission: 'balcao' },
  { label: 'Comandas', icon: '📋', path: '/comandas', enabled: true, permission: 'comandas' },
  { label: 'Cozinha (KDS)', icon: '👨‍🍳', path: '/cozinha', enabled: true, permission: 'cozinha' },
  { label: 'Delivery', icon: '🛵', path: '/delivery', enabled: true, permission: 'delivery' },
  { label: 'Produtos', icon: '📦', path: '/produtos', enabled: true, permission: 'produtos' },
  { label: 'Clientes', icon: '👥', path: '/clientes', enabled: true, permission: 'clientes' },
  { label: 'Financeiro', icon: '💰', path: '/financeiro', enabled: true, permission: 'financeiro' },
  { label: 'Relatórios', icon: '📊', path: '/relatorios', enabled: true, permission: 'relatorios' },
  { label: 'Configurações', icon: '⚙️', path: '/configuracoes', enabled: true, permission: 'configuracoes' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const can = useCan();
  const { data: branding } = useEstablishmentBranding();
  // Sub-usuário só enxerga os módulos que o dono liberou para ele.
  const visible = NAV.filter((item) => can(item.permission));

  return (
    <aside
      className={clsx(
        'flex h-full flex-col bg-gray-900 text-gray-300 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-3">
        {/* Marca do restaurante definida em Configurações. */}
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-lg text-primary-fg">
            🍽️
          </div>
        )}
        {!collapsed && (
          <span className="truncate font-semibold text-white">
            {branding?.name ?? 'Restaurante'}
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visible.map((item) =>
          item.enabled ? (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-primary text-primary-fg'
                    : 'hover:bg-white/10 hover:text-white',
                )
              }
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ) : (
            <div
              key={item.path}
              title="Em breve"
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500"
            >
              <span className="text-lg opacity-60">{item.icon}</span>
              {!collapsed && (
                <span className="flex-1">{item.label}</span>
              )}
              {!collapsed && (
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase">
                  em breve
                </span>
              )}
            </div>
          ),
        )}
      </nav>
    </aside>
  );
}
