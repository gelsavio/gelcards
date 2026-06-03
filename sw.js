const CACHE_NAME = 'gelcifras-cache-v1';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/apple-touch-icon.png',
    '/favicon.ico'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Força a atualização do Service Worker
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // INTERCEPTA O COMPARTILHAMENTO DE ARQUIVO DO ANDROID
    if (event.request.method === 'POST' && url.pathname === '/_share-target') {
        event.respondWith((async() => {
            try {
                const formData = await event.request.formData();
                const file = formData.get('file');

                if (file) {
                    const text = await file.text();
                    const cache = await caches.open(CACHE_NAME);
                    // Guarda o texto extraído no cache
                    await cache.put('/shared-file.txt', new Response(text));
                }
            } catch (err) {
                console.error('Erro ao interceptar arquivo:', err);
            }
            // Redireciona para o app avisando que há um arquivo na URL (?shared=1)
            return Response.redirect('/?shared=1', 303);
        })());
        return;
    }

    // Fluxo normal de cache (offline)
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});