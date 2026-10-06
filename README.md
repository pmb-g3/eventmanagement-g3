# Event Management Gontor 3

Aplikasi web untuk manajemen penyewaan perlengkapan acara pondok dan **pengingat pembayaran vendor**.

- **Frontend:** HTML/CSS/JS murni, di-hosting di GitHub Pages (folder ini).
- **Backend:** Google Apps Script sebagai REST API (berkas `Kode.gs`, terpisah dan tidak ikut di repo ini).
- **Database:** Google Sheets. **Berkas:** Google Drive (tidak dibagikan publik).

## Struktur

```
index.html          ← halaman utama (WAJIB di root repository)
css/style.css       ← desain (hijau emerald, responsif HP & PC, mode gelap)
js/config.js        ← ⚠️ isi GAS_URL di sini
js/ui.js            ← ikon, format, modal, tabel data
js/api.js           ← komunikasi ke Apps Script (fetch POST text/plain)
js/admin.js         ← halaman Admin
js/vendor.js        ← Portal Vendor
js/app.js           ← login, sesi, router
PANDUAN-INSTALASI.md
```

## Konfigurasi

Buka `js/config.js`, lalu ganti `GAS_URL` dengan URL `/exec` dari Deploy → Web app di Apps Script.

## Keamanan

Repository ini publik, tetapi **tidak berisi data atau rahasia apa pun**. Semua data hanya bisa diakses setelah login, dan penyaringan data per vendor dilakukan di server (Apps Script).

Panduan lengkap ada di **PANDUAN-INSTALASI.md**.
