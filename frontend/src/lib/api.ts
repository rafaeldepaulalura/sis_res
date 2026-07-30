import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/authStore';

// Em dev, relativo: o proxy do Vite encaminha /api para o backend :3000.
// Em produção (front e back em domínios/apps separados no EasyPanel),
// VITE_API_URL é definida no build e aponta pro domínio público do backend.
const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export const api = axios.create({ baseURL: apiBase });

// Anexa o access token em toda requisição.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh automático em 401 (uma única tentativa, compartilhada entre chamadas).
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    const store = useAuthStore.getState();

    if (status === 401 && !original._retry && store.refreshToken) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = axios
            .post('/api/v1/auth/refresh', {
              refreshToken: store.refreshToken,
            })
            .then((res) => {
              // setAuth (e não setTokens) para o usuário vir junto: assim
              // mudanças de permissão feitas pelo dono chegam na UI sem
              // o funcionário precisar sair e entrar de novo.
              useAuthStore.getState().setAuth(res.data);
              return res.data.accessToken as string;
            })
            .finally(() => {
              refreshing = null;
            });
        }
        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        useAuthStore.getState().logout();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);

// Extrai mensagem de erro amigável de uma resposta da API.
export function apiErrorMessage(error: unknown, fallback = 'Erro inesperado') {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string | string[] };
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
  }
  return fallback;
}
