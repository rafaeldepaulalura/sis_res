import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { LoginResponse } from '../types/api';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const { data } = await api.post<LoginResponse>('/auth/login', creds);
      return data;
    },
    onSuccess: (data) => setAuth(data),
  });
}
