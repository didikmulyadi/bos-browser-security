# Bos (Browser Security)

Ekstensi Chrome/Edge (Manifest V3) untuk memblokir iklan, redirect otomatis, popup/tab iklan, sekaligus mendeteksi dan menangani indikasi pencurian data di halaman web.

- Versi: `1.8.4`
- Browser: Chrome / Edge 119+
- Dokumentasi online: https://didikmulyadi.github.io/bos-browser-security/
- Lisensi: MIT
- Tanpa build step, tanpa server, semua proses lokal di browser.

---

## Fitur utama

### 1. Blokir iklan jaringan
- Memakai `declarativeNetRequest` dengan ruleset statis `rules/ads.json`.
- Saat ini memblokir **111 domain** iklan/tracker/popunder populer (doubleclick, googlesyndication, taboola, outbrain, adsterra, propellerads, pubadx, bauval, dll).
- Bisa dimatikan/ dinyalakan lewat toggle proteksi.

### 2. Blokir redirect otomatis
- Hook `window.open`, `Location.assign`, dan `Location.replace` di MAIN world.
- Redirect lintas situs tanpa interaksi pengguna diblokir.
- `meta refresh` lintas situs / ke domain iklan dihapus.
- Klik link ke domain iklan dibatalkan.

### 3. Blokir popup dan tab iklan
- Tab baru yang mengarah ke domain iklan ditutup otomatis oleh background.
- Iframe iklan (`about:blank`, `atContainer`, `pubadx`, dll) dideteksi dan dihapus.
- Filter kosmetik menyembunyikan slot iklan umum.

### 4. Keamanan dan deteksi pencurian data
17 pemeriksaan, masing-masing punya toggle **tangani otomatis** sendiri (default aktif):

| Pemeriksaan | Yang dideteksi | Severity | Tindakan otomatis |
|---|---|---|---|
| Exfiltrasi cookie/token | Cookie/token/localStorage dikirim ke domain lain | Tinggi | Request diblokir |
| Data sensitif ke pihak ketiga | Password/email/OTP lintas situs | Sedang | Request diblokir |
| Data ke alamat IP mentah | Request berisi data ke IP langsung | Sedang | Request diblokir |
| Cookie lintas domain | Upaya set cookie untuk domain lain | Tinggi | Cookie write dibatalkan |
| Perubahan `document.domain` | Memperluas akses ke subdomain | Sedang | Perubahan dibatalkan |
| Akses clipboard | `clipboard.readText` | Sedang | Promise ditolak |
| Akses kredensial | `navigator.credentials.get` | Tinggi | Promise ditolak |
| Pemantau keyboard | Listener `keydown/keyup/keypress` di window/document | Sedang | Hanya tombol panah yang diteruskan |
| Script obfuscated | Analisis skor obfuscation (`_0x`, escape, base64, eval, akses cookie/jaringan) | Rendah/Sedang/Tinggi | Sedang/tinggi di-*neutralize* |
| Script lintas situs | Script dari `data:`, `blob:`, atau IP mentah | Tinggi | Script dinonaktifkan |
| Iframe tersembunyi/overlay | Iframe pihak ketiga tersembunyi atau menutupi halaman | Sedang/Tinggi | Iframe disembunyikan |
| Akses kamera/mikrofon | `getUserMedia` / `getDisplayMedia` | Tinggi | Promise ditolak |
| Akses lokasi | `navigator.geolocation` | Sedang | Permintaan diblokir |
| Payment Request | `PaymentRequest` | Tinggi | Constructor diblokir |
| Kebocoran `postMessage` | Kirim data sensitif ke `*` / origin pihak ketiga | Sedang/Tinggi | Pesan tidak dikirim |
| Fingerprint canvas | `toDataURL` / `getImageData` | Rendah | Dipantau saja |
| Banner cookie | Banner OneTrust | - | Otomatis klik "Reject All" + sembunyikan |

Catatan:
- Yang **Rendah** hanya dipantau (tidak diblokir) karena berisiko merusak situs.
- Semua item bisa diaktifkan/dimatikan sendiri lewat toggle kecil di popup.

### 5. Data per tab
- Statistik popup/redirect, peringatan keamanan, dan hasil pemeriksaan disimpan **per tab** di `chrome.storage.session`.
- Badge ikon mengikuti data tab aktif.
- Navigasi/reload mereset data tab tersebut; menutup tab menghapus datanya.
- Tombol **Reset stats** dan **hapus** hanya berlaku untuk tab aktif.

### 6. Popup
- Status proteksi dan status network ad filter.
- Daftar pemeriksaan keamanan dengan status hijau/merah/abu.
- Toggle **tangani otomatis per item**.
- Peringatan terbaru dikelompokkan per severity (Tinggi/Sedang/Rendah), cukup klik item untuk melihat detail.
- Scrollbar custom (tidak ada scroll horizontal).

