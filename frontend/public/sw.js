// Service worker mínimo — habilita instalação do PWA (network-first simples).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Só intercepta GET do próprio domínio (assets/páginas). Chamadas de API
  // (POST/PATCH/DELETE, ou cross-origin — caso de front e back em domínios
  // separados) passam direto: interceptar essas fazia qualquer erro de rede
  // real virar um "Offline" com status 200, quebrando o login em produção.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(fetch(req).catch(() => new Response('Offline')));
});
