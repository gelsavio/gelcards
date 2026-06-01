const CACHE_NAME = 'gelcifras-cache-v1';

// Lista de arquivos que serão salvos na memória do celular
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/apple-touch-icon.png',
    '/favicon.ico'
];

// Instalação: Baixa os arquivos e guarda no cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Cache aberto e arquivos salvos');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Interceptação: Quando o app pedir um arquivo, busca primeiro no cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Se o arquivo está no cache, entrega ele. Se não, tenta buscar na rede.
            return response || fetch(event.request);
        })
    );
});