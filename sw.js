const CACHE_NAME = 'ashiato-cache-v4';

// キャッシュする静的ファイルのリスト
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// インストール時に静的ファイルをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
    // 新しいService Workerをすぐにアクティブにする
    self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// リクエストの傍受とキャッシュの返却
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // VercelのAPI、Supabase、SendGridなどの動的なリクエストはキャッシュしない（常にネットワーク）
    if (requestUrl.pathname.startsWith('/api') || 
        requestUrl.hostname.includes('supabase.co') || 
        event.request.method !== 'GET') {
        return;
    }

    // 地図のGeoJSONデータは一度取得したらキャッシュを優先する
    if (requestUrl.hostname === 'raw.githubusercontent.com') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
        );
        return;
    }

    // 基本的な静的ファイルは「キャッシュファースト」戦略
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // キャッシュがあればそれを返す
                if (response) {
                    return response;
                }
                
                // キャッシュがなければネットワークから取得
                return fetch(event.request).then((networkResponse) => {
                    // 取得した新しいデータをキャッシュに保存
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                });
            })
    );
});