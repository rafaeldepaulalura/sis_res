import { type ReactNode, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { disconnectSocket } from '../lib/socket';
import { useAuthStore } from '../stores/authStore';

export interface PanelNavItem {
  label: string;
  icon: string;
  path: string;
}

interface Props {
  brandName: string;
  brandIcon?: ReactNode;
  nav: PanelNavItem[];
}

export function PanelLayout({ brandName, brandIcon, nav }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={clsx(
          'flex h-full flex-col bg-gray-900 text-gray-300 transition-all duration-200',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-lg text-primary-fg">
            {brandIcon ?? '🏢'}
          </div>
          {!collapsed && (
            <span className="truncate font-semibold text-white">
              {brandName}
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
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
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4">
          <span className="text-sm font-medium text-gray-700">{brandName}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-gray-50 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
