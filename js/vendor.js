/* =====================================================================
 *  VENDOR.JS — Portal Vendor (hanya data milik vendor yang login)
 * ===================================================================== */

const VendorState = { filter: 'aktif', q: '' };

function vData() {
  const d = App.data;
  const today = App.today;
  return d.acara.filter((a) => !a.nonaktif).map((a) => {
    const items = d.pesanan.filter((p) => p.id_acara === a.id_acara);
    const av = d.fin.av.find((x) => x.id_acara === a.id_acara) || { tagihan: 0, dibayar: 0, sisa: 0, status: '-', terpasang: 0, jumlah_item: 0 };
    const pays = d.alokasi.filter((al) => al.id_acara === a.id_acara).map((al) => Object.assign({}, App.maps.pembayaran[al.id_pembayaran] || {}, { porsi: al.nominal }));
    const pasang = items.map((p) => p.tanggal_pasang).filter(isYMD).sort();
    const bongkar = items.map((p) => p.tanggal_bongkar).filter(isYMD).sort();
    const allBongkar = items.length && items.every((p) => p.status_pasang === 'Dibongkar');
    const allPasang = items.length && items.every((p) => ['Terpasang', 'Dibongkar'].includes(p.status_pasang));
    const first = pasang[0] || a.tanggal_mulai, last = bongkar[bongkar.length - 1] || a.tanggal_selesai;
    let tahap = 'Akan Datang', tcls = 'b-info';
    if (allBongkar || a.status_acara === 'Selesai') { tahap = 'Selesai & Dibongkar'; tcls = 'b-neu'; }
    else if (allPasang) { tahap = 'Terpasang'; tcls = 'b-ok'; }
    else if (today >= first || items.some((p) => p.status_pasang !== 'Belum')) { tahap = 'Tahap Instalasi Lapangan'; tcls = 'b-warn'; }
    const aktif = !(allBongkar || a.status_acara === 'Selesai' || a.status_acara === 'Batal') || av.sisa > 0;
    return { a, items, av, pays, first, last, tahap, tcls, aktif };
  }).sort((x, y) => (y.aktif - x.aktif) || (x.aktif ? x.first.localeCompare(y.first) : y.first.localeCompare(x.first)));
}

