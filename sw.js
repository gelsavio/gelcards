// ATENÇÃO: Toda vez que você atualizar o app, mude este número (ex: v2, v3, v4)
const CACHE_NAME = 'gelcifras-cache-v310';

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
    self.skipWaiting(); // Força o celular a baixar a versão nova imediatamente
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

// A MÁGICA AQUI: Apaga os arquivos velhos quando a versão do CACHE_NAME muda
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(nomesDosCaches => {
            return Promise.all(
                nomesDosCaches.map(nome => {
                    if (nome !== CACHE_NAME) {
                        console.log('Apagando cache antigo:', nome);
                        return caches.delete(nome);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (event.request.method === 'POST' && url.pathname === '/_share-target') {
        event.respondWith((async() => {
            try {
                const formData = await event.request.formData();
                const file = formData.get('file');

                if (file) {
                    const text = await file.text();
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put('/shared-file.txt', new Response(text));
                }
            } catch (err) {
                console.error('Erro ao interceptar arquivo:', err);
            }
            return Response.redirect('/?shared=1', 303);
        })());
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});