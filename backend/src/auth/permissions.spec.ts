import { Role } from '@prisma/client';
import { DEFAULT_PERMISSIONS, hasPermission } from './permissions';

describe('hasPermission', () => {
  it('ADMIN (dono) passa mesmo sem nada gravado', () => {
    const dono = { role: Role.ADMIN, permissions: [] };
    expect(hasPermission(dono, ['relatorios'])).toBe(true);
    expect(hasPermission(dono, ['caixa.abrir_fechar'])).toBe(true);
  });

  it('libera quando o usuário tem a permissão exigida', () => {
    const user = { role: Role.WAITER, permissions: ['mesas', 'comandas'] };
    expect(hasPermission(user, ['mesas'])).toBe(true);
  });

  it('bloqueia quando não tem', () => {
    const user = { role: Role.WAITER, permissions: ['mesas'] };
    expect(hasPermission(user, ['relatorios'])).toBe(false);
  });

  it('basta UMA das exigidas (rotas compartilhadas, ex: /tabs)', () => {
    const user = { role: Role.WAITER, permissions: ['balcao'] };
    expect(hasPermission(user, ['mesas', 'balcao', 'comandas'])).toBe(true);
  });

  it('lista vazia não dá acesso a nada (fora ADMIN)', () => {
    const user = { role: Role.WAITER, permissions: [] };
    expect(hasPermission(user, ['mesas'])).toBe(false);
  });

  // É o ponto central do pedido: funcionário não vê o faturamento.
  it('garçom e cozinha não enxergam relatórios por padrão', () => {
    for (const role of [Role.WAITER, Role.KITCHEN] as const) {
      const user = { role, permissions: DEFAULT_PERMISSIONS[role] };
      expect(hasPermission(user, ['relatorios'])).toBe(false);
    }
  });

  it('caixa opera o dinheiro mas não vê o faturamento por padrão', () => {
    const caixa = {
      role: Role.CASHIER,
      permissions: DEFAULT_PERMISSIONS[Role.CASHIER],
    };
    expect(hasPermission(caixa, ['financeiro'])).toBe(true);
    expect(hasPermission(caixa, ['relatorios'])).toBe(false);
  });
});
