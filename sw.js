const CACHE_NAME = 'ashiato-cache-v2.3.1'; // バージョンを更新（古いキャッシュを捨てるため）

// キャッシュする静的ファイルのリスト
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// インストール時：最低限のファイルをスマホに保存
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

// アクティベート時：古いバージョンのキャッシュ（ゴミ）を削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
                })
            );
        })
    );
    self.clients.claim();
});

// リクエストの傍受（ここがPWAの心臓部！）
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // ① 動的通信（Supabase, APIなど）は絶対にキャッシュしない（そのまま通す）
    if (requestUrl.pathname.startsWith('/api') || 
        requestUrl.hostname.includes('supabase.co') || 
        event.request.method !== 'GET') {
        return;
    }

    // ② 重い地図データ(GeoJSON)や外部ファイルは「キャッシュ優先（爆速化）」
    // 一度ダウンロードしたら、次からはスマホ内から一瞬で読み込む
    if (requestUrl.hostname.includes('githubusercontent.com') || 
        requestUrl.hostname.includes('unpkg.com') ||
        requestUrl.hostname.includes('fonts.googleapis.com')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request).then((response) => {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                    return response;
                });
            })
        );
        return;
    }

    // ③ アプリ本体（HTML, JS, CSS）は「ネットワーク優先、ダメならキャッシュ（機内モード対応）」
    // 普段は最新のアプリ状態を取りに行き、ネットが切れている時だけスマホ内のデータを使う
    event.respondWith(
        fetch(event.request).then((response) => {
            // ネットに繋がっていれば最新を取得してキャッシュを更新
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            return response;
        }).catch(() => {
            // オフライン（機内モード）ならキャッシュから返す！
            return caches.match(event.request);
        })
    );
});