import { useEffect } from 'react';
import { PanelLayout } from './PanelLayout';
import { resetPrimaryColor } from '../lib/theme';

const NAV = [
  { label: 'Revendedores', icon: '🏬', path: '/admin' },
  { label: 'Planos', icon: '📦', path: '/admin/planos' },
  { label: 'Métricas', icon: '📊', path: '/admin/metricas' },
];

export function AdminLayout() {
  // Painel do sistema usa o tema padrão (não o white-label do revendedor).
  useEffect(() => resetPrimaryColor(), []);
  return <PanelLayout brandName="Super Admin" brandIcon="👑" nav={NAV} />;
}
