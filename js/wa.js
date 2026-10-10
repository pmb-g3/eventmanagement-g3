/* =====================================================================
 *  WA.JS — WhatsApp otomatis lewat Fonnte (khusus Admin) — v1.7
 *  Token Fonnte disimpan di server (Apps Script), tidak pernah di browser.
 * ===================================================================== */

const WAS = { device: null, deviceLoaded: false, log: null, preview: null };
const WA_JENIS_LABEL = {
  tagih: 'Tagih setoran', konsumsi: 'Konsumsi', jadwal: 'Jadwal vendor', bayar: 'Info bayar', akun: 'Akun vendor',
  ringkasan: 'Ringkasan', tes: 'Tes', manual: 'Manual'
};
const waReady = () => !!(D().wa && D().wa.token_set);
const waOk = (p) => /^\d{9,15}$/.test(waNumber(p));

/* ---------- Jendela kirim satu pesan ---------- */
ACT['wa-compose'] = (el) => openWaCompose({
  to: el.dataset.to, text: el.dataset.text, jenis: el.dataset.jenis, ref: el.dataset.ref, nama: el.dataset.nama, tpl: el.dataset.tpl
});

function openWaCompose(o) {
  const ready = waReady();
  const m = Modal.open({
    title: 'Kirim WhatsApp', sub: esc((WA_JENIS_LABEL[o.jenis] || 'Pesan') + (o.nama ? ' • ' + o.nama : '')), size: 'lg',
    body: `
      <div class="form-grid">
        <div class="field"><label>Kepada</label><input class="input" id="wc-nama" value="${esc(o.nama || '')}" placeholder="Nama penerima"></div>
        <div class="field"><label>Nomor WhatsApp <span class="req">*</span></label><input class="input tnum" id="wc-to" inputmode="tel" value="${esc(o.to || '')}" placeholder="08xxxxxxxxxx"></div>
      </div>
      <div class="field" style="margin-top:12px"><label><span>Isi pesan <span class="small muted">(bisa diubah untuk pengiriman ini)</span></span>${o.tpl && TPL_DEF[o.tpl] ? tplBtn(o.tpl, o.ref, 'Ubah format tetap', 'btn-ghost btn-xs') : ''}</label>
        <textarea class="textarea" id="wc-text" style="min-height:220px;font-size:13.5px">${esc(o.text || '')}</textarea>
        <span class="hint" id="wc-count"></span></div>
      ${ready ? '' : `<div class="callout warn" style="margin-top:12px">${ic('info', 18)}<div>Kirim otomatis belum aktif. Pasang token Fonnte di menu <a href="#/wa" data-modal-close>WhatsApp</a>. Sementara ini gunakan <b>Buka WhatsApp</b>.</div></div>`}`,
    foot: `<button class="btn btn-soft" id="wc-open" type="button">${ic('external', 15)} Buka WhatsApp</button>
      <button class="btn btn-primary" id="wc-send" type="button" ${ready ? '' : 'disabled'}>${ic('send', 15)} Kirim Otomatis</button>`
  });
  const $ = (q) => m.querySelector(q);
  const cnt = () => { $('#wc-count').textContent = $('#wc-text').value.length + ' karakter'; };
  $('#wc-text').addEventListener('input', cnt); cnt();
  const val = () => ({ to: $('#wc-to').value.trim(), nama: $('#wc-nama').value.trim(), text: $('#wc-text').value });
  $('#wc-open').addEventListener('click', () => {
    const v = val();
    if (!waOk(v.to)) return toast('Isi nomor WhatsApp tujuan.', 'warn');
    window.open(waLink(v.to, v.text), '_blank', 'noopener');
  });
  $('#wc-send').addEventListener('click', async (e) => {
    const v = val();
    if (!waOk(v.to)) return toast('Nomor WhatsApp tujuan belum benar.', 'warn');
    if (!v.text.trim()) return toast('Isi pesan masih kosong.', 'warn');
    const btn = e.currentTarget;
    setBusy(btn, true, 'Mengirim...');
    const res = await API.call('sendWa', { items: [{ to: v.to, nama: v.nama, text: v.text, jenis: o.jenis || 'manual', ref: o.ref || '' }] });
    setBusy(btn, false);
    if (!res.success) return res.code === 'AUTH' ? null : toast(waErr(res.message), 'error', 7000);
    if (res.data) App.setData(res.data);
    WAS.log = null;
    const h = (res.hasil || [])[0] || {};
    if (!h.ok) return toast('Gagal terkirim: ' + (h.reason || '-'), 'error', 7000);
    m.dataset.sent = '1';
    Modal.close();
    App.renderChrome(); App.renderView(false);
    toast('WhatsApp terkirim ke ' + (v.nama || h.to) + '.', 'success');
  });
}
function waErr(msg) {
  return /Aksi tidak dikenal/.test(msg || '') ? 'Fitur WhatsApp butuh backend v1.7: tempel Kode.gs terbaru, jalankan izinkanWhatsApp(), lalu Deploy → New version.' : (msg || 'Terjadi kesalahan.');
}

