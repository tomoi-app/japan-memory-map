const CACHE_NAME = 'ashiato-v1';

// キャッシュするリソース
const STATIC_ASSETS = [
    'https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap'
];

// インストール時にキャッシュを準備
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(
                STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
            );
        }).then(() => self.skipWaiting())
    );
});

// 古いキャッシュを削除
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// フェッチ戦略
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // APIリクエストはキャッシュしない
    if (url.includes('/api') || url.includes('supabase')) return;

    // GeoJSONは「キャッシュ優先、なければネット」
    if (url.includes('japan.geojson')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return res;
                });
            })
        );
        return;
    }

    // 静的リソースは「キャッシュ優先、なければネット→キャッシュに保存」
    if (STATIC_ASSETS.some(a => url.startsWith(a.split('?')[0]))) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return res;
                });
            })
        );
    }
});