import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Role, TableStatus } from '../types/api';

// ---------- Áreas & Mesas ----------

export interface RoomAreaFull {
  id: string;
  name: string;
  tables: { id: string; number: number; status: TableStatus }[];
}

export function useRoomAreasFull() {
  return useQuery({
    queryKey: ['room-areas'],
    queryFn: async () => (await api.get<RoomAreaFull[]>('/room-areas')).data,
  });
}

function useAreasMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room-areas'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useCreateArea() {
  return useAreasMutation((name: string) =>
    api.post('/room-areas', { name }).then((r) => r.data),
  );
}
export function useDeleteArea() {
  return useAreasMutation((id: string) =>
    api.delete(`/room-areas/${id}`).then((r) => r.data),
  );
}
export function useCreateTable() {
  return useAreasMutation((vars: { roomAreaId: string; number: number }) =>
    api.post('/tables', vars).then((r) => r.data),
  );
}
export function useDeleteTable() {
  return useAreasMutation((id: string) =>
    api.delete(`/tables/${id}`).then((r) => r.data),
  );
}

// ---------- Usuários / Equipe ----------

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  // Páginas/ações liberadas (ver lib/permissions.ts).
  permissions: string[];
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<StaffUser[]>('/users')).data,
  });
}

function useUsersMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  // Páginas/ações que o dono liberou. Omitido = padrão do papel.
  permissions?: string[];
  pinCode?: string;
}

export function useCreateUser() {
  return useUsersMutation((dto: NewUser) =>
    api.post('/users', dto).then((r) => r.data),
  );
}
export function useUpdateUser() {
  return useUsersMutation(
    (vars: { id: string; dto: Partial<NewUser> & { active?: boolean } }) =>
      api.patch(`/users/${vars.id}`, vars.dto).then((r) => r.data),
  );
}