/* ---------- Kirim banyak sekaligus ---------- */
function openWaBulk(items, title = 'Kirim WhatsApp Sekaligus', sub = '') {
  if (!items.length) return toast('Tidak ada pesan untuk dikirim.', 'info');
  const ready = waReady();
  const st = items.map((it) => Object.assign({ pick: !it.skip && !!waOk(it.to), res: null }, it));
  const m = Modal.open({
    title, sub: esc(sub || st.length + ' pesan disiapkan — centang yang ingin dikirim'), size: 'xl',
    body: `<div class="row between wrap" style="gap:8px;margin-bottom:10px">
        <label class="check small"><input type="checkbox" id="wb-all"> Pilih semua yang bisa dikirim</label>
        <span class="small muted">Klik <b>Lihat pesan</b> untuk mengubah isi sebelum dikirim.</span></div>
      <div class="wb-list" id="wb-list"></div>
      <div class="wb-prog" id="wb-prog" hidden><div class="progress"><span id="wb-bar" style="width:0%"></span></div><div class="small muted" id="wb-txt"></div></div>
      ${ready ? '' : `<div class="callout warn" style="margin-top:12px">${ic('info', 18)}<div>Token Fonnte belum dipasang. Buka menu <a href="#/wa" data-modal-close>WhatsApp</a> terlebih dahulu.</div></div>`}`,
    foot: `<span class="note">${ic('clock', 14)} Dikirim berurutan dengan jeda ±1 detik agar nomor aman.</span><button class="btn btn-ghost" data-modal-close>Tutup</button><button class="btn btn-primary" id="wb-send" ${ready ? '' : 'disabled'}>${ic('send', 15)} Kirim</button>`
  });
  const $ = (q) => m.querySelector(q);
  const draw = () => {
    $('#wb-list').innerHTML = st.map((it, i) => {
      const can = !!waOk(it.to);
      const stat = it.res ? (it.res.ok ? badge('Terkirim', 'b-ok') : badge('Gagal', 'b-bad') + `<div class="xs tx-bad">${esc(it.res.reason || '')}</div>`)
        : it.skip ? `<span class="xs muted">${esc(it.alasan || 'dilewati')}</span>` : can ? '' : '<span class="xs tx-bad">Nomor kosong</span>';
      return `<div class="wb-row ${it.res ? (it.res.ok ? 'ok' : 'bad') : ''}">
        <input type="checkbox" class="bulk-cb" data-wb="${i}" ${it.pick ? 'checked' : ''} ${can && !it.res ? '' : 'disabled'} aria-label="Pilih">
        <div class="grow" style="min-width:0"><div class="bold small">${badge(WA_JENIS_LABEL[it.jenis] || it.jenis, 'b-info no-dot')} ${esc(it.label || it.nama || '')}</div>
          <div class="xs muted">${esc(it.nama || '')}${it.to ? ' • ' + esc(it.to) : ''}</div>
          <details data-det="${i}"><summary class="xs">Lihat pesan</summary><textarea class="textarea" data-wbt="${i}" style="min-height:140px;font-size:12.5px;margin-top:6px" ${it.res && it.res.ok ? 'disabled' : ''}>${esc(it.text)}</textarea></details></div>
        <div class="wb-st">${stat}</div></div>`;
    }).join('');
    const n = st.filter((x) => x.pick && !x.res).length;
    $('#wb-send').innerHTML = ic('send', 15) + ' Kirim ' + n + ' pesan';
    $('#wb-send').disabled = !ready || !n;
    $('#wb-all').checked = st.filter((x) => waOk(x.to) && !x.res).every((x) => x.pick);
  };
  $('#wb-list').addEventListener('change', (e) => { const i = e.target.dataset.wb; if (i !== undefined) { st[i].pick = e.target.checked; draw(); } });
  $('#wb-list').addEventListener('input', (e) => { const i = e.target.dataset.wbt; if (i !== undefined) st[i].text = e.target.value; });
  $('#wb-all').addEventListener('change', (e) => { st.forEach((x) => { if (waOk(x.to) && !x.res) x.pick = e.target.checked; }); draw(); });
  $('#wb-send').addEventListener('click', async (e) => {
    const todo = st.filter((x) => x.pick && !x.res);
    if (!todo.length) return;
    const btn = e.currentTarget;
    setBusy(btn, true, 'Mengirim...');
    $('#wb-prog').hidden = false;
    let done = 0, last = null;
    for (let i = 0; i < todo.length; i += 5) {
      const chunk = todo.slice(i, i + 5);
      $('#wb-txt').textContent = `Mengirim ${done + 1}–${done + chunk.length} dari ${todo.length}...`;
      const res = await API.call('sendWa', { items: chunk.map((x) => ({ to: x.to, nama: x.nama, text: x.text, jenis: x.jenis, ref: x.ref })) }, { timeout: 120000 });
      if (!res.success) { chunk.forEach((x) => (x.res = { ok: false, reason: res.message })); toast(waErr(res.message), 'error', 7000); break; }
      (res.hasil || []).forEach((h, k) => { chunk[k].res = h; chunk[k].pick = false; });
      last = res; done += chunk.length;
      $('#wb-bar').style.width = Math.round((done / todo.length) * 100) + '%';
      draw();
    }
    setBusy(btn, false);
    if (last && last.data) { App.setData(last.data); App.renderChrome(); App.renderView(false); }
    WAS.log = null;
    const ok = st.filter((x) => x.res && x.res.ok).length, bad = st.filter((x) => x.res && !x.res.ok).length;
    $('#wb-txt').textContent = `Selesai: ${ok} terkirim${bad ? ', ' + bad + ' gagal' : ''}.`;
    toast(`${ok} pesan terkirim${bad ? ', ' + bad + ' gagal' : ''}.`, bad ? 'warn' : 'success', 5000);
    draw();
  });
  draw();
}

