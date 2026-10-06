# 📋 Panduan Instalasi — Event Management Gontor 3

Panduan ini untuk pemula. Ikuti urutannya: **Bagian A (backend)** dulu, karena URL dari Apps Script dibutuhkan sebelum frontend diunggah ke GitHub.

| Berkas | Tujuan |
|---|---|
| `Kode.gs` | Ditempel ke editor Google Apps Script (backend) |
| `appsscript.json` | Opsional, pengaturan zona waktu & web app |
| `event-management-gontor3.zip` | Frontend untuk GitHub Pages |

---

## A. BACKEND — Google Apps Script (± 10 menit)

### A1. Buat proyek & tempel kode
1. Buka **https://script.google.com** → klik **Proyek baru** (New project).
2. Ganti nama proyek (kiri atas) menjadi `Event Management Gontor 3`.
3. Hapus semua isi `Code.gs`, lalu **tempel seluruh isi `Kode.gs`**. Tekan **Ctrl+S**.
4. *(Opsional, disarankan)* Klik ⚙️ **Project Settings** → centang **Show "appsscript.json" manifest file in editor**. Kembali ke Editor, buka `appsscript.json`, ganti isinya dengan berkas `appsscript.json` yang diberikan, lalu simpan. Langkah ini memastikan zona waktu **Asia/Jakarta**.

### A2. Jalankan setup (HANYA SEKALI)
1. Di bilah atas editor, pilih fungsi **`setupAppEnvironment`**, lalu klik **▶ Run**.
2. Akan muncul **Review permissions** → pilih akun Google Anda.
3. Jika muncul *"Google hasn't verified this app"*: klik **Advanced** → **Go to Event Management Gontor 3 (unsafe)** → **Allow**. Ini normal karena skrip ini milik Anda sendiri.
4. Buka **Execution log**, lalu pastikan muncul tanda ✅ dan baris:
   `🔐 Login Admin awal → username: admin • kata sandi: gontor3`
5. Cek Google Drive Anda. Seharusnya sudah ada folder **📁 Event Management Gontor 3** berisi spreadsheet database dan 6 folder berkas.

> ⚠️ **Jangan jalankan `setupAppEnvironment` dua kali.** Skrip akan menolak bila sudah pernah dijalankan.

### A3. (Opsional) Data contoh untuk mencoba
- Jalankan **`isiDataContoh`** untuk mengisi 2 vendor, 8 barang, dan 3 acara contoh, beserta akun vendor contoh `vendor1` / `vendor123`.
- Setelah selesai mencoba, jalankan **`hapusDataContoh`**. Semua data berawalan `DEMO-` akan terhapus.

### A4. Deploy sebagai Web App
1. Klik **Deploy** (kanan atas) → **New deployment**.
2. Klik ⚙️ di samping *Select type* → pilih **Web app**.
3. Isi:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Klik **Deploy** → **salin URL Web app** (berakhiran `/exec`).
5. Uji dengan membuka URL itu di browser. Hasil yang benar berupa JSON, misalnya `{"success":true,"app":"Event Management Gontor 3",...,"ready":true}`.

> 🔒 *"Anyone"* aman: setiap aksi tetap wajib login, dan data vendor disaring di server.

### A5. Cara memperbarui backend nanti (URL tetap sama)
**Deploy** → **Manage deployments** → klik ✏️ (Edit) → **Version: New version** → **Deploy**.
Jangan membuat *New deployment* baru, karena URL-nya akan berubah.

---

## B. FRONTEND — isi alamat backend

1. Ekstrak `event-management-gontor3.zip`. Hasilnya sebuah folder **`event-management-gontor3`**.
   Di dalamnya **langsung** ada `index.html`, folder `css`, dan folder `js`.
