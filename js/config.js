/* =====================================================================
 *  KONFIGURASI FRONTEND — satu-satunya berkas yang WAJIB Anda ubah
 * ===================================================================== */
window.APP_CONFIG = {
  // ⚠️ Ganti dengan URL /exec dari Deploy → Web app di Google Apps Script
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyV2bU9HSIP42WAJ20N6Ry_Jm8g_LXloj1K7T2Kfp2Xc9MCHbce7leMPNWISZkGv_w/exec',

  // Identitas tampilan
  APP_NAME: 'Event Management',
  APP_SUB: 'Gontor 3 Darussalam',
  KAMPUS: "Kampus Darul Ma'rifat",
  KOTA: 'Kediri',

  // Unggahan berkas (dikompres di browser sebelum dikirim)
  MAX_IMAGE_PX: 1600,
  IMAGE_QUALITY: 0.8,
  MAX_PDF_MB: 5,

  // Muat ulang data otomatis saat tab dibuka kembali setelah X menit
  AUTO_REFRESH_MIN: 3
};
