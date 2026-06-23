// Altere o sufixo da versão sempre que atualizar arquivos do jogo
const CACHE_NAME = 'pacienca-solitaire-cache-v110';

const ASSETS_TO_CACHE = [
    './', // O ponto garante a raiz da pasta atual no GitHub Pages
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'apple-touch-icon.png'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Força a ativação imediata do novo cache
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(nomesDosCaches => {
            return Promise.all(
                nomesDosCaches.map(nome => {
                    if (nome !== CACHE_NAME) {
                        console.log('Apagando cache antigo de Paciência:', nome);
                        return caches.delete(nome);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});

self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});