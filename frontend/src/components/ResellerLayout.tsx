import { useEffect } from 'react';
import { PanelLayout } from './PanelLayout';
import { useBranding } from '../hooks/useResellerPanel';
import { applyPrimaryColor, resetPrimaryColor } from '../lib/theme';

const NAV = [
  { label: 'Estabelecimentos', icon: '🏪', path: '/revendedor' },
  { label: 'Uso de Notas', icon: '🧾', path: '/revendedor/uso' },
  { label: 'Branding', icon: '🎨', path: '/revendedor/branding' },
];

export function ResellerLayout() {
  const { data: branding } = useBranding();

  // White-label: aplica a cor do revendedor; restaura ao sair do painel.
  useEffect(() => {
    applyPrimaryColor(branding?.primaryColor);
    return () => resetPrimaryColor();
  }, [branding?.primaryColor]);

  const brandName = branding?.tradeName ?? branding?.name ?? 'Revendedor';
  const brandIcon = branding?.logoUrl ? (
    <img
      src={branding.logoUrl}
      alt=""
      className="h-full w-full object-cover"
    />
  ) : (
    '🏢'
  );

  return <PanelLayout brandName={brandName} brandIcon={brandIcon} nav={NAV} />;
}
