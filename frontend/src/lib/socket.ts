import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let socket: Socket | null = null;

// Conexão única com o backend (mesma origem, proxy do Vite encaminha /socket.io).
// Autentica via token no handshake.
export function getSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  if (!socket) {
    socket = io({ auth: { token }, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
