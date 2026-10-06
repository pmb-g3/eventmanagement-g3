/* =====================================================================
 *  API.JS — komunikasi ke Google Apps Script + penyimpanan lokal
 *  Semua aksi via POST (token tidak pernah muncul di URL)
 *  Content-Type text/plain → menghindari CORS preflight yang diblok GAS
 * ===================================================================== */

const Store = {
  K_TOKEN: 'emg3_token',
  K_CACHE: 'emg3_cache',
  safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } },
  get token() {
    return this.safe(() => sessionStorage.getItem(this.K_TOKEN) || localStorage.getItem(this.K_TOKEN), null);
  },
  setToken(t, remember) {
    this.safe(() => {
      sessionStorage.removeItem(this.K_TOKEN); localStorage.removeItem(this.K_TOKEN);
      (remember ? localStorage : sessionStorage).setItem(this.K_TOKEN, t);
      localStorage.setItem('emg3_remember', remember ? '1' : '0');
    });
  },
  get remember() { return this.safe(() => localStorage.getItem('emg3_remember') !== '0', true); },
  clear() {
    this.safe(() => {
      sessionStorage.removeItem(this.K_TOKEN); localStorage.removeItem(this.K_TOKEN);
      localStorage.removeItem(this.K_CACHE); sessionStorage.removeItem(this.K_CACHE);
    });
  },
  // Cache data terakhir → tampilan instan saat aplikasi dibuka ulang
  saveCache(data) {
    this.safe(() => {
      const s = JSON.stringify({ t: Date.now(), data });
      (this.remember ? localStorage : sessionStorage).setItem(this.K_CACHE, s);
    });
  },
  loadCache() {
    return this.safe(() => {
      const raw = sessionStorage.getItem(this.K_CACHE) || localStorage.getItem(this.K_CACHE);
      return raw ? JSON.parse(raw) : null;
    }, null);
  }
};

const API = {
  get url() { return window.APP_CONFIG.GAS_URL; },
  configured() { return !!this.url && !/GANTI_DENGAN/.test(this.url); },
  async call(action, data = {}, opts = {}) {
    if (!this.configured()) {
      return { success: false, message: 'GAS_URL belum diisi. Buka js/config.js lalu tempel URL /exec dari Apps Script.' };
    }
    const body = JSON.stringify({ action, data, token: Store.token });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout || 90000);
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body, redirect: 'follow', signal: ctrl.signal
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch (e) {
        throw new Error('Respons server tidak valid. Pastikan Web App di-deploy dengan akses "Anyone" dan URL /exec benar.');
      }
      if (json.code === 'AUTH' && action !== 'login' && typeof App !== 'undefined') App.sessionExpired(json.message);
      return json;
    } catch (err) {
      const msg = err.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.'
        : !navigator.onLine ? 'Tidak ada koneksi internet.' : (err.message || 'Gagal terhubung ke server.');
      return { success: false, message: msg, network: true };
    } finally {
      clearTimeout(timer);
    }
  }
};
