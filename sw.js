// sw.js - Service Worker para ativação do PWA Di Solle no Tablet
const CACHE_NAME = 'disolle-v1';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

// O Chrome do Tablet exige este evento de busca interceptado para habilitar o botão de "Instalar"
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});