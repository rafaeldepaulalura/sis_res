import { useAuthStore } from '../stores/authStore';

// Espelho de backend/src/auth/permissions.ts — ao mexer lá, mexa aqui.
// Aqui as permissões guiam a UI (menu e botões); a checagem que vale é a
// do backend, que roda em toda requisição.

export const PAGE_PERMISSIONS = [
  'dashboard',
  'mesas',
  'balcao',
  'comandas',
  'cozinha',
  'delivery',
  'produtos',
  'clientes',
  'financeiro',
  'relatorios',
  'configuracoes',
] as const;

export const ACTION_PERMISSIONS = [
  'comanda.desconto',
  'comanda.cancelar_item',
  'caixa.abrir_fechar',
  'caixa.movimentacao',
] as const;

export type Permission =
  | (typeof PAGE_PERMISSIONS)[number]
  | (typeof ACTION_PERMISSIONS)[number];

// Rótulos exibidos na tela de criação/edição de sub-usuário.
export const PERMISSION_LABEL: Record<Permission, string> = {
  dashboard: 'Dashboard (visão geral)',
  mesas: 'Mesas',
  balcao: 'Balcão',
  comandas: 'Comandas',
  cozinha: 'Cozinha (KDS)',
  delivery: 'Delivery',
  produtos: 'Produtos / Cardápio',
  clientes: 'Clientes',
  financeiro: 'Financeiro (caixa)',
  relatorios: 'Relatórios (faturamento)',
  configuracoes: 'Configurações (equipe, links, marca)',
  'comanda.desconto': 'Aplicar desconto na comanda',
  'comanda.cancelar_item': 'Cancelar item já lançado',
  'caixa.abrir_fechar': 'Abrir e fechar o caixa',
  'caixa.movimentacao': 'Sangria e suprimento',
};

// Explicação curta para as páginas mais sensíveis.
export const PERMISSION_HINT: Partial<Record<Permission, string>> = {
  dashboard: 'Só mostra faturamento se tiver também Relatórios',
  relatorios: 'Mostra quanto o restaurante fatura',
  financeiro: 'Mostra o dinheiro em caixa',
  configuracoes: 'Permite criar e editar outros usuários',
};

// Padrões por papel — usados para pré-marcar a tela ao escolher o papel.
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [...PAGE_PERMISSIONS, ...ACTION_PERMISSIONS],
  MANAGER: [...PAGE_PERMISSIONS, ...ACTION_PERMISSIONS],
  CASHIER: [
    'dashboard',
    'mesas',
    'balcao',
    'comandas',
    'delivery',
    'clientes',
    'financeiro',
    'comanda.desconto',
    'comanda.cancelar_item',
    'caixa.abrir_fechar',
    'caixa.movimentacao',
  ],
  WAITER: ['dashboard', 'mesas', 'balcao', 'comandas', 'cozinha'],
  KITCHEN: ['cozinha'],
  COURIER: ['delivery'],
};

// Hook de checagem. ADMIN é o dono: sempre pode tudo.
export function useCan(): (permission: Permission) => boolean {
  const user = useAuthStore((s) => s.user);
  return (permission) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return (user.permissions ?? []).includes(permission);
  };
}
