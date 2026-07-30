// Service worker mínimo — habilita instalação do PWA (network-first simples).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  // Passa direto para a rede; sem cache offline nesta fase.
  event.respondWith(fetch(event.request).catch(() => new Response('Offline')));
});