### 7. Whitelist domain
- Kecualikan situs aktif dari pemblokiran dan deteksi tanpa mematikan ekstensi.
- Tombol **Whitelist domain ini** / **Batalkan whitelist** di popup.
- Domain dasar disimpan (mis. `example.com`), subdomain ikut dikecualikan.
- Diterapkan lewat aturan `allow` DNR berprioritas tinggi + content script berhenti memblokir/deteksi untuk situs tersebut.
- Pengaturan disimpan di `chrome.storage.local` (`whitelist`).

### 8. Technology profiler
- Mendeteksi library, framework, package, CMS, analytics, CDN, web server, dan hosting yang dipakai halaman beserta versinya bila tersedia.
- Multi-sinyal (mengikuti pendekatan Wappalyzer): global `window`, DOM selector/class, URL `script`/`link`, `performance` resource entries, cookie, `meta` tags, isi inline script, inline CSS, dan **HTTP response header**.
- Header yang dipakai antara lain `Server`, `X-Powered-By`, `X-AspNet-Version`, `X-Generator`, `X-Drupal-Cache`, `X-Shopify-Stage`, `X-Vercel-Id`, `X-Nextjs-Cache`, `CF-Ray`, `Via`, dan `Set-Cookie`.
- Implikasi umum: WooCommerce/Elementor → WordPress, Next.js/Gatsby/Remix → React, Nuxt → Vue.js, SvelteKit → Svelte+Vite, Laravel/CodeIgniter → PHP, Django → Python.
- Versi diambil dari global (mis. `React.version`, `jQuery.fn.jquery`), atribut (`ng-version`), atau pola URL/header (`nginx/1.24`, `PHP/8.2`, `jquery-3.6.0.min.js`, `@5.3.2`, `?ver=`).
- Ditampilkan per tab di popup (nama + badge versi). Versi bersifat best-effort.
- Setiap item punya ikon brand asli dari [Simple Icons](https://simpleicons.org) (CC0 1.0); fallback monogram kategori bila logo belum tersedia. Ikon di-bundle lokal (tanpa request eksternal).

---

## Instalasi

1. Clone repo:
   ```bash
   git clone https://github.com/didikmulyadi/bos-browser-security.git
   ```
2. Buka `chrome://extensions` (atau `edge://extensions`).
3. Aktifkan **Developer mode**.
4. Klik **Load unpacked**, pilih folder repo.
5. Setelah mengubah kode, klik ikon **Reload** pada kartu ekstensi, lalu refresh halaman web (`Ctrl+Shift+R`).

Tidak ada proses build. Semua file dimuat langsung.

---

## Cara pakai

- **Toggle kanan atas**: menyalakan/mematikan seluruh proteksi.
- **Mini toggle di setiap baris pemeriksaan**: mengatur *tangani otomatis* untuk item itu saja.
- **Whitelist domain ini**: mengecualikan situs aktif; klik **Batalkan whitelist** untuk mengaktifkan lagi.
- **Muat ulang halaman**: muncul jika content script halaman belum versi terbaru.
- **Peringatan terbaru**: klik kartu untuk melihat penjelasan, host/detail, waktu, dan status penanganan.
- **Reset stats / hapus**: membersihkan statistik atau peringatan tab aktif.

Jika situs rusak karena sesuatu diblokir, matikan toggle item terkait (mis. akses clipboard atau geolocation), bukan seluruh ekstensi.

---

## Struktur project

```
bos-browser-security/
├── manifest.json
├── rules/
│   └── ads.json                 # 111 rule blokir domain iklan
├── icons/                       # ikon 16/32/48/128
├── docs/                        # situs dokumentasi statis (GitHub Pages)
├── .github/workflows/pages.yml  # deploy docs ke GitHub Pages
├── LICENSE                      # MIT
└── src/
    ├── background.js            # service worker: DNR, data per tab, badge, whitelist, tutup tab iklan
    ├── main/
    │   ├── main-world.js        # hook window.open, Location, blokir redirect
    │   ├── security.js          # hook keamanan, analisis script, auto-handle, OneTrust
    │   └── tech.js              # technology profiler (framework/library + versi)
    ├── content/
    │   └── isolated.js          # filter kosmetik, frame cleaner, meta refresh, bridge pesan, whitelist
    ├── popup/
    │   ├── popup.html
    │   ├── popup.css
    │   └── popup.js
    └── shared/
        ├── patterns.js          # daftar domain iklan + helper URL
        ├── checks.js            # daftar key pemeriksaan + default auto-handle
        └── tech-icons.js        # logo brand (Simple Icons, CC0) untuk profiler
```

### Alur data

```
MAIN world (security.js)
   deteksi → window.postMessage({__adgSec})
        ↓
ISOLATED world (isolated.js)
   chrome.runtime.sendMessage
        ↓
background.js
   chrome.storage.session: stats_<tabId>, security_<tabId>
        ↓
popup.js
   menampilkan statistik & peringatan tab aktif
```

Konfigurasi (proteksi dan map `autoHandle` per item) disimpan di `chrome.storage.local`.

---

## Permission

| Permission | Alasan |
|---|---|
| `declarativeNetRequest` | Memblokir request iklan di level jaringan |
| `storage` | Menyimpan pengaturan dan data per tab |
| `tabs` | Query tab aktif, badge per tab, menutup tab iklan |
| `webRequest` | Membaca header respons (server/CDN/framework) untuk profiler teknologi |
| `host_permissions: <all_urls>` | Injeksi content script dan membaca URL tab |

Ekstensi **tidak mengirim data ke mana pun**. Semua deteksi dan penanganan terjadi lokal.

---

## Batasan

- Bukan pengganti penuh uBlock Origin/EasyList. Daftar domain masih statis dan terbatas; bisa diperluas di `src/shared/patterns.js` lalu sinkronkan `rules/ads.json`.
- JavaScript tidak bisa membaca cookie domain lain (same-origin policy). Yang dideteksi adalah **upaya eksfiltrasi** dan penulisan cookie lintas domain.
- Script inline yang diinjeksi parser awal bisa sudah sempat dieksekusi sebelum dianalisis. Script yang disisipkan dinamis (`appendChild`/`insertBefore`/`append`) diperiksa dan di-*neutralize* sebelum dieksekusi.
- Auto-handle berpotensi merusak fitur situs (clipboard, geolocation, passkey, dsb). Default aktif; matikan per item jika perlu.
- Frame yang di-sandbox tanpa `allow-scripts` sengaja dilewati agar tidak memicu error.
- Di halaman challenge Cloudflare ("Just a moment..."/security verification), auto-handle keamanan dinonaktifkan sementara agar verifikasi bisa selesai. Jika masih gagal, whitelist domain tersebut sementara.
- Data per tab bersifat sesi: hilang saat tab ditutup, halaman dinavigasi ulang, atau ekstensi di-reload.

### Challenge Cloudflare (`Just a moment...`)
Jika verifikasi berputar terus dan Network menampilkan `401` pada `/cdn-cgi/challenge-platform/.../pat/`:
- Itu respons dari Cloudflare, bukan pemblokiran ekstensi. Domain challenge (`cloudflare.com`, `cloudflareinsights.com`, `hcaptcha.com`, `recaptcha.net`, `gstatic.com`) sudah di-*allow* di `rules/allow.json` dan bypass di hooks.
- Reload paksa (`Ctrl+Shift+R`), lalu bersihkan cookie/site data situs.
- Izinkan cookie pihak ketiga untuk `challenges.cloudflare.com` (atau matikan blokir cookie pihak ketiga untuk situs itu sementara).
- Coba **Whitelist domain ini** atau nonaktifkan ekstensi sebentar untuk memastikan penyebabnya.
- Pastikan jam sistem benar dan tidak memakai VPN/proxy mencurigakan.
- Ekstensi tidak mencoba melewati verifikasi Cloudflare.
- Tidak memblokir iklan yang disajikan langsung dari domain situs (first-party) tanpa indikator tambahan.

---

## Pengembangan

- Edit file lalu reload ekstensi. Tidak ada bundler.
- Validasi sintaks:
  ```bash
  node --check src/background.js
  node --check src/content/isolated.js
  node --check src/main/main-world.js
  node --check src/main/security.js
  node --check src/popup/popup.js
  node --check src/shared/patterns.js
  node --check src/shared/checks.js
  ```
- Validasi JSON:
  ```bash
  node -e "JSON.parse(require('fs').readFileSync('manifest.json')); JSON.parse(require('fs').readFileSync('rules/ads.json')); console.log('ok')"
  ```
- Saat menambah domain iklan: tambahkan ke `AD_HOSTS` di `src/shared/patterns.js` dan regenerate `rules/ads.json` dengan format yang sama (`urlFilter: "||domain^"`).
- Saat menambah pemeriksaan baru: tambahkan key di `src/shared/checks.js`, `buildChecks()` di `security.js`, dan daftar `CHECKS` + `SEC_INFO` di `popup.js`.
- Naikkan `version` di `manifest.json` setiap rilis.

---

## Lisensi

Dirilis di bawah [MIT License](LICENSE). Copyright (c) 2026 didikmulyadi.

## Dokumentasi

- Situs dokumentasi statis: `docs/index.html` dan `docs/docs.html`
- Deploy otomatis ke GitHub Pages lewat `.github/workflows/pages.yml` (Settings → Pages → Source: GitHub Actions)
- Alternatif tanpa Actions: Settings → Pages → Deploy from a branch → `main` / `docs`

---

## Disclaimer

Ekstensi ini dibuat untuk membantu privasi dan keamanan browsing. Deteksi bisa menghasilkan false positive/negative. Gunakan dengan risiko sendiri dan sesuaikan toggle bila ada situs yang tidak berjalan normal.
