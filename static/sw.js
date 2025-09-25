// Service Worker لتطبيق إدارة رموز QR
const CACHE_NAME = 'qr-manager-v1';
const urlsToCache = [
    '/',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/js/scanner.js',
    '/static/js/pwa.js',
    '/static/manifest.json',
    '/static/icons/icon-192x192.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap',
    'https://unpkg.com/qr-scanner@1.4.2/qr-scanner.min.js'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// اعتراض طلبات الشبكة
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // إرجاع الملف من الكاش إذا وُجد
                if (response) {
                    return response;
                }

                // إذا لم يوجد في الكاش، جلبه من الشبكة
                return fetch(event.request).then((response) => {
                    // التحقق من صحة الاستجابة
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // نسخ الاستجابة لحفظها في الكاش
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // في حالة عدم توفر الشبكة، إرجاع صفحة افتراضية
                if (event.request.destination === 'document') {
                    return caches.match('/');
                }
            })
    );
});

