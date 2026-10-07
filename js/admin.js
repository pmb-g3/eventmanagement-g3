/* =====================================================================
 *  ADMIN.JS — seluruh halaman & formulir untuk peran Admin
 * ===================================================================== */

const ACT = {};
const STATUS_ACARA = ['Rencana', 'Estimasi Dikirim', 'Disetujui', 'Dipesan', 'Terpasang', 'Dibongkar', 'Selesai', 'Batal'];
const STATUS_PASANG = ['Belum', 'Penataan', 'Terpasang', 'Dibongkar'];
const KATEGORI = ['Tenda & Terop', 'Panggung', 'Rigging & Truss', 'Sound & Lighting', 'Kursi & Meja', 'Karpet & Permadani',
  'Sofa & Dekorasi', 'Pendingin & Kipas', 'Barikade & Keamanan', 'Genset & Listrik', 'Lainnya'];
const SATUAN = ['unit', 'set', 'paket', 'buah', 'lembar', 'roll', 'meter', 'm²', 'titik', 'hari'];
const satuanOpts = (v) => selectOpts(SATUAN.includes(v) || !v ? SATUAN : [v, ...SATUAN], v || 'unit');
const KAT_ICON = { 'Tenda & Terop': 'tent', Panggung: 'layers', 'Rigging & Truss': 'layers', 'Sound & Lighting': 'zap', 'Kursi & Meja': 'box', 'Karpet & Permadani': 'list', 'Sofa & Dekorasi': 'box', 'Pendingin & Kipas': 'activity', 'Barikade & Keamanan': 'shield', 'Genset & Listrik': 'zap' };

const AdminState = {
  homeTab: 'vendor',
  detailTab: 'barang',
  acaraFilter: { q: '', tahun: String(new Date().getFullYear()), status: '', bayar: '', setoran: '', nonaktif: false },
  pesananFilter: { acara: '', vendor: '', status: '' },
  katalogFilter: { vendor: '', kategori: '', nonaktif: false },
  dokJenis: ''
};

/* ---------- Data turunan ---------- */
const D = () => App.data;
const ambang = () => num(D().settings.ambang_hari) || 14;
function isOff(a) { return !a || a.status_acara === 'Batal' || a.nonaktif; }
function acaraAktif() { return D().acara.filter((a) => !isOff(a)); }
function tagihanList() {
  return D().fin.av.filter((x) => x.sisa > 0 && !isOff(App.maps.acara[x.id_acara])).sort((a, b) => b.umur - a.umur || a.tgl_ref.localeCompare(b.tgl_ref));
}
function setoranKurangList() {
  return acaraAktif().map((a) => Object.assign({ id_acara: a.id_acara }, App.finA(a.id_acara)))
    .filter((x) => x.kekurangan > 0 && x.biaya > 0).sort((a, b) => b.umur - a.umur);
}
function talanganList() {
  return acaraAktif().map((a) => Object.assign({ id_acara: a.id_acara }, App.finA(a.id_acara)))
    .filter((x) => x.talangan > 0).sort((a, b) => b.talangan - a.talangan);
}
function jadwalUpcoming(days) {
  const today = App.today, end = addDays(today, days), ev = {};
  D().pesanan.forEach((p) => {
    const a = App.acara(p.id_acara);
    if (isOff(a)) return;
    [['Pasang', p.tanggal_pasang], ['Bongkar', p.tanggal_bongkar]].forEach(([tahap, t]) => {
      if (!isYMD(t) || t < today || t > end) return;
      const k = [p.id_acara, p.id_vendor, tahap, t].join('|');
      const e = ev[k] || (ev[k] = { id_acara: p.id_acara, id_vendor: p.id_vendor, tahap, tanggal: t, n: 0, done: 0, lokasi: p.lokasi || a.lokasi });
      e.n++;
      if (tahap === 'Pasang' ? ['Terpasang', 'Dibongkar'].includes(p.status_pasang) : p.status_pasang === 'Dibongkar') e.done++;
    });
  });
  return Object.values(ev).sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.tahap.localeCompare(b.tahap));
}
function konsumsiDue() {
  const today = App.today, besok = addDays(today, 1);
  return D().konsumsi.filter((k) => (k.tanggal === today || k.tanggal === besok) && !isOff(App.maps.acara[k.id_acara]))
    .sort((a, b) => Number(a.sudah_diingatkan) - Number(b.sudah_diingatkan) || (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam));
}
function rekomendasiKonsumsi(durasi, kesulitan) {
  const st = D().settings;
  let lv = 1;
  if (num(durasi) < num(st.batas_jam_ringan)) lv = 0; else if (num(durasi) > num(st.batas_jam_berat)) lv = 2;
  lv = Math.max(lv, { Ringan: 0, Sedang: 1, Berat: 2 }[kesulitan] ?? 1);
  return [st.konsumsi_ringan, st.konsumsi_sedang, st.konsumsi_berat][lv];
}
/* ---------- Format pesan WhatsApp (bisa diedit Admin) ---------- */
const TPL_DEF = {
  konsumsi: {
    key: 'tpl_konsumsi', label: 'Pengingat Konsumsi Pekerja', icon: 'utensils',
    def: "Assalamu'alaikum warahmatullah, Ustadz {panitia}.\nMohon disiapkan konsumsi untuk {jumlah_pekerja} kru {vendor} yang akan {kegiatan} perlengkapan *{acara}* pada {tanggal} pukul {jam} di {lokasi}.\nPerkiraan durasi {durasi} jam ({kesulitan}).\nRekomendasi: {rekomendasi}.\nMari memuliakan pekerja sebelum keringatnya kering. Jazakumullah khairan.",
    vars: { panitia: 'Nama panitia (PJ)', acara: 'Nama acara', vendor: 'Nama vendor', kegiatan: 'memasang / membongkar', tanggal: 'Hari & tanggal kegiatan', jam: 'Jam mulai (mis. 08:00 WIB)', lokasi: 'Lokasi acara', jumlah_pekerja: 'Jumlah pekerja', durasi: 'Perkiraan durasi (jam)', kesulitan: 'Ringan / Sedang / Berat', rekomendasi: 'Rekomendasi konsumsi', admin: 'Nama Admin' }
  },
  tagih: {
    key: 'tpl_tagih_setoran', label: 'Tagihan Setoran ke Panitia', icon: 'coins',
    def: "Assalamu'alaikum warahmatullah, Ustadz {panitia}.\nMengingatkan setoran biaya perlengkapan acara *{acara}* ({tanggal_acara}).\n• Total biaya riil: {biaya}\n• Sudah disetor: {sudah_setor}\n• Kekurangan: *{kekurangan}*\nNota dari vendor dapat kami sampaikan. Jazakumullah khairan.\n— {admin}",
    vars: { panitia: 'Nama panitia (PJ)', acara: 'Nama acara', tanggal_acara: 'Tanggal acara', biaya: 'Total biaya riil', sudah_setor: 'Total sudah disetor', kekurangan: 'Kekurangan setoran', talangan: 'Nominal yang ditalangi Admin', admin: 'Nama Admin' }
  },
  akun: {
    key: 'tpl_akun_vendor', label: 'Kirim Akun ke Vendor', icon: 'user',
    def: "Assalamu'alaikum {pic}.\nBerikut akun Portal Vendor Event Management Gontor 3:\n• Alamat: {link}\n• Username: {username}\n• Kata sandi: {password}\nMohon dijaga kerahasiaannya. Jazakumullah khairan.",
    vars: { pic: 'Nama PIC vendor', vendor: 'Nama vendor', link: 'Alamat aplikasi', username: 'Username', password: 'Kata sandi', admin: 'Nama Admin' }
  }
};
function getTpl(type) { const t = TPL_DEF[type]; return (D().settings[t.key] || t.def); }
function fillTpl(tpl, vars) { return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)); }
function varsKonsumsi(k) {
  const a = App.acara(k.id_acara);
  return {
    panitia: a.nama_panitia || 'Panitia', acara: a.nama_acara, vendor: App.vName(k.id_vendor), kegiatan: k.tahap === 'Pasang' ? 'memasang' : 'membongkar',
    tanggal: tglPanjang(k.tanggal), jam: k.jam ? k.jam + ' WIB' : '-', lokasi: a.lokasi || '-', jumlah_pekerja: num(k.jumlah_pekerja) || 'para',
    durasi: num(k.durasi_jam) || '-', kesulitan: k.kesulitan, rekomendasi: k.rekomendasi, admin: D().settings.nama_admin
  };
}
function varsTagih(ida) {
  const a = App.acara(ida), f = App.finA(ida);
  return {
    panitia: a.nama_panitia || 'Panitia', acara: a.nama_acara, tanggal_acara: tglRange(a.tanggal_mulai, a.tanggal_selesai),
    biaya: rp(f.biaya), sudah_setor: rp(f.setoran), kekurangan: rp(f.kekurangan), talangan: rp(f.talangan), admin: D().settings.nama_admin
  };
}
function varsAkun(c) {
  const v = App.maps.vendor[c.id_vendor] || {};
  return { pic: v.pic || '', vendor: v.nama_vendor || '', link: location.href.split('#')[0], username: c.username, password: c.password, admin: D().settings.nama_admin };
}
function sampleVars(type) {
  if (type === 'konsumsi') {
    const k = D().konsumsi[0];
    return k ? varsKonsumsi(k) : { panitia: 'Ust. Rahmat', acara: 'Panggung Gembira', vendor: 'Berkah Jaya Tenda', kegiatan: 'memasang', tanggal: tglPanjang(addDays(App.today, 1)), jam: '08:00 WIB', lokasi: 'Lapangan Hijau', jumlah_pekerja: 8, durasi: 7, kesulitan: 'Berat', rekomendasi: D().settings.konsumsi_berat, admin: D().settings.nama_admin };
  }
  if (type === 'tagih') {
    const x = setoranKurangList()[0];
    return x ? varsTagih(x.id_acara) : { panitia: 'Ust. Fajar', acara: 'Panggung Gembira', tanggal_acara: tgl(App.today), biaya: rp(25500000), sudah_setor: rp(2000000), kekurangan: rp(23500000), talangan: rp(2000000), admin: D().settings.nama_admin };
  }
  return { pic: 'Pak Slamet', vendor: 'Berkah Jaya Tenda', link: location.href.split('#')[0], username: 'vendor1', password: 'abc12345', admin: D().settings.nama_admin };
}
function konsumsiText(k) { return fillTpl(getTpl('konsumsi'), varsKonsumsi(k)); }
function tagihSetoranText(ida) { return fillTpl(getTpl('tagih'), varsTagih(ida)); }
function tplBtn(type, ref, label = 'Edit Format', cls = 'btn-ghost btn-sm') {
  return `<button type="button" class="btn ${cls}" data-act="wa-tpl" data-tpl="${type}" ${ref ? `data-ref="${esc(ref)}"` : ''} title="Ubah format pesan WhatsApp">${ic('edit', 14)} ${label}</button>`;
}
function waBtn(phone, text, label = 'Kirim WA', cls = 'btn-sm') {
  return `<a class="btn wa-btn ${cls}" href="${waLink(phone, text)}" target="_blank" rel="noopener">${ic('chat', 15)} ${label}</a>`;
}
function vendorOpts(val, placeholder = 'Pilih vendor', onlyActive = true) {
  return selectOpts(D().vendor.filter((v) => !onlyActive || v.aktif || v.id_vendor === val).map((v) => ({ value: v.id_vendor, label: v.nama_vendor })), val, placeholder);
}
function acaraOpts(val, placeholder = 'Pilih acara') {
  const list = D().acara.filter((a) => !a.nonaktif || a.id_acara === val).sort((a, b) => b.tanggal_mulai.localeCompare(a.tanggal_mulai));
  return selectOpts(list.map((a) => ({ value: a.id_acara, label: a.nama_acara + ' — ' + tgl(a.tanggal_mulai) + (a.status_acara === 'Batal' ? ' (Batal)' : '') + (a.nonaktif ? ' (Nonaktif)' : '') })), val, placeholder);
}
function uploadBox(id, label, sub, accept = 'image/*,application/pdf', multiple = false) {
  return `<label class="upload" id="${id}-box"><span class="u-ic">${ic('upload', 20)}</span><span class="grow" style="min-width:0"><span class="u-t ellipsis" id="${id}-t" style="display:block">${label}</span><span class="u-s" id="${id}-s">${sub}</span></span><input type="file" id="${id}" accept="${accept}" ${multiple ? 'multiple' : ''}></label>`;
}
document.addEventListener('change', (e) => {
  const inp = e.target;
  if (inp.type === 'file' && inp.closest('.upload') && !inp.multiple) {
    const f = inp.files[0];
    const t = document.getElementById(inp.id + '-t'), s = document.getElementById(inp.id + '-s');
    inp.closest('.upload').classList.toggle('has', !!f);
    if (f && t) t.textContent = f.name;
    if (f && s) s.textContent = (f.size / 1024 / 1024).toFixed(2) + ' MB • siap diunggah';
  }
});
function fileLink(idBerkas, label, title) {
  if (!idBerkas) return '<span class="muted small">—</span>';
  return `<button class="btn btn-soft btn-xs" data-act="open-file" data-id="${esc(idBerkas)}" data-title="${esc(title || label)}">${ic('eye', 14)} ${label}</button>`;
}
function showPdf(res) { if (res && res.file) showFile(res.file, 'PDF siap — tersimpan di Google Drive'); }

/* =====================================================================
 *  BERANDA
 * ===================================================================== */
