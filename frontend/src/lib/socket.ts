import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let socket: Socket | null = null;

// Em dev, mesma origem (proxy do Vite encaminha /socket.io). Em produção,
// VITE_SOCKET_URL aponta pro domínio público do backend (ver lib/api.ts).
const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;

// Conexão única com o backend. Autentica via token no handshake.
export function getSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  if (!socket) {
    socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
