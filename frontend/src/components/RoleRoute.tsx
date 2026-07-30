import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { homeForUser } from '../lib/roleHome';
import { useCan, type Permission } from '../lib/permissions';
import type { Role } from '../types/api';

// Redireciona para a home do papel se o usuário não tiver acesso àquele grupo.
export function RoleRoute({ roles }: { roles: Role[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <Navigate to={homeForUser(user)} replace />;
  }
  return <Outlet />;
}

// Bloqueia uma página do PDV que o sub-usuário não tem permissão de ver.
// É só a primeira barreira: o backend recusa a requisição de qualquer forma.
export function PermissionRoute({ permission }: { permission: Permission }) {
  const user = useAuthStore((s) => s.user);
  const can = useCan();
  if (!user) return <Navigate to="/login" replace />;
  if (!can(permission)) return <Navigate to={homeForUser(user)} replace />;
  return <Outlet />;
}

// Redireciona a raiz para a home do usuário logado.
export function RoleHome() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForUser(user)} replace />;
}
