/* =====================================================================
 *  APP.JS — inti aplikasi: login, sesi, router, kerangka tampilan
 * ===================================================================== */

const ADMIN_NAV = [
  { r: 'beranda', label: 'Beranda & Pengingat', short: 'Beranda', icon: 'home', badge: () => App.reminderCount() },
  { r: 'acara', label: 'Daftar Acara', short: 'Acara', icon: 'calendar' },
  { r: 'pesanan', label: 'Pesanan Barang', short: 'Pesanan', icon: 'box' },
  { r: 'pembayaran', label: 'Pembayaran Vendor', short: 'Bayar', icon: 'wallet' },
  { r: 'setoran', label: 'Setoran Panitia', short: 'Setoran', icon: 'coins' },
  { r: 'katalog', label: 'Katalog Barang', short: 'Katalog', icon: 'tag' },
  { r: 'vendor', label: 'Vendor & Akun', short: 'Vendor', icon: 'store' },
  { r: 'dokumen', label: 'Dokumen & Rekap', short: 'Dokumen', icon: 'file' },
  { r: 'pengaturan', label: 'Pengaturan', short: 'Pengaturan', icon: 'settings' }
];
const ADMIN_BOTTOM = ['beranda', 'acara', 'pembayaran', 'setoran'];
const VENDOR_NAV = [
  { r: 'beranda', label: 'Beranda', short: 'Beranda', icon: 'home' },
  { r: 'acara', label: 'Acara Saya', short: 'Acara Saya', icon: 'calendar' },
  { r: 'bukti', label: 'Bukti Bayar', short: 'Bukti Bayar', icon: 'receipt' },
  { r: 'profil', label: 'Profil', short: 'Profil', icon: 'user' }
];

