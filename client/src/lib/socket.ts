import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

const rawSocketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim();
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

// Fallback chain: VITE_SOCKET_URL -> VITE_API_URL (strip /api) -> '/' (Vite dev proxy)
export const SOCKET_URL = rawSocketUrl
  ? rawSocketUrl.replace(/\/+$/, '')
  : (rawApiUrl ? rawApiUrl.replace(/\/api\/?$/, '') : '/');

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      auth: (cb) => {
        cb({ token: getAccessToken() });
      }
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}