function vendorCard(e, i) {
  const { a, items, av, pays, tahap, tcls } = e;
  const fotos = App.data.berkas.filter((b) => b.id_acara === a.id_acara);
  const bukti = pays.filter((p) => p.id_berkas_bukti);
  const pct = items.length ? Math.round((av.terpasang / items.length) * 100) : 0;
  const stIc = (s) => s === 'Terpasang' || s === 'Dibongkar' ? `<span class="st-ic ok">${ic('check', 15)}</span>` : s === 'Penataan' ? `<span class="st-ic warn">${ic('refresh', 14)}</span>` : `<span class="st-ic bad"></span>`;
  return `<div class="card" style="--i:${Math.min(i, 8)};display:flex;flex-direction:column;gap:14px">
    <div class="row between" style="align-items:flex-start">
      <div style="min-width:0">${badge(tahap, tcls)}<h3 style="font-size:18px;margin-top:10px">${esc(a.nama_acara)}</h3>
        <div class="small muted row" style="gap:6px;margin-top:4px">${ic('calendar', 14)} ${tglRange(a.tanggal_mulai, a.tanggal_selesai)}${a.lokasi ? ' • ' + esc(a.lokasi) : ''}</div></div>
      <div class="right" style="flex-shrink:0"><div class="xs muted bold" style="letter-spacing:.05em">NILAI SEWA</div><div class="bold tnum" style="font-family:var(--font-head);font-size:17px">${rp(av.tagihan)}</div>
        ${av.status === 'Lunas' ? badge('LUNAS', 'b-ok') : av.status === 'Sebagian' ? badge('Sebagian', 'b-warn') : av.status === 'Belum' ? badge('Belum dibayar', 'b-bad') : ''}</div>
    </div>
    <div class="pay-chip"><div><div class="xs muted">Sudah diterima</div><div class="bold tnum tx-ok" style="font-size:16px">${rp(av.dibayar)}</div>${av.sisa > 0 ? `<div class="xs tx-bad">Sisa ${rp(av.sisa)}</div>` : ''}</div>
      <div class="row wrap" style="gap:6px">${bukti.length ? bukti.map((p, k) => `<button class="btn btn-soft btn-sm" data-act="open-file" data-id="${esc(p.id_berkas_bukti)}" data-title="Bukti Transfer ${tgl(p.tanggal_bayar)}">${ic('receipt', 14)} Bukti ${bukti.length > 1 ? k + 1 : 'Transfer'}</button>`).join('') : '<span class="xs muted">Belum ada bukti transfer</span>'}</div></div>
    ${items.length ? `<div>
      <div class="row between" style="margin-bottom:8px"><b style="font-family:var(--font-head);font-size:13.5px">Progres Unit Terpasang</b>${badge(av.terpasang + ' dari ' + items.length + ' terpasang', pct === 100 ? 'b-ok' : 'b-info')}</div>
      <div class="progress" style="margin-bottom:10px"><span style="width:${pct}%"></span></div>
      ${items.map((p) => `<div class="item-row">${stIc(p.status_pasang)}<div class="grow" style="min-width:0"><div class="bold small">${esc(p.nama_barang)}</div>
        <div class="xs muted">${p.spek ? 'Spek ' + esc(spekText(p)) + ' • ' : ''}${fmtQty(p.jumlah)} ${esc(p.satuan)} • ${rp(p.harga_vendor_satuan)}/${esc(p.satuan)}${p.tanggal_pasang ? ' • pasang ' + tgl(p.tanggal_pasang) : ''}</div></div>
        ${p.status_pasang === 'Belum' || p.status_pasang === 'Penataan'
          ? `<button class="btn btn-mint btn-xs" data-act="v-quick" data-id="${esc(p.id_pesanan)}">${ic('check', 13)} Terpasang</button>`
          : badge(p.status_pasang === 'Dibongkar' ? 'Dibongkar' : 'Sudah Terpasang', p.status_pasang === 'Dibongkar' ? 'b-neu' : 'b-ok')}</div>`).join('')}
    </div>` : ''}
    <div class="row wrap" style="gap:8px">
      ${items.some((p) => p.status_pasang !== 'Dibongkar') ? `<button class="btn btn-primary grow" data-act="v-tandai" data-id="${esc(a.id_acara)}">${ic('camera', 16)} Tandai Terpasang & Unggah Foto</button>` : ''}
      ${fotos.length ? `<button class="btn btn-soft" data-act="v-foto" data-id="${esc(a.id_acara)}">${ic('image', 16)} ${fotos.length} Foto</button>` : ''}
    </div>
  </div>`;
}

