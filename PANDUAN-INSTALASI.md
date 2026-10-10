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

## E. FITUR TAMBAHAN (versi 1.1 – 1.6)

### E1. Import katalog dari Excel
1. Buka **Katalog Barang**, lalu klik **Import Excel** → **Template Excel**.
2. Isi sheet **Katalog** sesuai sheet **Petunjuk**. Kolom Vendor & Kategori sudah berupa *dropdown*.
   - Kolom wajib: **Nama Barang**, **Vendor**, **Harga Vendor**.
   - Harga ditulis angka saja, misalnya `1500000`.
   - Baris yang diawali `CONTOH` otomatis dilewati.
3. Unggah berkas `.xlsx` atau `.csv`. Aplikasi menampilkan **pratinjau** dan menandai baris yang error beserta alasannya.
4. Klik **Impor**. Barang dengan nama & vendor yang sama akan **diperbarui** harganya, tidak dobel.
5. Untuk mengubah harga massal: klik **Ekspor Excel**, ubah harga di Excel, lalu impor kembali.

### E2. Edit format pesan WhatsApp
- Klik **Edit Format** di kartu pengingat konsumsi, di halaman Setoran Panitia, atau di **Pengaturan → Format Pesan WhatsApp**.
- Kata dalam `{kurung kurawal}` otomatis diganti data asli, misalnya `{acara}` dan `{kekurangan}`. Klik tombol *Sisipkan data* untuk memasukkannya.
- Gunakan **Kembalikan bawaan** untuk kembali ke format awal.

### E3. Nonaktifkan acara & akun (v1.2)
- **Acara:** buka detail acara, lalu klik **Nonaktifkan**. Acara akan hilang dari daftar, pengingat, total Beranda, dan portal vendor, tetapi datanya tetap tersimpan.
  Untuk melihatnya lagi, centang **Lihat acara nonaktif** di Daftar Acara, lalu klik **Aktifkan kembali**.
- **Akun:** buka **Vendor & Akun**, lalu klik **Nonaktifkan** pada tabel akun. Pengguna itu langsung keluar dan tidak bisa login sampai diaktifkan lagi.
- Kolom "Umur" kini bernama **Jatuh Tempo**. Jatuh tempo = jumlah hari di Pengaturan (bawaan 14) setelah acara selesai/dibongkar.
- Kolom baru di Google Sheets ditambahkan **otomatis**. Tidak perlu menjalankan setup ulang.

### E4. Spek ukuran & satuan m² di pesanan (v1.3)
- Di **Kelola Pesanan**, setiap barang punya kolom **Spek / Ukuran** dan pilihan **satuan**.
- Jika satuannya **m²**, tulis ukurannya seperti `6x6`, `6 x 6`, atau `4,5x10`, lalu isi jumlah unitnya.
  **Jumlah m²** akan terhitung otomatis. Contoh: 2 unit × 6×6 = **72 m²**, sehingga biayanya 72 × harga per m².
- Untuk satuan lain (unit, buah, dll.), Spek hanya berupa catatan dan jumlah diisi manual.
- Spek ikut tampil di tabel barang, PDF estimasi & rekap, serta portal vendor.
- Tips: agar langsung bersatuan m² saat ditambahkan dari katalog, atur satuan barang tenda di **Katalog Barang** menjadi `m²`.
- **Lama sewa (Hari)** (v1.4): hari ke-1 dihitung 100% harga, hari ke-2 dan seterusnya **30% per hari**. Contoh: sewa 3 hari = 1 + 0,3 + 0,3 = **×1,6** dari harga.
  - Nilai bawaannya mengikuti durasi acara. Bisa diubah per barang atau lewat **Terapkan ke semua**.
  - Persentasenya bisa diganti di **Pengaturan → Tarif sewa hari ke-2 dst**. Pesanan lama tetap memakai tarif saat disimpan, kecuali jumlah harinya diubah.
- **Pembaruan otomatis** (v1.4): jika ada versi baru di GitHub Pages, aplikasi otomatis memuat ulang ke versi terbaru. Tidak perlu lagi menghapus cache.

### E5. Urutan & warna acara, pencarian barang, potongan harga (v1.5)
**Urutan Daftar Acara**
1. Paling atas: acara yang **sedang berjalan atau diproses** dan belum beres (vendor atau setoran belum lunas).
2. Berikutnya: acara lain yang belum beres, dari yang terbaru.
3. Paling bawah: acara yang **sudah lunas dan bebas tanggungan**. Acara yang paling lama berada di urutan terakhir.

**Warna kartu menunjukkan status setoran panitia**

| Warna | Arti |
|---|---|
| 🔴 Merah | Panitia **belum setor** sama sekali (ditampilkan beserta kekurangannya) |
| 🟠 Oranye | Panitia **proses cicil** (sudah setor sebagian) |
| 🟢 Hijau | Panitia **lunas, bebas tanggungan** |
| Polos | Acara belum punya pesanan |

Klik label warna di atas daftar (mis. *Belum setor 3*) untuk menyaring. Klik sekali lagi untuk melepas saringan.

**Pencarian barang di Kelola Pesanan**
- Ketik di kotak **Cari & tambah barang**, misalnya `tenda 6` atau `kursi`.
- Pilih barang dengan klik, atau gunakan ↑ ↓ lalu **Enter**. **Esc** mengosongkan pencarian.
- Barang yang sudah ada di pesanan diberi tanda **sudah 1×**. Jika barang yang sama ditambahkan lagi, barang itu tetap masuk sebagai baris baru.

