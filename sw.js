const CACHE_NAME = 'bengkel-hw-pwa-v19-full-offline';

// DAFTAR LENGKAP SEMUA FILE UNTUK AKSES FULL OFFLINE
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './cbt-anti-cheat.css',
  './cbt-anti-cheat.js',
  './LKPD_BIOS_UEFI.pdf',
  './LKPD_BIOS_UEFI.docx',

  // Modul Semester Ganjil
  './pert_1_Materi_K3_Prosedur_Kerja_Interaktif.html',
  './Pert_2_materi-hardware-komputer.html',
  './Pert_2_simulasi-casing-pc.html',
  './Pert_3_bongkar-pasang-komputer.html',
  './Pert_4_materi-bios-uefi.html',
  './Pert_5_Materi_Ajar_Instalasi_Sistem_Operasi.html',
  './pert_5a_panduan-instalasi-windows11.html',
  './pert_5b_panduan-rufus.html',
  './Pert_6_Materi_Bootable_USB_Ubuntu_Windows.html',
  './Pert_6a_Pengayaan.html',
  './Pert_7_modul-ajar-instalasi-driver.html',
  './Pert_8_modul-ajar-troubleshooting-hardware.html',
  './Pert_9_materi-troubleshooting-software.html',
  './Pert_10_materi-perawatan-berkala.html',
  './Pert_11_materi-backup-restore.html',

  // Modul Semester Genap
  './Genap_Pert_1_upgrade-komponen-komputer.html',
  './Genap_Pert_2_perawatan-troubleshooting-printer-scanner.html',
  './Genap_Pert_3_perawatan-laptop-perangkat-mobile.html',
  './Genap_Pert_4_keamanan-sistem-antivirus-firewall.html',
  './Genap_Pert_5_manajemen-partisi-storage.html',
  './Genap_Pert_6_diagnosa-kerusakan-diagnostic-tools-ai.html',
  './Genap_Pert_7_instalasi-ulang-recovery-restore-point.html',
  './Genap_Pert_8_studi-kasus-troubleshooting-kompleks.html',
  './Genap_Pert_9_proyek-perawatan-perbaikan-unit-sekolah.html',
  './Genap_Pert_10_uji-kompetensi-laporan-perawatan.html',

  // Infografis Materi (JPG Cepat + PNG HD)
  './assets/infografis/infografis-bios-materi.jpg',
  './assets/infografis/infografis-bios-materi.png',
  './assets/infografis/infografis-instalasi-os-langkah.jpg',
  './assets/infografis/infografis-instalasi-os-langkah.png',
  './assets/infografis/infografis-instalasi-rufus.jpg',
  './assets/infografis/infografis-instalasi-rufus.png',
  './assets/infografis/infografis-instalasi-sebelum-saat-setelah.jpg',
  './assets/infografis/infografis-instalasi-sebelum-saat-setelah.png'
];

// 1. INSTALL EVENT: Pre-cache semua aset sekaligus & skipWaiting
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[PWA-SW] Mengunduh seluruh materi untuk akses offline...');
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[PWA-SW] Gagal cache:', asset, err);
        }
      }
      console.log('[PWA-SW] Semua materi berhasil tersimpan untuk akses offline!');
    })
  );
});

// 2. ACTIVATE EVENT: Bersihkan cache versi lama & langsung ambil kontrol client
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[PWA-SW] Menghapus cache lama:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH EVENT: Stale-While-Revalidate untuk aset lokal, Cache-First untuk offline instan
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Penanganan request lokal / same-origin
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          }
          return networkResponse;
        }).catch(() => {
          return cachedResponse || (event.request.mode === 'navigate' ? caches.match('./index.html') : null);
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Penanganan resource pihak ketiga (Google Fonts, CDN, dsb)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => {
        return null;
      });
    })
  );
});