const VendorViews = {
  beranda: {
    title: 'Portal Vendor',
    render() {
      const d = App.data, v = d.vendor[0] || {}, t = d.fin.total;
      const list = vData();
      const aktif = list.filter((e) => e.aktif);
      const pct = t.tagihan ? Math.round((t.dibayar / t.tagihan) * 100) : 0;
      const soon = d.pesanan.filter((p) => isYMD(p.tanggal_pasang) && p.tanggal_pasang >= App.today && p.tanggal_pasang <= addDays(App.today, 3) && p.status_pasang === 'Belum');
      return `
      <div class="v-hero">
        <span class="hero-pill">Mitra Terverifikasi Pondok</span>
        <h2>${esc(v.nama_vendor || 'Vendor')}</h2>
        <div class="small" style="color:rgba(255,255,255,.8)">${ic('user', 14)} ${esc(d.user.nama)}${v.pic ? ' • PIC ' + esc(v.pic) : ''}</div>
        <div class="note">${ic('lock', 15)}<span>Data khusus rekanan resmi. Anda hanya melihat acara, tagihan, dan bukti transfer milik ${esc(v.nama_vendor || 'Anda')}. Estimasi internal panitia dirahasiakan & terlindungi amanah.</span></div>
      </div>
      <div class="card section" style="margin-top:18px">
        <div class="row between"><h3 style="font-size:16px" class="row">${ic('wallet', 18, 'tx-primary')} Hak Tagihan Berjalan</h3>${badge(pct + '% Terbayar', pct === 100 ? 'b-ok' : 'b-info')}</div>
        <div class="v-stat"><div><div class="l">Total nilai kontrak</div><div class="v">${countEl(t.tagihan)}</div></div><div class="g"><div class="l">Sudah diterima</div><div class="v">${countEl(t.dibayar)}</div></div></div>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <div class="row between" style="margin-top:12px"><span class="muted">Sisa hak tagihan</span><b class="tnum ${t.sisa > 0 ? 'tx-bad' : 'tx-ok'}" style="font-family:var(--font-head);font-size:18px">${countEl(t.sisa)}</b></div>
      </div>
      ${soon.length ? `<div class="callout warn section" style="margin-top:14px">${ic('truck', 18)}<div><b>${soon.length} barang dijadwalkan pasang dalam 3 hari.</b> ${esc([...new Set(soon.map((p) => App.acara(p.id_acara).nama_acara))].join(', '))}</div></div>` : ''}
      <div class="row between section" style="margin:26px 0 12px"><div><h3 style="font-size:18px">Daftar Penugasan Lapangan</h3><div class="small muted">${aktif.length} acara berjalan / belum lunas</div></div>${badge('Periode ' + App.today.slice(0, 4), 'b-ok no-dot')}</div>
      <div class="grid-2 stagger">${aktif.length ? aktif.map(vendorCard).join('') : `<div class="card" style="grid-column:1/-1">${emptyState('Belum ada penugasan aktif', 'Acara baru dari pondok akan muncul di sini.', 'calendar')}</div>`}</div>
      ${list.length > aktif.length ? `<div class="center section"><a class="btn btn-soft" href="#/acara">${ic('list', 16)} Lihat riwayat acara (${list.length - aktif.length})</a></div>` : ''}
      ${VendorViews.contactBtn()}`;
    }
  },
  acara: {
    title: 'Acara Saya',
    render() {
      const list = vData(), f = VendorState.filter, q = VendorState.q.toLowerCase();
      let rows = list;
      if (f === 'aktif') rows = rows.filter((e) => e.aktif);
      if (f === 'belum') rows = rows.filter((e) => e.av.sisa > 0);
      if (f === 'lunas') rows = rows.filter((e) => e.av.status === 'Lunas');
      if (q) rows = rows.filter((e) => (e.a.nama_acara + ' ' + e.a.lokasi + ' ' + e.items.map((p) => p.nama_barang).join(' ')).toLowerCase().includes(q));
      const cnt = { semua: list.length, aktif: list.filter((e) => e.aktif).length, belum: list.filter((e) => e.av.sisa > 0).length, lunas: list.filter((e) => e.av.status === 'Lunas').length };
      return `
      <div class="page-head"><div><span class="eyebrow">${ic('calendar', 13)} Portal Vendor</span><h1>Acara Saya</h1><p>Seluruh acara pondok yang menggunakan perlengkapan Anda.</p></div></div>
      <div class="dt-tools">
        <div class="search">${ic('search', 16)}<input type="search" id="vq" placeholder="Cari acara / barang..." value="${esc(VendorState.q)}"></div>
        <div class="tabs">${[['aktif', 'Berjalan'], ['belum', 'Belum Lunas'], ['lunas', 'Lunas'], ['semua', 'Semua']].map(([k, l]) => `<button class="chip ${f === k ? 'active' : ''}" data-act="v-filter" data-f="${k}">${l} <span class="cnt">${cnt[k]}</span></button>`).join('')}</div>
      </div>
      <div class="grid-2 stagger">${rows.length ? rows.map(vendorCard).join('') : `<div class="card" style="grid-column:1/-1">${emptyState('Tidak ada acara', 'Coba ubah filter.', 'calendar')}</div>`}</div>
      ${VendorViews.contactBtn()}`;
    },
    after() {
      const q = document.getElementById('vq');
      if (q) { let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { VendorState.q = q.value; App.renderView(false); const n = document.getElementById('vq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); }); }
    }
  },
  bukti: {
    title: 'Bukti Bayar',
    render() {
      const d = App.data, t = d.fin.total;
      const pays = d.pembayaran.slice().sort((a, b) => b.tanggal_bayar.localeCompare(a.tanggal_bayar));
      return `
      <div class="page-head"><div><span class="eyebrow">${ic('receipt', 13)} Portal Vendor</span><h1>Bukti Pembayaran</h1><p>Riwayat pembayaran dari pondok ke ${esc((d.vendor[0] || {}).nama_vendor || 'Anda')} beserta alokasi per acara.</p></div></div>
      <div class="mini-kpis stagger" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="mini-kpi" style="--i:0"><div class="l">Total Diterima</div><div class="v tx-ok">${countEl(t.dibayar)}</div><div class="s">${pays.length} transaksi</div></div>
        <div class="mini-kpi" style="--i:1"><div class="l">Total Kontrak</div><div class="v">${countEl(t.tagihan)}</div></div>
        <div class="mini-kpi" style="--i:2"><div class="l tx-bad">Sisa</div><div class="v tx-bad">${countEl(t.sisa)}</div></div>
      </div>
      <div class="stack section stagger" style="gap:12px;margin-top:18px">
        ${pays.length ? pays.map((p, i) => {
          const al = d.alokasi.filter((a) => a.id_pembayaran === p.id_pembayaran);
          return `<div class="card pad-sm" style="--i:${Math.min(i, 8)}"><div class="row between wrap" style="gap:12px">
            <div class="row" style="gap:12px"><span class="li-ic mint">${ic(p.metode === 'Transfer' ? 'send' : 'wallet', 18)}</span><div><div class="bold tnum" style="font-family:var(--font-head);font-size:17px">${rp(p.nominal_total)}</div><div class="small muted">${tglPanjang(p.tanggal_bayar)} • ${esc(p.metode)}</div></div></div>
            ${p.id_berkas_bukti ? `<button class="btn btn-primary btn-sm" data-act="open-file" data-id="${esc(p.id_berkas_bukti)}" data-title="Bukti Transfer ${tgl(p.tanggal_bayar)}">${ic('eye', 15)} Lihat Bukti Transfer</button>` : `<span class="small muted">${p.metode === 'Tunai' ? 'Pembayaran tunai' : 'Bukti tidak ditampilkan'}</span>`}</div>
            <div class="divider" style="margin:12px 0"></div>
            <div class="stack" style="gap:6px">${al.map((a) => `<div class="row between small"><span>${ic('calendar', 13)} ${esc(App.acara(a.id_acara).nama_acara)}</span><b class="tnum">${rp(a.nominal)}</b></div>`).join('')}</div></div>`;
        }).join('') : `<div class="card">${emptyState('Belum ada pembayaran', 'Pembayaran dari pondok akan tercatat di sini.', 'receipt')}</div>`}
      </div>
      ${VendorViews.contactBtn()}`;
    }
  },
  profil: {
    title: 'Profil',
    render() {
      const d = App.data, v = d.vendor[0] || {}, u = d.user;
      const th = document.documentElement.getAttribute('data-theme') === 'dark';
      return `
      <div class="page-head"><div><span class="eyebrow">${ic('user', 13)} Akun</span><h1>Profil</h1></div></div>
      <div class="grid-2 stagger">
        <div class="card" style="--i:0;display:flex;flex-direction:column;gap:14px">
          <div class="row" style="gap:14px"><span class="avatar" style="width:56px;height:56px;font-size:18px">${initials(u.nama)}</span><div><div class="bold" style="font-family:var(--font-head);font-size:17px">${esc(u.nama)}</div><div class="small muted">@${esc(u.username)} • Rekan Vendor</div></div></div>
          <div class="info-grid" style="grid-template-columns:1fr 1fr">
            <div class="info-item"><div class="l">Vendor</div><div class="v">${esc(v.nama_vendor || '-')}</div></div>
            <div class="info-item"><div class="l">PIC</div><div class="v">${esc(v.pic || '-')}</div></div>
            <div class="info-item"><div class="l">Kontak</div><div class="v">${esc(v.kontak || '-')}</div></div>
            <div class="info-item"><div class="l">Rekening</div><div class="v">${esc(v.rekening || '-')}</div></div>
          </div>
          <div class="hint">Data vendor dikelola oleh Admin. Hubungi Admin bila ada perubahan rekening/kontak.</div>
          <div class="row wrap"><button class="btn btn-soft" data-act="theme" data-label="Ganti tema">${ic(th ? 'sun' : 'moon', 18)} Ganti tema</button><button class="btn btn-danger" data-act="logout">${ic('logout', 16)} Keluar</button></div>
        </div>
        <div class="card" style="--i:1"><div class="card-head"><div><h3><span class="card-title-ic">${ic('lock', 18)}</span>Ganti Kata Sandi</h3></div></div>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="field"><label>Kata sandi saat ini</label><input class="input" type="password" id="vp-old" autocomplete="current-password"></div>
            <div class="field"><label>Kata sandi baru</label><input class="input" type="password" id="vp-new" autocomplete="new-password" placeholder="min. 6 karakter"></div>
            <button class="btn btn-primary" data-act="v-pw">${ic('check', 16)} Simpan Kata Sandi</button></div></div>
      </div>
      ${VendorViews.contactBtn()}`;
    }
  },
  contactBtn() {
    const wa = App.data.settings.kontak_admin_wa;
    if (!wa) return '';
    return `<a class="btn wa-btn btn-lg btn-block section" style="margin-top:22px" href="${waLink(wa, 'Assalamu\'alaikum Ustadz, saya ' + App.data.user.nama + ' dari ' + ((App.data.vendor[0] || {}).nama_vendor || '') + '. ')}" target="_blank" rel="noopener">${ic('chat', 18)} Hubungi Ustadz PJ. Vendor (WhatsApp)</a>
      <div class="center xs muted" style="margin-top:8px">Layanan Resmi Bagian Perlengkapan Acara • ${esc(App.data.settings.nama_kampus || '')}</div>`;
  }
};

ACT['v-filter'] = (el) => { VendorState.filter = el.dataset.f; App.renderView(false); };
ACT['v-pw'] = async (el) => {
  const o = document.getElementById('vp-old').value, n = document.getElementById('vp-new').value;
  if (n.length < 6) return toast('Kata sandi baru minimal 6 karakter.', 'warn');
  const res = await App.write('changePassword', { old: o, new: n }, { btn: el });
  if (res.success) { const a = document.getElementById('vp-old'); if (a) a.value = ''; }
};

/* Tandai cepat satu barang (Optimistic UI: tampil dulu, simpan di latar) */
ACT['v-quick'] = async (el) => {
  const p = App.data.pesanan.find((x) => x.id_pesanan === el.dataset.id);
  if (!p) return;
  const old = p.status_pasang;
  p.status_pasang = 'Terpasang';
  const av = App.data.fin.av.find((x) => x.id_acara === p.id_acara);
  if (av) av.terpasang++;
  App.renderView(false);
  toast('"' + p.nama_barang + '" ditandai terpasang.', 'success', 2000);
  const res = await API.call('setStatusPasang', { ids: [p.id_pesanan], status: 'Terpasang' });
  if (res.success) { App.setData(res.data); App.renderView(false); }
  else if (res.code !== 'AUTH') {
    p.status_pasang = old; if (av) av.terpasang--; App.renderView(false);
    toast('Gagal menyimpan: ' + res.message, 'error', 5000);
  }
};

/* Modal tandai banyak barang + unggah foto */
ACT['v-tandai'] = (el) => {
  const ida = el.dataset.id;
  const a = App.acara(ida);
  const items = App.data.pesanan.filter((p) => p.id_acara === ida && p.status_pasang !== 'Dibongkar');
  const fotos = [];
  const m = Modal.open({
    title: 'Tandai Terpasang & Foto Lapangan', sub: esc(a.nama_acara), size: 'lg',
    body: `<div class="row between" style="margin-bottom:10px"><span class="small muted">Atur status tiap barang.</span><button class="btn btn-mint btn-sm" type="button" id="vt-all">${ic('checkCircle', 15)} Tandai semua terpasang</button></div>
      <div class="stack" style="gap:8px">${items.map((p) => `<div class="item-row" style="flex-wrap:wrap"><div class="grow" style="min-width:180px"><div class="bold small">${esc(p.nama_barang)}</div><div class="xs muted">${p.spek ? esc(spekText(p)) + ' • ' : ''}${fmtQty(p.jumlah)} ${esc(p.satuan)}${p.lokasi ? ' • ' + esc(p.lokasi) : ''}</div></div>
        <div style="width:290px;max-width:100%">${seg('vt-' + p.id_pesanan, ['Belum', 'Penataan', 'Terpasang'], p.status_pasang, 'sm')}</div></div>`).join('')}</div>
      <div class="field section" style="margin-top:18px"><label>Foto pemasangan (opsional, bisa lebih dari satu)</label>
        <label class="upload"><span class="u-ic">${ic('camera', 20)}</span><span class="grow"><span class="u-t">Ambil / pilih foto</span><br><span class="u-s">Maks. 8 foto • dikompres otomatis</span></span><input type="file" id="vt-foto" accept="image/*" multiple></label>
        <div class="thumbs" id="vt-thumbs"></div></div>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="vt-save">${ic('check', 16)} Simpan</button>`
  });
  const $ = (q) => m.querySelector(q);
  $('#vt-all').addEventListener('click', () => {
    m.querySelectorAll('[data-seg^="vt-"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'Terpasang'));
  });
  const drawThumbs = () => {
    $('#vt-thumbs').innerHTML = fotos.map((f, i) => `<div class="t" style="background-image:url('${f.preview}')"><button type="button" data-rm="${i}" aria-label="Hapus foto">${ic('x', 12)}</button></div>`).join('');
  };
  $('#vt-thumbs').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { fotos.splice(Number(b.dataset.rm), 1); drawThumbs(); } });
  $('#vt-foto').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, 8 - fotos.length);
    for (const f of files) { try { fotos.push(await prepareFile(f)); } catch (err) { toast(err.message, 'error'); } }
    e.target.value = '';
    drawThumbs();
  });
  $('#vt-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const groups = {};
    items.forEach((p) => { const v = segVal(m, 'vt-' + p.id_pesanan); if (v && v !== p.status_pasang) (groups[v] = groups[v] || []).push(p.id_pesanan); });
    if (!Object.keys(groups).length && !fotos.length) return toast('Tidak ada perubahan.', 'info');
    setBusy(btn, true, 'Menyimpan...');
    let last = null;
    for (const status of Object.keys(groups)) {
      const res = await API.call('setStatusPasang', { ids: groups[status], status });
      if (!res.success) { setBusy(btn, false); return toast(res.message, 'error', 5000); }
      last = res;
    }
    if (fotos.length) {
      btn.innerHTML = ic('loader', 16) + ' Mengunggah ' + fotos.length + ' foto...';
      const res = await API.call('uploadFoto', { id_acara: ida, files: fotos.map((f) => ({ name: f.name, mime: f.mime, base64: f.base64 })) }, { timeout: 180000 });
      if (!res.success) { setBusy(btn, false); return toast(res.message, 'error', 5000); }
      last = res;
    }
    setBusy(btn, false);
    if (last && last.data) App.setData(last.data);
    Modal.closeAll();
    App.renderChrome();
    App.renderView(false);
    toast('Alhamdulillah, data lapangan tersimpan.' + (fotos.length ? ' ' + fotos.length + ' foto terunggah.' : ''), 'success');
  });
};

ACT['v-foto'] = (el) => {
  const ida = el.dataset.id;
  const fotos = App.data.berkas.filter((b) => b.id_acara === ida);
  Modal.open({
    title: 'Foto Pemasangan', sub: esc(App.acara(ida).nama_acara), size: 'sm',
    body: `<div class="list">${fotos.map((f) => `<div class="li"><span class="li-ic mint">${ic('image', 18)}</span><div class="grow" style="min-width:0"><div class="small bold ellipsis">${esc(f.nama_file)}</div><div class="xs muted">${esc(f.tanggal)}</div></div>${fileLink(f.id_berkas, 'Lihat', 'Foto Pemasangan')}</div>`).join('')}</div>`
  });
};