**Potongan harga dari vendor (opsional)** — di form **Catat Pembayaran Vendor**:

| Jenis | Diisi di | Siapa yang tahu |
|---|---|---|
| **Potongan acara** | Kolom *Potongan acara* pada baris acara | Tampil di **PDF rekap acara** (Total harga vendor − Potongan = Total biaya riil setelah potongan). Biaya untuk panitia ikut turun. |
| **Potongan gabungan** | Kotak *Potongan gabungan dari total* (hanya Admin) | **Hanya Admin.** Tidak tampil di PDF panitia; panitia tetap menyetor sesuai biaya acaranya. Selisihnya menjadi dana Admin. |

- Potongan gabungan dibagi otomatis ke acara yang dibayar, sesuai sisa yang belum tertutup uang.
- Tombol **Lunasi acara paling lama dulu** sudah memperhitungkan potongan. Contoh: tagihan 12.500.000 dengan potongan gabungan 500.000 → nominal uang otomatis 12.000.000 dan semua acara tercatat **LUNAS**.
- Pembayaran boleh bernilai Rp 0 jika isinya hanya potongan.
- Potongan tampil di Riwayat Pembayaran, tabel per vendor, detail acara, dan portal vendor. Tanda 🔒 *gab.* berarti potongan gabungan yang hanya terlihat oleh Admin.

### E6. Bayar sesuai tanggungan, nota per pembayaran, foto per barang (v1.6)
**Tombol "Sesuai tanggungan" di Catat Pembayaran Vendor**
- Setiap baris acara punya tombol ⚡ **Sesuai tanggungan Rp …**.
- Klik tombol pada acara-acara yang ingin dibayar. Kolom Bayar terisi sebesar sisa tagihan acara itu, dan **nominal total terjumlah otomatis**.
- Klik sekali lagi untuk membatalkan pilihan.
- Tulisan hijau **Setoran tersedia Rp …** menandai acara yang setoran panitianya sudah masuk tetapi belum disalurkan ke vendor.

**Nota PDF per pembayaran**
- Ada tombol **Nota** di Riwayat Pembayaran, di tab Pembayaran pada detail acara, dan di halaman **Bukti Bayar** portal vendor.
- Isinya: vendor, tanggal & metode bayar, daftar **acara yang dibayar** (total sewa, uang yang dibayar pada nota itu, potongan, dan status terkini), lalu **rincian barang yang disewa** per acara secara ringkas.
- Nota ini cocok diberikan ke admin/owner vendor agar mereka tahu acara mana saja yang sudah dibayar. Harga estimasi tidak pernah dicantumkan.
- Vendor hanya dapat mengunduh nota pembayaran miliknya sendiri.

**Foto pemasangan per barang** (Admin & Vendor)
- Setiap barang punya tombol 📷 **Foto**:
  - Admin: kolom *Foto* di tab Barang pada detail acara dan di menu Pesanan Barang.
  - Vendor: tombol 📷 di samping tiap barang.
- Di galeri foto: unggah beberapa foto sekaligus, ketuk foto untuk memperbesar, dan ketuk 🗑 untuk menghapus. Foto yang salah bisa dihapus lalu diganti.
- Vendor hanya melihat dan menghapus foto pada barang miliknya.
- Foto umum per acara tetap ada lewat tombol **Foto** pada kartu acara (vendor) atau **Foto Pemasangan** di detail acara (admin).

**Vendor dapat mengubah status pasang sendiri**
- Pilihannya: **Belum → Penataan → Terpasang → Dibongkar**.
- Ubah langsung dari pilihan di samping tiap barang, atau gunakan **Ubah Status Serentak & Foto** untuk banyak barang sekaligus. Tersedia tombol *Semua terpasang* dan *Semua dibongkar*.

### E7. Cara memperbarui aplikasi yang sudah terpasang
1. **Backend:** buka editor Apps Script, ganti seluruh isi `Kode.gs` dengan versi baru, lalu simpan.
   Setelah itu buka **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
   Jangan jalankan `setupAppEnvironment` lagi. URL tetap sama.
2. **Frontend:** ekstrak ZIP baru, lalu salin semua berkasnya ke folder repository Anda dan timpa berkas lama, **kecuali `js/config.js`**. Berkas itu berisi GAS_URL Anda.
   Setelah itu jalankan:
   ```bash
   git add .
   git commit -m "Update v1.6"
   git push
   ```

---

## F. MASALAH UMUM

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
| Muncul pesan "butuh backend terbaru" | Lakukan langkah E5 nomor 1 (Kode.gs baru + New version) |
| Import Excel: "Format .xls belum didukung" | Di Excel: File → Save As → *Excel Workbook (.xlsx)* |
| Import Excel: vendor "belum terdaftar" | Samakan ejaan dengan sheet *Daftar Vendor*, tambahkan vendor di aplikasi, atau centang *Buat vendor baru otomatis* |
| Tanggal bergeser 1 hari | Pastikan `appsscript.json` memakai `"timeZone": "Asia/Jakarta"` |

---

*Jazakumullah khairan — semoga menjadi amal jariyah dan memudahkan amanah pengelolaan acara pondok.*