2. Buka `js/config.js` dengan Notepad, lalu ganti baris ini:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec',
   ```
   dengan URL `/exec` dari langkah A4. Simpan.
3. *(Opsional)* Klik dua kali `index.html` untuk mencoba langsung di browser sebelum diunggah.

---

## C. GITHUB PAGES — unggah lewat terminal

> 📁 **Folder kerja = `event-management-gontor3`**, yaitu folder yang berisi `index.html`.
> Semua perintah `git` dijalankan **di dalam folder ini**, jangan di folder induknya.
> ❗ Jangan gunakan tombol "Upload files" di web GitHub, karena struktur folder `css/` dan `js/` akan rusak.

1. **Install Git:** https://git-scm.com/download/win (pengaturan default). Cek dengan `git --version`.
2. **Identitas (sekali saja):**
   ```bash
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@contoh.com"
   ```
3. **Buat repository** di github.com: tombol **+** → **New repository**. Contoh nama `event-gontor3`, pilih **Public**, dan **jangan** centang README.
4. **Masuk ke folder kerja:** buka folder `event-management-gontor3` di File Explorer, klik address bar, ketik `powershell`, lalu tekan Enter. Ketik `dir`, dan pastikan `index.html` terlihat.
5. **Kirim ke GitHub** (satu per satu):
   ```bash
   git init
   git add .
   git commit -m "Upload pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/event-gontor3.git
   git push -u origin main
   ```
   Saat diminta **password**, tempel **Personal Access Token**, bukan password GitHub. Buat token di https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo**.
   Saat token ditempel, layar memang tetap kosong. Itu normal.
6. **Aktifkan Pages:** repo → **Settings** → **Pages** → Source: *Deploy from a branch* → Branch **main** / **(root)** → **Save**. Centang **Enforce HTTPS**.
7. Tunggu 1–2 menit. Situs Anda akan tersedia di: `https://USERNAME.github.io/event-gontor3/`

**Update di kemudian hari:**
```bash
git add .
git commit -m "Perbarui tampilan"
git push
```
Jika tampilan belum berubah, tekan **Ctrl+Shift+R**.

---

## D. PENGGUNAAN PERTAMA

1. Buka situs, lalu masuk dengan **admin** / **gontor3**. Aplikasi akan langsung meminta Anda **mengganti kata sandi**.
2. **Pengaturan:** isi No. WhatsApp Admin, nama penanda tangan PDF, dan ambang hari tagihan (bawaan 14 hari).
3. **Vendor & Akun:** tambahkan vendor. Klik **Buat akun** untuk setiap vendor, lalu kirim kredensialnya lewat tombol WhatsApp.
4. **Katalog Barang:** isi daftar barang, harga vendor, dan harga estimasi.
5. **Daftar Acara:** buat acara → **Kelola Pesanan** → **PDF Estimasi** → kirim ke panitia.
6. Saat membayar vendor, buka **Pembayaran Vendor** → **Catat Pembayaran**. Satu transfer bisa dibagi ke beberapa acara.
7. Saat menerima dana dari panitia, buka **Setoran Panitia** → **Catat Setoran**.

---

## E. MASALAH UMUM

| Gejala | Solusi |
|---|---|
| Login: *"GAS_URL belum diisi"* | Isi `js/config.js`, lalu `git add .` → `commit` → `push` |
| *"Respons server tidak valid"* | Deploy ulang dengan **Who has access: Anyone**, dan pastikan URL berakhiran `/exec` |
| *"Server belum disiapkan"* | Jalankan `setupAppEnvironment` di editor Apps Script |
| Lupa kata sandi Admin / akun terkunci | Di editor Apps Script, jalankan **`resetPasswordAdmin`**. Sandi kembali menjadi `gontor3` |
| Vendor lupa kata sandi | Admin → Vendor & Akun → **Reset sandi** |
| Perubahan kode backend tidak berlaku | Manage deployments → Edit → **New version** |
| Halaman 404 di GitHub Pages | Pastikan `index.html` ada di root repository (bukan di subfolder) |
| Tampilan tanpa warna (CSS 404) | Folder `css/` & `js/` harus ikut ter-push. Gunakan terminal, bukan upload web |
| Tanggal bergeser 1 hari | Pastikan `appsscript.json` memakai `"timeZone": "Asia/Jakarta"` |

---

*Jazakumullah khairan — semoga menjadi amal jariyah dan memudahkan amanah pengelolaan acara pondok.*
