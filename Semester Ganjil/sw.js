const CACHE_NAME = 'bengkel-hw-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './pert_1_Materi_K3_Prosedur_Kerja_Interaktif.html',
  './Pert_2_materi-hardware-komputer.html',
  './Pert_2_simulasi-casing-pc.html',
  './Pert_3_bongkar-pasang-komputer.html',
  './Pert_4_materi-bios-uefi.html',
  './LKPD_BIOS_UEFI.pdf',
  './Pert_5_Materi_Ajar_Instalasi_Sistem_Operasi.html',
  './pert_5a_panduan-instalasi-windows11.html',
  './pert_5b_panduan-rufus.html',
  './Pert_6_Materi_Bootable_USB_Ubuntu_Windows.html',
  './Pert_6a_Pengayaan.html',
  './Pert_7_modul-ajar-instalasi-driver.html',
  './Pert_8_modul-ajar-troubleshooting-hardware.html',
  './Pert_9_materi-troubleshooting-software.html',
  './Pert_10_materi-perawatan-berkala.html',
  './Pert_11_materi-backup-restore.html'
];

// Install Event: Pre-cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First with Network fallback & dynamic caching
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* offline mode */});
        
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for HTML documents
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