const AdminViews = {};
AdminViews.beranda = {
  title: 'Beranda',
  render() {
    const d = D(), t = d.fin.total, st = d.settings, amb = ambang(), today = App.today;
    const tag = tagihanList(), setr = setoranKurangList(), tal = talanganList(), jad = jadwalUpcoming(7), ks = konsumsiDue();
    const vendorTertagih = new Set(tag.map((x) => x.id_vendor)).size;
    const lokasi = [...new Set(jad.map((j) => j.lokasi).filter(Boolean))];
    const nama = d.user.nama || 'Ustadz';
    const pct = t.tagihan ? Math.round((t.dibayar / t.tagihan) * 100) : 0;
    const counts = { vendor: tag.length, setoran: setr.length, talangan: tal.length };
    return `
    <div class="hero">
      <div style="flex:1;min-width:260px">
        <span class="hero-pill">Sistem Operasional GAS Aktif</span>
        <div class="hero-date">${ic('clock', 15)} ${tglPanjang(today)} / ${hijri(today)}</div>
        <h1>Assalamu'alaikum, ${esc(nama)}</h1>
        <p>Pantau tagihan vendor, setoran panitia, dana talangan, serta kesiapan logistik lapangan ${esc(window.APP_CONFIG.KAMPUS)} dalam satu layar.</p>
      </div>
      <div class="hero-actions">
        <button class="btn btn-white" data-act="new-acara">${ic('plus', 17)} Buat Acara Baru</button>
        <div class="row"><button class="btn btn-glass" data-act="new-bayar">${ic('wallet', 16)} Catat Pembayaran Multi-Acara</button>
        <button class="btn btn-glass" data-act="new-setoran">${ic('coins', 16)} Catat Setoran</button></div>
      </div>
    </div>

    <div class="kpi-grid stagger" style="margin-top:22px">
      <div class="kpi ${t.n_lewat ? 'alert' : ''}" style="--i:0">
        <div class="kpi-top"><span class="kpi-ic red">${ic('receipt', 22)}</span>${t.n_lewat ? `<span class="badge b-bad">${t.n_lewat} Perlu Ditagih</span>` : t.n_tagihan ? `<span class="badge b-warn">${t.n_tagihan} Tertunda</span>` : '<span class="badge b-ok">Semua Lunas</span>'}</div>
        <div class="kpi-label">Tagihan Vendor Belum Lunas</div>
        <div class="kpi-value">${countEl(t.sisa)}</div>
        <div class="kpi-sub">${ic('alertCircle', 14)} Harus dibayarkan ke ${vendorTertagih} vendor mitra</div>
        <div class="kpi-foot"><span>Jatuh tempo: ${tag[0] ? (tag[0].umur > amb ? 'lewat ' + (tag[0].umur - amb) + ' hari' : tag[0].umur === amb ? 'hari ini' : tag[0].umur ? (amb - tag[0].umur) + ' hari lagi' : 'belum') : '-'}</span><span class="tx-bad">${tag[0] ? esc(App.acara(tag[0].id_acara).nama_acara) : ''}</span></div>
      </div>
      <div class="kpi" style="--i:1">
        <div class="kpi-top"><span class="kpi-ic">${ic('wallet', 22)}</span><span class="badge b-ok">Kas Siap Salur</span></div>
        <div class="kpi-label">Total Dana di Tangan Admin</div>
        <div class="kpi-value green">${countEl(t.dana)}</div>
        <div class="kpi-sub">${ic('checkCircle', 14)} Setoran panitia dikurangi bayar vendor</div>
        <div class="kpi-foot"><span>Bersih setelah talangan</span><span class="${t.dana_net < 0 ? 'tx-bad' : 'tx-ok'} bold">${rp(t.dana_net)}</span></div>
      </div>
      <div class="kpi ${t.talangan ? 'alert' : ''}" style="--i:2">
        <div class="kpi-top"><span class="kpi-ic red">${ic('handshake', 22)}</span>${t.talangan ? '<span class="badge b-bad">Admin Menalangi</span>' : '<span class="badge b-ok">Aman</span>'}</div>
        <div class="kpi-label">Acara Ditalangi Admin</div>
        <div class="kpi-value ${t.talangan ? 'red' : ''}">${countEl(t.talangan)}</div>
        <div class="kpi-sub">${ic('alert', 14)} ${t.n_ditalangi} acara defisit setoran panitia</div>
        <div class="kpi-foot"><span>Tertinggi</span><span class="tx-bad">${tal[0] ? esc(App.acara(tal[0].id_acara).nama_acara) : '-'}</span></div>
      </div>
      <div class="kpi" style="--i:3">
        <div class="kpi-top"><span class="kpi-ic amber">${ic('truck', 22)}</span>${jad.length ? '<span class="badge b-warn">Masa Sibuk</span>' : '<span class="badge b-neu">Lengang</span>'}</div>
        <div class="kpi-label">Jadwal Pasang & Bongkar (7 hari)</div>
        <div class="kpi-value">${jad.length} <span style="font-size:16px">Jadwal</span></div>
        <div class="kpi-sub">${ic('pin', 14)} ${lokasi.length ? esc(lokasi.slice(0, 2).join(', ')) + (lokasi.length > 2 ? ' +' + (lokasi.length - 2) : '') : 'Belum ada jadwal'}</div>
        <div class="kpi-foot"><span>Konsumsi perlu diingatkan</span><span class="bold">${ks.filter((k) => !k.sudah_diingatkan).length}</span></div>
      </div>
    </div>

    <div class="card section">
      <div class="card-head">
        <div><h3><span class="card-title-ic red">${ic('alertCircle', 18)}</span>Tagihan Vendor & Setoran Panitia Perlu Segera Ditagih</h3>
        <p>Diurutkan dari yang paling lama. Jatuh tempo = ${amb} hari setelah acara selesai/dibongkar (atur di Pengaturan); penanda merah berarti sudah lewat jatuh tempo.</p></div>
        <div class="tabs">
          ${[['vendor', 'Tagihan Vendor'], ['setoran', 'Setoran Panitia'], ['talangan', 'Ditalangi']].map(([k, l]) =>
            `<button class="chip ${AdminState.homeTab === k ? 'active' : ''}" data-act="home-tab" data-tab="${k}">${l} <span class="cnt">${counts[k]}</span></button>`).join('')}
        </div>
      </div>
      <div id="home-tab-panel" class="tab-panel">${this.tabPanel()}</div>
    </div>

    <div class="card section">
      <div class="card-head">
        <div><h3><span class="card-title-ic">${ic('utensils', 18)}</span>Pengingat Konsumsi Pekerja Vendor (H-1 & Hari H)</h3>
        <p>Adab kepondokan: memuliakan pekerja rekanan dengan konsumsi yang sesuai durasi & beban pekerjaan.</p></div>
        <button class="btn btn-soft btn-sm" data-act="new-konsumsi">${ic('plus', 15)} Jadwal Konsumsi</button>
      </div>
      ${ks.length ? `<div class="grid-2">${ks.map((k) => this.konsumsiCard(k)).join('')}</div>`
        : emptyState('Tidak ada pengingat konsumsi untuk hari ini & besok', this.nextKonsumsiText(), 'utensils')}
    </div>

    <div class="grid-2 section">
      <div class="card">
        <div class="card-head"><div><h3><span class="card-title-ic amber">${ic('truck', 18)}</span>Jadwal Lapangan 7 Hari</h3><p>Pemasangan & pembongkaran terdekat.</p></div></div>
        ${jad.length ? `<div class="list">${jad.slice(0, 8).map((j) => `
          <div class="li" style="cursor:pointer" data-act="open-acara" data-id="${esc(j.id_acara)}">
            <div class="date-blk ${j.tahap === 'Bongkar' ? 'past' : ''}" style="width:50px;min-width:50px;padding:5px 0"><div class="m">${BLN[parseYMD(j.tanggal).getMonth()]}</div><div class="d" style="font-size:18px">${parseYMD(j.tanggal).getDate()}</div></div>
            <div class="grow"><div class="bold ellipsis">${esc(App.acara(j.id_acara).nama_acara)}</div>
              <div class="small muted ellipsis">${esc(App.vName(j.id_vendor))} • ${j.n} barang${j.lokasi ? ' • ' + esc(j.lokasi) : ''}</div></div>
            <div class="stack" style="align-items:flex-end">${badge(j.tahap)}<span class="xs muted">${relDay(j.tanggal, App.today)}</span></div>
          </div>`).join('')}</div>` : emptyState('Belum ada jadwal 7 hari ke depan', 'Atur tanggal pasang/bongkar di Pesanan Barang.', 'calendar')}
      </div>
      <div class="grid-2" style="gap:18px">
        <div class="card" style="display:flex;flex-direction:column;gap:14px">
          <div class="row between"><h3 style="font-size:15px">Progres Pelunasan Vendor</h3>${ic('trending', 18, 'tx-primary')}</div>
          <div class="row" style="gap:16px">
            <div class="ring" style="--p:${pct}"><div><b>${pct}%</b><span>LUNAS</span></div></div>
            <div class="stack" style="gap:8px;min-width:0"><div><div class="xs muted">Sudah dibayar</div><div class="bold tnum tx-ok">${rpShort(t.dibayar)}</div></div>
            <div><div class="xs muted">Sisa tunggakan</div><div class="bold tnum tx-bad">${rpShort(t.sisa)}</div></div></div>
          </div>
          <div class="xs muted">Dari total biaya riil ${rp(t.tagihan)} seluruh acara.</div>
        </div>
        <div class="quote">
          <span class="t">${ic('shield', 15)} Prinsip Amanah Pondok</span>
          <q>Berikanlah upah kepada pekerja sebelum keringatnya kering.</q>
          <p>(HR. Ibnu Majah) — Mari tertibkan pembukuan, segera salurkan hak vendor yang terpasang, dan tagih dana urunan panitia dengan cara yang ma'ruf.</p>
        </div>
      </div>
    </div>

    <div class="card section">
      <div class="card-head"><div><h3><span class="card-title-ic">${ic('phone', 18)}</span>Hotline Cepat Vendor Lapangan</h3><p>Hubungi PIC vendor langsung lewat WhatsApp.</p></div>
      <a class="btn btn-ghost btn-sm" href="#/vendor">Kelola Vendor ${ic('chevR', 15)}</a></div>
      ${d.vendor.filter((v) => v.aktif).length ? `<div class="grid-3">${d.vendor.filter((v) => v.aktif).map((v) => `
        <div class="li" style="border:1px solid var(--border);border-radius:14px;padding:12px">
          <span class="li-ic mint">${initials(v.nama_vendor)}</span>
          <div class="grow"><div class="bold ellipsis">${esc(v.nama_vendor)}</div><div class="small muted ellipsis">${esc(v.pic || '-')} • ${esc(v.kontak || '-')}</div></div>
          ${v.kontak ? `<a class="btn btn-mint btn-icon btn-sm" href="${waLink(v.kontak, 'Assalamu\'alaikum ' + (v.pic || '') + ', ')}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('chat', 16)}</a>` : ''}
        </div>`).join('')}</div>` : emptyState('Belum ada vendor', 'Tambahkan vendor di menu Vendor & Akun.', 'store')}
    </div>`;
  },
  tabPanel() {
    const amb = ambang(), tab = AdminState.homeTab;
    if (tab === 'vendor') {
      return DT.render('home-vendor', {
        rows: tagihanList(), pageSize: 8, empty: emptyState('Alhamdulillah, tidak ada tagihan vendor tertunda', '', 'checkCircle'),
        search: (r) => App.acara(r.id_acara).nama_acara + ' ' + App.vName(r.id_vendor), placeholder: 'Cari acara / vendor...',
        cols: [
          { key: 'acara', label: 'Acara & Rekanan Vendor', main: true, sortVal: (r) => App.acara(r.id_acara).nama_acara, render: (r) => `<div class="row" style="gap:12px"><span class="t-ic">${ic('tent', 19)}</span><div style="min-width:0"><div class="t-main">${esc(App.acara(r.id_acara).nama_acara)}</div><div class="t-sub">${ic('store', 13)} ${esc(App.vName(r.id_vendor))}</div></div></div>` },
          { key: 'sisa', label: 'Sisa Tagihan Vendor', render: (r) => `<div class="stack" style="gap:0;align-items:inherit"><b class="tnum">${rp(r.sisa)}</b><span class="xs muted">dari ${rp(r.tagihan)}</span></div>` },
          { key: 'setoran', label: 'Status Setoran Panitia', sort: false, render: (r) => { const f = App.finA(r.id_acara); return f.talangan > 0 ? badge('Ditalangi ' + rpShort(f.talangan), 'b-bad') : f.kekurangan > 0 ? `<span class="tx-bad small bold">Kurang ${rp(f.kekurangan)}</span>` : badge('Lunas disetor', 'b-ok'); } },
          { key: 'umur', label: 'Jatuh Tempo', render: (r) => agingPill(r.umur, amb) },
          { key: '', label: 'Tindakan', acts: true, sort: false, render: (r) => `<div class="acts"><button class="btn btn-primary btn-sm" data-act="new-bayar" data-vendor="${r.id_vendor}" data-acara="${r.id_acara}">${ic('wallet', 14)} Bayar</button><button class="btn btn-soft btn-sm" data-act="open-acara" data-id="${r.id_acara}">Detail</button></div>` }
        ]
      });
    }
    const list = tab === 'setoran' ? setoranKurangList() : talanganList();
    return DT.render('home-' + tab, {
      rows: list, pageSize: 8,
      empty: emptyState(tab === 'setoran' ? 'Semua panitia sudah menyetor' : 'Tidak ada acara yang ditalangi', '', 'checkCircle'),
      search: (r) => App.acara(r.id_acara).nama_acara + ' ' + App.acara(r.id_acara).nama_panitia, placeholder: 'Cari acara / panitia...',
      tools: tplBtn('tagih', '', 'Edit Format WA Tagihan', 'btn-soft btn-sm'),
      cols: [
        { key: 'acara', label: 'Acara & Panitia', main: true, sortVal: (r) => App.acara(r.id_acara).nama_acara, render: (r) => { const a = App.acara(r.id_acara); return `<div class="row" style="gap:12px"><span class="t-ic">${ic('users', 18)}</span><div style="min-width:0"><div class="t-main">${esc(a.nama_acara)}</div><div class="t-sub">PJ: ${esc(a.nama_panitia || '-')}</div></div></div>`; } },
        { key: 'biaya', label: 'Biaya Riil', align: 'r', render: (r) => `<span class="tnum">${rp(r.biaya)}</span>` },
        tab === 'setoran'
          ? { key: 'setoran', label: 'Sudah Setor', align: 'r', render: (r) => `<span class="tnum">${rp(r.setoran)}</span>` }
          : { key: 'dibayar', label: 'Dibayar ke Vendor', align: 'r', render: (r) => `<span class="tnum">${rp(r.dibayar)}</span>` },
        tab === 'setoran'
          ? { key: 'kekurangan', label: 'Kekurangan', align: 'r', render: (r) => `<b class="tnum tx-bad">${rp(r.kekurangan)}</b>` }
          : { key: 'talangan', label: 'Talangan Admin', align: 'r', render: (r) => `<b class="tnum tx-bad">${rp(r.talangan)}</b>` },
        { key: 'umur', label: 'Jatuh Tempo', render: (r) => agingPill(r.umur, amb) },
        { key: '', label: 'Tindakan', acts: true, sort: false, render: (r) => { const a = App.acara(r.id_acara); return `<div class="acts">${waBtn(a.kontak_panitia, tagihSetoranText(r.id_acara), 'Tagih')}<button class="btn btn-soft btn-sm" data-act="new-setoran" data-acara="${r.id_acara}">${ic('plus', 14)} Setoran</button></div>`; } }
      ]
    });
  },
  konsumsiCard(k) {
    const a = App.acara(k.id_acara), today = App.today;
    const txt = konsumsiText(k);
    return `<div class="remind">
      <div class="remind-head"><div><span class="badge b-dark no-dot">${esc(a.nama_acara)}</span>
        <h4>${k.tahap === 'Pasang' ? 'Pemasangan' : 'Pembongkaran'} — ${esc(App.vName(k.id_vendor))}</h4></div>
        ${k.sudah_diingatkan ? badge('Sudah diingatkan', 'b-ok') : badge(k.tanggal === today ? 'Hari H — Belum' : 'H-1 — Belum', 'b-bad')}</div>
      <div class="facts">
        <div class="fact"><div class="l">Waktu</div><div class="v">${relDay(k.tanggal, today)}${k.jam ? ', ' + esc(k.jam) : ''}</div></div>
        <div class="fact"><div class="l">Durasi & Beban</div><div class="v ${k.kesulitan === 'Berat' ? 'tx-bad' : ''}">${num(k.durasi_jam)} jam (${esc(k.kesulitan)})</div></div>
        <div class="fact"><div class="l">Pekerja</div><div class="v">${num(k.jumlah_pekerja) || '-'} orang</div></div>
      </div>
      <div class="rec"><div class="t">${ic('utensils', 13)} Rekomendasi wajib disediakan panitia</div><div class="v">${esc(k.rekomendasi)}</div></div>
      <div class="wa-box" id="ks-txt-${k.id_konsumsi}">${esc(txt)}</div>
      <div class="row wrap">
        <button class="btn btn-mint btn-sm" data-act="copy" data-target="ks-txt-${k.id_konsumsi}">${ic('copy', 15)} Salin Format WA</button>
        ${tplBtn('konsumsi', k.id_konsumsi)}
        ${a.kontak_panitia ? waBtn(a.kontak_panitia, txt, 'Kirim ke Panitia') : ''}
        <button class="btn ${k.sudah_diingatkan ? 'btn-ghost' : 'btn-primary'} btn-sm" data-act="ks-mark" data-id="${k.id_konsumsi}" data-v="${k.sudah_diingatkan ? '0' : '1'}">${ic(k.sudah_diingatkan ? 'x' : 'check', 15)} ${k.sudah_diingatkan ? 'Batalkan tanda' : 'Tandai Sudah Diingatkan'}</button>
      </div>
    </div>`;
  },
  nextKonsumsiText() {
    const next = D().konsumsi.filter((k) => k.tanggal > addDays(App.today, 1)).sort((a, b) => a.tanggal.localeCompare(b.tanggal))[0];
    return next ? 'Berikutnya: ' + esc(App.acara(next.id_acara).nama_acara) + ' — ' + tgl(next.tanggal) : 'Tambahkan jadwal konsumsi dari detail acara.';
  }
};
ACT['home-tab'] = (el) => {
  AdminState.homeTab = el.dataset.tab;
  document.querySelectorAll('[data-act="home-tab"]').forEach((b) => b.classList.toggle('active', b === el));
  const p = document.getElementById('home-tab-panel');
  p.innerHTML = AdminViews.beranda.tabPanel();
  p.classList.remove('tab-panel'); void p.offsetWidth; p.classList.add('tab-panel');
};

/* =====================================================================
 *  DAFTAR ACARA
 * ===================================================================== */
AdminViews.acara = {
  title: (id) => id ? 'Detail Acara' : 'Daftar Acara',
  render(id) {
    if (id) return AcaraDetail.render(id);
    const d = D(), f = AdminState.acaraFilter;
    const years = [...new Set(d.acara.map((a) => a.tahun))].sort().reverse();
    if (f.tahun && !years.includes(f.tahun)) years.unshift(f.tahun);
    const nOff = d.acara.filter((a) => a.nonaktif && (!f.tahun || a.tahun === f.tahun)).length;
    let list = d.acara.filter((a) => f.nonaktif ? a.nonaktif : !a.nonaktif);
    if (f.tahun) list = list.filter((a) => a.tahun === f.tahun);
    if (f.status) list = list.filter((a) => a.status_acara === f.status);
    if (f.bayar) list = list.filter((a) => App.finA(a.id_acara).status_bayar === f.bayar);
    if (f.setoran) list = list.filter((a) => App.finA(a.id_acara).status_setoran === f.setoran);
    if (f.q) {
      const q = f.q.toLowerCase();
      list = list.filter((a) => (a.nama_acara + ' ' + a.lokasi + ' ' + a.nama_panitia + ' ' +
        d.pesanan.filter((p) => p.id_acara === a.id_acara).map((p) => p.nama_barang + ' ' + App.vName(p.id_vendor)).join(' ')).toLowerCase().includes(q));
    }
    const today = App.today;
    list.sort((a, b) => {
      const ua = a.tanggal_selesai >= today, ub = b.tanggal_selesai >= today;
      if (ua !== ub) return ua ? -1 : 1;
      return ua ? a.tanggal_mulai.localeCompare(b.tanggal_mulai) : b.tanggal_mulai.localeCompare(a.tanggal_mulai);
    });
    const sum = list.reduce((s, a) => { const x = App.finA(a.id_acara); s.biaya += x.biaya || 0; s.talangan += x.talangan || 0; s.n += x.jumlah_item || 0; s.t += x.terpasang || 0; if (x.talangan > 0) s.nt++; return s; }, { biaya: 0, talangan: 0, n: 0, t: 0, nt: 0 });
    const filtered = f.q || f.status || f.bayar || f.setoran;
    return `
    <div class="page-head">
      <div><span class="eyebrow">${ic('calendar', 13)} ${f.tahun ? 'Tahun ' + esc(f.tahun) : 'Semua tahun'}</span><h1>Daftar Acara & Kebutuhan Logistik</h1>
      <p>Pusat kendali sewa perlengkapan tiap acara: pesanan vendor, status pemasangan, pembayaran, dan setoran panitia.</p></div>
      <div class="row wrap"><button class="btn btn-soft" data-act="go-dokumen">${ic('printer', 16)} Rekap PDF</button><button class="btn btn-primary" data-act="new-acara">${ic('plus', 17)} Buat Acara Baru</button></div>
    </div>
    <div class="mini-kpis stagger">
      <div class="mini-kpi" style="--i:0"><div class="l">Total Agenda Acara</div><div class="v">${list.length}</div><div class="s">${list.filter((a) => a.tanggal_selesai >= today).length} akan datang / berjalan</div></div>
      <div class="mini-kpi" style="--i:1"><div class="l">Total Biaya Riil Sewa</div><div class="v">${countEl(sum.biaya)}</div><div class="s">${sum.n} item barang dipesan</div></div>
      <div class="mini-kpi" style="--i:2"><div class="l tx-bad">Admin Menalangi</div><div class="v tx-bad">${countEl(sum.talangan)}</div><div class="s">${sum.nt} acara menunggu setoran</div></div>
      <div class="mini-kpi" style="--i:3"><div class="l">Kesiapan Instalasi</div><div class="v">${sum.n ? Math.round((sum.t / sum.n) * 100) : 0}%</div><div class="progress" style="margin-top:6px"><span style="width:${sum.n ? (sum.t / sum.n) * 100 : 0}%"></span></div></div>
    </div>
    <div class="card pad-sm section" style="margin-top:18px">
      <div class="dt-tools" style="margin:0">
        <div class="search">${ic('search', 16)}<input type="search" id="af-q" placeholder="Cari acara, lokasi, panitia, barang..." value="${esc(f.q)}"></div>
        <select class="select sm" style="width:auto" data-af="tahun">${selectOpts(years.map((y) => ({ value: y, label: 'Tahun ' + y + ' (' + hijriYear(y + '-07-01') + ' H)' })), f.tahun, 'Semua tahun')}</select>
        <select class="select sm" style="width:auto" data-af="status">${selectOpts(STATUS_ACARA, f.status, 'Semua status acara')}</select>
        <select class="select sm" style="width:auto" data-af="bayar">${selectOpts(['Belum', 'Sebagian', 'Lunas'].map((s) => ({ value: s, label: 'Bayar vendor: ' + s })), f.bayar, 'Semua status bayar')}</select>
        <select class="select sm" style="width:auto" data-af="setoran">${selectOpts(['Belum', 'Sebagian', 'Lunas'].map((s) => ({ value: s, label: 'Setoran: ' + s })), f.setoran, 'Semua status setoran')}</select>
        <label class="check small"><input type="checkbox" data-af="nonaktif" ${f.nonaktif ? 'checked' : ''}> Lihat acara nonaktif (${nOff})</label>
        ${filtered ? `<button class="btn btn-ghost btn-sm" data-act="af-reset">${ic('x', 14)} Reset</button>` : ''}
      </div>
    </div>
    <div class="ev-list stagger section" style="margin-top:16px">
      ${list.length ? list.map((a, i) => this.card(a, i)).join('') : `<div class="card">${emptyState(filtered ? 'Tidak ada acara yang cocok dengan filter' : 'Belum ada acara', filtered ? 'Coba ubah kata kunci atau filter.' : 'Mulai dengan membuat acara pertama.', 'calendar')}${filtered ? '' : `<div class="center"><button class="btn btn-primary" data-act="new-acara">${ic('plus', 16)} Buat Acara</button></div>`}</div>`}
    </div>`;
  },
  card(a, i) {
    const x = App.finA(a.id_acara), today = App.today;
    const dt = parseYMD(a.tanggal_mulai), past = a.tanggal_selesai < today;
    const pct = x.jumlah_item ? Math.round((x.terpasang / x.jumlah_item) * 100) : 0;
    return `<div class="ev-card ${a.nonaktif ? 'off' : ''}" style="--i:${Math.min(i, 10)}" data-act="open-acara" data-id="${esc(a.id_acara)}">
      <div class="date-blk ${past ? 'past' : ''}"><div class="m">${BLN[dt.getMonth()]}</div><div class="d">${dt.getDate()}</div></div>
      <div class="ev-body">
        <div class="ev-title">${esc(a.nama_acara)} ${badge(a.status_acara)}${a.nonaktif ? badge('Nonaktif', 'b-neu no-dot') : ''}</div>
        <div class="ev-meta"><span>${ic('calendar', 14)} ${tglRange(a.tanggal_mulai, a.tanggal_selesai)}</span><span>${ic('user', 14)} PJ: ${esc(a.nama_panitia || '-')}</span>${a.lokasi ? `<span>${ic('pin', 14)} ${esc(a.lokasi)}</span>` : ''}</div>
        <div class="ev-badges">
          ${x.biaya ? payBadge(x.status_bayar, 'Vendor') : badge('Belum ada pesanan', 'b-neu')}
          ${x.biaya ? payBadge(x.status_setoran, 'Setoran') : ''}
          ${x.talangan > 0 ? badge('Admin menalangi ' + rpShort(x.talangan), 'b-bad') : ''}
          ${x.jumlah_item ? badge(x.terpasang + '/' + x.jumlah_item + ' terpasang', pct === 100 ? 'b-ok' : 'b-info') : ''}
        </div>
      </div>
      <div class="ev-side">
        <div><div class="l">Biaya Riil</div><div class="v">${rp(x.biaya)}</div></div>
        <div class="small muted">Estimasi ${rp(x.estimasi)}</div>
        ${x.jumlah_item ? `<div style="width:150px"><div class="progress"><span style="width:${pct}%"></span></div></div>` : ''}
      </div>
    </div>`;
  },
  after() {
    const q = document.getElementById('af-q');
    if (q) {
      let tm;
      q.addEventListener('input', () => {
        clearTimeout(tm);
        tm = setTimeout(() => {
          AdminState.acaraFilter.q = q.value; App.renderView(false);
          const n = document.getElementById('af-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length);
        }, 250);
      });
    }
    document.querySelectorAll('[data-af]').forEach((s) => s.addEventListener('change', () => { AdminState.acaraFilter[s.dataset.af] = s.type === 'checkbox' ? s.checked : s.value; App.renderView(false); }));
    if (App.route.id) AcaraDetail.after(App.route.id);
  }
};
ACT['af-reset'] = () => { Object.assign(AdminState.acaraFilter, { q: '', status: '', bayar: '', setoran: '', nonaktif: false }); App.renderView(false); };
ACT['open-acara'] = (el) => { App.go('acara/' + encodeURIComponent(el.dataset.id)); };
ACT['go-dokumen'] = () => App.go('dokumen');

/* =====================================================================
 *  DETAIL ACARA
 * ===================================================================== */
const AcaraDetail = {
  render(id) {
    const d = D(), a = App.maps.acara[id];
    if (!a) return `<button class="back-link" data-act="go" data-r="acara">${ic('chevL', 16)} Daftar Acara</button><div class="card">${emptyState('Acara tidak ditemukan', 'Mungkin sudah dihapus.', 'alert')}</div>`;
    const x = App.finA(id);
    const items = d.pesanan.filter((p) => p.id_acara === id);
    const counts = {
      barang: items.length, vendor: d.fin.av.filter((v) => v.id_acara === id).length,
      konsumsi: d.konsumsi.filter((k) => k.id_acara === id).length,
      bayar: d.alokasi.filter((al) => al.id_acara === id).length,
      setoran: d.setoran.filter((s) => s.id_acara === id).length,
      berkas: d.berkas.filter((b) => b.id_acara === id).length
    };
    const tabs = [['barang', 'Barang', 'box'], ['vendor', 'Per Vendor', 'store'], ['konsumsi', 'Konsumsi', 'utensils'], ['bayar', 'Pembayaran', 'wallet'], ['setoran', 'Setoran', 'coins'], ['berkas', 'Berkas', 'file']];
    return `
    <button class="back-link" data-act="go" data-r="acara">${ic('chevL', 16)} Daftar Acara</button>
    ${a.nonaktif ? `<div class="callout warn" style="margin-bottom:14px">${ic('eyeOff', 18)}<div class="grow"><b>Acara ini nonaktif.</b> Tidak muncul di daftar, pengingat, total di Beranda, maupun portal vendor. Data & riwayat tetap tersimpan.</div><button class="btn btn-primary btn-sm" data-act="aktif-acara" data-id="${esc(id)}" data-v="1">${ic('checkCircle', 15)} Aktifkan kembali</button></div>` : ''}
    <div class="card">
      <div class="card-head" style="margin-bottom:18px">
        <div style="min-width:0;flex:1">
          <div class="row wrap" style="gap:10px"><h1 style="font-size:24px">${esc(a.nama_acara)}</h1>${x.talangan > 0 ? badge('Admin menalangi ' + rp(x.talangan), 'b-bad') : ''}</div>
          <p>${ic('calendar', 14)} ${tglRange(a.tanggal_mulai, a.tanggal_selesai)} • ${hijri(a.tanggal_mulai)}</p>
        </div>
        <div class="row" style="gap:8px"><span class="small muted">Status</span><select class="select sm" style="width:auto" data-change="status-acara" data-id="${esc(id)}">${selectOpts(STATUS_ACARA, a.status_acara)}</select></div>
      </div>
      <div class="info-grid">
        <div class="info-item"><div class="l">${ic('pin', 13)} Lokasi</div><div class="v">${esc(a.lokasi || '-')}</div></div>
        <div class="info-item"><div class="l">${ic('user', 13)} Panitia (PJ)</div><div class="v">${esc(a.nama_panitia || '-')}</div></div>
        <div class="info-item"><div class="l">${ic('phone', 13)} Kontak Panitia</div><div class="v">${a.kontak_panitia ? `<a href="${waLink(a.kontak_panitia, 'Assalamu\'alaikum Ustadz ' + (a.nama_panitia || '') + ', ')}" target="_blank" rel="noopener">${esc(a.kontak_panitia)}</a>` : '-'}</div></div>
        <div class="info-item"><div class="l">${ic('info', 13)} Catatan</div><div class="v small">${esc(a.catatan || '-')}</div></div>
      </div>
      <div class="divider"></div>
      <div class="row wrap" style="gap:8px">
        <button class="btn btn-primary btn-sm" data-act="pesanan-editor" data-id="${esc(id)}">${ic('box', 15)} Kelola Pesanan</button>
        <button class="btn btn-soft btn-sm" data-act="pdf-estimasi" data-id="${esc(id)}">${ic('file', 15)} PDF Estimasi</button>
        <button class="btn btn-soft btn-sm" data-act="pdf-rekap-acara" data-id="${esc(id)}">${ic('printer', 15)} PDF Rekap</button>
        <button class="btn btn-soft btn-sm" data-act="new-bayar" data-acara="${esc(id)}">${ic('wallet', 15)} Catat Bayar</button>
        <button class="btn btn-soft btn-sm" data-act="new-setoran" data-acara="${esc(id)}">${ic('coins', 15)} Catat Setoran</button>
        <button class="btn btn-soft btn-sm" data-act="new-konsumsi" data-acara="${esc(id)}">${ic('utensils', 15)} Konsumsi</button>
        ${x.kekurangan > 0 && a.kontak_panitia ? waBtn(a.kontak_panitia, tagihSetoranText(id), 'Tagih Panitia') : ''}
        <span class="grow"></span>
        <button class="btn btn-ghost btn-sm" data-act="edit-acara" data-id="${esc(id)}">${ic('edit', 15)} Edit</button>
        <button class="btn btn-ghost btn-sm" data-act="aktif-acara" data-id="${esc(id)}" data-v="${a.nonaktif ? '1' : '0'}">${ic(a.nonaktif ? 'checkCircle' : 'eyeOff', 15)} ${a.nonaktif ? 'Aktifkan' : 'Nonaktifkan'}</button>
        <button class="btn btn-ghost btn-sm tx-bad" data-act="del-acara" data-id="${esc(id)}">${ic('trash', 15)} Hapus</button>
      </div>
    </div>

    <div class="mini-kpis stagger section" style="margin-top:18px">
      <div class="mini-kpi" style="--i:0"><div class="l">Estimasi ke Panitia</div><div class="v">${countEl(x.estimasi)}</div><div class="s">Harga estimasi</div></div>
      <div class="mini-kpi" style="--i:1"><div class="l">Biaya Riil (Vendor)</div><div class="v">${countEl(x.biaya)}</div><div class="s">Selisih estimasi: <b class="${x.selisih < 0 ? 'tx-bad' : 'tx-ok'}">${rp(x.selisih)}</b></div></div>
      <div class="mini-kpi" style="--i:2"><div class="l">Dibayar ke Vendor</div><div class="v">${countEl(x.dibayar)}</div><div class="s">Sisa: <b class="${x.sisa_vendor > 0 ? 'tx-bad' : ''}">${rp(x.sisa_vendor)}</b> • ${payBadge(x.status_bayar)}</div></div>
      <div class="mini-kpi" style="--i:3"><div class="l">Setoran Panitia</div><div class="v">${countEl(x.setoran)}</div><div class="s">Kurang: <b class="${x.kekurangan > 0 ? 'tx-bad' : ''}">${rp(x.kekurangan)}</b> • ${payBadge(x.status_setoran)}</div></div>
    </div>
    ${x.talangan > 0 ? `<div class="callout bad section" style="margin-top:14px">${ic('alert', 18)}<div><b>Admin menalangi ${rp(x.talangan)}.</b> Pembayaran ke vendor (${rp(x.dibayar)}) melebihi setoran panitia (${rp(x.setoran)}). Segera tagih panitia.</div></div>`
      : x.dana > 0 ? `<div class="callout ok section" style="margin-top:14px">${ic('wallet', 18)}<div>Dana di tangan Admin untuk acara ini: <b>${rp(x.dana)}</b> (setoran yang belum disalurkan ke vendor).</div></div>` : ''}
    ${x.kelebihan > 0 ? `<div class="callout warn" style="margin-top:10px">${ic('info', 18)}<div>Setoran panitia melebihi biaya riil sebesar <b>${rp(x.kelebihan)}</b> — kemungkinan perlu dikembalikan.</div></div>` : ''}

    <div class="card section">
      <div class="tabs" style="margin-bottom:16px">${tabs.map(([k, l, icn]) => `<button class="chip ${AdminState.detailTab === k ? 'active' : ''}" data-act="dtab" data-tab="${k}">${ic(icn, 14)} ${l} <span class="cnt">${counts[k]}</span></button>`).join('')}</div>
      <div id="dtab-panel" class="tab-panel">${this.tab(id)}</div>
    </div>`;
  },
  tab(id) {
    const d = D(), t = AdminState.detailTab, amb = ambang();
    if (t === 'barang') {
      const items = d.pesanan.filter((p) => p.id_acara === id);
      return DT.render('det-barang', {
        rows: items, pageSize: 15, empty: `${emptyState('Belum ada barang dipesan', 'Klik "Kelola Pesanan" untuk menambahkan barang dari katalog vendor.', 'box')}`,
        search: (r) => r.nama_barang + ' ' + App.vName(r.id_vendor) + ' ' + r.kategori, placeholder: 'Cari barang / vendor...',
        tools: `<button class="btn btn-primary btn-sm" data-act="pesanan-editor" data-id="${esc(id)}">${ic('edit', 14)} Kelola Pesanan</button>`,
        footer: (rows) => `Total ${rows.length} barang • Riil ${rp(rows.reduce((s, r) => s + subRiil(r), 0))} • Estimasi ${rp(rows.reduce((s, r) => s + subEst(r), 0))}`,
        cols: [
          { key: 'nama_barang', label: 'Barang', main: true, render: (r) => `<div class="row" style="gap:12px"><span class="t-ic">${ic(KAT_ICON[r.kategori] || 'box', 18)}</span><div style="min-width:0"><div class="t-main">${esc(r.nama_barang)}</div><div class="t-sub">${esc(r.kategori)}</div></div></div>` },
          { key: 'id_vendor', label: 'Vendor', sortVal: (r) => App.vName(r.id_vendor), render: (r) => `<span class="small">${esc(App.vName(r.id_vendor))}</span>` },
          { key: 'jumlah', label: 'Qty', align: 'c', render: (r) => `<span class="tnum">${fmtQty(r.jumlah)} ${esc(r.satuan)}</span>${r.spek ? `<div class="xs muted">${esc(spekText(r))}</div>` : ''}` },
          { key: 'harga_vendor_satuan', label: 'Harga Vendor', align: 'r', render: (r) => `<span class="tnum">${rp(r.harga_vendor_satuan)}</span><div class="xs muted tnum">est. ${rp(r.harga_estimasi_satuan)}</div>` },
          { key: 'sub', label: 'Subtotal Riil', align: 'r', sortVal: (r) => subRiil(r), render: (r) => `<b class="tnum">${rp(subRiil(r))}</b>${hariText(r) ? `<div class="xs muted">${esc(hariText(r))}</div>` : ''}` },
          { key: 'tanggal_pasang', label: 'Jadwal', render: (r) => `<span class="small">${r.tanggal_pasang ? tgl(r.tanggal_pasang) : '-'} → ${r.tanggal_bongkar ? tgl(r.tanggal_bongkar) : '-'}</span>` },
          { key: 'status_pasang', label: 'Status Pasang', render: (r) => `<select class="select sm" style="width:auto;min-width:120px" data-change="status-pesanan" data-id="${esc(r.id_pesanan)}">${selectOpts(STATUS_PASANG, r.status_pasang)}</select>${r.ditandai_oleh ? `<div class="xs muted">oleh ${esc(r.ditandai_oleh)}</div>` : ''}` }
        ]
      });
    }
    if (t === 'vendor') {
      const rows = d.fin.av.filter((v) => v.id_acara === id);
      return DT.render('det-vendor', {
        rows, empty: emptyState('Belum ada vendor terlibat', '', 'store'),
        cols: [
          { key: 'id_vendor', label: 'Vendor', main: true, sortVal: (r) => App.vName(r.id_vendor), render: (r) => { const v = App.maps.vendor[r.id_vendor] || {}; return `<div class="row" style="gap:12px"><span class="t-ic">${ic('store', 18)}</span><div><div class="t-main">${esc(v.nama_vendor || '-')}</div><div class="t-sub">${esc(v.pic || '')} ${esc(v.kontak || '')}</div></div></div>`; } },
          { key: 'terpasang', label: 'Terpasang', align: 'c', render: (r) => `${r.terpasang}/${r.jumlah_item}` },
          { key: 'estimasi', label: 'Estimasi', align: 'r', render: (r) => `<span class="tnum muted">${rp(r.estimasi)}</span>` },
          { key: 'tagihan', label: 'Tagihan Riil', align: 'r', render: (r) => `<b class="tnum">${rp(r.tagihan)}</b>` },
          { key: 'dibayar', label: 'Dibayar', align: 'r', render: (r) => `<span class="tnum">${rp(r.dibayar)}</span>` },
          { key: 'sisa', label: 'Sisa', align: 'r', render: (r) => `<b class="tnum ${r.sisa > 0 ? 'tx-bad' : ''}">${rp(Math.max(0, r.sisa))}</b>` },
          { key: 'status', label: 'Status', render: (r) => payBadge(r.status) + (r.sisa > 0 ? ' ' + agingPill(r.umur, amb) : '') },
          { key: '', label: '', acts: true, sort: false, render: (r) => r.sisa > 0 ? `<div class="acts"><button class="btn btn-primary btn-sm" data-act="new-bayar" data-vendor="${r.id_vendor}" data-acara="${esc(id)}">${ic('wallet', 14)} Bayar</button></div>` : '' }
        ]
      });
    }
    if (t === 'konsumsi') {
      const list = d.konsumsi.filter((k) => k.id_acara === id).sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam));
      return `<div class="row between" style="margin-bottom:12px"><span class="small muted">Rekomendasi otomatis mengikuti durasi & tingkat kesulitan (atur di Pengaturan).</span>
        <button class="btn btn-primary btn-sm" data-act="new-konsumsi" data-acara="${esc(id)}">${ic('plus', 14)} Tambah Jadwal</button></div>` +
        (list.length ? `<div class="grid-2">${list.map((k) => `<div class="remind">
          <div class="remind-head"><div>${badge(k.tahap)} <span class="small muted">${tglPanjang(k.tanggal)}${k.jam ? ' • ' + esc(k.jam) : ''}</span><h4>${esc(App.vName(k.id_vendor))}</h4></div>
          ${k.sudah_diingatkan ? badge('Sudah diingatkan', 'b-ok') : badge('Belum diingatkan', 'b-warn')}</div>
          <div class="facts"><div class="fact"><div class="l">Durasi</div><div class="v">${num(k.durasi_jam)} jam</div></div><div class="fact"><div class="l">Beban</div><div class="v">${esc(k.kesulitan)}</div></div><div class="fact"><div class="l">Pekerja</div><div class="v">${num(k.jumlah_pekerja) || '-'}</div></div></div>
          <div class="rec"><div class="t">${ic('utensils', 13)} Rekomendasi</div><div class="v">${esc(k.rekomendasi)}</div></div>
          <div class="row wrap"><button class="btn btn-mint btn-sm" data-act="copy" data-text="${esc(konsumsiText(k))}">${ic('copy', 14)} Salin WA</button>${tplBtn('konsumsi', k.id_konsumsi, 'Format')}
          <button class="btn btn-soft btn-sm" data-act="ks-mark" data-id="${k.id_konsumsi}" data-v="${k.sudah_diingatkan ? '0' : '1'}">${ic('check', 14)} ${k.sudah_diingatkan ? 'Batalkan' : 'Tandai diingatkan'}</button>
          <button class="btn btn-ghost btn-sm" data-act="edit-konsumsi" data-id="${k.id_konsumsi}">${ic('edit', 14)}</button>
          <button class="btn btn-ghost btn-sm tx-bad" data-act="del-konsumsi" data-id="${k.id_konsumsi}">${ic('trash', 14)}</button></div>
        </div>`).join('')}</div>` : emptyState('Belum ada jadwal konsumsi', 'Tambahkan agar pengingat H-1 & Hari H muncul di Beranda.', 'utensils'));
    }
    if (t === 'bayar') {
      const rows = d.alokasi.filter((al) => al.id_acara === id).map((al) => Object.assign({}, App.maps.pembayaran[al.id_pembayaran] || {}, { porsi: al.nominal }));
      return DT.render('det-bayar', {
        rows, empty: emptyState('Belum ada pembayaran ke vendor untuk acara ini', '', 'wallet'), sort: 'tanggal_bayar', dir: 'desc',
        tools: `<button class="btn btn-primary btn-sm" data-act="new-bayar" data-acara="${esc(id)}">${ic('plus', 14)} Catat Pembayaran</button>`,
        cols: [
          { key: 'tanggal_bayar', label: 'Tanggal', main: true, render: (r) => `<div class="t-main">${tgl(r.tanggal_bayar)}</div><div class="t-sub">${esc(App.vName(r.id_vendor))}</div>` },
          { key: 'metode', label: 'Metode', render: (r) => badge(r.metode) },
          { key: 'porsi', label: 'Porsi Acara Ini', align: 'r', render: (r) => `<b class="tnum">${rp(r.porsi)}</b>${r.nominal_total !== r.porsi ? `<div class="xs muted">dari total ${rp(r.nominal_total)}</div>` : ''}` },
          { key: 'bukti', label: 'Bukti & Nota', sort: false, render: (r) => `<div class="row" style="justify-content:inherit;gap:6px">${fileLink(r.id_berkas_bukti, 'Bukti', 'Bukti Transfer')}${fileLink(r.id_berkas_nota, 'Nota', 'Nota Vendor')}</div>` },
          { key: 'nota_diteruskan', label: 'Nota ke Panitia', render: (r) => r.nota_diteruskan ? badge('Diteruskan ' + tgl(r.tanggal_nota_diteruskan), 'b-ok') : badge('Belum', 'b-warn') },
          { key: '', label: '', acts: true, sort: false, render: (r) => `<div class="acts"><button class="btn btn-ghost btn-sm" data-act="edit-bayar" data-id="${r.id_pembayaran}">${ic('edit', 14)}</button></div>` }
        ]
      });
    }
    if (t === 'setoran') {
      const rows = d.setoran.filter((s) => s.id_acara === id);
      return DT.render('det-setoran', {
        rows, sort: 'tanggal_setor', dir: 'desc', empty: emptyState('Belum ada setoran panitia', '', 'coins'),
        tools: `<button class="btn btn-primary btn-sm" data-act="new-setoran" data-acara="${esc(id)}">${ic('plus', 14)} Catat Setoran</button>`,
        cols: setoranCols(false)
      });
    }
    const rows = d.berkas.filter((b) => b.id_acara === id);
    return DT.render('det-berkas', { rows, sort: 'tanggal', dir: 'desc', empty: emptyState('Belum ada berkas', 'PDF estimasi/rekap, bukti, nota, dan foto pemasangan akan muncul di sini.', 'file'), cols: berkasCols() });
  },
  after() { }
};
ACT.dtab = (el) => {
  AdminState.detailTab = el.dataset.tab;
  document.querySelectorAll('[data-act="dtab"]').forEach((b) => b.classList.toggle('active', b === el));
  const p = document.getElementById('dtab-panel');
  p.innerHTML = AcaraDetail.tab(App.route.id);
  p.classList.remove('tab-panel'); void p.offsetWidth; p.classList.add('tab-panel');
};
function berkasCols() {
  return [
    { key: 'nama_file', label: 'Berkas', main: true, render: (r) => `<div class="row" style="gap:12px"><span class="t-ic">${ic(/^image/.test(r.mime) ? 'image' : 'file', 18)}</span><div style="min-width:0"><div class="t-main ellipsis" style="max-width:340px">${esc(r.nama_file)}</div><div class="t-sub">${esc(r.jenis)}${r.id_acara ? ' • ' + esc(App.acara(r.id_acara).nama_acara) : ''}</div></div></div>` },
    { key: 'jenis', label: 'Jenis', render: (r) => badge(r.jenis, r.jenis === 'Estimasi' || r.jenis === 'Rekap' ? 'b-info' : 'b-neu') },
    { key: 'tanggal', label: 'Tanggal', render: (r) => `<span class="small">${esc(r.tanggal)}</span>` },
    { key: 'diunggah_oleh', label: 'Oleh', render: (r) => `<span class="small">${esc(r.diunggah_oleh)}</span>` },
    { key: '', label: '', acts: true, sort: false, render: (r) => `<div class="acts">${fileLink(r.id_berkas, 'Buka', r.jenis)}</div>` }
  ];
}
function setoranCols(withAcara) {
  return [
    { key: 'tanggal_setor', label: 'Tanggal', main: true, render: (r) => `<div class="t-main">${tgl(r.tanggal_setor)}</div><div class="t-sub">${withAcara ? esc(App.acara(r.id_acara).nama_acara) + ' • ' : ''}${esc(r.nama_penyetor || '-')}</div>` },
    { key: 'metode', label: 'Metode', render: (r) => badge(r.metode) },
    { key: 'nominal', label: 'Nominal', align: 'r', render: (r) => `<b class="tnum">${rp(r.nominal)}</b>` },
    { key: 'bukti', label: 'Bukti', sort: false, render: (r) => fileLink(r.id_berkas_bukti, 'Bukti', 'Bukti Setoran') },
    { key: 'catatan', label: 'Catatan', render: (r) => `<span class="small muted">${esc(r.catatan || '-')}</span>` },
    { key: '', label: '', acts: true, sort: false, render: (r) => `<div class="acts"><button class="btn btn-ghost btn-sm" data-act="edit-setoran" data-id="${r.id_setoran}" aria-label="Edit">${ic('edit', 14)}</button><button class="btn btn-ghost btn-sm tx-bad" data-act="del-setoran" data-id="${r.id_setoran}" aria-label="Hapus">${ic('trash', 14)}</button></div>` }
  ];
}

/* Ubah status langsung dari tabel/select (Optimistic UI) */
document.addEventListener('change', async (e) => {
  const s = e.target.closest('[data-change]');
  if (!s || !App.isAdmin) return;
  if (s.dataset.change === 'status-acara') {
    await App.write('setStatusAcara', { id_acara: s.dataset.id, status_acara: s.value }, { close: false });
  } else if (s.dataset.change === 'status-pesanan') {
    const p = D().pesanan.find((x) => x.id_pesanan === s.dataset.id);
    const old = p.status_pasang;
    p.status_pasang = s.value; // tampil seketika
    const res = await App.write('setStatusPasang', { ids: [s.dataset.id], status: s.value }, { close: false, toast: false });
    if (res.success) toast('Status "' + p.nama_barang + '" → ' + s.value, 'success', 2200);
    else { p.status_pasang = old; s.value = old; }
  }
});

/* ---------- Form acara ---------- */
ACT['new-acara'] = () => openAcaraForm();
ACT['edit-acara'] = (el) => openAcaraForm(App.maps.acara[el.dataset.id]);
function openAcaraForm(a) {
  a = a || {};
  const m = Modal.open({
    title: a.id_acara ? 'Edit Acara' : 'Buat Acara Baru', sub: 'Data acara tahunan pondok & panitia penanggung jawab.', size: 'lg',
    body: `<form class="form-grid" id="f-acara">
      <div class="field full"><label>Nama acara <span class="req">*</span></label><input class="input" name="nama_acara" value="${esc(a.nama_acara)}" placeholder="mis. Panggung Gembira 2026" required></div>
      <div class="field"><label>Tanggal mulai <span class="req">*</span></label><input class="input" type="date" name="tanggal_mulai" value="${esc(a.tanggal_mulai)}" required></div>
      <div class="field"><label>Tanggal selesai</label><input class="input" type="date" name="tanggal_selesai" value="${esc(a.tanggal_selesai)}"></div>
      <div class="field full"><label>Lokasi / penempatan</label><input class="input" name="lokasi" value="${esc(a.lokasi)}" placeholder="mis. Lapangan Hijau, depan BPPM"></div>
      <div class="field"><label>Nama panitia (PJ)</label><input class="input" name="nama_panitia" value="${esc(a.nama_panitia)}" placeholder="Ust. ..."></div>
      <div class="field"><label>No. WhatsApp panitia</label><input class="input" name="kontak_panitia" value="${esc(a.kontak_panitia)}" inputmode="tel" placeholder="08xxxxxxxxxx"></div>
      <div class="field"><label>Status acara</label><select class="select" name="status_acara">${selectOpts(STATUS_ACARA, a.status_acara || 'Rencana')}</select></div>
      <div class="field full"><label>Catatan</label><textarea class="textarea" name="catatan" placeholder="Opsional">${esc(a.catatan)}</textarea></div>
    </form>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="f-acara-save">${ic('check', 16)} Simpan Acara</button>`
  });
  const form = m.querySelector('#f-acara');
  form.tanggal_mulai.addEventListener('change', () => { if (!form.tanggal_selesai.value || form.tanggal_selesai.value < form.tanggal_mulai.value) form.tanggal_selesai.value = form.tanggal_mulai.value; });
  const save = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.nama_acara.trim()) return toast('Nama acara wajib diisi.', 'warn');
    if (!data.tanggal_mulai) return toast('Tanggal mulai wajib diisi.', 'warn');
    if (data.tanggal_selesai && data.tanggal_selesai < data.tanggal_mulai) return toast('Tanggal selesai tidak boleh sebelum tanggal mulai.', 'warn');
    data.id_acara = a.id_acara || '';
    const res = await App.write('saveAcara', data, { btn: m.querySelector('#f-acara-save') });
    if (res.success && !a.id_acara && res.id) {
      App.go('acara/' + res.id);
      setTimeout(async () => {
        if (await confirmDialog({ title: 'Acara tersimpan', message: 'Lanjut menambahkan barang yang akan disewa untuk acara ini?', okText: 'Tambah Pesanan' })) openPesananEditor(res.id);
      }, 350);
    }
  };
  form.addEventListener('submit', save);
  m.querySelector('#f-acara-save').addEventListener('click', save);
}
ACT['aktif-acara'] = async (el) => {
  const a = App.maps.acara[el.dataset.id], on = el.dataset.v === '1';
  if (!on) {
    const f = App.finA(a.id_acara);
    const warn = f.sisa_vendor > 0 || f.kekurangan > 0 ? `<br><br><span class="tx-bad">${ic('alert', 14)} Masih ada ${f.sisa_vendor > 0 ? 'sisa tagihan vendor <b>' + rp(f.sisa_vendor) + '</b>' : ''}${f.sisa_vendor > 0 && f.kekurangan > 0 ? ' dan ' : ''}${f.kekurangan > 0 ? 'kekurangan setoran <b>' + rp(f.kekurangan) + '</b>' : ''} yang tidak akan diingatkan lagi.</span>` : '';
    if (!await confirmDialog({ title: 'Nonaktifkan acara?', message: `<b>${esc(a.nama_acara)}</b> akan disembunyikan dari daftar acara, pengingat & total di Beranda, serta portal vendor. Data dan riwayat tetap tersimpan dan bisa diaktifkan kembali kapan saja.${warn}`, okText: 'Nonaktifkan' })) return;
  }
  App.write('setAktifAcara', { id_acara: a.id_acara, aktif: on }, { btn: el });
};
ACT['toggle-user'] = async (el) => {
  const u = App.maps.users[el.dataset.id], on = el.dataset.v === '1';
  if (!on && !await confirmDialog({ title: 'Nonaktifkan akun?', message: `<b>${esc(u.nama)}</b> (@${esc(u.username)}) tidak akan bisa login, dan sesi yang sedang berjalan langsung berakhir. Akun & datanya tetap tersimpan dan bisa diaktifkan kembali.`, okText: 'Nonaktifkan', danger: true })) return;
  App.write('toggleUser', { id_user: u.id_user, aktif: on }, { btn: el, close: false });
};
ACT['del-acara'] = async (el) => {
  const a = App.maps.acara[el.dataset.id];
  if (!await confirmDialog({ title: 'Hapus acara?', message: `Acara <b>${esc(a.nama_acara)}</b> akan dihapus permanen. Acara yang sudah memiliki pesanan/pembayaran tidak dapat dihapus (ubah statusnya menjadi "Batal").`, okText: 'Hapus', danger: true })) return;
  const res = await App.write('deleteAcara', { id_acara: a.id_acara });
  if (res.success) App.go('acara');
};

/* ---------- PDF ---------- */
ACT['pdf-estimasi'] = async (el) => {
  const res = await App.write('generateEstimasi', { id_acara: el.dataset.id }, { btn: el, busyText: 'Membuat PDF...', close: false });
  if (res.success) showPdf(res);
};
ACT['pdf-rekap-acara'] = async (el) => {
  const res = await App.write('generateRekap', { jenis: 'acara', id: el.dataset.id }, { btn: el, busyText: 'Membuat PDF...', close: false });
  if (res.success) showPdf(res);
};

/* =====================================================================
 *  EDITOR PESANAN BARANG
 * ===================================================================== */
const PE = { acara: '', items: [], dirty: false, vendor: '' };
ACT['pesanan-editor'] = (el) => openPesananEditor(el.dataset.id || '');
function loadPE() {
  PE.items = D().pesanan.filter((p) => p.id_acara === PE.acara).map((p) => Object.assign({}, p, { manual: !p.id_barang }));
  PE.dirty = false;
}
function openPesananEditor(ida) {
  PE.acara = ida || '';
  loadPE();
  const m = Modal.open({
    title: 'Kelola Pesanan Barang', sub: 'Harga estimasi (untuk panitia) dan harga vendor (biaya riil) dicatat terpisah.', size: 'xl',
    body: '<div id="pe-root"></div>',
    foot: `<span class="note">${ic('info', 14)} Status pemasangan barang yang sudah ada tetap tersimpan.</span><button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="pe-save">${ic('check', 16)} Simpan Pesanan</button>`
  });
  const root = m.querySelector('#pe-root');
  renderPE(root);
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.f === undefined) return;
    const i = Number(t.dataset.i), f = t.dataset.f, it = PE.items[i];
    const wasLuas = isLuas(it.satuan);
    it[f] = f.startsWith('harga') ? parseMoney(t.value) : (f === 'jumlah' || f === 'qty_unit' || f === 'hari') ? num(t.value) : t.value;
    if (f === 'hari') it.tarif_hari = ''; // hari berubah → pakai tarif terbaru dari Pengaturan
    PE.dirty = true;
    if (f === 'satuan' && wasLuas !== isLuas(it.satuan)) { peRecalc(it); renderPERows(root); return; }
    if (f === 'spek' || f === 'qty_unit' || f === 'satuan') peSyncRow(root, i);
    updatePETotals(root);
  });
  root.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.id === 'pe-acara') {
      if (PE.dirty && !await confirmDialog({ title: 'Ganti acara?', message: 'Perubahan yang belum disimpan akan hilang.', okText: 'Ganti' })) { t.value = PE.acara; return; }
      PE.acara = t.value; loadPE(); renderPE(root);
    } else if (t.id === 'pe-v') {
      PE.vendor = t.value;
      root.querySelector('#pe-b').innerHTML = barangOpts(PE.vendor);
    }
  });
  root.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { PE.items.splice(Number(del.dataset.del), 1); PE.dirty = true; renderPERows(root); return; }
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'pe-add') {
      const ib = root.querySelector('#pe-b').value;
      if (!ib) return toast('Pilih barang dari katalog dulu.', 'warn');
      const k = App.maps.katalog[ib];
      // Barang yang sama selalu dibuat baris baru (bisa beda spek/ukuran)
      const dupIdx = PE.items.findIndex((x) => x.id_barang === ib);
      const sp = parseSpek(k.spesifikasi) ? k.spesifikasi.match(/\d+(?:[.,]\d+)?\s*(?:m(?:eter)?)?\s*[x×X*]\s*\d+(?:[.,]\d+)?/)[0] : parseSpek(k.nama_barang) ? k.nama_barang.match(/\d+(?:[.,]\d+)?\s*(?:m(?:eter)?)?\s*[x×X*]\s*\d+(?:[.,]\d+)?/)[0] : '';
      const it = Object.assign(peDefaults(root), { id_vendor: k.id_vendor, id_barang: k.id_barang, nama_barang: k.nama_barang, kategori: k.kategori, satuan: k.satuan, jumlah: 1, spek: dupIdx >= 0 ? '' : sp, qty_unit: 1, harga_estimasi_satuan: k.harga_estimasi, harga_vendor_satuan: k.harga_vendor });
      peRecalc(it);
      PE.items.push(it);
      if (dupIdx >= 0) toast(`"${k.nama_barang}" sudah ada di baris ${dupIdx + 1}. Baris baru ditambahkan di bawah — isi spek/ukurannya.`, 'info', 4500);
      PE.dirty = true; renderPERows(root);
      const last = PE.items.length - 1;
      const rowEl = root.querySelectorAll('.pe-row')[last];
      if (rowEl) { rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); if (dupIdx >= 0) { const sIn = rowEl.querySelector('[data-f="spek"]'); if (sIn) sIn.focus(); } }
    } else if (b.id === 'pe-manual') {
      const iv = root.querySelector('#pe-v').value;
      if (!iv) return toast('Pilih vendor dulu untuk barang di luar katalog.', 'warn');
      PE.items.push(Object.assign(peDefaults(root), { id_vendor: iv, id_barang: '', nama_barang: '', kategori: 'Lainnya', satuan: 'unit', jumlah: 1, spek: '', qty_unit: 1, harga_estimasi_satuan: 0, harga_vendor_satuan: 0, manual: true }));
      PE.dirty = true; renderPERows(root);
      const inputs = root.querySelectorAll('[data-f="nama_barang"]'); if (inputs.length) inputs[inputs.length - 1].focus();
    } else if (b.id === 'pe-apply') {
      const dft = peDefaults(root);
      PE.items.forEach((it) => { if (dft.tanggal_pasang) it.tanggal_pasang = dft.tanggal_pasang; if (dft.tanggal_bongkar) it.tanggal_bongkar = dft.tanggal_bongkar; if (dft.lokasi) it.lokasi = dft.lokasi; if (num(it.hari) !== dft.hari) { it.hari = dft.hari; it.tarif_hari = ''; } });
      PE.dirty = true; renderPERows(root); toast('Tanggal, lokasi & lama sewa diterapkan ke semua barang.', 'success', 2200);
    }
  });
  m.querySelector('#pe-save').addEventListener('click', async (e) => {
    if (!PE.acara) return toast('Pilih acara terlebih dahulu.', 'warn');
    for (let i = 0; i < PE.items.length; i++) {
      const it = PE.items[i];
      if (!String(it.nama_barang || '').trim()) return toast(`Baris ${i + 1}: nama barang wajib diisi.`, 'warn');
      if (isLuas(it.satuan) && !it.spek && !it.id_pesanan) return toast(`Baris ${i + 1} (${it.nama_barang}): isi Spek ukurannya, mis. 6x6.`, 'warn', 6000);
      if (isLuas(it.satuan) && !parseSpek(it.spek) && it.spek) return toast(`Baris ${i + 1} (${it.nama_barang}): spek "${it.spek}" tidak terbaca. Tulis seperti 6x6 atau 4,5x10.`, 'warn', 6000);
      if (!(num(it.hari) >= 1 || !it.hari)) return toast(`Baris ${i + 1}: lama sewa minimal 1 hari.`, 'warn');
      if (!(num(it.jumlah) > 0)) return toast(`Baris ${i + 1}: jumlah harus lebih dari 0${isLuas(it.satuan) ? ' — isi spek ukuran, mis. 6x6' : ''}.`, 'warn');
      if (it.tanggal_pasang && it.tanggal_bongkar && it.tanggal_bongkar < it.tanggal_pasang) return toast(`Baris ${i + 1}: tanggal bongkar sebelum tanggal pasang.`, 'warn');
    }
    if (!PE.items.length && !await confirmDialog({ title: 'Kosongkan pesanan?', message: 'Semua barang untuk acara ini akan dihapus.', okText: 'Ya, kosongkan', danger: true })) return;
    const items = PE.items.map((it) => ({
      id_pesanan: it.id_pesanan || '', id_vendor: it.id_vendor, id_barang: it.id_barang || '', nama_barang: it.nama_barang, kategori: it.kategori, satuan: it.satuan,
      jumlah: num(it.jumlah), harga_estimasi_satuan: num(it.harga_estimasi_satuan), harga_vendor_satuan: num(it.harga_vendor_satuan),
      tanggal_pasang: it.tanggal_pasang || '', tanggal_bongkar: it.tanggal_bongkar || '', lokasi: it.lokasi || '', catatan: it.catatan || '',
      spek: it.spek || '', qty_unit: num(it.qty_unit) || 1, hari: Math.max(1, Math.round(num(it.hari) || 1))
    }));
    await App.write('savePesananAcara', { id_acara: PE.acara, items }, { btn: e.currentTarget });
  });
}
function barangOpts(iv) {
  const list = D().katalog.filter((k) => k.aktif && (!iv || k.id_vendor === iv)).sort((a, b) => a.kategori.localeCompare(b.kategori) || a.nama_barang.localeCompare(b.nama_barang));
  if (!list.length) return '<option value="">— Katalog kosong untuk vendor ini —</option>';
  return '<option value="">Pilih barang dari katalog</option>' + list.map((k) => `<option value="${k.id_barang}">${esc(k.nama_barang)} — ${rp(k.harga_vendor)}/${esc(k.satuan)}${iv ? '' : ' • ' + esc(App.vName(k.id_vendor))}</option>`).join('');
}
function peDefaults(root) {
  const g = (id) => (root.querySelector(id) || {}).value || '';
  return { tanggal_pasang: g('#pe-tp'), tanggal_bongkar: g('#pe-tb'), lokasi: g('#pe-lok'), hari: Math.max(1, Math.round(num(g('#pe-hari')) || 1)), tarif_hari: '' };
}
function renderPE(root) {
  const a = App.maps.acara[PE.acara];
  const tp = a ? addDays(a.tanggal_mulai, -1) : '', tb = a ? addDays(a.tanggal_selesai || a.tanggal_mulai, 1) : '';
  root.innerHTML = `
    <div class="field" style="margin-bottom:14px"><label>Acara</label><select class="select" id="pe-acara">${acaraOpts(PE.acara)}</select></div>
    ${!PE.acara ? `<div class="callout info">${ic('info', 18)}<div>Pilih acara terlebih dahulu untuk mengelola daftar barang yang disewa.</div></div>` : `
    <div class="pe-bar">
      <div class="field"><label>Vendor</label><select class="select sm" id="pe-v">${vendorOpts(PE.vendor, 'Semua vendor')}</select></div>
      <div class="field"><label>Barang dari katalog</label><select class="select sm" id="pe-b">${barangOpts(PE.vendor)}</select></div>
      <button class="btn btn-primary btn-sm" id="pe-add" type="button">${ic('plus', 15)} Tambah</button>
      <button class="btn btn-soft btn-sm" id="pe-manual" type="button">${ic('edit', 14)} Barang manual</button>
    </div>
    <div class="pe-defaults">
      <div class="field"><label>Tgl pasang (bawaan)</label><input class="input sm" type="date" id="pe-tp" value="${tp}"></div>
      <div class="field"><label>Tgl bongkar (bawaan)</label><input class="input sm" type="date" id="pe-tb" value="${tb}"></div>
      <div class="field"><label>Lokasi (bawaan)</label><input class="input sm" id="pe-lok" value="${esc(a ? a.lokasi : '')}"></div>
      <div class="field"><label>Lama sewa (hari)</label><input class="input sm tnum" type="number" min="1" step="1" id="pe-hari" value="${a ? Math.max(1, diffDays(a.tanggal_mulai, a.tanggal_selesai || a.tanggal_mulai) + 1) : 1}"></div>
      <button class="btn btn-soft btn-sm" id="pe-apply" type="button">${ic('layers', 14)} Terapkan ke semua</button>
    </div>
    <div class="pe-scroll"><div>
      <div class="callout info" style="margin-top:12px;padding:9px 12px;font-size:12.5px">${ic('info', 16)}<div>Untuk barang bersatuan <b>m²</b> (mis. tenda per meter), tulis <b>Spek</b> ukurannya seperti <span class="mono">6x6</span> dan jumlah unitnya — <b>Jumlah m²</b> dihitung otomatis (2 unit × 6×6 = 72 m²). <b>Hari</b> = lama sewa: hari ke-1 100%, hari ke-2 dst ${fmtQty(num(D().settings.tarif_hari_tambahan ?? 0.3) * 100)}% per hari.</div></div>
      <div class="pe-head"><span>Barang</span><span>Spek / Ukuran</span><span>Jumlah</span><span>Hari</span><span>Harga estimasi</span><span>Harga vendor</span><span>Tgl pasang</span><span>Tgl bongkar</span><span>Lokasi</span><span class="right">Subtotal riil</span><span></span></div>
      <div id="pe-rows"></div>
    </div></div>
    <div class="pe-total" id="pe-tot"></div>`}`;
  if (PE.acara) renderPERows(root);
}
function renderPERows(root) {
  const box = root.querySelector('#pe-rows');
  box.innerHTML = PE.items.length ? PE.items.map((it, i) => `
    <div class="pe-row">
      <div class="pe-name">${it.manual
        ? `<span class="ml">Nama barang (manual)</span><input class="input sm" data-f="nama_barang" data-i="${i}" value="${esc(it.nama_barang)}" placeholder="Nama barang"><div class="row" style="gap:6px;margin-top:4px"><select class="select sm" data-f="kategori" data-i="${i}" style="flex:1">${selectOpts(KATEGORI, it.kategori)}</select></div>`
        : `<div class="n">${esc(it.nama_barang)}</div>`}
        <div class="v">${esc(App.vName(it.id_vendor))} • ${esc(it.kategori)}</div></div>
      <div><span class="ml">Spek / ukuran</span><input class="input sm" data-f="spek" data-i="${i}" value="${esc(it.spek || '')}" placeholder="${isLuas(it.satuan) ? 'mis. 6x6' : 'opsional'}" autocomplete="off">
        ${isLuas(it.satuan) ? `<div class="row" style="gap:5px;margin-top:4px"><span class="xs muted">×</span><input class="input sm tnum" type="number" min="1" step="1" data-f="qty_unit" data-i="${i}" value="${num(it.qty_unit) || 1}" style="width:64px"><span class="xs muted">unit</span></div>` : ''}</div>
      <div><span class="ml">Jumlah</span><div class="row" style="gap:4px"><input class="input sm tnum" type="number" min="0" step="any" data-f="jumlah" data-i="${i}" value="${num(it.jumlah)}" style="flex:1;min-width:0" ${isLuas(it.satuan) && parseSpek(it.spek) ? 'readonly title="Dihitung otomatis dari spek"' : ''}></div>
        <select class="select sm" data-f="satuan" data-i="${i}" style="margin-top:4px">${satuanOpts(it.satuan)}</select>
        <div class="xs" id="pe-calc-${i}" style="margin-top:3px">${peCalcText(it)}</div></div>
      <div><span class="ml">Lama sewa (hari)</span><input class="input sm tnum" type="number" min="1" step="1" data-f="hari" data-i="${i}" value="${Math.max(1, Math.round(num(it.hari) || 1))}"><div class="xs muted" id="pe-hf-${i}" style="margin-top:3px">${peHariText(it)}</div></div>
      <div><span class="ml">Harga estimasi</span><input class="input sm tnum money" inputmode="numeric" data-f="harga_estimasi_satuan" data-i="${i}" value="${fmtNum(it.harga_estimasi_satuan)}"></div>
      <div><span class="ml">Harga vendor</span><input class="input sm tnum money" inputmode="numeric" data-f="harga_vendor_satuan" data-i="${i}" value="${fmtNum(it.harga_vendor_satuan)}"></div>
      <div><span class="ml">Tgl pasang</span><input class="input sm" type="date" data-f="tanggal_pasang" data-i="${i}" value="${esc(it.tanggal_pasang)}"></div>
      <div><span class="ml">Tgl bongkar</span><input class="input sm" type="date" data-f="tanggal_bongkar" data-i="${i}" value="${esc(it.tanggal_bongkar)}"></div>
      <div><span class="ml">Lokasi</span><input class="input sm" data-f="lokasi" data-i="${i}" value="${esc(it.lokasi)}"></div>
      <div class="pe-sub right"><span class="ml">Subtotal riil</span><b class="tnum" id="pe-sub-${i}">${rp(subRiil(it, peTarif()))}</b><div class="xs muted tnum" id="pe-sube-${i}">est. ${rp(subEst(it, peTarif()))}</div></div>
      <div class="pe-del"><button class="btn btn-ghost btn-icon btn-sm tx-bad" data-del="${i}" type="button" aria-label="Hapus baris">${ic('trash', 16)}</button></div>
    </div>`).join('') : `<div style="padding:8px 0">${emptyState('Belum ada barang', 'Pilih vendor & barang dari katalog lalu klik Tambah.', 'box')}</div>`;
  updatePETotals(root);
}
function peTarif() { return D().settings.tarif_hari_tambahan ?? 0.3; }
function peHariText(it) {
  const h = Math.max(1, Math.round(num(it.hari) || 1));
  return h > 1 ? 'harga ×' + fmtQty(faktorHari(it, peTarif())) : 'harga ×1';
}
function peRecalc(it) {
  const d = parseSpek(it.spek);
  if (isLuas(it.satuan) && d) it.jumlah = Math.round((num(it.qty_unit) || 1) * d.p * d.l * 100) / 100;
}
function peCalcText(it) {
  if (!isLuas(it.satuan)) return '';
  const d = parseSpek(it.spek);
  if (!d) return `<span class="tx-warn">${it.spek ? 'Spek tidak terbaca' : 'Isi spek, mis. 6x6'}</span>`;
  return `<span class="tx-ok">= ${num(it.qty_unit) || 1} × ${fmtQty(d.p)}×${fmtQty(d.l)} = ${fmtQty(it.jumlah)} m²</span>`;
}
function peSyncRow(root, i) {
  const it = PE.items[i];
  peRecalc(it);
  const q = root.querySelector(`[data-f="jumlah"][data-i="${i}"]`);
  if (q) { q.value = num(it.jumlah); q.readOnly = isLuas(it.satuan) && !!parseSpek(it.spek); }
  const c = root.querySelector('#pe-calc-' + i);
  if (c) c.innerHTML = peCalcText(it);
}
function updatePETotals(root) {
  let est = 0, riil = 0;
  PE.items.forEach((it, i) => {
    const r = subRiil(it, peTarif()), e = subEst(it, peTarif());
    const hf = root.querySelector('#pe-hf-' + i); if (hf) hf.textContent = peHariText(it);
    riil += r; est += e;
    const a = root.querySelector('#pe-sub-' + i), b = root.querySelector('#pe-sube-' + i);
    if (a) a.textContent = rp(r);
    if (b) b.textContent = 'est. ' + rp(e);
  });
  const t = root.querySelector('#pe-tot');
  if (t) t.innerHTML = `<div><div class="l">Jumlah baris</div><div class="v">${PE.items.length}</div></div>
    <div><div class="l">Total estimasi (panitia)</div><div class="v">${rp(est)}</div></div>
    <div><div class="l">Total biaya riil (vendor)</div><div class="v tx-primary">${rp(riil)}</div></div>
    <div><div class="l">Selisih</div><div class="v ${est - riil < 0 ? 'tx-bad' : 'tx-ok'}">${rp(est - riil)}</div></div>`;
}

/* =====================================================================
 *  PESANAN BARANG (semua acara)
 * ===================================================================== */
AdminViews.pesanan = {
  title: 'Pesanan Barang',
  render() {
    const d = D(), f = AdminState.pesananFilter;
    let rows = d.pesanan.slice();
    if (f.acara) rows = rows.filter((p) => p.id_acara === f.acara);
    if (f.vendor) rows = rows.filter((p) => p.id_vendor === f.vendor);
    if (f.status) rows = rows.filter((p) => p.status_pasang === f.status);
    const riil = rows.reduce((s, p) => s + subRiil(p), 0);
    const est = rows.reduce((s, p) => s + subEst(p), 0);
    const terpasang = rows.filter((p) => ['Terpasang', 'Dibongkar'].includes(p.status_pasang)).length;
    return `
    <div class="page-head"><div><span class="eyebrow">${ic('box', 13)} Logistik</span><h1>Pesanan Barang</h1><p>Seluruh barang sewa lintas acara beserta jadwal pasang/bongkar dan status pemasangan di lapangan.</p></div>
      <button class="btn btn-primary" data-act="pesanan-editor" data-id="${esc(f.acara)}">${ic('edit', 16)} Kelola Pesanan Acara</button></div>
    <div class="mini-kpis stagger">
      <div class="mini-kpi" style="--i:0"><div class="l">Item Pesanan</div><div class="v">${rows.length}</div><div class="s">${new Set(rows.map((r) => r.id_acara)).size} acara</div></div>
      <div class="mini-kpi" style="--i:1"><div class="l">Total Biaya Riil</div><div class="v">${countEl(riil)}</div><div class="s">Harga vendor</div></div>
      <div class="mini-kpi" style="--i:2"><div class="l">Total Estimasi</div><div class="v">${countEl(est)}</div><div class="s">Selisih ${rp(est - riil)}</div></div>
      <div class="mini-kpi" style="--i:3"><div class="l">Sudah Terpasang</div><div class="v">${terpasang}/${rows.length}</div><div class="progress" style="margin-top:6px"><span style="width:${rows.length ? (terpasang / rows.length) * 100 : 0}%"></span></div></div>
    </div>
    <div class="card section">
      ${DT.render('pesanan', {
        rows, pageSize: 15, sort: 'tanggal_pasang', dir: 'desc',
        search: (r) => r.nama_barang + ' ' + App.vName(r.id_vendor) + ' ' + App.acara(r.id_acara).nama_acara + ' ' + r.kategori, placeholder: 'Cari barang, vendor, acara...',
        tools: `<select class="select sm" style="width:auto;max-width:260px" data-pf="acara">${acaraOpts(f.acara, 'Semua acara')}</select>
          <select class="select sm" style="width:auto" data-pf="vendor">${vendorOpts(f.vendor, 'Semua vendor', false)}</select>
          <select class="select sm" style="width:auto" data-pf="status">${selectOpts(STATUS_PASANG, f.status, 'Semua status')}</select>`,
        empty: emptyState('Belum ada pesanan', 'Buka acara lalu klik "Kelola Pesanan".', 'box'),
        cols: [
          { key: 'nama_barang', label: 'Barang & Acara', main: true, render: (r) => `<div class="row" style="gap:12px"><span class="t-ic">${ic(KAT_ICON[r.kategori] || 'box', 18)}</span><div style="min-width:0"><div class="t-main">${esc(r.nama_barang)}</div><div class="t-sub"><a href="#/acara/${encodeURIComponent(r.id_acara)}">${esc(App.acara(r.id_acara).nama_acara)}</a></div></div></div>` },
          { key: 'id_vendor', label: 'Vendor', sortVal: (r) => App.vName(r.id_vendor), render: (r) => `<span class="small">${esc(App.vName(r.id_vendor))}</span>` },
          { key: 'jumlah', label: 'Qty', align: 'c', render: (r) => `<span class="tnum">${fmtQty(r.jumlah)} ${esc(r.satuan)}</span>${r.spek ? `<div class="xs muted">${esc(spekText(r))}</div>` : ''}` },
          { key: 'harga_vendor_satuan', label: 'Harga Vendor', align: 'r', render: (r) => `<span class="tnum">${rp(r.harga_vendor_satuan)}</span>` },
          { key: 'sub', label: 'Subtotal', align: 'r', sortVal: (r) => subRiil(r), render: (r) => `<b class="tnum">${rp(subRiil(r))}</b>${hariText(r) ? `<div class="xs muted">${esc(hariText(r))}</div>` : ''}` },
          { key: 'tanggal_pasang', label: 'Pasang', render: (r) => `<span class="small">${tgl(r.tanggal_pasang)}</span>` },
          { key: 'tanggal_bongkar', label: 'Bongkar', render: (r) => `<span class="small">${tgl(r.tanggal_bongkar)}</span>` },
          { key: 'status_pasang', label: 'Status', render: (r) => `<select class="select sm" style="width:auto;min-width:118px" data-change="status-pesanan" data-id="${esc(r.id_pesanan)}">${selectOpts(STATUS_PASANG, r.status_pasang)}</select>` }
        ]
      })}
    </div>`;
  },
  after() { document.querySelectorAll('[data-pf]').forEach((s) => s.addEventListener('change', () => { AdminState.pesananFilter[s.dataset.pf] = s.value; DT.state.pesanan && (DT.state.pesanan.page = 1); App.renderView(false); })); }
};

/* =====================================================================
 *  PEMBAYARAN VENDOR
 * ===================================================================== */
AdminViews.pembayaran = {
  title: 'Pembayaran Vendor',
  render() {
    const d = D(), t = d.fin.total, year = App.today.slice(0, 4);
    const thisYear = d.pembayaran.filter((p) => p.tanggal_bayar.slice(0, 4) === year);
    const belumNota = d.pembayaran.filter((p) => !p.nota_diteruskan).length;
    return `
    <div class="page-head"><div><span class="eyebrow">${ic('wallet', 13)} Keuangan</span><h1>Pembayaran Vendor</h1><p>Satu pembayaran dapat dialokasikan ke beberapa acara sekaligus. Sisa tagihan tiap acara diperbarui otomatis.</p></div>
      <button class="btn btn-primary" data-act="new-bayar">${ic('plus', 17)} Catat Pembayaran</button></div>
    <div class="mini-kpis stagger">
      <div class="mini-kpi" style="--i:0"><div class="l">Dibayar Tahun ${year}</div><div class="v">${countEl(thisYear.reduce((s, p) => s + p.nominal_total, 0))}</div><div class="s">${thisYear.length} transaksi</div></div>
      <div class="mini-kpi" style="--i:1"><div class="l tx-bad">Sisa Tagihan Vendor</div><div class="v tx-bad">${countEl(t.sisa)}</div><div class="s">${t.n_tagihan} tagihan • ${t.n_lewat} lewat jatuh tempo</div></div>
      <div class="mini-kpi" style="--i:2"><div class="l">Total Biaya Riil</div><div class="v">${countEl(t.tagihan)}</div><div class="s">Semua acara aktif</div></div>
      <div class="mini-kpi" style="--i:3"><div class="l">Nota Belum Diteruskan</div><div class="v">${belumNota}</div><div class="s">ke panitia</div></div>
    </div>
    <div class="card section">
      <div class="card-head"><div><h3><span class="card-title-ic red">${ic('receipt', 18)}</span>Sisa Tagihan per Vendor</h3><p>Klik "Bayar" untuk membuka formulir dengan vendor terpilih.</p></div></div>
      ${this.perVendor()}
    </div>
    <div class="card section">
      <div class="card-head"><div><h3><span class="card-title-ic">${ic('list', 18)}</span>Riwayat Pembayaran</h3></div></div>
      ${DT.render('bayar', {
        rows: d.pembayaran, sort: 'tanggal_bayar', dir: 'desc', pageSize: 12,
        search: (r) => App.vName(r.id_vendor) + ' ' + r.catatan + ' ' + d.alokasi.filter((a) => a.id_pembayaran === r.id_pembayaran).map((a) => App.acara(a.id_acara).nama_acara).join(' '),
        placeholder: 'Cari vendor, acara, catatan...',
        empty: emptyState('Belum ada pembayaran', 'Catat pembayaran pertama ke vendor.', 'wallet'),
        cols: [
          { key: 'tanggal_bayar', label: 'Tanggal & Vendor', main: true, render: (r) => `<div class="row" style="gap:12px"><span class="t-ic">${ic('wallet', 18)}</span><div style="min-width:0"><div class="t-main">${esc(App.vName(r.id_vendor))}</div><div class="t-sub">${tgl(r.tanggal_bayar)} • ${esc(r.metode)}</div></div></div>` },
          { key: 'nominal_total', label: 'Nominal', align: 'r', render: (r) => `<b class="tnum">${rp(r.nominal_total)}</b>` },
          { key: 'alokasi', label: 'Dialokasikan ke', sort: false, render: (r) => `<div class="stack" style="gap:2px;align-items:inherit">${d.alokasi.filter((a) => a.id_pembayaran === r.id_pembayaran).map((a) => `<span class="small"><a href="#/acara/${encodeURIComponent(a.id_acara)}">${esc(App.acara(a.id_acara).nama_acara)}</a> <span class="muted tnum">${rp(a.nominal)}</span></span>`).join('')}</div>` },
          { key: 'berkas', label: 'Bukti & Nota', sort: false, render: (r) => `<div class="row" style="gap:6px;justify-content:inherit">${fileLink(r.id_berkas_bukti, 'Bukti', 'Bukti Transfer')}${fileLink(r.id_berkas_nota, 'Nota', 'Nota Vendor')}</div>${r.id_berkas_bukti ? `<div class="xs ${r.tampilkan_ke_vendor ? 'tx-ok' : 'muted'}" style="margin-top:3px">${r.tampilkan_ke_vendor ? '● tampil ke vendor' : '○ tersembunyi dari vendor'}</div>` : ''}` },
          { key: 'nota_diteruskan', label: 'Nota → Panitia', render: (r) => `<button class="btn btn-xs ${r.nota_diteruskan ? 'btn-mint' : 'btn-soft'}" data-act="nota-toggle" data-id="${r.id_pembayaran}" data-v="${r.nota_diteruskan ? '0' : '1'}">${ic(r.nota_diteruskan ? 'checkCircle' : 'circle', 14)} ${r.nota_diteruskan ? 'Diteruskan ' + tgl(r.tanggal_nota_diteruskan) : 'Belum diteruskan'}</button>` },
          { key: '', label: '', acts: true, sort: false, render: (r) => `<div class="acts"><button class="btn btn-ghost btn-sm" data-act="edit-bayar" data-id="${r.id_pembayaran}" aria-label="Edit">${ic('edit', 15)}</button><button class="btn btn-ghost btn-sm tx-bad" data-act="del-bayar" data-id="${r.id_pembayaran}" aria-label="Hapus">${ic('trash', 15)}</button></div>` }
        ]
      })}
    </div>`;
  },
  perVendor() {
    const rows = D().vendor.map((v) => {
      const av = D().fin.av.filter((x) => x.id_vendor === v.id_vendor && !isOff(App.maps.acara[x.id_acara]));
      return { id_vendor: v.id_vendor, nama: v.nama_vendor, tagihan: av.reduce((s, x) => s + x.tagihan, 0), dibayar: av.reduce((s, x) => s + x.dibayar, 0), sisa: av.reduce((s, x) => s + Math.max(0, x.sisa), 0), n: av.filter((x) => x.sisa > 0).length, umur: Math.max(0, ...av.filter((x) => x.sisa > 0).map((x) => x.umur)) };
    }).filter((r) => r.tagihan > 0 || r.dibayar > 0);
    return DT.render('bayar-vendor', {
      rows, sort: 'sisa', dir: 'desc', empty: emptyState('Belum ada tagihan vendor', '', 'checkCircle'),
      cols: [
        { key: 'nama', label: 'Vendor', main: true, render: (r) => `<div class="row" style="gap:12px"><span class="li-ic mint">${initials(r.nama)}</span><div><div class="t-main">${esc(r.nama)}</div><div class="t-sub">${r.n} acara belum lunas</div></div></div>` },
        { key: 'tagihan', label: 'Total Tagihan', align: 'r', render: (r) => `<span class="tnum">${rp(r.tagihan)}</span>` },
        { key: 'dibayar', label: 'Dibayar', align: 'r', render: (r) => `<span class="tnum">${rp(r.dibayar)}</span>` },
        { key: 'sisa', label: 'Sisa', align: 'r', render: (r) => `<b class="tnum ${r.sisa > 0 ? 'tx-bad' : 'tx-ok'}">${rp(r.sisa)}</b>` },
        { key: 'umur', label: 'Jatuh Tempo', render: (r) => r.sisa > 0 ? agingPill(r.umur, ambang()) : badge('Lunas', 'b-ok') },
        { key: '', label: '', acts: true, sort: false, render: (r) => `<div class="acts">${r.sisa > 0 ? `<button class="btn btn-primary btn-sm" data-act="new-bayar" data-vendor="${r.id_vendor}">${ic('wallet', 14)} Bayar</button>` : ''}<button class="btn btn-soft btn-sm" data-act="rekap-vendor" data-id="${r.id_vendor}">${ic('printer', 14)} Rekap</button></div>` }
      ]
    });
  }
};
ACT['nota-toggle'] = (el) => App.write('setNotaDiteruskan', { id_pembayaran: el.dataset.id, value: el.dataset.v === '1' }, { close: false, btn: el });
ACT['del-bayar'] = async (el) => {
  const p = App.maps.pembayaran[el.dataset.id];
  if (!await confirmDialog({ title: 'Hapus pembayaran?', message: `Pembayaran <b>${rp(p.nominal_total)}</b> ke <b>${esc(App.vName(p.id_vendor))}</b> (${tgl(p.tanggal_bayar)}) akan dihapus beserta alokasinya. Sisa tagihan akan dihitung ulang.`, okText: 'Hapus', danger: true })) return;
  App.write('deletePembayaran', { id_pembayaran: p.id_pembayaran });
};
ACT['rekap-vendor'] = async (el) => {
  const res = await App.write('generateRekap', { jenis: 'vendor', id: el.dataset.id, hanyaBelumLunas: false }, { btn: el, busyText: 'PDF...', close: false });
  if (res.success) showPdf(res);
};

/* ---------- Formulir pembayaran (multi-acara) ---------- */
ACT['new-bayar'] = (el) => openBayarForm({ id_vendor: el.dataset.vendor, id_acara: el.dataset.acara });
ACT['edit-bayar'] = (el) => openBayarForm({ id_pembayaran: el.dataset.id });
function openBayarForm(opt = {}) {
  const d = D();
  const edit = opt.id_pembayaran ? App.maps.pembayaran[opt.id_pembayaran] : null;
  let vendor = edit ? edit.id_vendor : (opt.id_vendor || '');
  if (!vendor && opt.id_acara) {
    const cand = d.fin.av.filter((x) => x.id_acara === opt.id_acara && x.sisa > 0);
    if (cand.length === 1) vendor = cand[0].id_vendor;
  }
  const PM = { vendor, alok: {}, orig: {}, extra: opt.id_acara ? [opt.id_acara] : [] };
  if (edit) d.alokasi.filter((a) => a.id_pembayaran === edit.id_pembayaran).forEach((a) => { PM.orig[a.id_acara] = (PM.orig[a.id_acara] || 0) + a.nominal; });
  PM.alok = Object.assign({}, PM.orig);
  const metode = edit ? edit.metode : 'Transfer';
  const m = Modal.open({
    title: edit ? 'Edit Pembayaran Vendor' : 'Catat Pembayaran Vendor', sub: 'Satu transfer/tunai bisa dibagi ke beberapa acara sekaligus.', size: 'lg',
    body: `
      <div class="field"><label><span>Pilih rekanan vendor <span class="req">*</span></span><span class="small tx-bad" id="pm-owed"></span></label><select class="select" id="pm-vendor">${vendorOpts(vendor, 'Pilih vendor', false)}</select></div>
      <div class="form-grid" style="margin-top:14px">
        <div class="field"><label>Tanggal pembayaran <span class="req">*</span></label><input class="input" type="date" id="pm-tgl" value="${edit ? edit.tanggal_bayar : App.today}"></div>
        <div class="field"><label>Metode pembayaran</label>${seg('pm-metode', [{ value: 'Transfer', label: ic('checkCircle', 15) + ' Transfer Bank' }, { value: 'Tunai', label: ic('wallet', 15) + ' Tunai' }], metode)}</div>
      </div>
      <div class="field" style="margin-top:14px"><label><span>Nominal total yang dikeluarkan <span class="req">*</span></span><button class="btn btn-primary btn-xs" type="button" id="pm-auto">${ic('zap', 13)} Lunasi acara paling lama dulu</button></label>
        <div class="input-group"><span class="pre big" style="font-family:var(--font-head);font-weight:700">Rp</span><input class="input tnum money money-big" id="pm-nominal" inputmode="numeric" value="${edit ? fmtNum(edit.nominal_total) : ''}" placeholder="0"></div>
        <div class="row between wrap"><span class="terbilang">Terbilang: <b id="pm-terbilang">-</b></span><span class="small tx-primary bold" id="pm-rek"></span></div></div>
      <div class="section" style="margin-top:18px">
        <div class="alloc-bar" id="pm-bar"></div>
        <div class="alloc-row alloc-head"><span>Nama acara</span><span class="right">Sisa tagihan</span><span>Alokasi (Rp)</span><span>Status pasca bayar</span></div>
        <div id="pm-rows"></div>
        <div class="row" style="margin-top:10px;gap:8px"><select class="select sm" id="pm-addsel" style="flex:1"></select><button class="btn btn-soft btn-sm" type="button" id="pm-addbtn">${ic('plus', 14)} Tambah acara</button></div>
        <div class="hint" style="margin-top:4px">Gunakan "Tambah acara" untuk DP/uang muka acara yang belum punya tagihan.</div>
      </div>
      <div class="form-grid section" style="margin-top:18px">
        <div class="field"><label>Bukti transfer ${edit && edit.id_berkas_bukti ? fileLink(edit.id_berkas_bukti, 'Lihat tersimpan', 'Bukti Transfer') : ''}</label>${uploadBox('pm-bukti', edit && edit.id_berkas_bukti ? 'Ganti bukti transfer' : 'Unggah bukti transfer', 'Foto/PDF • dikompres otomatis')}</div>
        <div class="field"><label>Nota dari vendor ${edit && edit.id_berkas_nota ? fileLink(edit.id_berkas_nota, 'Lihat tersimpan', 'Nota Vendor') : ''}</label>${uploadBox('pm-nota', edit && edit.id_berkas_nota ? 'Ganti nota vendor' : 'Unggah nota vendor', 'Foto/PDF • internal Admin')}</div>
        <label class="check"><input type="checkbox" id="pm-show" ${!edit || edit.tampilkan_ke_vendor ? 'checked' : ''}><span><b>Tampilkan bukti transfer ke vendor</b><br><span class="small muted">Vendor dapat melihat bukti ini di portalnya.</span></span></label>
        <label class="check"><input type="checkbox" id="pm-fwd" ${edit && edit.nota_diteruskan ? 'checked' : ''}><span><b>Nota sudah diteruskan ke panitia</b><br><span class="small muted">Tanggal dicatat otomatis hari ini.</span></span></label>
        <div class="field full"><label>Catatan</label><input class="input" id="pm-cat" value="${esc(edit ? edit.catatan : '')}" placeholder="mis. Pelunasan termin 2"></div>
      </div>`,
    foot: `<span class="note">${ic('lock', 14)} Tercatat di jurnal kas & log aktivitas.</span><button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="pm-save">${ic('check', 16)} Simpan Pembayaran</button>`
  });
  const $ = (s) => m.querySelector(s);
  const sisaNow = (ida) => { const av = App.avOf(ida, PM.vendor); return (av ? av.sisa : 0) + (PM.orig[ida] || 0); };
  const rowIds = () => {
    if (!PM.vendor) return [];
    const ids = new Set(d.fin.av.filter((x) => x.id_vendor === PM.vendor && x.sisa > 0 && !isOff(App.maps.acara[x.id_acara])).map((x) => x.id_acara));
    Object.keys(PM.alok).forEach((k) => ids.add(k));
    PM.extra.forEach((k) => ids.add(k));
    return [...ids].filter((k) => App.maps.acara[k]).sort((a, b) => {
      const x = App.avOf(a, PM.vendor), y = App.avOf(b, PM.vendor);
      return ((y && y.umur) || 0) - ((x && x.umur) || 0) || App.acara(a).tanggal_mulai.localeCompare(App.acara(b).tanggal_mulai);
    });
  };
  const renderRows = () => {
    const v = App.maps.vendor[PM.vendor];
    const ids = rowIds();
    const owed = ids.reduce((s, k) => s + Math.max(0, sisaNow(k)), 0);
    $('#pm-owed').textContent = PM.vendor ? '● Total saldo terutang: ' + rp(owed) : '';
    $('#pm-rek').textContent = v && v.rekening ? 'Rek. ' + v.rekening : '';
    $('#pm-rows').innerHTML = !PM.vendor ? `<div style="padding:10px 0">${emptyState('Pilih vendor terlebih dahulu', 'Daftar acara dengan tagihan vendor tersebut akan muncul di sini.', 'store')}</div>`
      : ids.length ? ids.map((k) => {
        const a = App.acara(k);
        const items = d.pesanan.filter((p) => p.id_acara === k && p.id_vendor === PM.vendor).map((p) => p.nama_barang);
        return `<div class="alloc-row"><div class="a-name"><div class="bold">${esc(a.nama_acara)}</div><div class="small muted ellipsis">${tgl(a.tanggal_mulai)}${items.length ? ' • ' + esc(items.slice(0, 3).join(', ')) + (items.length > 3 ? '…' : '') : ''}</div></div>
          <div class="right"><span class="ml">Sisa tagihan</span><b class="tnum">${rp(sisaNow(k))}</b></div>
          <div><span class="ml">Alokasi</span><div class="input-group"><span class="pre small">Rp</span><input class="input sm tnum money" data-alok="${esc(k)}" inputmode="numeric" value="${PM.alok[k] ? fmtNum(PM.alok[k]) : ''}" placeholder="0"></div></div>
          <div id="pm-st-${esc(k)}"></div></div>`;
      }).join('') : `<div style="padding:10px 0">${emptyState('Tidak ada tagihan tertunda untuk vendor ini', 'Tambahkan acara di bawah bila ini uang muka.', 'checkCircle')}</div>`;
    const inRows = new Set(ids);
    $('#pm-addsel').innerHTML = '<option value="">— Pilih acara lain —</option>' + d.acara.filter((a) => !inRows.has(a.id_acara) && !isOff(a)).sort((a, b) => b.tanggal_mulai.localeCompare(a.tanggal_mulai)).map((a) => `<option value="${a.id_acara}">${esc(a.nama_acara)} — ${tgl(a.tanggal_mulai)}</option>`).join('');
    update();
  };
  const update = () => {
    const nominal = parseMoney($('#pm-nominal').value);
    $('#pm-terbilang').textContent = nominal ? terbilang(nominal) : '-';
    let tot = 0;
    rowIds().forEach((k) => {
      const al = PM.alok[k] || 0, s = sisaNow(k);
      tot += al;
      const el = m.querySelector('#pm-st-' + CSS.escape(k));
      if (!el) return;
      el.innerHTML = '<span class="ml">Status baru</span>' + (al <= 0 ? badge('Belum dialokasikan', 'b-neu')
        : al > s ? badge('Melebihi ' + rp(al - s), 'b-bad')
        : al >= s ? badge('LUNAS (100%)', 'b-ok') : badge('Sisa ' + rp(s - al), 'b-warn'));
    });
    const bar = $('#pm-bar'), diff = nominal - tot;
    bar.className = 'alloc-bar' + (diff === 0 && nominal > 0 ? '' : diff < 0 ? ' over' : ' off');
    bar.innerHTML = `<span>${ic('wallet', 16)} Alokasi pembayaran per acara</span><span class="tnum">Terdistribusi: ${rp(tot)} / ${rp(nominal)} ${!nominal && !tot ? badge('Isi nominal', 'b-neu') : diff === 0 ? badge('SEIMBANG ✓', 'b-dark no-dot') : diff > 0 ? badge('Kurang ' + rp(diff), 'b-warn') : badge('Lebih ' + rp(-diff), 'b-bad')}</span>`;
  };
  const origSaved = Object.assign({}, PM.orig);
  $('#pm-vendor').addEventListener('change', (e) => {
    PM.vendor = e.target.value;
    const same = edit && PM.vendor === edit.id_vendor;
    PM.orig = same ? Object.assign({}, origSaved) : {};
    PM.alok = Object.assign({}, PM.orig);
    renderRows();
  });
  $('#pm-nominal').addEventListener('input', update);
  $('#pm-rows').addEventListener('input', (e) => { const k = e.target.dataset.alok; if (k !== undefined) { PM.alok[k] = parseMoney(e.target.value); update(); } });
  $('#pm-addbtn').addEventListener('click', () => { const k = $('#pm-addsel').value; if (!k) return toast('Pilih acara dulu.', 'warn'); if (!PM.vendor) return toast('Pilih vendor dulu.', 'warn'); PM.extra.push(k); renderRows(); });
  $('#pm-auto').addEventListener('click', () => {
    if (!PM.vendor) return toast('Pilih vendor terlebih dahulu.', 'warn');
    const ids = rowIds();
    let nominal = parseMoney($('#pm-nominal').value);
    if (!nominal) { nominal = ids.reduce((s, k) => s + Math.max(0, sisaNow(k)), 0); $('#pm-nominal').value = fmtNum(nominal); }
    let rest = nominal;
    PM.alok = {};
    ids.forEach((k) => { const take = Math.min(rest, Math.max(0, sisaNow(k))); if (take > 0) { PM.alok[k] = take; rest -= take; } });
    if (rest > 0 && ids.length) { PM.alok[ids[0]] = (PM.alok[ids[0]] || 0) + rest; toast('Nominal melebihi total tagihan — sisanya dialokasikan ke acara pertama.', 'warn', 4500); }
    m.querySelectorAll('[data-alok]').forEach((inp) => { const v = PM.alok[inp.dataset.alok]; inp.value = v ? fmtNum(v) : ''; });
    update();
  });
  renderRows();
  $('#pm-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const nominal = parseMoney($('#pm-nominal').value);
    if (!PM.vendor) return toast('Pilih vendor terlebih dahulu.', 'warn');
    if (!$('#pm-tgl').value) return toast('Tanggal pembayaran wajib diisi.', 'warn');
    if (!(nominal > 0)) return toast('Nominal pembayaran harus lebih dari 0.', 'warn');
    const alokasi = Object.keys(PM.alok).filter((k) => PM.alok[k] > 0).map((k) => ({ id_acara: k, nominal: PM.alok[k] }));
    const tot = alokasi.reduce((s, a) => s + a.nominal, 0);
    if (!alokasi.length) return toast('Alokasikan nominal ke minimal satu acara.', 'warn');
    if (tot !== nominal) return toast(`Total alokasi (${rp(tot)}) harus sama dengan nominal (${rp(nominal)}).`, 'warn', 5000);
    const lebih = alokasi.filter((a) => a.nominal > sisaNow(a.id_acara));
    if (lebih.length && !await confirmDialog({ title: 'Alokasi melebihi sisa tagihan', message: `Alokasi untuk <b>${lebih.map((a) => esc(App.acara(a.id_acara).nama_acara)).join(', ')}</b> melebihi sisa tagihannya (lebih bayar/uang muka). Tetap simpan?`, okText: 'Tetap simpan' })) return;
    let fileBukti = null, fileNota = null;
    try {
      setBusy(btn, true, 'Menyiapkan berkas...');
      fileBukti = await prepareFile($('#pm-bukti').files[0]);
      fileNota = await prepareFile($('#pm-nota').files[0]);
    } catch (err) { setBusy(btn, false); return toast(err.message, 'error'); }
    setBusy(btn, false);
    const data = {
      id_pembayaran: edit ? edit.id_pembayaran : '', id_vendor: PM.vendor, tanggal_bayar: $('#pm-tgl').value, metode: segVal(m, 'pm-metode'),
      nominal_total: nominal, tampilkan_ke_vendor: $('#pm-show').checked, nota_diteruskan: $('#pm-fwd').checked,
      tanggal_nota_diteruskan: edit && edit.nota_diteruskan ? edit.tanggal_nota_diteruskan : '', catatan: $('#pm-cat').value
    };
    await App.write('savePembayaran', { data, alokasi, fileBukti, fileNota }, { btn, busyText: 'Menyimpan & mengunggah...' });
  });
}

/* =====================================================================
 *  SETORAN PANITIA
 * ===================================================================== */
AdminViews.setoran = {
  title: 'Setoran Panitia',
  render() {
    const d = D(), t = d.fin.total;
    const perAcara = acaraAktif().map((a) => Object.assign({ id_acara: a.id_acara }, App.finA(a.id_acara))).filter((x) => x.biaya > 0 || x.setoran > 0);
    return `
    <div class="page-head"><div><span class="eyebrow">${ic('coins', 13)} Keuangan</span><h1>Setoran Panitia</h1><p>Dana yang disetor panitia ke Admin. Kewajiban setor dihitung dari biaya riil (harga vendor), bukan estimasi.</p></div>
      <button class="btn btn-primary" data-act="new-setoran">${ic('plus', 17)} Catat Setoran</button></div>
    <div class="mini-kpis stagger">
      <div class="mini-kpi" style="--i:0"><div class="l">Total Setoran Diterima</div><div class="v">${countEl(t.setoran)}</div><div class="s">${d.setoran.length} transaksi</div></div>
      <div class="mini-kpi" style="--i:1"><div class="l tx-bad">Kekurangan Setoran</div><div class="v tx-bad">${countEl(t.kekurangan)}</div><div class="s">${t.n_setoran_kurang} acara belum lunas</div></div>
      <div class="mini-kpi" style="--i:2"><div class="l">Dana di Tangan Admin</div><div class="v tx-ok">${countEl(t.dana)}</div><div class="s">Belum disalurkan ke vendor</div></div>
      <div class="mini-kpi" style="--i:3"><div class="l tx-bad">Ditalangi Admin</div><div class="v tx-bad">${countEl(t.talangan)}</div><div class="s">${t.n_ditalangi} acara</div></div>
    </div>
    <div class="card section">
      <div class="card-head"><div><h3><span class="card-title-ic amber">${ic('users', 18)}</span>Status Setoran per Acara</h3><p>Gunakan tombol "Tagih" untuk mengirim pengingat WhatsApp ke panitia.</p></div>${tplBtn('tagih', '', 'Edit Format WA Tagihan', 'btn-soft btn-sm')}</div>
      ${DT.render('setoran-acara', {
        rows: perAcara, sort: 'kekurangan', dir: 'desc', pageSize: 10,
        search: (r) => App.acara(r.id_acara).nama_acara + ' ' + App.acara(r.id_acara).nama_panitia, placeholder: 'Cari acara / panitia...',
        empty: emptyState('Belum ada acara dengan biaya', '', 'coins'),
        cols: [
          { key: 'acara', label: 'Acara & Panitia', main: true, sortVal: (r) => App.acara(r.id_acara).nama_acara, render: (r) => { const a = App.acara(r.id_acara); return `<div class="t-main"><a href="#/acara/${encodeURIComponent(r.id_acara)}" style="color:inherit;text-decoration:none">${esc(a.nama_acara)}</a></div><div class="t-sub">PJ: ${esc(a.nama_panitia || '-')} • ${tgl(a.tanggal_mulai)}</div>`; } },
          { key: 'biaya', label: 'Biaya Riil', align: 'r', render: (r) => `<span class="tnum">${rp(r.biaya)}</span>` },
          { key: 'setoran', label: 'Sudah Setor', align: 'r', render: (r) => `<span class="tnum">${rp(r.setoran)}</span>` },
          { key: 'kekurangan', label: 'Kekurangan', align: 'r', render: (r) => `<b class="tnum ${r.kekurangan > 0 ? 'tx-bad' : 'tx-ok'}">${rp(r.kekurangan)}</b>` },
          { key: 'dana', label: 'Dana / Talangan', align: 'r', render: (r) => r.talangan > 0 ? badge('Talangan ' + rp(r.talangan), 'b-bad') : `<span class="tnum tx-ok">${rp(r.dana)}</span>` },
          { key: 'status_setoran', label: 'Status', render: (r) => payBadge(r.status_setoran) + (r.kekurangan > 0 ? ' ' + agingPill(r.umur, ambang()) : '') },
          { key: '', label: '', acts: true, sort: false, render: (r) => { const a = App.acara(r.id_acara); return `<div class="acts">${r.kekurangan > 0 ? waBtn(a.kontak_panitia, tagihSetoranText(r.id_acara), 'Tagih') : ''}<button class="btn btn-soft btn-sm" data-act="new-setoran" data-acara="${r.id_acara}">${ic('plus', 14)} Setoran</button></div>`; } }
        ]
      })}
    </div>
    <div class="card section">
      <div class="card-head"><div><h3><span class="card-title-ic">${ic('list', 18)}</span>Riwayat Setoran</h3></div></div>
      ${DT.render('setoran', {
        rows: d.setoran, sort: 'tanggal_setor', dir: 'desc', pageSize: 12,
        search: (r) => App.acara(r.id_acara).nama_acara + ' ' + r.nama_penyetor + ' ' + r.catatan, placeholder: 'Cari acara / penyetor...',
        empty: emptyState('Belum ada setoran', '', 'coins'), cols: setoranCols(true)
      })}
    </div>`;
  }
};
ACT['new-setoran'] = (el) => openSetoranForm({ id_acara: el.dataset.acara });
ACT['edit-setoran'] = (el) => openSetoranForm(D().setoran.find((s) => s.id_setoran === el.dataset.id));
ACT['del-setoran'] = async (el) => {
  const s = D().setoran.find((x) => x.id_setoran === el.dataset.id);
  if (!await confirmDialog({ title: 'Hapus setoran?', message: `Setoran <b>${rp(s.nominal)}</b> untuk <b>${esc(App.acara(s.id_acara).nama_acara)}</b> akan dihapus.`, okText: 'Hapus', danger: true })) return;
  App.write('deleteSetoran', { id_setoran: s.id_setoran });
};
function openSetoranForm(s) {
  s = s || {};
  const edit = !!s.id_setoran;
  const m = Modal.open({
    title: edit ? 'Edit Setoran Panitia' : 'Catat Setoran Panitia', sub: 'Dana dari panitia acara ke Admin.', size: 'lg',
    body: `<div class="form-grid">
      <div class="field full"><label>Acara <span class="req">*</span></label><select class="select" id="st-acara">${acaraOpts(s.id_acara)}</select></div>
      <div class="full" id="st-info"></div>
      <div class="field"><label>Tanggal setor <span class="req">*</span></label><input class="input" type="date" id="st-tgl" value="${s.tanggal_setor || App.today}"></div>
      <div class="field"><label>Metode</label>${seg('st-metode', ['Tunai', 'Transfer'], s.metode || 'Tunai')}</div>
      <div class="field full"><label><span>Nominal setoran <span class="req">*</span></span><button class="btn btn-mint btn-xs" type="button" id="st-fill">${ic('zap', 13)} Isi sesuai kekurangan</button></label>
        <div class="input-group"><span class="pre big" style="font-family:var(--font-head);font-weight:700">Rp</span><input class="input tnum money money-big" id="st-nom" inputmode="numeric" value="${s.nominal ? fmtNum(s.nominal) : ''}" placeholder="0"></div>
        <span class="terbilang">Terbilang: <b id="st-terb">-</b></span></div>
      <div class="field"><label>Nama penyetor</label><input class="input" id="st-nama" value="${esc(s.nama_penyetor)}" placeholder="Default: nama panitia"></div>
      <div class="field"><label>Bukti setoran (opsional) ${s.id_berkas_bukti ? fileLink(s.id_berkas_bukti, 'Lihat', 'Bukti Setoran') : ''}</label>${uploadBox('st-bukti', 'Unggah bukti', 'Foto/PDF')}</div>
      <div class="field full"><label>Catatan</label><input class="input" id="st-cat" value="${esc(s.catatan)}" placeholder="Opsional"></div>
    </div>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="st-save">${ic('check', 16)} Simpan Setoran</button>`
  });
  const $ = (q) => m.querySelector(q);
  const kurang = () => { const ida = $('#st-acara').value; const f = App.finA(ida); return Math.max(0, (f.kekurangan || 0) + (edit && ida === s.id_acara ? s.nominal : 0)); };
  const info = () => {
    const ida = $('#st-acara').value;
    if (!ida) { $('#st-info').innerHTML = ''; return; }
    const f = App.finA(ida), a = App.acara(ida);
    const sudah = f.setoran - (edit && ida === s.id_acara ? s.nominal : 0);
    $('#st-info').innerHTML = `<div class="v-stat" style="grid-template-columns:repeat(3,1fr);margin:0"><div><div class="l">Biaya riil</div><div class="v">${rp(f.biaya)}</div></div><div class="g"><div class="l">Sudah setor</div><div class="v">${rp(sudah)}</div></div><div><div class="l">Kekurangan</div><div class="v tx-bad">${rp(kurang())}</div></div></div>`;
    if (!$('#st-nama').value) $('#st-nama').placeholder = a.nama_panitia || 'Nama penyetor';
  };
  const terb = () => { const n = parseMoney($('#st-nom').value); $('#st-terb').textContent = n ? terbilang(n) : '-'; };
  $('#st-acara').addEventListener('change', info);
  $('#st-nom').addEventListener('input', terb);
  $('#st-fill').addEventListener('click', () => { const k = kurang(); if (!k) return toast('Tidak ada kekurangan setoran untuk acara ini.', 'info'); $('#st-nom').value = fmtNum(k); terb(); });
  info(); terb();
  $('#st-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget, nominal = parseMoney($('#st-nom').value), ida = $('#st-acara').value;
    if (!ida) return toast('Pilih acara terlebih dahulu.', 'warn');
    if (!(nominal > 0)) return toast('Nominal setoran harus lebih dari 0.', 'warn');
    if (nominal > kurang() && !await confirmDialog({ title: 'Setoran melebihi kekurangan', message: `Nominal ${rp(nominal)} melebihi kekurangan ${rp(kurang())}. Kelebihan mungkin perlu dikembalikan. Tetap simpan?`, okText: 'Tetap simpan' })) return;
    let fileBukti = null;
    try { fileBukti = await prepareFile($('#st-bukti').files[0]); } catch (err) { return toast(err.message, 'error'); }
    await App.write('saveSetoran', { data: { id_setoran: s.id_setoran || '', id_acara: ida, tanggal_setor: $('#st-tgl').value, metode: segVal(m, 'st-metode'), nominal, nama_penyetor: $('#st-nama').value, catatan: $('#st-cat').value }, fileBukti }, { btn });
  });
}

/* ---------- Konsumsi ---------- */
ACT['new-konsumsi'] = (el) => openKonsumsiForm({ id_acara: el.dataset.acara });
ACT['edit-konsumsi'] = (el) => openKonsumsiForm(D().konsumsi.find((k) => k.id_konsumsi === el.dataset.id));
ACT['del-konsumsi'] = async (el) => {
  if (!await confirmDialog({ title: 'Hapus jadwal konsumsi?', message: 'Pengingat untuk jadwal ini tidak akan muncul lagi.', okText: 'Hapus', danger: true })) return;
  App.write('deleteKonsumsi', { id_konsumsi: el.dataset.id }, { close: false });
};
ACT['ks-mark'] = (el) => App.write('markKonsumsi', { id_konsumsi: el.dataset.id, value: el.dataset.v === '1' }, { close: false, btn: el });
function openKonsumsiForm(k) {
  k = k || {};
  const edit = !!k.id_konsumsi;
  let touched = edit;
  const m = Modal.open({
    title: edit ? 'Edit Jadwal Konsumsi' : 'Jadwal Konsumsi Pekerja', sub: 'Pengingat muncul di Beranda pada H-1 dan Hari H.', size: 'lg',
    body: `<div class="form-grid">
      <div class="field"><label>Acara <span class="req">*</span></label><select class="select" id="ks-acara">${acaraOpts(k.id_acara)}</select></div>
      <div class="field"><label>Vendor (kru)</label><select class="select" id="ks-vendor"></select></div>
      <div class="field"><label>Tahap</label>${seg('ks-tahap', ['Pasang', 'Bongkar'], k.tahap || 'Pasang')}</div>
      <div class="field"><label>Tingkat kesulitan</label>${seg('ks-sulit', ['Ringan', 'Sedang', 'Berat'], k.kesulitan || 'Sedang')}</div>
      <div class="field"><label>Tanggal <span class="req">*</span></label><input class="input" type="date" id="ks-tgl" value="${esc(k.tanggal)}"></div>
      <div class="field"><label>Jam mulai</label><input class="input" type="time" id="ks-jam" value="${esc(k.jam || '08:00')}"></div>
      <div class="field"><label>Perkiraan durasi (jam)</label><input class="input" type="number" min="0" step="0.5" id="ks-dur" value="${k.durasi_jam !== undefined ? num(k.durasi_jam) : 4}"></div>
      <div class="field"><label>Jumlah pekerja</label><input class="input" type="number" min="0" id="ks-org" value="${k.jumlah_pekerja !== undefined ? num(k.jumlah_pekerja) : ''}" placeholder="orang"></div>
      <div class="field full"><label><span>Rekomendasi konsumsi</span><button type="button" class="btn btn-ghost btn-xs" id="ks-reset">${ic('refresh', 13)} Pakai rekomendasi otomatis</button></label><textarea class="textarea" id="ks-rec" style="min-height:64px">${esc(k.rekomendasi)}</textarea><span class="hint">Otomatis dari durasi & kesulitan; boleh diubah manual.</span></div>
      <div class="field full"><label>Catatan</label><input class="input" id="ks-cat" value="${esc(k.catatan)}"></div>
    </div>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="ks-save">${ic('check', 16)} Simpan Jadwal</button>`
  });
  const $ = (q) => m.querySelector(q);
  const fillVendor = () => {
    const ida = $('#ks-acara').value;
    const ids = [...new Set(D().pesanan.filter((p) => p.id_acara === ida).map((p) => p.id_vendor))];
    const list = ids.length ? ids : D().vendor.map((v) => v.id_vendor);
    $('#ks-vendor').innerHTML = selectOpts(list.map((v) => ({ value: v, label: App.vName(v) })), k.id_vendor || list[0] || '', 'Pilih vendor');
  };
  const fillDate = () => {
    if ($('#ks-tgl').value && edit) return;
    const ida = $('#ks-acara').value, iv = $('#ks-vendor').value, tahap = segVal(m, 'ks-tahap');
    const ps = D().pesanan.filter((p) => p.id_acara === ida && (!iv || p.id_vendor === iv));
    const dates = ps.map((p) => tahap === 'Pasang' ? p.tanggal_pasang : p.tanggal_bongkar).filter(isYMD).sort();
    if (dates.length) $('#ks-tgl').value = tahap === 'Pasang' ? dates[0] : dates[dates.length - 1];
  };
  const autoRec = (force) => { if (!touched || force) $('#ks-rec').value = rekomendasiKonsumsi($('#ks-dur').value, segVal(m, 'ks-sulit')); };
  $('#ks-acara').addEventListener('change', () => { fillVendor(); fillDate(); });
  $('#ks-vendor').addEventListener('change', fillDate);
  m.querySelector('[data-seg="ks-tahap"]').addEventListener('segchange', () => { if (!edit) fillDate(); });
  m.querySelector('[data-seg="ks-sulit"]').addEventListener('segchange', () => autoRec());
  $('#ks-dur').addEventListener('input', () => autoRec());
  $('#ks-rec').addEventListener('input', () => (touched = true));
  $('#ks-reset').addEventListener('click', () => { touched = false; autoRec(true); });
  fillVendor(); if (!edit) fillDate(); autoRec();
  $('#ks-save').addEventListener('click', async (e) => {
    if (!$('#ks-acara').value) return toast('Pilih acara.', 'warn');
    if (!$('#ks-tgl').value) return toast('Tanggal wajib diisi.', 'warn');
    await App.write('saveKonsumsi', {
      id_konsumsi: k.id_konsumsi || '', id_acara: $('#ks-acara').value, id_vendor: $('#ks-vendor').value, tahap: segVal(m, 'ks-tahap'),
      tanggal: $('#ks-tgl').value, jam: $('#ks-jam').value, durasi_jam: num($('#ks-dur').value), kesulitan: segVal(m, 'ks-sulit'),
      jumlah_pekerja: num($('#ks-org').value), rekomendasi: $('#ks-rec').value, catatan: $('#ks-cat').value
    }, { btn: e.currentTarget });
  });
}

/* =====================================================================
 *  KATALOG BARANG
 * ===================================================================== */
AdminViews.katalog = {
  title: 'Katalog Barang',
  render() {
    const d = D(), f = AdminState.katalogFilter;
    let rows = d.katalog.slice();
    if (!f.nonaktif) rows = rows.filter((k) => k.aktif);
    if (f.vendor) rows = rows.filter((k) => k.id_vendor === f.vendor);
    if (f.kategori) rows = rows.filter((k) => k.kategori === f.kategori);
    return `
    <div class="page-head"><div><span class="eyebrow">${ic('tag', 13)} Master Data</span><h1>Katalog Barang</h1><p>Daftar barang sewa tiap vendor beserta harga vendor (biaya riil) dan harga estimasi bawaan untuk panitia.</p></div>
      <div class="row wrap"><button class="btn btn-soft" data-act="kat-export">${ic('download', 16)} Ekspor Excel</button><button class="btn btn-soft" data-act="kat-import">${ic('upload', 16)} Import Excel</button><button class="btn btn-primary" data-act="new-barang">${ic('plus', 17)} Tambah Barang</button></div></div>
    <div class="card">
      ${DT.render('katalog', {
        rows, sort: 'nama_barang', pageSize: 15,
        search: (r) => r.nama_barang + ' ' + r.kategori + ' ' + App.vName(r.id_vendor) + ' ' + r.spesifikasi, placeholder: 'Cari barang...',
        tools: `<select class="select sm" style="width:auto" data-kf="vendor">${vendorOpts(f.vendor, 'Semua vendor', false)}</select>
          <select class="select sm" style="width:auto" data-kf="kategori">${selectOpts(KATEGORI, f.kategori, 'Semua kategori')}</select>
          <label class="check small"><input type="checkbox" data-kf="nonaktif" ${f.nonaktif ? 'checked' : ''}> Tampilkan nonaktif</label>`,
        empty: emptyState('Katalog masih kosong', d.vendor.length ? 'Tambahkan barang sewa pertama.' : 'Tambahkan vendor terlebih dahulu di menu Vendor & Akun.', 'tag'),
        cols: [
          { key: 'nama_barang', label: 'Barang', main: true, render: (r) => `<div class="row" style="gap:12px"><span class="t-ic">${ic(KAT_ICON[r.kategori] || 'box', 18)}</span><div style="min-width:0"><div class="t-main">${esc(r.nama_barang)} ${r.aktif ? '' : badge('Nonaktif', 'b-neu')}</div><div class="t-sub">${esc(r.spesifikasi || r.kategori)}</div></div></div>` },
          { key: 'kategori', label: 'Kategori', render: (r) => `<span class="small">${esc(r.kategori)}</span>` },
          { key: 'id_vendor', label: 'Vendor', sortVal: (r) => App.vName(r.id_vendor), render: (r) => `<span class="small">${esc(App.vName(r.id_vendor))}</span>` },
          { key: 'harga_vendor', label: 'Harga Vendor', align: 'r', render: (r) => `<b class="tnum">${rp(r.harga_vendor)}</b><div class="xs muted">per ${esc(r.satuan)}</div>` },
          { key: 'harga_estimasi', label: 'Harga Estimasi', align: 'r', render: (r) => `<span class="tnum">${rp(r.harga_estimasi)}</span>` },
          { key: 'margin', label: 'Selisih', align: 'r', sortVal: (r) => r.harga_estimasi - r.harga_vendor, render: (r) => `<span class="tnum small ${r.harga_estimasi - r.harga_vendor < 0 ? 'tx-bad' : 'tx-ok'}">${rp(r.harga_estimasi - r.harga_vendor)}</span>` },
          { key: '', label: '', acts: true, sort: false, render: (r) => `<div class="acts"><button class="btn btn-ghost btn-sm" data-act="edit-barang" data-id="${r.id_barang}" aria-label="Edit">${ic('edit', 15)}</button><button class="btn btn-ghost btn-sm" data-act="toggle-barang" data-id="${r.id_barang}" data-v="${r.aktif ? '0' : '1'}">${r.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button></div>` }
        ]
      })}
    </div>`;
  },
  after() {
    document.querySelectorAll('[data-kf]').forEach((s) => s.addEventListener('change', () => {
      AdminState.katalogFilter[s.dataset.kf] = s.type === 'checkbox' ? s.checked : s.value; App.renderView(false);
    }));
  }
};
ACT['new-barang'] = () => openBarangForm({ id_vendor: AdminState.katalogFilter.vendor });
ACT['edit-barang'] = (el) => openBarangForm(App.maps.katalog[el.dataset.id]);
ACT['toggle-barang'] = (el) => App.write('toggleBarang', { id_barang: el.dataset.id, aktif: el.dataset.v === '1' }, { close: false, btn: el });
function openBarangForm(b) {
  b = b || {};
  if (!D().vendor.length) return toast('Tambahkan vendor terlebih dahulu di menu Vendor & Akun.', 'warn');
  const m = Modal.open({
    title: b.id_barang ? 'Edit Barang Katalog' : 'Tambah Barang Katalog', size: 'lg',
    body: `<form class="form-grid" id="f-brg">
      <div class="field full"><label>Nama barang <span class="req">*</span></label><input class="input" name="nama_barang" value="${esc(b.nama_barang)}" placeholder="mis. Tenda VIP Semi-Rigging 10x20 m"></div>
      <div class="field"><label>Vendor <span class="req">*</span></label><select class="select" name="id_vendor">${vendorOpts(b.id_vendor, 'Pilih vendor')}</select></div>
      <div class="field"><label>Kategori</label><select class="select" name="kategori">${selectOpts(KATEGORI, b.kategori || 'Lainnya')}</select></div>
      <div class="field"><label>Harga vendor (riil) <span class="req">*</span></label>${moneyInput('brg-hv', b.harga_vendor)}</div>
      <div class="field"><label>Harga estimasi (panitia)</label>${moneyInput('brg-he', b.harga_estimasi)}<span class="hint">Kosongkan = sama dengan harga vendor.</span></div>
      <div class="field"><label>Satuan</label><input class="input" name="satuan" list="satuan-list" value="${esc(b.satuan || 'unit')}"><datalist id="satuan-list">${SATUAN.map((s) => `<option value="${s}">`).join('')}</datalist></div>
      <div class="field"><label>Spesifikasi</label><input class="input" name="spesifikasi" value="${esc(b.spesifikasi)}" placeholder="Ukuran, warna, dll."></div>
    </form>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="brg-save">${ic('check', 16)} Simpan</button>`
  });
  m.querySelector('#brg-save').addEventListener('click', async (e) => {
    const f = Object.fromEntries(new FormData(m.querySelector('#f-brg')));
    if (!f.nama_barang.trim()) return toast('Nama barang wajib diisi.', 'warn');
    if (!f.id_vendor) return toast('Pilih vendor.', 'warn');
    const hv = parseMoney(m.querySelector('#brg-hv').value), heRaw = m.querySelector('#brg-he').value;
    await App.write('saveBarang', Object.assign(f, { id_barang: b.id_barang || '', harga_vendor: hv, harga_estimasi: heRaw ? parseMoney(heRaw) : hv }), { btn: e.currentTarget });
  });
}

/* =====================================================================
 *  VENDOR & AKUN
 * ===================================================================== */
AdminViews.vendor = {
  title: 'Vendor & Akun',
  render() {
    const d = D();
    return `
    <div class="page-head"><div><span class="eyebrow">${ic('store', 13)} Master Data</span><h1>Vendor & Akun Pengguna</h1><p>Kelola rekanan vendor serta akun login. Vendor hanya dapat melihat acara, tagihan, dan bukti transfer miliknya sendiri.</p></div>
      <div class="row wrap"><button class="btn btn-soft" data-act="new-user">${ic('user', 16)} Buat Akun</button><button class="btn btn-primary" data-act="new-vendor">${ic('plus', 17)} Tambah Vendor</button></div></div>
    <div class="grid-3 stagger">
      ${d.vendor.length ? d.vendor.map((v, i) => {
        const av = d.fin.av.filter((x) => x.id_vendor === v.id_vendor);
        const sisa = av.reduce((s, x) => s + Math.max(0, x.sisa), 0), tag = av.reduce((s, x) => s + x.tagihan, 0);
        const akun = d.users.filter((u) => u.id_vendor === v.id_vendor);
        const nb = d.katalog.filter((k) => k.id_vendor === v.id_vendor && k.aktif).length;
        return `<div class="card" style="--i:${i};display:flex;flex-direction:column;gap:12px">
          <div class="row" style="gap:12px"><span class="li-ic mint" style="width:48px;height:48px;font-size:15px">${initials(v.nama_vendor)}</span>
            <div class="grow"><div class="bold" style="font-family:var(--font-head);font-size:15.5px">${esc(v.nama_vendor)}</div><div class="small muted">${esc(v.pic || '-')} • ${esc(v.kontak || '-')}</div></div>
            ${v.aktif ? '' : badge('Nonaktif', 'b-neu')}</div>
          <div class="v-stat" style="margin:0"><div><div class="l">Total tagihan</div><div class="v" style="font-size:15px">${rpShort(tag)}</div></div><div class="${sisa ? '' : 'g'}"><div class="l">Sisa</div><div class="v ${sisa ? 'tx-bad' : ''}" style="font-size:15px">${rpShort(sisa)}</div></div></div>
          <div class="small muted">${ic('tag', 13)} ${nb} barang katalog • ${ic('wallet', 13)} ${esc(v.rekening || 'Rekening belum diisi')}</div>
          <div class="small">${ic('user', 13)} Akun: ${akun.length ? akun.map((u) => `<b>${esc(u.username)}</b>${u.aktif ? '' : ' (nonaktif)'}`).join(', ') : '<span class="tx-warn">belum ada akun login</span>'}</div>
          <div class="row wrap" style="margin-top:auto"><button class="btn btn-soft btn-sm" data-act="edit-vendor" data-id="${v.id_vendor}">${ic('edit', 14)} Edit</button>
          ${akun.length ? '' : `<button class="btn btn-mint btn-sm" data-act="new-user" data-vendor="${v.id_vendor}">${ic('plus', 14)} Buat akun</button>`}
          ${v.kontak ? `<a class="btn btn-ghost btn-sm" href="${waLink(v.kontak, 'Assalamu\'alaikum ' + (v.pic || ''))}" target="_blank" rel="noopener">${ic('chat', 14)} WA</a>` : ''}</div>
        </div>`;
      }).join('') : `<div class="card" style="grid-column:1/-1">${emptyState('Belum ada vendor', 'Tambahkan vendor rekanan pertama.', 'store')}</div>`}
    </div>
    <div class="card section">
      <div class="card-head"><div><h3><span class="card-title-ic">${ic('users', 18)}</span>Akun Pengguna</h3><p>Bagikan username & kata sandi vendor secara pribadi.</p></div></div>
      ${DT.render('users', {
        rows: d.users, sort: 'role', rowAttr: (r) => r.aktif ? '' : 'style="opacity:.6"',
        cols: [
          { key: 'nama', label: 'Nama', main: true, render: (r) => `<div class="row" style="gap:12px"><span class="avatar" style="width:36px;height:36px">${initials(r.nama)}</span><div><div class="t-main">${esc(r.nama)} ${r.id_user === d.user.id_user ? badge('Anda', 'b-info') : ''}</div><div class="t-sub">@${esc(r.username)}</div></div></div>` },
          { key: 'role', label: 'Peran', render: (r) => r.role === 'admin' ? badge('Admin', 'b-dark') : badge('Vendor', 'b-info') },
          { key: 'id_vendor', label: 'Vendor', render: (r) => `<span class="small">${r.id_vendor ? esc(App.vName(r.id_vendor)) : '—'}</span>` },
          { key: 'aktif', label: 'Status', render: (r) => (r.aktif ? badge('Aktif', 'b-ok') : badge('Nonaktif', 'b-neu')) + (r.terkunci ? ' ' + badge('Terkunci', 'b-bad') : '') + (r.harus_ganti ? ' ' + badge('Wajib ganti sandi', 'b-warn') : '') },
          { key: 'login_terakhir', label: 'Login Terakhir', render: (r) => `<span class="small muted">${esc(r.login_terakhir || 'Belum pernah')}</span>` },
          { key: '', label: '', acts: true, sort: false, render: (r) => `<div class="acts"><button class="btn btn-ghost btn-sm" data-act="edit-user" data-id="${r.id_user}" aria-label="Edit">${ic('edit', 14)}</button><button class="btn btn-soft btn-sm" data-act="reset-pw" data-id="${r.id_user}">${ic('lock', 14)} Reset sandi</button>${r.id_user === d.user.id_user ? '' : `<button class="btn btn-sm ${r.aktif ? 'btn-danger' : 'btn-mint'}" data-act="toggle-user" data-id="${r.id_user}" data-v="${r.aktif ? '0' : '1'}">${ic(r.aktif ? 'lock' : 'checkCircle', 14)} ${r.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>`}</div>` }
        ]
      })}
    </div>`;
  }
};
ACT['new-vendor'] = () => openVendorForm();
ACT['edit-vendor'] = (el) => openVendorForm(App.maps.vendor[el.dataset.id]);
function openVendorForm(v) {
  v = v || {};
  const m = Modal.open({
    title: v.id_vendor ? 'Edit Vendor' : 'Tambah Vendor', size: 'lg',
    body: `<form class="form-grid" id="f-vnd">
      <div class="field full"><label>Nama vendor <span class="req">*</span></label><input class="input" name="nama_vendor" value="${esc(v.nama_vendor)}" placeholder="mis. Berkah Jaya Tenda & Rigging"></div>
      <div class="field"><label>Nama PIC</label><input class="input" name="pic" value="${esc(v.pic)}"></div>
      <div class="field"><label>No. WhatsApp PIC</label><input class="input" name="kontak" value="${esc(v.kontak)}" inputmode="tel" placeholder="08xxxxxxxxxx"></div>
      <div class="field full"><label>Rekening pembayaran</label><input class="input" name="rekening" value="${esc(v.rekening)}" placeholder="mis. BSI 7144702611 a.n. Berkah Jaya"></div>
      <div class="field full"><label>Alamat</label><input class="input" name="alamat" value="${esc(v.alamat)}"></div>
      <div class="field full"><label>Catatan</label><textarea class="textarea" name="catatan">${esc(v.catatan)}</textarea></div>
      ${v.id_vendor ? `<label class="check full"><input type="checkbox" name="aktif" ${v.aktif ? 'checked' : ''}> Vendor aktif (tampil di pilihan pesanan)</label>` : ''}
    </form>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="vnd-save">${ic('check', 16)} Simpan Vendor</button>`
  });
  m.querySelector('#vnd-save').addEventListener('click', async (e) => {
    const form = m.querySelector('#f-vnd');
    const f = Object.fromEntries(new FormData(form));
    if (!f.nama_vendor.trim()) return toast('Nama vendor wajib diisi.', 'warn');
    f.id_vendor = v.id_vendor || '';
    if (v.id_vendor) f.aktif = form.aktif.checked; else delete f.aktif;
    await App.write('saveVendor', f, { btn: e.currentTarget });
  });
}
ACT['new-user'] = (el) => openUserForm({ role: 'vendor', id_vendor: el.dataset.vendor || '', aktif: true });
ACT['edit-user'] = (el) => openUserForm(App.maps.users[el.dataset.id]);
function openUserForm(u) {
  const edit = !!u.id_user;
  const m = Modal.open({
    title: edit ? 'Edit Akun' : 'Buat Akun Login', sub: edit ? '' : 'Bagikan username & kata sandi kepada vendor secara pribadi.', size: 'lg',
    body: `<form class="form-grid" id="f-usr" autocomplete="off">
      <div class="field"><label>Nama lengkap <span class="req">*</span></label><input class="input" name="nama" value="${esc(u.nama)}"></div>
      <div class="field"><label>Username <span class="req">*</span></label><input class="input" name="username" value="${esc(u.username)}" autocapitalize="none" placeholder="huruf kecil, tanpa spasi"></div>
      <div class="field"><label>Peran</label>${seg('u-role', [{ value: 'vendor', label: 'Vendor' }, { value: 'admin', label: 'Admin' }], u.role || 'vendor')}</div>
      <div class="field" id="u-vendor-f"><label>Vendor <span class="req">*</span></label><select class="select" name="id_vendor">${vendorOpts(u.id_vendor, 'Pilih vendor', false)}</select></div>
      ${edit ? '' : `<div class="field"><label>Kata sandi awal <span class="req">*</span></label><div class="input-group"><input class="input" name="password" id="u-pw" value="${Math.random().toString(36).slice(2, 10)}"><button type="button" class="btn btn-ghost btn-xs post" data-act="copy-pw">${ic('copy', 13)}</button></div><span class="hint">Minimal 6 karakter. Salin & bagikan ke vendor.</span></div>`}
      <div class="full stack" style="gap:10px">
        <label class="check"><input type="checkbox" name="harus_ganti" ${u.harus_ganti ? 'checked' : ''}> Minta ganti kata sandi saat login pertama</label>
        ${edit ? `<label class="check"><input type="checkbox" name="aktif" ${u.aktif ? 'checked' : ''}> Akun aktif (bisa login)</label>` : ''}
      </div>
    </form>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="usr-save">${ic('check', 16)} Simpan Akun</button>`
  });
  const toggleVendor = () => { m.querySelector('#u-vendor-f').style.display = segVal(m, 'u-role') === 'vendor' ? '' : 'none'; };
  m.querySelector('[data-seg="u-role"]').addEventListener('segchange', toggleVendor);
  toggleVendor();
  m.querySelector('#usr-save').addEventListener('click', async (e) => {
    const form = m.querySelector('#f-usr');
    const f = Object.fromEntries(new FormData(form));
    f.role = segVal(m, 'u-role');
    f.harus_ganti = form.harus_ganti.checked;
    if (edit) { f.aktif = form.aktif.checked; f.id_user = u.id_user; }
    if (!f.nama.trim() || !f.username.trim()) return toast('Nama dan username wajib diisi.', 'warn');
    if (f.role === 'vendor' && !f.id_vendor) return toast('Pilih vendor untuk akun ini.', 'warn');
    if (!edit && String(f.password).length < 6) return toast('Kata sandi minimal 6 karakter.', 'warn');
    const res = await App.write('saveUser', f, { btn: e.currentTarget, close: false });
    if (res.success) {
      Modal.closeAll();
      if (!edit) credentialDialog(f.username, f.password, f.id_vendor);
    }
  });
}
ACT['copy-pw'] = () => { const p = document.getElementById('u-pw'); if (p) copyText(p.value); };
let CRED = null;
function credentialDialog(username, password, idv) {
  CRED = { username, password, id_vendor: idv };
  const v = App.maps.vendor[idv] || {};
  const text = fillTpl(getTpl('akun'), varsAkun(CRED));
  Modal.open({
    title: 'Akun berhasil dibuat', size: 'sm', id: 'cred-modal', onClose: () => (CRED = null),
    body: `<div class="wa-box" id="cred-txt">${esc(text)}</div><p class="small muted">Kata sandi tidak dapat dilihat lagi setelah jendela ini ditutup.</p>`,
    foot: `${tplBtn('akun', '', 'Edit Format')}<button class="btn btn-mint" data-act="copy" data-target="cred-txt">${ic('copy', 15)} Salin</button>${v.kontak ? `<a class="btn wa-btn" id="cred-wa" href="${waLink(v.kontak, text)}" target="_blank" rel="noopener">${ic('chat', 15)} Kirim WA</a>` : ''}`
  });
}
function refreshCredential() {
  if (!CRED) return;
  const v = App.maps.vendor[CRED.id_vendor] || {};
  const text = fillTpl(getTpl('akun'), varsAkun(CRED));
  const box = document.getElementById('cred-txt'); if (box) box.textContent = text;
  const wa = document.getElementById('cred-wa'); if (wa) wa.href = waLink(v.kontak, text);
}

/* Editor format pesan WhatsApp */
ACT['wa-tpl'] = (el) => {
  const type = el.dataset.tpl, ref = el.dataset.ref;
  let vars;
  if (type === 'konsumsi') { const k = ref && D().konsumsi.find((x) => x.id_konsumsi === ref); vars = k ? varsKonsumsi(k) : sampleVars(type); }
  else if (type === 'tagih') vars = ref ? varsTagih(ref) : sampleVars(type);
  else vars = CRED ? varsAkun(CRED) : sampleVars(type);
  openTplEditor(type, vars);
};
function openTplEditor(type, vars) {
  const def = TPL_DEF[type];
  const m = Modal.open({
    title: 'Edit Format Pesan WhatsApp', sub: esc(def.label), size: 'lg',
    body: `<div class="callout info" style="margin-bottom:14px">${ic('info', 18)}<div>Tulis pesan sesuka Anda. Kata di dalam <b>{kurung kurawal}</b> otomatis diganti data asli. Klik tombol di bawah untuk menyisipkan. Format WhatsApp: <b>*tebal*</b>, <i>_miring_</i>.</div></div>
      <div class="lbl" style="margin-bottom:8px">Sisipkan data</div>
      <div class="row wrap" style="gap:6px;margin-bottom:12px">${Object.entries(def.vars).map(([k, d]) => `<button type="button" class="chip" data-ins="${k}" title="${esc(d)}" style="height:30px;padding:0 10px">{${k}}</button>`).join('')}</div>
      <div class="field"><label>Format pesan</label><textarea class="textarea mono" id="tpl-txt" style="min-height:200px;font-size:13px">${esc(getTpl(type))}</textarea><span class="hint" id="tpl-warn"></span></div>
      <div class="lbl" style="margin:14px 0 8px">Pratinjau (dengan contoh data)</div>
      <div class="wa-box" id="tpl-prev"></div>`,
    foot: `<button class="btn btn-ghost" id="tpl-reset" style="margin-right:auto">${ic('refresh', 15)} Kembalikan bawaan</button><button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="tpl-save">${ic('check', 16)} Simpan Format</button>`
  });
  const ta = m.querySelector('#tpl-txt');
  const upd = () => {
    m.querySelector('#tpl-prev').textContent = fillTpl(ta.value, vars);
    const unknown = [...new Set((ta.value.match(/\{(\w+)\}/g) || []).map((x) => x.slice(1, -1)).filter((k) => !(k in def.vars)))];
    m.querySelector('#tpl-warn').innerHTML = unknown.length ? `<span class="tx-bad">${ic('alert', 13)} Tidak dikenali: ${unknown.map((k) => '{' + esc(k) + '}').join(', ')} — akan tampil apa adanya.</span>` : `${ta.value.length}/3000 karakter`;
  };
  ta.addEventListener('input', upd);
  m.querySelectorAll('[data-ins]').forEach((b) => b.addEventListener('click', () => {
    const ins = '{' + b.dataset.ins + '}', st = ta.selectionStart, en = ta.selectionEnd;
    ta.value = ta.value.slice(0, st) + ins + ta.value.slice(en);
    ta.focus(); ta.setSelectionRange(st + ins.length, st + ins.length); upd();
  }));
  m.querySelector('#tpl-reset').addEventListener('click', () => { ta.value = def.def; upd(); toast('Format bawaan dimuat. Klik Simpan untuk menerapkan.', 'info', 2500); });
  m.querySelector('#tpl-save').addEventListener('click', async (e) => {
    const text = ta.value.trim();
    if (!text) return toast('Format pesan tidak boleh kosong.', 'warn');
    if (text.length > 3000) return toast('Format pesan maksimal 3000 karakter.', 'warn');
    const res = await App.write('saveSettings', { [def.key]: text }, { btn: e.currentTarget, close: false, toast: false });
    if (!res.success) return;
    if ((D().settings[def.key] || '').trim() !== text) return toast('Format belum tersimpan: backend masih versi lama. Tempel Kode.gs terbaru lalu Deploy → New version.', 'warn', 9000);
    Modal.close();
    refreshCredential();
    toast('Format pesan WhatsApp "' + def.label + '" tersimpan.', 'success');
  });
  upd();
}

ACT['reset-pw'] = (el) => {
  const u = App.maps.users[el.dataset.id];
  const pw = Math.random().toString(36).slice(2, 10);
  const m = Modal.open({
    title: 'Reset Kata Sandi', sub: esc(u.nama) + ' (@' + esc(u.username) + ')', size: 'sm',
    body: `<div class="field"><label>Kata sandi baru</label><input class="input" id="rp-pw" value="${pw}"></div>
      <label class="check" style="margin-top:12px"><input type="checkbox" id="rp-force" checked> Minta ganti saat login berikutnya</label>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="rp-save">${ic('lock', 15)} Reset</button>`
  });
  m.querySelector('#rp-save').addEventListener('click', async (e) => {
    const p = m.querySelector('#rp-pw').value;
    if (p.length < 6) return toast('Minimal 6 karakter.', 'warn');
    const res = await App.write('resetPassword', { id_user: u.id_user, password: p, harus_ganti: m.querySelector('#rp-force').checked }, { btn: e.currentTarget, close: false });
    if (res.success) { Modal.closeAll(); credentialDialog(u.username, p, u.id_vendor); }
  });
};

/* =====================================================================
 *  DOKUMEN & REKAP
 * ===================================================================== */
AdminViews.dokumen = {
  title: 'Dokumen & Rekap',
  render() {
    const d = D(), year = App.today.slice(0, 4);
    const years = [...new Set(d.acara.map((a) => a.tahun).concat([year]))].sort().reverse();
    let rows = d.berkas.slice();
    if (AdminState.dokJenis) rows = rows.filter((b) => b.jenis === AdminState.dokJenis);
    return `
    <div class="page-head"><div><span class="eyebrow">${ic('file', 13)} Arsip</span><h1>Dokumen & Rekap PDF</h1><p>PDF dibuat otomatis dan tersimpan di Google Drive (tidak dibagikan publik).</p></div>
      <a class="btn btn-soft" href="${esc(d.sys.folder_url)}" target="_blank" rel="noopener">${ic('external', 16)} Buka Folder Drive</a></div>
    <div class="grid-2 stagger">
      <div class="card" style="--i:0"><div class="card-head"><div><h3><span class="card-title-ic">${ic('file', 18)}</span>Per Acara</h3><p>Estimasi (untuk panitia) atau rekap tagihan lengkap.</p></div></div>
        <div class="field"><label>Acara</label><select class="select" id="dk-acara">${acaraOpts('')}</select></div>
        <div class="row wrap" style="margin-top:12px"><button class="btn btn-primary btn-sm" data-act="dk-estimasi">${ic('file', 15)} PDF Estimasi</button><button class="btn btn-soft btn-sm" data-act="dk-rekap-acara">${ic('printer', 15)} PDF Rekap Tagihan</button></div></div>
      <div class="card" style="--i:1"><div class="card-head"><div><h3><span class="card-title-ic amber">${ic('store', 18)}</span>Per Vendor</h3><p>Rekap tagihan, pembayaran, dan sisa per vendor.</p></div></div>
        <div class="form-grid"><div class="field"><label>Vendor</label><select class="select" id="dk-vendor">${vendorOpts('', 'Pilih vendor', false)}</select></div>
        <div class="field"><label>Tahun</label><select class="select" id="dk-vtahun">${selectOpts(years, '', 'Semua tahun')}</select></div></div>
        <label class="check small" style="margin-top:10px"><input type="checkbox" id="dk-belum"> Hanya yang belum lunas</label>
        <div class="row" style="margin-top:12px"><button class="btn btn-primary btn-sm" data-act="dk-rekap-vendor">${ic('printer', 15)} PDF Rekap Vendor</button></div></div>
      <div class="card" style="--i:2"><div class="card-head"><div><h3><span class="card-title-ic red">${ic('coins', 18)}</span>Setoran Panitia Tahunan</h3><p>Biaya riil, setoran, dan kekurangan seluruh acara dalam setahun.</p></div></div>
        <div class="field"><label>Tahun</label><select class="select" id="dk-stahun">${selectOpts(years, year)}</select></div>
        <div class="row" style="margin-top:12px"><button class="btn btn-primary btn-sm" data-act="dk-rekap-setoran">${ic('printer', 15)} PDF Rekap Setoran</button></div></div>
      <div class="card" style="--i:3"><div class="card-head"><div><h3><span class="card-title-ic">${ic('layers', 18)}</span>Database</h3><p>Data tersimpan di Google Sheets & Drive milik Admin.</p></div></div>
        <div class="stack" style="gap:10px"><a class="btn btn-soft btn-sm" href="${esc(d.sys.spreadsheet_url)}" target="_blank" rel="noopener">${ic('external', 14)} Buka Google Sheets</a>
        <a class="btn btn-soft btn-sm" href="${esc(d.sys.folder_url)}" target="_blank" rel="noopener">${ic('external', 14)} Buka Folder Google Drive</a></div></div>
    </div>
    <div class="card section">
      <div class="card-head"><div><h3><span class="card-title-ic">${ic('list', 18)}</span>Arsip Berkas</h3></div></div>
      ${DT.render('berkas', {
        rows, sort: 'tanggal', dir: 'desc', pageSize: 12,
        search: (r) => r.nama_file + ' ' + r.jenis + ' ' + (r.id_acara ? App.acara(r.id_acara).nama_acara : '') + ' ' + (r.id_vendor ? App.vName(r.id_vendor) : ''), placeholder: 'Cari berkas...',
        tools: `<select class="select sm" style="width:auto" data-dkf>${selectOpts(['Estimasi', 'Rekap', 'Bukti Transfer', 'Nota', 'Bukti Setoran', 'Foto Pemasangan'], AdminState.dokJenis, 'Semua jenis')}</select>`,
        empty: emptyState('Belum ada berkas', '', 'file'), cols: berkasCols()
      })}
    </div>`;
  },
  after() { const s = document.querySelector('[data-dkf]'); if (s) s.addEventListener('change', () => { AdminState.dokJenis = s.value; App.renderView(false); }); }
};
async function genPdf(el, payload, action = 'generateRekap') {
  const res = await App.write(action, payload, { btn: el, busyText: 'Membuat PDF...', close: false });
  if (res.success) showPdf(res);
}
ACT['dk-estimasi'] = (el) => { const id = document.getElementById('dk-acara').value; if (!id) return toast('Pilih acara.', 'warn'); genPdf(el, { id_acara: id }, 'generateEstimasi'); };
ACT['dk-rekap-acara'] = (el) => { const id = document.getElementById('dk-acara').value; if (!id) return toast('Pilih acara.', 'warn'); genPdf(el, { jenis: 'acara', id }); };
ACT['dk-rekap-vendor'] = (el) => { const id = document.getElementById('dk-vendor').value; if (!id) return toast('Pilih vendor.', 'warn'); genPdf(el, { jenis: 'vendor', id, tahun: document.getElementById('dk-vtahun').value, hanyaBelumLunas: document.getElementById('dk-belum').checked }); };
ACT['dk-rekap-setoran'] = (el) => genPdf(el, { jenis: 'setoran', tahun: document.getElementById('dk-stahun').value });

/* =====================================================================
 *  PENGATURAN
 * ===================================================================== */
AdminViews.pengaturan = {
  title: 'Pengaturan',
  render() {
    const st = D().settings, u = D().user;
    const f = (k, label, type = 'text', hint = '') => `<div class="field"><label>${label}</label><input class="input" ${type === 'number' ? 'type="number" min="0" step="0.5"' : ''} name="${k}" value="${esc(st[k])}">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
    return `
    <div class="page-head"><div><span class="eyebrow">${ic('settings', 13)} Sistem</span><h1>Pengaturan</h1><p>Atur ambang pengingat, aturan konsumsi pekerja, identitas kop PDF, dan keamanan akun.</p></div></div>
    <form id="f-set">
    <div class="grid-2 stagger">
      <div class="card" style="--i:0"><div class="card-head"><div><h3><span class="card-title-ic red">${ic('bell', 18)}</span>Pengingat & Sesi</h3></div></div>
        <div class="form-grid">${f('ambang_hari', 'Jatuh tempo (hari setelah acara selesai)', 'number', 'Tagihan/setoran yang belum lunas melewati jatuh tempo diberi penanda merah "Perlu ditagih".')}
        ${f('sesi_jam', 'Lama sesi login (jam)', 'number', 'Maksimal 6 jam. Sesi diperpanjang otomatis selama aktif.')}
        <div class="field full"><label>Tarif sewa hari ke-2 dst (per hari)</label><div class="input-group"><input class="input" type="number" min="0" max="100" step="1" name="tarif_hari_pct" value="${Math.round(num(st.tarif_hari_tambahan ?? 0.3) * 100)}" style="padding-right:40px"><span class="pre" style="left:auto;right:14px">%</span></div><span class="hint">Hari ke-1 = 100% harga. Contoh 30%: sewa 3 hari = 1 + 0,3 + 0,3 = ×1,6. Berlaku untuk pesanan yang disimpan setelah ini.</span></div>
        <div class="field full"><label>No. WhatsApp Admin (untuk tombol vendor)</label><input class="input" name="kontak_admin_wa" value="${esc(st.kontak_admin_wa)}" inputmode="tel" placeholder="08xxxxxxxxxx"></div></div></div>
      <div class="card" style="--i:1"><div class="card-head"><div><h3><span class="card-title-ic">${ic('utensils', 18)}</span>Aturan Rekomendasi Konsumsi</h3><p>Tingkat diambil dari yang lebih berat antara durasi dan kesulitan.</p></div></div>
        <div class="form-grid">${f('batas_jam_ringan', 'Ringan bila durasi < (jam)', 'number')}${f('batas_jam_berat', 'Berat bila durasi > (jam)', 'number')}
        <div class="field full"><label>Ringan</label><input class="input" name="konsumsi_ringan" value="${esc(st.konsumsi_ringan)}"></div>
        <div class="field full"><label>Sedang</label><input class="input" name="konsumsi_sedang" value="${esc(st.konsumsi_sedang)}"></div>
        <div class="field full"><label>Berat</label><input class="input" name="konsumsi_berat" value="${esc(st.konsumsi_berat)}"></div></div></div>
      <div class="card" style="--i:2"><div class="card-head"><div><h3><span class="card-title-ic amber">${ic('file', 18)}</span>Identitas Kop PDF</h3></div></div>
        <div class="form-grid">
        <div class="field full"><label>Nama instansi</label><input class="input" name="nama_instansi" value="${esc(st.nama_instansi)}"></div>
        ${f('nama_kampus', 'Nama kampus')}${f('alamat_instansi', 'Kota / alamat')}
        ${f('nama_admin', 'Nama penanda tangan')}${f('jabatan_admin', 'Jabatan')}</div></div>
      <div class="card" style="--i:3"><div class="card-head"><div><h3><span class="card-title-ic">${ic('lock', 18)}</span>Keamanan Akun Anda</h3><p>Masuk sebagai <b>@${esc(u.username)}</b></p></div></div>
        <div class="form-grid" style="grid-template-columns:1fr">
          <div class="field"><label>Kata sandi saat ini</label><input class="input" type="password" id="cp-old" autocomplete="current-password"></div>
          <div class="field"><label>Kata sandi baru</label><input class="input" type="password" id="cp-new" autocomplete="new-password" placeholder="min. 6 karakter"></div>
          <button type="button" class="btn btn-soft" data-act="change-pw">${ic('lock', 15)} Ganti Kata Sandi</button>
        </div></div>
    </div>
    <div class="card section"><div class="card-head"><div><h3><span class="card-title-ic">${ic('chat', 18)}</span>Format Pesan WhatsApp</h3><p>Ubah kalimat pesan yang dikirim ke panitia & vendor. Data seperti nama acara dan nominal terisi otomatis.</p></div></div>
      <div class="grid-3">${Object.entries(TPL_DEF).map(([k, t]) => `<div class="remind" style="gap:10px"><div class="row" style="gap:10px"><span class="li-ic mint">${ic(t.icon, 18)}</span><b style="font-family:var(--font-head)">${esc(t.label)}</b></div>
        <div class="wa-box" style="max-height:150px;overflow:hidden;font-size:11.5px">${esc(fillTpl(getTpl(k), sampleVars(k)))}</div>
        <div class="row between">${(D().settings[t.key] || t.def) === t.def ? '<span class="xs muted">Format bawaan</span>' : badge('Sudah diubah', 'b-ok')}${tplBtn(k, '', 'Edit Format', 'btn-soft btn-sm')}</div></div>`).join('')}</div></div>
    <div class="row section" style="justify-content:flex-end;gap:10px"><button type="button" class="btn btn-soft" data-act="load-log">${ic('activity', 16)} Log Aktivitas</button><button type="button" class="btn btn-primary" data-act="save-settings">${ic('check', 16)} Simpan Pengaturan</button></div>
    </form>
    <div class="card section"><div class="row between wrap"><div class="small muted">Backend v${esc(D().sys.version)} • Data: <a href="${esc(D().sys.spreadsheet_url)}" target="_blank" rel="noopener">Google Sheets</a> • <a href="${esc(D().sys.folder_url)}" target="_blank" rel="noopener">Google Drive</a></div>
      <button class="btn btn-ghost btn-sm tx-bad" data-act="logout">${ic('logout', 15)} Keluar</button></div></div>`;
  }
};
ACT['save-settings'] = (el) => {
  const data = Object.fromEntries(new FormData(document.getElementById('f-set')));
  ['ambang_hari', 'sesi_jam', 'batas_jam_ringan', 'batas_jam_berat'].forEach((k) => (data[k] = num(data[k])));
  if (data.tarif_hari_pct !== undefined) { data.tarif_hari_tambahan = num(data.tarif_hari_pct) / 100; delete data.tarif_hari_pct; }
  if (!(data.tarif_hari_tambahan >= 0 && data.tarif_hari_tambahan <= 1)) return toast('Tarif hari tambahan harus 0–100%.', 'warn');
  if (!(data.ambang_hari >= 1)) return toast('Ambang hari minimal 1.', 'warn');
  App.write('saveSettings', data, { btn: el });
};
ACT['change-pw'] = async (el) => {
  const o = document.getElementById('cp-old').value, n = document.getElementById('cp-new').value;
  if (n.length < 6) return toast('Kata sandi baru minimal 6 karakter.', 'warn');
  const res = await App.write('changePassword', { old: o, new: n }, { btn: el });
  if (res.success) { document.getElementById('cp-old').value = ''; document.getElementById('cp-new').value = ''; }
};
ACT['load-log'] = async (el) => {
  setBusy(el, true, 'Memuat...');
  const res = await API.call('getLog');
  setBusy(el, false);
  if (!res.success) return toast(res.message, 'error');
  Modal.open({
    title: 'Log Aktivitas', sub: '150 aktivitas terakhir', size: 'lg',
    body: `<div class="list">${res.log.map((l) => `<div class="li"><span class="li-ic ${/GAGAL|DITOLAK/.test(l.aksi) ? 'red' : /HAPUS/.test(l.aksi) ? 'amber' : 'mint'}">${ic(/GAGAL|DITOLAK/.test(l.aksi) ? 'alert' : 'activity', 16)}</span><div class="grow" style="min-width:0"><div class="bold small">${esc(l.aksi.replace(/_/g, ' '))}</div><div class="xs muted ellipsis">${esc(l.detail)}</div></div><div class="stack right" style="gap:0"><span class="xs">${esc(l.user)}</span><span class="xs muted">${esc(l.waktu)}</span></div></div>`).join('') || emptyState('Belum ada log', '', 'activity')}</div>`
  });
};


/* =====================================================================
 *  IMPORT / EKSPOR KATALOG (Excel .xlsx / CSV)
 * ===================================================================== */
const IMP_HEAD = ['Nama Barang *', 'Vendor *', 'Kategori', 'Satuan', 'Harga Vendor (Rp) *', 'Harga Estimasi (Rp)', 'Spesifikasi'];
const IMP_FIELDS = {
  nama_barang: ['nama barang', 'nama', 'barang', 'nama item', 'item'],
  vendor: ['vendor', 'nama vendor', 'rekanan', 'rekanan vendor', 'id vendor'],
  kategori: ['kategori', 'jenis', 'kategori barang'],
  satuan: ['satuan', 'unit satuan'],
  harga_vendor: ['harga vendor', 'harga riil', 'harga sewa', 'harga vendor riil', 'harga'],
  harga_estimasi: ['harga estimasi', 'estimasi', 'harga panitia', 'harga estimasi panitia'],
  spesifikasi: ['spesifikasi', 'keterangan', 'spek', 'ukuran', 'deskripsi']
};
const KAT_KEYWORD = [
  [/tenda|terop|tarub|tratak|dome/, 'Tenda & Terop'], [/panggung|stage/, 'Panggung'], [/rigging|truss|rangka/, 'Rigging & Truss'],
  [/sound|audio|lighting|lampu|speaker|mic|led|proyektor|layar/, 'Sound & Lighting'], [/kursi|meja|futura|chair/, 'Kursi & Meja'],
  [/karpet|permadani|ambal/, 'Karpet & Permadani'], [/sofa|dekor|bunga|backdrop/, 'Sofa & Dekorasi'], [/kipas|misty|fan|\bac\b|pendingin|cooler/, 'Pendingin & Kipas'],
  [/barikade|barrier|pagar|keamanan/, 'Barikade & Keamanan'], [/genset|listrik|kabel|panel/, 'Genset & Listrik']
];
const normTxt = (v) => String(v === undefined || v === null ? '' : v).toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[*:]/g, ' ').replace(/[^a-z0-9&²]+/g, ' ').replace(/\s+/g, ' ').trim();
const normName = (v) => String(v === undefined || v === null ? '' : v).toLowerCase().replace(/\s+/g, ' ').trim();

function impHeaderMap(row) {
  const map = {};
  (row || []).forEach((cell, i) => {
    const h = normTxt(cell);
    if (!h) return;
    for (const [f, syn] of Object.entries(IMP_FIELDS)) if (map[f] === undefined && syn.includes(h)) { map[f] = i; return; }
  });
  return map;
}
function impHarga(v) {
  if (typeof v === 'number') return isFinite(v) ? { v: Math.round(v) } : { err: 'bukan angka' };
  let t = String(v === undefined || v === null ? '' : v).trim();
  if (!t) return { empty: true };
  if (/^#|#ERROR/.test(t)) return { err: 'sel berisi error rumus (' + t.replace('#ERROR ', '') + ')' };
  t = t.replace(/rp\.?|idr|\s/gi, '');
  if (t.startsWith('-')) return { err: 'tidak boleh negatif' };
  if (/^\d+([.,]\d{1,2})$/.test(t)) return { v: Math.round(parseFloat(t.replace(',', '.'))) };
  t = t.replace(/[.,]/g, '');
  if (/^\d+$/.test(t)) return { v: parseInt(t, 10) };
  return { err: '"' + String(v).slice(0, 20) + '" bukan angka' };
}
function impKategori(v) {
  const t = String(v || '').trim();
  if (!t) return { k: 'Lainnya' };
  const exact = KATEGORI.find((k) => k.toLowerCase() === t.toLowerCase());
  if (exact) return { k: exact };
  const low = t.toLowerCase();
  const hit = KAT_KEYWORD.find(([re]) => re.test(low));
  if (hit) return { k: hit[1], note: 'kategori "' + t + '" → ' + hit[1] };
  return { k: 'Lainnya', note: 'kategori "' + t + '" tidak dikenal → Lainnya' };
}
function impVendor(v) {
  const t = normName(v);
  if (!t) return { err: 'kolom Vendor kosong' };
  const list = D().vendor;
  const byId = list.find((x) => x.id_vendor.toLowerCase() === t);
  if (byId) return { id: byId.id_vendor };
  const exact = list.find((x) => normName(x.nama_vendor) === t);
  if (exact) return { id: exact.id_vendor };
  const part = list.filter((x) => normName(x.nama_vendor).includes(t) || t.includes(normName(x.nama_vendor)));
  if (part.length === 1) return { id: part[0].id_vendor, note: 'vendor "' + String(v).trim() + '" dicocokkan ke ' + part[0].nama_vendor };
  return { baru: String(v).trim(), saran: part.map((x) => x.nama_vendor) };
}

const IM = { rows: [], file: '', sheet: '', update: true, buatVendor: false };
function impValidate() {
  const seen = {};
  const katalog = D().katalog;
  IM.rows.forEach((r) => {
    r.status = ''; r.notes = []; r.err = '';
    if (r.skip) { r.status = 'skip'; return; }
    if (!r.nama) r.err = 'Nama Barang kosong';
    const vd = impVendor(r.vendorRaw);
    r.id_vendor = vd.id || ''; r.vendor_baru = '';
    if (vd.note) r.notes.push(vd.note);
    if (!r.err && vd.err) r.err = vd.err;
    if (!r.err && vd.baru) {
      if (IM.buatVendor) { r.vendor_baru = vd.baru; r.notes.push('vendor baru "' + vd.baru + '" akan dibuat'); }
      else r.err = 'Vendor "' + vd.baru + '" belum terdaftar' + (vd.saran && vd.saran.length ? ' (mungkin: ' + vd.saran.join(' / ') + ')' : '') + '. Tambahkan di menu Vendor & Akun, perbaiki ejaannya, atau centang "Buat vendor baru otomatis".';
    }
    const hv = impHarga(r.hvRaw), he = impHarga(r.heRaw);
    if (!r.err && hv.empty) r.err = 'Harga Vendor kosong';
    if (!r.err && hv.err) r.err = 'Harga Vendor ' + hv.err;
    if (!r.err && he.err) r.err = 'Harga Estimasi ' + he.err;
    r.harga_vendor = hv.v || 0;
    r.harga_estimasi = he.empty ? r.harga_vendor : (he.v || 0);
    if (he.empty && !hv.empty) r.notes.push('estimasi = harga vendor');
    const kt = impKategori(r.katRaw); r.kategori = kt.k; if (kt.note) r.notes.push(kt.note);
    r.satuan = String(r.satRaw || '').trim() || 'unit';
    if (r.err) { r.status = 'error'; return; }
    const vkey = (r.id_vendor || 'NEW:' + normName(r.vendor_baru)) + '|' + normName(r.nama);
    if (seen[vkey]) { r.status = 'error'; r.err = 'Duplikat dengan baris ' + seen[vkey] + ' di berkas ini'; return; }
    seen[vkey] = r.baris;
    const ex = r.id_vendor && katalog.find((k) => k.id_vendor === r.id_vendor && normName(k.nama_barang) === normName(r.nama));
    if (ex) {
      r.status = IM.update ? 'update' : 'skip-ada';
      if (IM.update && (ex.harga_vendor !== r.harga_vendor || ex.harga_estimasi !== r.harga_estimasi)) r.notes.push('harga lama ' + rp(ex.harga_vendor) + ' → ' + rp(r.harga_vendor));
      if (IM.update && !ex.aktif) r.notes.push('barang nonaktif akan diaktifkan lagi');
    } else r.status = 'baru';
  });
}
function impRaw(v) { return v === '' || v === null || v === undefined ? '<span class="muted">—</span>' : typeof v === 'number' ? rp(v) : esc(String(v)); }
function impStatusBadge(r) {
  return { baru: badge('Baru', 'b-ok'), update: badge('Perbarui', 'b-info'), 'skip-ada': badge('Dilewati (sudah ada)', 'b-neu'), skip: badge('Contoh — dilewati', 'b-neu'), error: badge('Error', 'b-bad') }[r.status] || '';
}
function impRenderResult(m) {
  impValidate();
  const c = { baru: 0, update: 0, error: 0, skip: 0 };
  IM.rows.forEach((r) => { if (r.status === 'baru') c.baru++; else if (r.status === 'update') c.update++; else if (r.status === 'error') c.error++; else c.skip++; });
  const ok = c.baru + c.update;
  const list = IM.rows.slice().sort((a, b) => (a.status === 'error' ? 0 : 1) - (b.status === 'error' ? 0 : 1) || a.baris - b.baris);
  m.querySelector('#im-result').innerHTML = `
    <div class="row wrap between" style="margin:4px 0 12px;gap:10px">
      <div class="small"><b>${esc(IM.file)}</b> • sheet "${esc(IM.sheet)}" • ${IM.rows.length} baris data</div>
      <div class="row wrap" style="gap:6px">${badge(c.baru + ' baru', 'b-ok')}${badge(c.update + ' diperbarui', 'b-info')}${badge(c.skip + ' dilewati', 'b-neu')}${badge(c.error + ' error', c.error ? 'b-bad' : 'b-neu')}</div>
    </div>
    ${c.error ? `<div class="callout bad" style="margin-bottom:12px">${ic('alert', 18)}<div><b>${c.error} baris bermasalah</b> dan tidak akan diimpor. Perbaiki di Excel lalu unggah ulang, atau lanjutkan untuk mengimpor ${ok} baris yang valid saja.</div></div>`
      : ok ? `<div class="callout ok" style="margin-bottom:12px">${ic('checkCircle', 18)}<div>Semua baris valid. Siap mengimpor <b>${ok}</b> barang.</div></div>` : ''}
    <div class="dt"><div class="dt-wrap" style="max-height:340px;overflow:auto"><table><thead><tr><th>Baris</th><th>Nama Barang</th><th>Vendor</th><th>Kategori</th><th class="r">Harga Vendor</th><th class="r">Estimasi</th><th>Status</th></tr></thead><tbody>
    ${list.map((r) => `<tr><td data-label="Baris" class="small muted">${r.baris}</td><td class="td-main"><div class="t-main">${esc(r.nama || '—')}</div><div class="t-sub">${esc(r.satuan)}</div></td>
      <td data-label="Vendor" class="small">${esc(r.id_vendor ? App.vName(r.id_vendor) : r.vendor_baru || r.vendorRaw || '—')}</td><td data-label="Kategori" class="small">${esc(r.kategori || '')}</td>
      <td data-label="Harga Vendor" class="r tnum small">${r.status === 'error' ? impRaw(r.hvRaw) : rp(r.harga_vendor)}</td><td data-label="Estimasi" class="r tnum small">${r.status === 'error' ? impRaw(r.heRaw) : rp(r.harga_estimasi)}</td>
      <td data-label="Status">${impStatusBadge(r)}${r.err ? `<div class="xs tx-bad" style="margin-top:3px;max-width:320px">${esc(r.err)}</div>` : ''}${r.notes.length && r.status !== 'error' ? `<div class="xs muted" style="margin-top:3px;max-width:320px">${esc(r.notes.join(' • '))}</div>` : ''}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  const btn = m.querySelector('#im-go');
  btn.disabled = !ok;
  btn.innerHTML = ic('upload', 16) + (ok ? ` Impor ${ok} Barang` : ' Tidak ada yang bisa diimpor');
}

ACT['kat-template'] = () => katalogWorkbook(false);
ACT['kat-export'] = () => katalogWorkbook(true);
function katalogWorkbook(withData) {
  const vendors = D().vendor.filter((v) => v.aktif);
  const vn = vendors[0] ? vendors[0].nama_vendor : 'Nama Vendor Anda';
  const data = withData
    ? D().katalog.filter((k) => k.aktif).sort((a, b) => App.vName(a.id_vendor).localeCompare(App.vName(b.id_vendor)) || a.nama_barang.localeCompare(b.nama_barang))
      .map((k) => [k.nama_barang, App.vName(k.id_vendor), k.kategori, k.satuan, k.harga_vendor, k.harga_estimasi, k.spesifikasi || ''])
    : [['CONTOH - Tenda VIP Semi-Rigging 10x20 m', vn, 'Tenda & Terop', 'set', 10000000, 11000000, 'Atap putih, tiang besi'],
       ['CONTOH - Kursi Futura + Sarung', vn, 'Kursi & Meja', 'buah', 10000, 12000, 'Sarung hijau']];
  const n = 1000;
  const validations = [
    { type: 'decimal', operator: 'greaterThanOrEqual', formula: '0', ref: `E2:F${n}`, title: 'Harga tidak valid', error: 'Isi angka saja tanpa Rp/titik, minimal 0. Contoh: 1500000', prompt: 'Angka saja, contoh 1500000', promptTitle: 'Harga (Rp)' },
    { type: 'list', formula: `'Daftar Kategori'!$A$2:$A$${KATEGORI.length + 1}`, ref: `C2:C${n}`, style: 'warning', title: 'Kategori tidak dikenal', error: 'Pilih dari daftar. Jika tetap dilanjutkan, akan dicocokkan otomatis atau menjadi "Lainnya".' },
    { type: 'list', formula: `'Daftar Satuan'!$A$2:$A$${SATUAN.length + 1}`, ref: `D2:D${n}`, style: 'information', title: 'Satuan', error: 'Disarankan memilih dari daftar.' }
  ];
  if (vendors.length) validations.push({ type: 'list', formula: `'Daftar Vendor'!$A$2:$A$${vendors.length + 1}`, ref: `B2:B${n}`, style: 'warning', title: 'Vendor belum terdaftar', error: 'Nama vendor harus sama persis dengan daftar. Lanjutkan hanya jika Anda akan mencentang "Buat vendor baru otomatis" saat impor.', prompt: 'Pilih vendor dari daftar', promptTitle: 'Vendor' });
  const guide = [
    ['PANDUAN IMPORT KATALOG BARANG — Event Management Gontor 3'], [''],
    ['1. Isi data di sheet "Katalog" mulai baris ke-2. JANGAN mengubah, menghapus, atau memindah baris judul (baris 1).'],
    ['2. Kolom bertanda * WAJIB diisi: Nama Barang, Vendor, Harga Vendor.'],
    ['3. VENDOR: pilih dari dropdown (daftar ada di sheet "Daftar Vendor"). Ejaan harus sama persis dengan yang terdaftar di aplikasi.'],
    ['   Vendor baru? Tambahkan dulu di aplikasi (menu Vendor & Akun), ATAU centang "Buat vendor baru otomatis" saat impor.'],
    ['4. HARGA: tulis angka saja, tanpa "Rp", titik, atau koma. Contoh BENAR: 1500000. Contoh SALAH: Rp 1.500.000,- atau 1,5 jt'],
    ['5. Harga Estimasi (harga untuk panitia) boleh dikosongkan → otomatis disamakan dengan Harga Vendor.'],
    ['6. KATEGORI: pilih dari dropdown. Kosong atau tidak dikenal → otomatis "Lainnya".'],
    ['7. SATUAN: unit, set, paket, buah, lembar, roll, meter, m², titik, hari. Kosong → "unit".'],
    ['8. Baris yang Nama Barang-nya diawali "CONTOH" otomatis DILEWATI. Boleh dihapus.'],
    ['9. Barang dengan Nama + Vendor yang sudah ada di aplikasi akan DIPERBARUI harganya (tidak dobel).'],
    ['10. Jangan menggabungkan sel (merge cells), jangan ada baris kosong di tengah, jangan pakai rumus yang error (#N/A, #REF!).'],
    ['11. Maksimal 1000 baris per impor. Simpan sebagai .xlsx (Excel). Dari Google Sheets: File → Download → Microsoft Excel (.xlsx).'],
    ['12. Saat diunggah, aplikasi menampilkan PRATINJAU lebih dulu dan menandai baris bermasalah beserta alasannya. Tidak ada yang tersimpan sebelum Anda menekan tombol Impor.'],
    [''], ['Tips: gunakan tombol "Ekspor Excel" di aplikasi untuk mengunduh katalog saat ini, ubah harganya, lalu impor kembali.']
  ];
  XLSXLite.write([
    { name: 'Katalog', header: true, rows: [IMP_HEAD, ...data], widths: [44, 34, 22, 10, 20, 20, 34], money: [4, 5], validations },
    { name: 'Petunjuk', rows: guide, widths: [130] },
    { name: 'Daftar Vendor', header: true, rows: [['Nama Vendor (salin persis ke kolom Vendor)', 'ID Vendor', 'PIC'], ...vendors.map((v) => [v.nama_vendor, v.id_vendor, v.pic || ''])], widths: [44, 26, 24] },
    { name: 'Daftar Kategori', header: true, rows: [['Kategori'], ...KATEGORI.map((k) => [k])], widths: [28] },
    { name: 'Daftar Satuan', header: true, rows: [['Satuan'], ...SATUAN.map((k) => [k])], widths: [14] }
  ], withData ? `Katalog_Barang_Gontor3_${App.today}.xlsx` : 'Template_Import_Katalog_Gontor3.xlsx');
  toast(withData ? 'Katalog diekspor ke Excel.' : 'Template Excel diunduh. Baca sheet "Petunjuk" sebelum mengisi.', 'success');
}

ACT['kat-import'] = () => {
  if (!D().vendor.length) toast('Belum ada vendor. Tambahkan vendor dulu, atau centang "Buat vendor baru otomatis" saat impor.', 'info', 6000);
  IM.rows = []; IM.file = ''; IM.sheet = '';
  const m = Modal.open({
    title: 'Import Katalog dari Excel', sub: 'Tambah atau perbarui banyak barang sekaligus.', size: 'xl',
    body: `
      <div class="grid-3" style="margin-bottom:16px">
        <div class="remind"><div class="row" style="gap:10px"><span class="li-ic mint">1</span><b style="font-family:var(--font-head)">Unduh template</b></div>
          <div class="small muted">Sudah berisi kolom yang benar, dropdown vendor & kategori, serta sheet <b>Petunjuk</b>.</div>
          <div class="row wrap"><button class="btn btn-primary btn-sm" type="button" data-act="kat-template">${ic('download', 15)} Template Excel</button><button class="btn btn-soft btn-sm" type="button" data-act="kat-export">${ic('download', 15)} Katalog saat ini</button></div></div>
        <div class="remind"><div class="row" style="gap:10px"><span class="li-ic mint">2</span><b style="font-family:var(--font-head)">Isi sesuai panduan</b></div>
          <div class="small muted">Kolom wajib: <b>Nama Barang</b>, <b>Vendor</b>, <b>Harga Vendor</b>. Harga ditulis angka saja, misalnya <span class="mono">1500000</span>.</div>
          <button class="btn btn-ghost btn-sm" type="button" id="im-guide-btn">${ic('info', 15)} Lihat panduan lengkap</button></div>
        <div class="remind"><div class="row" style="gap:10px"><span class="li-ic mint">3</span><b style="font-family:var(--font-head)">Unggah & periksa</b></div>
          <label class="upload" style="padding:10px"><span class="u-ic">${ic('upload', 20)}</span><span class="grow" style="min-width:0"><span class="u-t ellipsis" id="im-file-t" style="display:block">Pilih berkas .xlsx / .csv</span><span class="u-s">Pratinjau muncul sebelum disimpan</span></span><input type="file" id="im-file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"></label></div>
      </div>
      <div id="im-guide" hidden class="callout info" style="margin-bottom:16px;display:block"><div>
        <b>Panduan pengisian agar tidak error</b>
        <ol style="margin:8px 0 0;padding-left:18px;line-height:1.7">
          <li>Gunakan template dari tombol <b>Template Excel</b>. Jangan ubah baris judul (baris 1).</li>
          <li><b>Vendor</b> harus sama persis dengan yang terdaftar (pilih dari dropdown). Vendor baru: tambahkan dulu di menu Vendor & Akun, atau centang <b>Buat vendor baru otomatis</b> di bawah.</li>
          <li><b>Harga</b> berupa angka saja tanpa "Rp", titik, atau koma. Contoh benar: <span class="mono">1500000</span>.</li>
          <li><b>Harga Estimasi</b> boleh kosong (otomatis sama dengan harga vendor). <b>Kategori</b> & <b>Satuan</b> boleh kosong (menjadi "Lainnya" & "unit").</li>
          <li>Baris berawalan <b>CONTOH</b> otomatis dilewati. Barang dengan nama + vendor yang sama akan <b>diperbarui</b>, bukan dobel.</li>
          <li>Jangan menggabungkan sel (merge) dan jangan pakai rumus yang error. Maksimal 1000 baris. Simpan sebagai <b>.xlsx</b>; dari Google Sheets: File → Download → Microsoft Excel.</li>
        </ol></div></div>
      <div class="row wrap" style="gap:18px;margin-bottom:6px">
        <label class="check small"><input type="checkbox" id="im-update" checked> Perbarui harga barang yang sudah ada (nama & vendor sama)</label>
        <label class="check small"><input type="checkbox" id="im-newv"> Buat vendor baru otomatis bila belum terdaftar</label>
      </div>
      <div id="im-result">${emptyState('Belum ada berkas', 'Unggah berkas Excel untuk melihat pratinjau.', 'file')}</div>`,
    foot: `<span class="note">${ic('shield', 14)} Data hanya disimpan setelah Anda menekan Impor.</span><button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="im-go" disabled>${ic('upload', 16)} Impor</button>`
  });
  IM.update = true; IM.buatVendor = false;
  m.querySelector('#im-guide').hidden = true;
  m.querySelector('#im-guide-btn').addEventListener('click', () => { const g = m.querySelector('#im-guide'); g.hidden = !g.hidden; });
  m.querySelector('#im-update').addEventListener('change', (e) => { IM.update = e.target.checked; if (IM.rows.length) impRenderResult(m); });
  m.querySelector('#im-newv').addEventListener('change', (e) => { IM.buatVendor = e.target.checked; if (IM.rows.length) impRenderResult(m); });
  m.querySelector('#im-file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    m.querySelector('#im-file-t').textContent = f.name;
    m.querySelector('#im-result').innerHTML = `<div class="sk sk-row"></div><div class="sk sk-row"></div>`;
    try {
      const { sheet, rows } = await XLSXLite.readFile(f, /katalog/i);
      let h = -1, map = null;
      for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const mp = impHeaderMap(rows[i]);
        if (mp.nama_barang !== undefined && mp.vendor !== undefined && mp.harga_vendor !== undefined) { h = i; map = mp; break; }
      }
      if (h < 0) throw new Error('Baris judul kolom tidak ditemukan. Pastikan ada kolom "Nama Barang", "Vendor", dan "Harga Vendor" — sebaiknya gunakan Template Excel.');
      const get = (r, k) => (map[k] !== undefined ? r[map[k]] : '');
      const data = [];
      rows.slice(h + 1).forEach((r, i) => {
        if (!r || r.every((c) => String(c === undefined || c === null ? '' : c).trim() === '')) return;
        const nama = String(get(r, 'nama_barang') ?? '').trim();
        data.push({ baris: h + 2 + i, nama, skip: /^contoh\b/i.test(nama), vendorRaw: get(r, 'vendor'), katRaw: get(r, 'kategori'), satRaw: get(r, 'satuan'), hvRaw: get(r, 'harga_vendor'), heRaw: get(r, 'harga_estimasi'), spes: String(get(r, 'spesifikasi') ?? '').trim() });
      });
      if (!data.length) throw new Error('Tidak ada baris data di bawah judul kolom.');
      if (data.length > 1000) throw new Error('Berkas berisi ' + data.length + ' baris. Maksimal 1000 baris per impor — bagi menjadi beberapa berkas.');
      Object.assign(IM, { rows: data, file: f.name, sheet });
      impRenderResult(m);
    } catch (err) {
      IM.rows = [];
      m.querySelector('#im-result').innerHTML = `<div class="callout bad">${ic('alert', 18)}<div><b>Berkas tidak dapat dibaca.</b><br>${esc(err.message)}</div></div>`;
      m.querySelector('#im-go').disabled = true;
    }
    e.target.value = '';
  });
  m.querySelector('#im-go').addEventListener('click', async (e) => {
    impValidate();
    const items = IM.rows.filter((r) => r.status === 'baru' || r.status === 'update').map((r) => ({
      baris: r.baris, id_vendor: r.id_vendor, vendor_baru: r.vendor_baru, nama_barang: r.nama, kategori: r.kategori, satuan: r.satuan,
      harga_vendor: r.harga_vendor, harga_estimasi: r.harga_estimasi, spesifikasi: r.spes
    }));
    if (!items.length) return;
    const nErr = IM.rows.filter((r) => r.status === 'error').length;
    if (nErr && !await confirmDialog({ title: 'Lewati baris error?', message: `${nErr} baris bermasalah akan dilewati. Lanjut mengimpor ${items.length} baris yang valid?`, okText: 'Lanjutkan Impor' })) return;
    const res = await App.write('importBarang', { items, update: IM.update, buatVendor: IM.buatVendor }, { btn: e.currentTarget, busyText: 'Mengimpor ' + items.length + ' baris...', toast: false });
    if (res.success) toast(res.message, 'success', 6000);
  });
};
