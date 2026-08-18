const CACHE_NAME = 'bengkel-hw-v7';

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

// Install Event: Cache fresh assets and force activate
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Pre-caching v4 assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event: Delete all old caches immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Clearing old cache:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-First for HTML to get latest lockdown/exam updates, Cache-First for assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const isHtml = event.request.headers.get('accept')?.includes('text/html') || event.request.url.endsWith('.html') || event.request.url.endsWith('/');

  if (isHtml) {
    // Network-First for HTML (always get latest version if online, fallback to cache if offline)
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then(cached => cached || caches.match('./index.html'));
      })
    );
  } else {
    // Cache-First for static assets (icons, images, PDF)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          }
          return networkResponse;
        });
      })
    );
  }
});
