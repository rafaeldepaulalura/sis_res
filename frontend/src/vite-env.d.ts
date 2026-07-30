/// <reference types="vite/client" />

interface ImportMetaEnv {
  // URL pública do backend em produção (ex: https://api.seurestaurante.com).
  // Vazia em dev: usa o proxy relativo do Vite.
  readonly VITE_API_URL?: string;
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