const App = {
  data: null,
  maps: {},
  route: { name: 'beranda', id: '' },
  lastSync: 0,
  syncing: false,
  loginTab: 'admin',

  /* ---------- Mulai ---------- */
  init() {
    window.addEventListener('hashchange', () => this.onRoute());
    document.addEventListener('click', (e) => this.onClick(e));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.data && Date.now() - this.lastSync > window.APP_CONFIG.AUTO_REFRESH_MIN * 60000) this.refresh(true);
    });
    window.addEventListener('online', () => { this.updateSync(); if (this.data) this.refresh(true); });
    window.addEventListener('offline', () => this.updateSync());

    const token = Store.token;
    const cache = Store.loadCache();
    if (token && cache && cache.data) {
      // Tampilkan data terakhir seketika, lalu sinkronkan di latar belakang
      this.setData(cache.data, false);
      this.enter();
      this.refresh(true);
    } else if (token) {
      this.hideSplash();
      this.showSkeletonShell();
      this.refresh(false).then((ok) => { if (ok) this.enter(); });
    } else {
      this.renderLogin();
    }
  },
  hideSplash() {
    const s = document.getElementById('splash');
    if (s && !s.classList.contains('out')) { s.classList.add('out'); setTimeout(() => s.remove(), 450); }
  },

  /* ---------- Data ---------- */
  setData(d, save = true) {
    this.data = d;
    const m = { vendor: {}, acara: {}, katalog: {}, pembayaran: {}, berkas: {}, users: {} };
    (d.vendor || []).forEach((x) => (m.vendor[x.id_vendor] = x));
    (d.acara || []).forEach((x) => (m.acara[x.id_acara] = x));
    (d.katalog || []).forEach((x) => (m.katalog[x.id_barang] = x));
    (d.pembayaran || []).forEach((x) => (m.pembayaran[x.id_pembayaran] = x));
    (d.berkas || []).forEach((x) => (m.berkas[x.id_berkas] = x));
    (d.users || []).forEach((x) => (m.users[x.id_user] = x));
    this.maps = m;
    if (save) { this.lastSync = Date.now(); Store.saveCache(d); }
  },
  get isAdmin() { return this.data && this.data.role === 'admin'; },
  get today() { return (this.data && this.data.today) || toYMD(new Date()); },
  vName(id) { const v = this.maps.vendor[id]; return v ? v.nama_vendor : '—'; },
  acara(id) { return this.maps.acara[id] || { nama_acara: '(acara terhapus)' }; },
  finA(id) { return (this.data.fin.acara || {})[id] || {}; },
  avOf(ida, idv) { return this.data.fin.av.find((x) => x.id_acara === ida && x.id_vendor === idv); },

  async refresh(silent) {
    if (this.syncing) return false;
    this.syncing = true;
    this.updateSync();
    const btn = document.getElementById('btn-sync');
    if (btn) btn.classList.add('spin');
    const res = await API.call('bootstrap');
    this.syncing = false;
    if (btn) btn.classList.remove('spin');
    if (res.success) {
      const firstLoad = !this.data;
      this.setData(res.data);
      this.updateSync();
      if (!firstLoad && document.getElementById('app-shell').hidden === false) this.renderChrome(), this.renderView(false);
      return true;
    }
    this.updateSync(res.message);
    if (res.code === 'AUTH') return false;
    if (!silent) toast(res.message, 'error');
    if (!this.data) { this.renderLogin(); toast(res.message, 'error'); }
    return false;
  },

  /* Panggil aksi tulis → server mengembalikan data terbaru → render ulang */
  async write(action, payload, opts = {}) {
    const btn = opts.btn;
    setBusy(btn, true, opts.busyText);
    const res = await API.call(action, payload);
    setBusy(btn, false);
    if (res.success) {
      if (res.data) this.setData(res.data);
      if (opts.close !== false) Modal.closeAll();
      if (opts.toast !== false && res.message) toast(res.message, 'success');
      this.renderChrome();
      this.renderView(false);
      if (opts.after) opts.after(res);
    } else if (res.code !== 'AUTH') {
      toast(res.message || 'Terjadi kesalahan.', 'error', 5500);
    }
    return res;
  },

  async openFile(idBerkas, title, btn) {
    setBusy(btn, true, 'Memuat...');
    const res = await API.call('getFile', { id_berkas: idBerkas });
    setBusy(btn, false);
    if (!res.success) return toast(res.message, 'error');
    showFile(res.file, title);
  },

  reminderCount() {
    if (!this.isAdmin) return 0;
    const t = this.data.fin.total;
    const today = this.today, besok = addDays(today, 1);
    const ks = (this.data.konsumsi || []).filter((k) => !k.sudah_diingatkan && (k.tanggal === today || k.tanggal === besok)).length;
    return (t.n_lewat || 0) + (t.n_setoran_lewat || 0) + ks;
  },

  /* ---------- Login ---------- */
  renderLogin() {
    this.hideSplash();
    document.getElementById('app-shell').hidden = true;
    const v = document.getElementById('login-view');
    v.hidden = false;
    const cfg = window.APP_CONFIG;
    const th = document.documentElement.getAttribute('data-theme') === 'dark';
    v.innerHTML = `
      <button class="icon-btn theme-fab" data-act="theme" aria-label="Ganti tema">${ic(th ? 'sun' : 'moon', 18)}</button>
      <div class="login-wrap">
        <div class="login-logo"><span class="logo-mark lg"></span><span class="chk">${ic('check', 16)}</span></div>
        <div><span class="eyebrow">Event Management</span></div>
        <h1>${esc(cfg.APP_SUB)}</h1>
        <p class="sub">Sistem Logistik Acara & Pengingat Pembayaran Vendor</p>
        <form class="login-card" id="login-form" autocomplete="on">
          ${seg('role', [{ value: 'admin', label: ic('shield', 17) + ' Admin / Asatidz' }, { value: 'vendor', label: ic('store', 17) + ' Rekan Vendor' }], this.loginTab)}
          <div class="field"><label for="lg-user"><span id="lg-user-l">Username Admin</span><span class="badge b-ok no-dot">Wajib</span></label>
            <div class="input-group"><span class="pre">${ic('user', 18)}</span><input class="input" id="lg-user" name="username" autocomplete="username" placeholder="misal: admin" required autocapitalize="none" spellcheck="false"></div></div>
          <div class="field"><label for="lg-pass">Kata Sandi <button type="button" class="btn-ghost" style="border:0;background:none;color:var(--primary-text);font-weight:600;cursor:pointer" data-act="forgot">Lupa sandi?</button></label>
            <div class="input-group"><span class="pre">${ic('lock', 18)}</span><input class="input" id="lg-pass" type="password" name="password" autocomplete="current-password" placeholder="••••••••" required>
            <button type="button" class="pw-toggle" data-act="pw-toggle" aria-label="Tampilkan sandi">${ic('eyeOff', 18)}</button></div></div>
          <div class="row between"><label class="check"><input type="checkbox" id="lg-remember" ${Store.remember ? 'checked' : ''}> Ingat di perangkat ini</label><span class="small muted">Amanah & Terjaga</span></div>
          <button class="btn btn-grad btn-lg btn-block" type="submit" id="lg-btn">Masuk ke Sistem ${ic('arrowR', 18)}</button>
          <div class="login-sync"><span class="i">${ic('cloud', 20)}</span><div>Tersinkronisasi aman dengan <b>Google Apps Script</b> & <b>Google Drive</b>.</div></div>
          ${API.configured() ? '' : `<div class="callout warn">${ic('alert', 18)}<div><b>GAS_URL belum diisi.</b> Buka <span class="mono">js/config.js</span> dan tempel URL /exec Web App Anda.</div></div>`}
        </form>
        <div class="login-foot"><div>${ic('calendar', 14)} Tahun Ajaran ${hijriYear()} H / ${new Date().getFullYear()} M • ${esc(cfg.KAMPUS)} ${esc(cfg.KOTA)}</div></div>
      </div>`;
    const updLabel = (role) => {
      this.loginTab = role;
      document.getElementById('lg-user-l').textContent = role === 'admin' ? 'Username Admin' : 'Username Vendor';
      document.getElementById('lg-user').placeholder = role === 'admin' ? 'misal: admin' : 'username dari Admin';
    };
    updLabel(this.loginTab);
    v.querySelector('[data-seg="role"]').addEventListener('segchange', (e) => updLabel(e.detail));
    document.getElementById('login-form').addEventListener('submit', (e) => { e.preventDefault(); this.doLogin(); });
  },

  async doLogin() {
    const u = document.getElementById('lg-user').value.trim();
    const p = document.getElementById('lg-pass').value;
    const remember = document.getElementById('lg-remember').checked;
    if (!u || !p) return toast('Username dan kata sandi wajib diisi.', 'warn');
    const btn = document.getElementById('lg-btn');
    setBusy(btn, true, 'Memeriksa...');
    const res = await API.call('login', { username: u, password: p });
    setBusy(btn, false);
    if (!res.success) return toast(res.message, 'error', 5000);
    Store.setToken(res.token, remember);
    this.setData(res.data);
    if (res.data.role === 'vendor' && this.loginTab === 'admin') toast('Anda masuk sebagai Rekan Vendor.', 'info');
    this.enter();
    toast(res.message, 'success');
  },

  enter() {
    this.hideSplash();
    document.getElementById('login-view').hidden = true;
    document.getElementById('login-view').innerHTML = '';
    document.getElementById('app-shell').hidden = false;
    if (!location.hash) history.replaceState(null, '', '#/beranda');
    this.renderChrome();
    this.onRoute();
  },

  sessionExpired(msg) {
    if (this._expired) return;
    this._expired = true;
    Store.clear();
    this.data = null;
    Modal.closeAll();
    this.renderLogin();
    toast(msg || 'Sesi berakhir. Silakan masuk kembali.', 'warn', 5000);
    setTimeout(() => (this._expired = false), 1500);
  },

  async logout() {
    const ok = await confirmDialog({ title: 'Keluar dari aplikasi?', message: 'Anda perlu memasukkan username dan kata sandi lagi untuk masuk.', okText: 'Keluar' });
    if (!ok) return;
    API.call('logout');
    Store.clear();
    this.data = null;
    Modal.closeAll();
    history.replaceState(null, '', location.pathname);
    this.renderLogin();
    toast('Anda telah keluar. Jazakumullah khairan.', 'info');
  },

  forceChangePassword() {
    const m = Modal.open({
      title: 'Ganti Kata Sandi Awal', sub: 'Demi keamanan, ganti kata sandi bawaan sebelum melanjutkan.', size: 'sm', dismissable: false,
      body: `<form id="fcp" class="form-grid" style="grid-template-columns:1fr">
        <div class="field"><label>Kata sandi saat ini</label><input class="input" type="password" id="fcp-old" autocomplete="current-password" required></div>
        <div class="field"><label>Kata sandi baru</label><input class="input" type="password" id="fcp-new" minlength="6" autocomplete="new-password" required><span class="hint">Minimal 6 karakter.</span></div>
        <div class="field"><label>Ulangi kata sandi baru</label><input class="input" type="password" id="fcp-new2" autocomplete="new-password" required></div></form>`,
      foot: `<button class="btn btn-ghost" data-act="logout-now">Keluar</button><button class="btn btn-primary" id="fcp-btn">${ic('check', 16)} Simpan Sandi</button>`
    });
    m.querySelector('#fcp-btn').addEventListener('click', async (e) => {
      const o = m.querySelector('#fcp-old').value, n = m.querySelector('#fcp-new').value, n2 = m.querySelector('#fcp-new2').value;
      if (n.length < 6) return toast('Kata sandi baru minimal 6 karakter.', 'warn');
      if (n !== n2) return toast('Ulangan kata sandi tidak sama.', 'warn');
      await this.write('changePassword', { old: o, new: n }, { btn: e.currentTarget });
    });
  },

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', cur);
    try { localStorage.setItem('emg3_theme', cur); } catch (e) { /* */ }
    document.querySelectorAll('[data-act="theme"]').forEach((b) => (b.innerHTML = ic(cur === 'dark' ? 'sun' : 'moon', 18) + (b.dataset.label ? ' ' + b.dataset.label : '')));
  },

  /* ---------- Kerangka (sidebar, topbar, bottom nav) ---------- */
  get nav() { return this.isAdmin ? ADMIN_NAV : VENDOR_NAV; },
  showSkeletonShell() {
    document.getElementById('app-shell').hidden = false;
    document.getElementById('view').innerHTML = `<div class="sk sk-hero"></div><div class="kpi-grid" style="margin-top:20px">${'<div class="sk sk-kpi"></div>'.repeat(4)}</div>
      <div style="margin-top:24px">${'<div class="sk sk-row"></div>'.repeat(4)}</div>`;
  },
  renderChrome() {
    if (!this.data) return;
    const cfg = window.APP_CONFIG, u = this.data.user || {}, admin = this.isAdmin;
    const th = document.documentElement.getAttribute('data-theme') === 'dark';
    const vendorName = !admin && this.data.vendor[0] ? this.data.vendor[0].nama_vendor : '';
    document.getElementById('sidebar').innerHTML = `
      <div class="brand"><span class="logo-mark"></span><div><div class="brand-name">${esc(cfg.APP_NAME)}</div><div class="brand-sub">${esc(cfg.APP_SUB)}</div></div></div>
      <div class="campus-pill"><span class="row"><span class="dot"></span>${esc(cfg.KAMPUS)}</span><b>${esc(cfg.KOTA)}</b></div>
      <div class="nav">${admin ? '<div class="nav-sec">Administrasi & Logistik</div>' : '<div class="nav-sec">Portal Vendor</div>'}
        ${this.nav.map((n) => {
          const b = n.badge ? n.badge() : 0;
          return `<a class="nav-item" href="#/${n.r}" data-nav="${n.r}">${ic(n.icon, 19)}<span>${n.label}</span>${b ? `<span class="nb">${b}</span>` : ''}</a>`;
        }).join('')}
      </div>
      <div class="side-foot"><div class="t">Koneksi Sistem <i id="sync-dot"></i></div>
        <div style="margin-top:6px;color:var(--text-2)" id="sync-text">Google Apps Script</div>
        <div class="row between" style="margin-top:10px"><span class="small muted">${admin ? 'Biro Logistik & Acara' : esc(vendorName)}</span>
        <button class="btn btn-ghost btn-xs" data-act="logout">${ic('logout', 14)} Keluar</button></div></div>`;
    const bell = this.reminderCount();
    document.getElementById('topbar').innerHTML = `
      <div class="top-brand"><span class="logo-mark" style="width:36px;height:36px;border-radius:11px"></span><div class="stack" style="gap:0;min-width:0"><div class="brand-name ellipsis">${admin ? 'G3 Darussalam' : 'Portal Vendor'}</div><div class="small muted ellipsis">${admin ? '<span class="badge b-ok no-dot" style="padding:0 8px;font-size:10px">Admin</span>' : esc(vendorName)}</div></div></div>
      ${admin ? `<form class="search" id="top-search"><span>${ic('search', 17)}</span><input type="search" id="top-q" placeholder="Cari acara, barang, atau rekanan vendor..."></form>` : '<div class="spacer"></div>'}
      <div class="spacer" style="flex:0"></div>
      <span class="top-pill">${ic('calendar', 15)} ${hijri(this.today)} / ${tgl(this.today)}</span>
      <button class="icon-btn" id="btn-sync" data-act="sync" aria-label="Muat ulang data" title="Muat ulang data">${ic('refresh', 18)}</button>
      <button class="icon-btn" data-act="theme" aria-label="Ganti tema" title="Ganti tema">${ic(th ? 'sun' : 'moon', 18)}</button>
      <button class="icon-btn" data-act="bell" aria-label="Pengingat" title="Pengingat">${ic('bell', 18)}${bell ? `<span class="dot">${bell}</span>` : ''}</button>
      <div class="user-chip" data-act="${admin ? 'go' : 'go'}" data-r="${admin ? 'pengaturan' : 'profil'}" title="Profil"><div class="stack" style="gap:0"><span class="n ellipsis">${esc(u.nama || '')}</span><span class="r">${admin ? 'Super Admin' : 'Rekan Vendor'}</span></div><span class="avatar">${initials(u.nama)}</span></div>`;
    const bottom = admin ? ADMIN_NAV.filter((n) => ADMIN_BOTTOM.includes(n.r)) : VENDOR_NAV;
    document.getElementById('bottom-nav').innerHTML = bottom.map((n) => {
      const b = n.badge ? n.badge() : 0;
      return `<a class="bn-item" href="#/${n.r}" data-nav="${n.r}" style="text-decoration:none"><span class="bi">${ic(n.icon, 21)}</span><span class="ellipsis" style="max-width:100%">${n.short}</span>${b ? `<span class="nb">${b}</span>` : ''}</a>`;
    }).join('') + (admin ? `<button class="bn-item" data-act="more" data-nav="more"><span class="bi">${ic('grid', 21)}</span><span>Lainnya</span></button>` : '');
    const ts = document.getElementById('top-search');
    if (ts) ts.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('top-q').value.trim();
      AdminState.acaraFilter.q = q;
      AdminState.acaraFilter.tahun = '';
      location.hash = '#/acara';
      if (this.route.name === 'acara' && !this.route.id) this.renderView(true);
    });
    this.markNav();
    this.updateSync();
  },
  markNav() {
    const r = this.route.name;
    const moreRoutes = ADMIN_NAV.filter((n) => !ADMIN_BOTTOM.includes(n.r)).map((n) => n.r);
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === r || (a.dataset.nav === 'more' && this.isAdmin && moreRoutes.includes(r));
      a.classList.toggle('active', on);
    });
  },
  updateSync(err) {
    const dot = document.getElementById('sync-dot'), txt = document.getElementById('sync-text');
    if (!dot) return;
    const off = !navigator.onLine || !!err;
    dot.classList.toggle('off', off);
    txt.textContent = this.syncing ? 'Menyinkronkan...' : !navigator.onLine ? 'Offline — menampilkan data terakhir'
      : err ? 'Gagal sinkron, coba muat ulang' : 'Tersinkron ' + (this.lastSync ? new Date(this.lastSync).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '');
  },

  /* ---------- Router ---------- */
  onRoute() {
    if (!this.data) return;
    const parts = (location.hash || '#/beranda').replace(/^#\/?/, '').split('/');
    const name = parts[0] || 'beranda';
    const valid = this.nav.map((n) => n.r);
    this.route = { name: valid.includes(name) ? name : 'beranda', id: decodeURIComponent(parts[1] || '') };
    Modal.closeAll();
    this.markNav();
    this.renderView(true);
    if (this.data.user && this.data.user.harus_ganti) this.forceChangePassword();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  },
  go(r) { location.hash = '#/' + r; },
  renderView(animate) {
    if (!this.data) return;
    const views = this.isAdmin ? AdminViews : VendorViews;
    const v = views[this.route.name] || views.beranda;
    const el = document.getElementById('view');
    const y = window.scrollY;
    try {
      el.innerHTML = v.render(this.route.id);
    } catch (err) {
      console.error(err);
      el.innerHTML = `<div class="card">${emptyState('Terjadi kesalahan tampilan', esc(err.message), 'alert')}</div>`;
    }
    if (animate) { el.classList.remove('view-enter'); void el.offsetWidth; el.classList.add('view-enter'); } else window.scrollTo(0, y);
    if (v.after) v.after(this.route.id);
    if (animate) animateCounts(el);
    document.title = (v.title ? (typeof v.title === 'function' ? v.title(this.route.id) : v.title) + ' · ' : '') + 'Event Management Gontor 3';
  },

  /* ---------- Delegasi klik [data-act] ---------- */
  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const core = {
      theme: () => this.toggleTheme(),
      logout: () => this.logout(),
      'logout-now': () => { Store.clear(); this.data = null; Modal.closeAll(); this.renderLogin(); },
      sync: () => this.refresh(false).then((ok) => ok && toast('Data terbaru sudah dimuat.', 'success', 2000)),
      go: () => this.go(el.dataset.r),
      bell: () => this.go(this.isAdmin ? 'beranda' : 'acara'),
      forgot: () => toast(this.loginTab === 'admin' ? 'Admin: jalankan fungsi resetPasswordAdmin() di editor Apps Script.' : 'Hubungi Ustadz Admin Bagian Acara untuk reset kata sandi.', 'info', 6000),
      'pw-toggle': () => {
        const inp = document.getElementById('lg-pass');
        inp.type = inp.type === 'password' ? 'text' : 'password';
        el.innerHTML = ic(inp.type === 'password' ? 'eyeOff' : 'eye', 18);
      },
      'open-file': () => this.openFile(el.dataset.id, el.dataset.title, el),
      copy: () => copyText(el.dataset.text || (document.getElementById(el.dataset.target) || {}).innerText || ''),
      more: () => this.openMore()
    };
    if (core[act]) { e.preventDefault(); return core[act](); }
    if (typeof ACT !== 'undefined' && ACT[act]) { e.preventDefault(); ACT[act](el, e); }
  },
  openMore() {
    const items = ADMIN_NAV.filter((n) => !ADMIN_BOTTOM.includes(n.r));
    const m = Modal.open({
      title: 'Menu Lainnya', size: 'sm',
      body: `<div class="more-grid">${items.map((n) => `<a class="more-item ${this.route.name === n.r ? 'active' : ''}" href="#/${n.r}" style="text-decoration:none"><span class="ic-w">${ic(n.icon, 22)}</span>${n.short}</a>`).join('')}
        <button class="more-item" data-act="theme" data-label="Tema">${ic(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon', 18)} Tema</button>
        <button class="more-item" data-act="logout"><span class="ic-w" style="background:var(--bad-bg);color:var(--bad-tx)">${ic('logout', 22)}</span>Keluar</button></div>`
    });
    m.querySelectorAll('a.more-item').forEach((a) => a.addEventListener('click', () => Modal.closeAll()));
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