/** Tagih semua panitia yang masih kurang setor. */
ACT['wa-bulk-tagih'] = () => {
  const items = setoranKurangList().map((x) => {
    const a = App.acara(x.id_acara);
    return { to: a.kontak_panitia || '', nama: a.nama_panitia || 'Panitia', text: tagihSetoranText(x.id_acara), jenis: 'tagih', ref: x.id_acara,
      label: a.nama_acara + ' — kurang ' + rp(x.kekurangan), skip: !a.kontak_panitia, alasan: 'Nomor panitia belum diisi' };
  });
  openWaBulk(items, 'Tagih Setoran Panitia via WhatsApp', items.length + ' acara masih kurang setor');
};

/* =====================================================================
 *  HALAMAN WHATSAPP
 * ===================================================================== */
const WA_AUTO_JENIS = [
  { v: 'konsumsi', l: 'Konsumsi pekerja', d: 'H-1 & hari H → panitia (lalu ditandai sudah diingatkan)', icon: 'utensils' },
  { v: 'jadwal', l: 'Jadwal pasang / bongkar', d: 'Barang dipasang/dibongkar besok → vendor', icon: 'truck' },
  { v: 'setoran', l: 'Tagihan setoran', d: 'Kekurangan setoran lewat jatuh tempo → panitia', icon: 'coins' },
  { v: 'ringkasan', l: 'Ringkasan harian', d: 'Rekap tagihan & jadwal → nomor WA Admin', icon: 'list' }
];
AdminViews.wa = {
  title: 'WhatsApp',
  render() {
    const d = D(), w = d.wa || {}, st = d.settings;
    const dev = WAS.device;
    const jenisOn = new Set(String(st.wa_auto_jenis || '').split(',').filter(Boolean));
    const conn = !w.token_set ? badge('Belum dipasang', 'b-neu')
      : !WAS.deviceLoaded ? badge('Memeriksa...', 'b-info')
      : dev && dev.status && dev.device_status === 'connect' ? badge('Terhubung', 'b-ok')
      : dev && dev.status ? badge('Perangkat terputus', 'b-bad') : badge(dev && dev.reason ? dev.reason : 'Tidak dapat diperiksa', 'b-bad');
    return `
    <div class="page-head"><div><span class="eyebrow">${ic('chat', 13)} Fonnte</span><h1>WhatsApp Otomatis</h1>
      <p>Kirim pesan WhatsApp langsung dari aplikasi tanpa membuka WhatsApp satu per satu. Formatnya bisa diubah di bagian bawah halaman ini.</p></div></div>

    <div class="grid-2 stagger">
      <div class="card" style="--i:0">
        <div class="card-head"><div><h3><span class="card-title-ic">${ic('link', 18)}</span>Koneksi Fonnte</h3><p>Token disimpan aman di server (Apps Script), tidak tampil di browser.</p></div>${conn}</div>
        ${w.token_set && dev && dev.status ? `<div class="info-grid" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
          <div class="info-item"><div class="l">Nomor pengirim</div><div class="v tnum">${esc(dev.device || '-')}</div></div>
          <div class="info-item"><div class="l">Sisa kuota</div><div class="v">${esc(dev.quota ?? '-')}</div></div>
          <div class="info-item"><div class="l">Paket</div><div class="v">${esc(dev.package || '-')}</div></div>
          <div class="info-item"><div class="l">Berlaku s.d.</div><div class="v">${esc(dev.expired || '-')}</div></div></div>` : ''}
        <div class="field"><label>Token Fonnte ${w.token_set ? `<span class="small muted">tersimpan: ${esc(w.token_hint)}</span>` : ''}</label>
          <div class="input-group"><input class="input" id="wa-token" type="password" autocomplete="off" placeholder="${w.token_set ? 'Isi untuk mengganti token' : 'Tempel token dari dashboard Fonnte'}"><button type="button" class="pw-toggle" data-act="pw-toggle" aria-label="Tampilkan">${ic('eyeOff', 18)}</button></div></div>
        <div class="row wrap" style="margin-top:10px;gap:8px">
          <button class="btn btn-primary btn-sm" data-act="wa-token-save">${ic('check', 15)} Simpan Token</button>
          ${w.token_set ? `<button class="btn btn-soft btn-sm" data-act="wa-status">${ic('refresh', 14)} Cek Status</button><button class="btn btn-ghost btn-sm tx-bad" data-act="wa-token-del">${ic('trash', 14)} Hapus Token</button>` : ''}
        </div>
        <details class="wa-help" style="margin-top:14px"><summary class="small bold">Cara mendapatkan token</summary>
          <ol class="small" style="margin:8px 0 0 18px;line-height:1.7">
            <li>Daftar / masuk di <a href="https://fonnte.com" target="_blank" rel="noopener">fonnte.com</a>.</li>
            <li>Menu <b>Device</b> → <b>Add Device</b>: isi nama & nomor WA pengirim (disarankan nomor khusus bagian perlengkapan).</li>
            <li>Klik <b>Connect</b> lalu scan QR dari WhatsApp HP tersebut (Perangkat Tertaut).</li>
            <li>Klik <b>Token</b> pada device, salin, lalu tempel di kolom di atas.</li>
          </ol></details>
      </div>

      <div class="card" style="--i:1">
        <div class="card-head"><div><h3><span class="card-title-ic amber">${ic('send', 18)}</span>Tes Kirim</h3><p>Pastikan pesan benar-benar sampai sebelum dipakai.</p></div></div>
        <div class="field"><label>Nomor tujuan tes</label><input class="input tnum" id="wa-test-to" inputmode="tel" value="${esc(st.kontak_admin_wa || '')}" placeholder="08xxxxxxxxxx"></div>
        <button class="btn btn-soft btn-sm" style="margin-top:10px" data-act="wa-test" ${w.token_set ? '' : 'disabled'}>${ic('send', 14)} Kirim Pesan Tes</button>
        <div class="divider"></div>
        <div class="card-head" style="margin-bottom:8px"><div><h3 style="font-size:15px"><span class="card-title-ic">${ic('bell', 16)}</span>Pengingat Hari Ini</h3><p>Disusun dari data: konsumsi, jadwal vendor besok, tagihan setoran, dan ringkasan untuk Admin.</p></div></div>
        <div class="row wrap" style="gap:8px">
          <button class="btn btn-primary btn-sm" data-act="wa-preview">${ic('list', 14)} Susun & Kirim Pengingat</button>
          <button class="btn wa-btn btn-sm" data-act="wa-bulk-tagih">${ic('coins', 14)} Tagih Semua Panitia</button>
        </div>
      </div>
    </div>

    <div class="card section">
      <div class="card-head"><div><h3><span class="card-title-ic">${ic('clock', 18)}</span>Pengingat Otomatis (opsional)</h3>
        <p>Bila diaktifkan, sistem mengirim pengingat sendiri setiap hari pada jam yang dipilih — tanpa membuka aplikasi. Pesan yang sudah terkirim tidak dikirim ulang.</p></div>
        ${w.trigger_on && num(st.wa_auto_aktif) ? badge('Aktif • pukul ' + String(w.trigger_jam || st.wa_auto_jam).padStart(2, '0') + '.00', 'b-ok') : badge('Nonaktif', 'b-neu')}</div>
      <label class="switch-row"><input type="checkbox" id="wa-auto-on" ${num(st.wa_auto_aktif) ? 'checked' : ''}><span><b>Aktifkan pengingat otomatis</b></span></label>
      <div class="form-grid" style="margin-top:12px">
        <div class="field"><label>Jam kirim (WIB)</label><select class="select" id="wa-auto-jam">${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${num(st.wa_auto_jam) === h ? 'selected' : ''}>${String(h).padStart(2, '0')}.00 – ${String(h + 1).padStart(2, '0')}.00</option>`).join('')}</select></div>
        <div class="field"><label>Ulangi tagihan setoran setiap (hari)</label><input class="input tnum" id="wa-auto-ulang" type="number" min="1" max="30" value="${num(st.wa_ulang_hari) || 3}"></div>
      </div>
      <div class="wa-jenis" style="margin-top:12px">${WA_AUTO_JENIS.map((j) => `<label class="wa-jenis-item"><input type="checkbox" data-wa-jenis="${j.v}" ${jenisOn.has(j.v) ? 'checked' : ''}><span class="li-ic mint">${ic(j.icon, 16)}</span><span><b>${j.l}</b><br><span class="xs muted">${j.d}</span></span></label>`).join('')}</div>
      <div class="hint" style="margin-top:8px">Ringkasan harian dikirim ke <b>Nomor WhatsApp Admin</b> di Pengaturan${st.kontak_admin_wa ? ' (' + esc(st.kontak_admin_wa) + ')' : ' — <span class="tx-bad">belum diisi</span>'}. Google menjalankan jadwal dalam rentang jam tersebut.</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" data-act="wa-auto-save">${ic('check', 16)} Simpan Pengingat Otomatis</button></div>
    </div>

    <div class="card section"><div class="card-head"><div><h3><span class="card-title-ic">${ic('edit', 18)}</span>Format Pesan</h3><p>Kata di dalam {kurung kurawal} otomatis diganti data asli. Berlaku untuk kirim manual maupun otomatis.</p></div></div>
      <div class="grid-3">${Object.entries(TPL_DEF).map(([k, t]) => `<div class="remind" style="gap:10px"><div class="row" style="gap:10px"><span class="li-ic mint">${ic(t.icon, 18)}</span><b style="font-family:var(--font-head)">${esc(t.label)}</b></div>
        <div class="wa-box" style="max-height:150px;overflow:hidden;font-size:11.5px">${esc(fillTpl(getTpl(k), sampleVars(k)))}</div>
        <div class="row between">${(D().settings[t.key] || t.def) === t.def ? '<span class="xs muted">Format bawaan</span>' : badge('Sudah diubah', 'b-ok')}${tplBtn(k, '', 'Edit Format', 'btn-soft btn-sm')}</div></div>`).join('')}</div></div>

    <div class="card section"><div class="card-head"><div><h3><span class="card-title-ic">${ic('activity', 18)}</span>Riwayat Kirim</h3><p>150 pesan terakhir (manual & otomatis).</p></div><button class="btn btn-soft btn-sm" data-act="wa-log">${ic('refresh', 14)} Muat ulang</button></div>
      <div id="wa-log-box">${this.logTable()}</div></div>`;
  },
  logTable() {
    if (!WAS.log) return `<div class="center muted small" style="padding:16px">${ic('loader', 16)} Memuat riwayat...</div>`;
    return DT.render('wa-log', {
      rows: WAS.log, pageSize: 10, sort: 'waktu', dir: 'desc', search: (r) => r.nama_tujuan + ' ' + r.tujuan + ' ' + r.pesan + ' ' + r.jenis, placeholder: 'Cari penerima / isi pesan...',
      empty: emptyState('Belum ada pesan terkirim', 'Riwayat pesan WhatsApp akan tampil di sini.', 'chat'),
      cols: [
        { key: 'waktu', label: 'Waktu', main: true, render: (r) => `<div class="t-main small">${esc(r.waktu)}</div><div class="t-sub">${badge(WA_JENIS_LABEL[r.jenis] || r.jenis, 'b-info no-dot')} ${r.mode === 'otomatis' ? badge('otomatis', 'b-neu no-dot') : ''}</div>` },
        { key: 'nama_tujuan', label: 'Penerima', render: (r) => `<div class="small bold">${esc(r.nama_tujuan || '-')}</div><div class="xs muted tnum">${esc(r.tujuan)}</div>` },
        { key: 'pesan', label: 'Pesan', sort: false, render: (r) => `<div class="xs muted wa-log-msg" title="${esc(r.pesan)}">${esc(String(r.pesan).slice(0, 120))}${String(r.pesan).length > 120 ? '…' : ''}</div>` },
        { key: 'status', label: 'Status', render: (r) => (r.status === 'Terkirim' ? badge('Terkirim', 'b-ok') : badge('Gagal', 'b-bad')) + (r.status !== 'Terkirim' && r.keterangan ? `<div class="xs tx-bad">${esc(r.keterangan)}</div>` : '') }
      ]
    });
  },
  after() {
    const w = D().wa || {};
    if (w.token_set && !WAS.deviceLoaded) waLoadStatus();
    if (!WAS.log) waLoadLog();
  }
};

async function waLoadStatus(btn) {
  setBusy(btn, true, 'Memeriksa...');
  const res = await API.call('waStatus', {});
  setBusy(btn, false);
  WAS.deviceLoaded = true;
  WAS.device = res.success ? res.device : { status: false, reason: waErr(res.message) };
  if (App.route.name === 'wa') App.renderView(false);
}
async function waLoadLog(btn) {
  setBusy(btn, true, 'Memuat...');
  const res = await API.call('getWaLog', {});
  setBusy(btn, false);
  WAS.log = res.success ? res.log : [];
  if (!res.success && res.code !== 'AUTH') toast(waErr(res.message), 'error', 7000);
  const box = document.getElementById('wa-log-box');
  if (box && App.route.name === 'wa') box.innerHTML = AdminViews.wa.logTable();
}
ACT['wa-status'] = (el) => waLoadStatus(el);
ACT['wa-log'] = (el) => { WAS.log = null; waLoadLog(el); };
ACT['wa-token-save'] = async (el) => {
  const t = document.getElementById('wa-token').value.trim();
  if (!t) return toast('Tempel token Fonnte terlebih dahulu.', 'warn');
  const res = await App.write('saveWaToken', { token: t }, { btn: el, close: false, toast: false });
  if (!res.success) return;
  WAS.deviceLoaded = true; WAS.device = res.device || null;
  App.renderView(false);
  const dv = res.device || {};
  if (dv.status && dv.device_status === 'connect') toast('Token tersimpan. Perangkat ' + (dv.device || '') + ' terhubung ✓', 'success', 5000);
  else toast('Token tersimpan, tetapi ' + (dv.status ? 'perangkat belum terhubung — scan QR di dashboard Fonnte.' : 'token ditolak Fonnte: ' + (dv.reason || '-')), 'warn', 8000);
};
ACT['wa-token-del'] = async (el) => {
  if (!await confirmDialog({ title: 'Hapus token Fonnte?', message: 'Kirim otomatis & pengingat terjadwal akan berhenti sampai token dipasang lagi.', okText: 'Hapus', danger: true })) return;
  const res = await App.write('saveWaToken', { token: '' }, { btn: el, close: false });
  if (res.success) { WAS.device = null; WAS.deviceLoaded = false; App.renderView(false); }
};
ACT['wa-test'] = async (el) => {
  const to = document.getElementById('wa-test-to').value.trim();
  if (!waOk(to)) return toast('Isi nomor tujuan tes.', 'warn');
  setBusy(el, true, 'Mengirim...');
  const res = await API.call('sendWa', { items: [{ to, nama: 'Tes', jenis: 'tes', text: "Assalamu'alaikum. ✅ Tes pesan dari *Event Management Gontor 3* berhasil.\n" + tglPanjang(App.today) }] });
  setBusy(el, false);
  WAS.log = null; waLoadLog();
  if (!res.success) return toast(waErr(res.message), 'error', 7000);
  const h = (res.hasil || [])[0] || {};
  h.ok ? toast('Pesan tes terkirim. Silakan cek WhatsApp ' + to + '.', 'success', 5000) : toast('Gagal: ' + h.reason, 'error', 7000);
};
ACT['wa-preview'] = async (el) => {
  setBusy(el, true, 'Menyusun...');
  const res = await API.call('previewWaAuto', {});
  setBusy(el, false);
  if (!res.success) return toast(waErr(res.message), 'error', 7000);
  if (!res.items.length) return toast('Tidak ada pengingat untuk hari ini. Alhamdulillah, semua beres.', 'success', 4000);
  openWaBulk(res.items, 'Pengingat Hari Ini', res.items.filter((x) => !x.skip).length + ' siap dikirim • ' + res.items.filter((x) => x.skip).length + ' dilewati');
};
ACT['wa-auto-save'] = async (el) => {
  const jenis = [...document.querySelectorAll('[data-wa-jenis]:checked')].map((x) => x.dataset.waJenis);
  const aktif = document.getElementById('wa-auto-on').checked;
  if (aktif && !waReady()) return toast('Pasang token Fonnte terlebih dahulu.', 'warn');
  if (aktif && !jenis.length) return toast('Pilih minimal satu jenis pengingat.', 'warn');
  if (aktif && jenis.includes('ringkasan') && !waOk(D().settings.kontak_admin_wa)) toast('Nomor WhatsApp Admin belum diisi di Pengaturan — ringkasan harian akan dilewati.', 'warn', 6000);
  const res = await App.write('saveWaAuto', { aktif, jam: num(document.getElementById('wa-auto-jam').value), jenis, ulang_hari: num(document.getElementById('wa-auto-ulang').value) }, { btn: el, close: false });
  if (!res.success && /izinkanWhatsApp/.test(res.message || '')) toast(res.message, 'error', 10000);
};
