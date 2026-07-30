import type { AuthUser, Role } from '../types/api';
import type { Permission } from './permissions';

// Ordem de preferência da tela inicial do PDV, da mais "gerencial" para a
// mais operacional. O usuário cai na primeira que ele tem permissão de ver.
const HOME_ORDER: { permission: Permission; path: string }[] = [
  { permission: 'relatorios', path: '/relatorios' },
  { permission: 'mesas', path: '/mesas' },
  { permission: 'balcao', path: '/balcao' },
  { permission: 'comandas', path: '/comandas' },
  { permission: 'cozinha', path: '/cozinha' },
  { permission: 'delivery', path: '/delivery' },
  { permission: 'financeiro', path: '/financeiro' },
  { permission: 'produtos', path: '/produtos' },
  { permission: 'clientes', path: '/clientes' },
  { permission: 'configuracoes', path: '/configuracoes' },
];

// Rota inicial de cada papel após o login.
export function homeForRole(role: Role): string {
  if (role === 'SUPER_ADMIN') return '/admin';
  if (role === 'RESELLER_ADMIN') return '/revendedor';
  if (role === 'ADMIN' || role === 'MANAGER') return '/relatorios';
  return '/mesas';
}

// Home do usuário considerando as permissões que o dono liberou — evita
// jogar um funcionário numa tela que ele não pode abrir.
export function homeForUser(user: AuthUser): string {
  if (user.role === 'SUPER_ADMIN') return '/admin';
  if (user.role === 'RESELLER_ADMIN') return '/revendedor';
  if (user.role === 'ADMIN') return '/relatorios';

  const permissions = user.permissions ?? [];
  const first = HOME_ORDER.find((h) => permissions.includes(h.permission));
  // Sem nenhuma permissão, cai numa tela que explica a situação.
  return first?.path ?? '/sem-acesso';
}
