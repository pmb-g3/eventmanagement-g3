/* =====================================================================
 *  INTERNAL.JS — Portal VENDOR INTERNAL (unit pondok) — v1.8
 *  Mengelola barang sendiri, acara, tagihan ke panitia, pembayaran & nota ber-logo.
 *  Panitia membayar LANGSUNG ke vendor internal (terpisah dari setoran ke Admin).
 * ===================================================================== */

const IS = { filter: 'aktif', q: '', logoUrl: '', logoFor: '' };
const IV = () => App.data.vendor[0] || {};
const ivOf = (ida) => (App.data.fin.internal || []).find((x) => x.id_acara === ida) || { tagihan: 0, dibayar: 0, sisa: 0, status: '-', jumlah_item: 0, terpasang: 0 };

const TPL_I = {
  tagih: {
    key: 'tpl_tagih', label: 'Tagihan ke Panitia', icon: 'coins',
    def: "Assalamu'alaikum warahmatullah, Ustadz {panitia}.\nKami dari *{vendor}* menyampaikan tagihan sewa perlengkapan acara *{acara}* ({tanggal_acara}):\n{daftar_barang}\n• Total: {total}\n• Sudah dibayar: {sudah_bayar}\n• Sisa tagihan: *{sisa}*\nPembayaran dapat melalui {rekening}. Jazakumullah khairan.\n— {pic}",
    vars: { panitia: 'Nama panitia', acara: 'Nama acara', tanggal_acara: 'Tanggal acara', vendor: 'Nama unit/vendor', pic: 'Nama PIC', rekening: 'Rekening', daftar_barang: 'Daftar barang', total: 'Total tagihan', sudah_bayar: 'Sudah dibayar', sisa: 'Sisa tagihan' }
  },
  terima: {
    key: 'tpl_terima', label: 'Terima Kasih Pembayaran', icon: 'checkCircle',
    def: "Assalamu'alaikum Ustadz {panitia}.\nAlhamdulillah, pembayaran *{nominal}* untuk acara *{acara}* telah kami terima pada {tanggal_bayar}.\n• Total tagihan: {total}\n• Total dibayar: {sudah_bayar}\n• {status}\nNota pembayaran kami kirimkan terpisah. Jazakumullah khairan.\n— {vendor}",
    vars: { panitia: 'Nama panitia', acara: 'Nama acara', vendor: 'Nama unit/vendor', pic: 'Nama PIC', nominal: 'Nominal dibayar', tanggal_bayar: 'Tanggal bayar', total: 'Total tagihan', sudah_bayar: 'Total dibayar', sisa: 'Sisa tagihan', status: 'LUNAS / Sisa Rp …' }
  }
};
const iTpl = (t) => IV()[TPL_I[t].key] || TPL_I[t].def;
function iVars(ida, idb) {
  const a = App.acara(ida), v = IV(), f = ivOf(ida);
  const items = App.data.pesanan.filter((p) => p.id_acara === ida);
  const b = idb ? App.data.bayar_internal.find((x) => x.id_bayar === idb) : null;
  return {
    panitia: a.nama_panitia || 'Panitia', acara: a.nama_acara, tanggal_acara: tglRange(a.tanggal_mulai, a.tanggal_selesai),
    vendor: v.nama_vendor || '', pic: v.pic || v.nama_vendor || '', rekening: v.rekening || 'tunai / sesuai kesepakatan',
    daftar_barang: items.map((x) => '• ' + x.nama_barang + (x.spek ? ' (' + x.spek + ')' : '') + ' — ' + fmtQty(x.jumlah) + ' ' + x.satuan + ' = ' + rp(subRiil(x))).join('\n') || '-',
    total: rp(f.tagihan), sudah_bayar: rp(f.dibayar), sisa: rp(Math.max(0, f.sisa)),
    nominal: b ? rp(b.nominal) : '-', tanggal_bayar: b ? tglPanjang(b.tanggal_bayar) : '-',
    status: f.sisa > 0.5 ? 'Sisa tagihan: ' + rp(f.sisa) : 'Status: LUNAS ✓'
  };
}

/** Daftar acara milik vendor internal (punya barang / dibuat sendiri / ada pembayaran). */
function iList() {
  const d = App.data, today = App.today, vid = IV().id_vendor;
  return d.acara.filter((a) => d.pesanan.some((p) => p.id_acara === a.id_acara) || a.pemilik === vid || d.bayar_internal.some((b) => b.id_acara === a.id_acara))
    .map((a) => {
      const f = ivOf(a.id_acara);
      const items = d.pesanan.filter((p) => p.id_acara === a.id_acara);
      const aktif = a.tanggal_selesai >= today || f.sisa > 0.5;
      const rank = a.status_acara === 'Batal' || a.nonaktif ? 3 : f.sisa > 0.5 ? (a.tanggal_mulai <= today ? 0 : 1) : a.tanggal_selesai >= today ? 1 : 2;
      return { a, f, items, aktif, rank };
    })
    .sort((x, y) => x.rank - y.rank || (x.rank === 1 ? x.a.tanggal_mulai.localeCompare(y.a.tanggal_mulai) : y.a.tanggal_mulai.localeCompare(x.a.tanggal_mulai)));
}
function iStatusBadge(f) {
  if (!(f.tagihan > 0)) return f.dibayar > 0 ? badge('Uang muka', 'b-info') : badge('Belum ada barang', 'b-neu');
  return f.sisa > 0.5 ? (f.dibayar > 0 ? badge('Cicil • sisa ' + rpShort(f.sisa), 'b-warn') : badge('Belum bayar', 'b-bad')) : badge('LUNAS', 'b-ok');
}

const InternalViews = {
  /* ---------- Beranda ---------- */
  beranda: {
    title: 'Beranda',
    render() {
      const d = App.data, v = IV(), t = d.fin.total, today = App.today;
      const tagih = iList().filter((e) => e.f.sisa > 0.5);
      const jad = d.pesanan.filter((p) => isYMD(p.tanggal_pasang) && p.tanggal_pasang >= today && p.tanggal_pasang <= addDays(today, 7) && p.status_pasang === 'Belum')
        .sort((a, b) => a.tanggal_pasang.localeCompare(b.tanggal_pasang));
      const pct = t.tagihan ? Math.min(100, Math.round((t.dibayar / t.tagihan) * 100)) : 0;
      return `
      <div class="v-hero">
        <span class="hero-pill">Vendor Internal Pondok</span>
        <h2>${esc(v.nama_vendor || 'Vendor Internal')}</h2>
        <div class="small" style="color:rgba(255,255,255,.8)">${ic('user', 14)} ${esc(d.user.nama)}${v.pic ? ' • PIC ' + esc(v.pic) : ''}</div>
        <div class="note">${ic('info', 15)}<span>Kelola barang sewa, tagih panitia, catat pembayaran, dan kirim nota ber-logo. Panitia membayar langsung ke ${esc(v.nama_vendor || 'unit Anda')}.</span></div>
      </div>
      <div class="mini-kpis stagger section" style="margin-top:18px">
        <div class="mini-kpi" style="--i:0"><div class="l">Total Tagihan ke Panitia</div><div class="v">${countEl(t.tagihan)}</div><div class="s">${iList().length} acara</div></div>
        <div class="mini-kpi" style="--i:1"><div class="l">Sudah Diterima</div><div class="v tx-ok">${countEl(t.dibayar)}</div><div class="progress" style="margin-top:6px"><span style="width:${pct}%"></span></div></div>
        <div class="mini-kpi" style="--i:2"><div class="l tx-bad">Belum Dibayar</div><div class="v tx-bad">${countEl(t.sisa)}</div><div class="s">${t.n_belum} acara perlu ditagih</div></div>
        <div class="mini-kpi" style="--i:3"><div class="l">Barang Aktif</div><div class="v">${d.katalog.filter((k) => k.aktif).length}</div><div class="s">di katalog Anda</div></div>
      </div>
      <div class="row wrap section" style="gap:8px;margin-top:16px">
        <button class="btn btn-primary" data-act="i-acara-new">${ic('plus', 16)} Buat Acara</button>
        <button class="btn btn-soft" data-act="i-pesanan" data-id="">${ic('box', 16)} Tambah Barang ke Acara</button>
        <button class="btn btn-soft" data-act="i-bayar-new">${ic('wallet', 16)} Catat Pembayaran</button>
      </div>
      <div class="grid-2 section" style="margin-top:18px">
        <div class="card"><div class="card-head"><div><h3><span class="card-title-ic red">${ic('coins', 18)}</span>Perlu Ditagih</h3><p>Acara yang belum lunas.</p></div></div>
          ${tagih.length ? `<div class="list">${tagih.slice(0, 8).map((e) => `<div class="li" style="flex-wrap:wrap"><div class="grow" style="min-width:160px"><a class="bold small" href="#/acara/${encodeURIComponent(e.a.id_acara)}">${esc(e.a.nama_acara)}</a><div class="xs muted">${esc(e.a.nama_panitia || '-')} • sisa <b class="tx-bad">${rp(e.f.sisa)}</b></div></div>
            <div class="row" style="gap:6px">${iWaBtn(e.a, 'tagih', '', 'Tagih')}<button class="btn btn-soft btn-xs" data-act="i-bayar-new" data-acara="${esc(e.a.id_acara)}">${ic('plus', 13)} Bayar</button></div></div>`).join('')}</div>`
            : emptyState('Alhamdulillah, semua lunas', 'Tidak ada tagihan tertunda.', 'checkCircle')}</div>
        <div class="card"><div class="card-head"><div><h3><span class="card-title-ic amber">${ic('truck', 18)}</span>Jadwal Pasang 7 Hari</h3><p>Barang yang belum terpasang.</p></div></div>
          ${jad.length ? `<div class="list">${jad.slice(0, 8).map((p) => `<div class="li"><span class="li-ic mint">${ic('box', 16)}</span><div class="grow" style="min-width:0"><div class="small bold ellipsis">${esc(p.nama_barang)}</div><div class="xs muted">${esc(App.acara(p.id_acara).nama_acara)} • ${tglPanjang(p.tanggal_pasang)}</div></div></div>`).join('')}</div>`
            : emptyState('Tidak ada jadwal pasang', '7 hari ke depan kosong.', 'calendar')}</div>
      </div>`;
    }
  },

  /* ---------- Acara & tagihan ---------- */
  acara: {
    title: (id) => id ? 'Detail Acara' : 'Acara & Tagihan',
    render(id) {
      if (id) return InternalViews.acaraDetail(id);
      const list = iList(), f = IS.filter, q = IS.q.toLowerCase();
      let rows = list;
      if (f === 'aktif') rows = rows.filter((e) => e.aktif);
      if (f === 'belum') rows = rows.filter((e) => e.f.sisa > 0.5);
      if (f === 'lunas') rows = rows.filter((e) => e.f.tagihan > 0 && e.f.sisa <= 0.5);
      if (q) rows = rows.filter((e) => (e.a.nama_acara + ' ' + e.a.lokasi + ' ' + e.a.nama_panitia + ' ' + e.items.map((p) => p.nama_barang).join(' ')).toLowerCase().includes(q));
      const cnt = { aktif: list.filter((e) => e.aktif).length, belum: list.filter((e) => e.f.sisa > 0.5).length, lunas: list.filter((e) => e.f.tagihan > 0 && e.f.sisa <= 0.5).length, semua: list.length };
      return `
      <div class="page-head"><div><span class="eyebrow">${ic('calendar', 13)} Vendor Internal</span><h1>Acara & Tagihan</h1><p>Acara yang memakai barang Anda. Acara buatan Admin juga bisa Anda tambahkan barangnya.</p></div>
        <div class="row wrap"><button class="btn btn-soft" data-act="i-pesanan" data-id="">${ic('box', 16)} Tambah Barang ke Acara</button><button class="btn btn-primary" data-act="i-acara-new">${ic('plus', 16)} Buat Acara</button></div></div>
      <div class="dt-tools">
        <div class="search">${ic('search', 16)}<input type="search" id="iq" placeholder="Cari acara / panitia / barang..." value="${esc(IS.q)}"></div>
        <div class="tabs">${[['aktif', 'Berjalan'], ['belum', 'Belum Lunas'], ['lunas', 'Lunas'], ['semua', 'Semua']].map(([k, l]) => `<button class="chip ${f === k ? 'active' : ''}" data-act="i-filter" data-f="${k}">${l} <span class="cnt">${cnt[k]}</span></button>`).join('')}</div>
      </div>
      <div class="ev-list stagger">${rows.length ? rows.map((e, i) => InternalViews.card(e, i)).join('') : `<div class="card">${emptyState('Belum ada acara', 'Buat acara atau tambahkan barang ke acara yang sudah ada.', 'calendar')}</div>`}</div>`;
    },
    after(id) {
      if (id) return;
      const q = document.getElementById('iq');
      if (q) { let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { IS.q = q.value; App.renderView(false); const n = document.getElementById('iq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); }); }
    }
  },
  card(e, i) {
    const { a, f, items } = e;
    const dt = parseYMD(a.tanggal_mulai), past = a.tanggal_selesai < App.today;
    const pct = f.jumlah_item ? Math.round((f.terpasang / f.jumlah_item) * 100) : 0;
    const st = !(f.tagihan > 0) ? 'none' : f.sisa <= 0.5 ? 'lunas' : f.dibayar > 0 ? 'cicil' : 'belum';
    return `<div class="ev-card st-${st} ${a.nonaktif ? 'off' : ''}" style="--i:${Math.min(i, 10)}" data-act="open-acara" data-id="${esc(a.id_acara)}">
      <div class="date-blk ${past ? 'past' : ''}"><div class="m">${BLN[dt.getMonth()]}</div><div class="d">${dt.getDate()}</div></div>
      <div class="ev-body">
        <div class="ev-title">${esc(a.nama_acara)} ${badge(a.status_acara)} ${a.pemilik === IV().id_vendor ? badge('Buatan Anda', 'b-info no-dot') : ''}</div>
        <div class="ev-meta"><span>${ic('calendar', 14)} ${tglRange(a.tanggal_mulai, a.tanggal_selesai)}</span><span>${ic('user', 14)} ${esc(a.nama_panitia || '-')}</span>${a.lokasi ? `<span>${ic('pin', 14)} ${esc(a.lokasi)}</span>` : ''}</div>
        <div class="ev-badges">${iStatusBadge(f)}${items.length ? badge(f.terpasang + '/' + f.jumlah_item + ' terpasang', pct === 100 ? 'b-ok' : 'b-info') : ''}</div>
      </div>
      <div class="ev-side">
        <div><div class="l">Tagihan</div><div class="v">${rp(f.tagihan)}</div></div>
        <div class="small muted">Dibayar ${rp(f.dibayar)}</div>
        ${items.length ? `<div style="width:150px"><div class="progress"><span style="width:${pct}%"></span></div></div>` : ''}
      </div>
    </div>`;
  },
  acaraDetail(id) {
    const d = App.data, a = App.maps.acara[id], vid = IV().id_vendor;
    if (!a) return `<button class="back-link" data-act="go" data-r="acara">${ic('chevL', 16)} Acara</button><div class="card">${emptyState('Acara tidak ditemukan', '', 'alert')}</div>`;
    const f = ivOf(id), mine = a.pemilik === vid;
    const items = d.pesanan.filter((p) => p.id_acara === id);
    const pays = d.bayar_internal.filter((b) => b.id_acara === id);
    const fotoN = FotoBarang.list({ id_acara: id }).length;
    return `
    <button class="back-link" data-act="go" data-r="acara">${ic('chevL', 16)} Acara & Tagihan</button>
    <div class="card">
      <div class="card-head" style="margin-bottom:16px"><div style="min-width:0;flex:1">
        <div class="row wrap" style="gap:10px"><h1 style="font-size:24px">${esc(a.nama_acara)}</h1>${iStatusBadge(f)}${mine ? badge('Buatan Anda', 'b-info no-dot') : badge('Acara dari Admin', 'b-neu no-dot')}</div>
        <p>${ic('calendar', 14)} ${tglRange(a.tanggal_mulai, a.tanggal_selesai)} • ${badge(a.status_acara)}</p></div></div>
      <div class="info-grid">
        <div class="info-item"><div class="l">${ic('pin', 13)} Lokasi</div><div class="v">${esc(a.lokasi || '-')}</div></div>
        <div class="info-item"><div class="l">${ic('user', 13)} Panitia (PJ)</div><div class="v">${esc(a.nama_panitia || '-')}</div></div>
        <div class="info-item"><div class="l">${ic('phone', 13)} Kontak Panitia</div><div class="v">${esc(a.kontak_panitia || '-')}</div></div>
        <div class="info-item"><div class="l">${ic('info', 13)} Catatan</div><div class="v small">${esc(a.catatan || '-')}</div></div>
      </div>
      <div class="divider"></div>
      <div class="row wrap" style="gap:8px">
        <button class="btn btn-primary btn-sm" data-act="i-pesanan" data-id="${esc(id)}">${ic('box', 15)} Kelola Barang</button>
        <button class="btn btn-soft btn-sm" data-act="i-bayar-new" data-acara="${esc(id)}">${ic('wallet', 15)} Catat Pembayaran</button>
        <button class="btn btn-soft btn-sm" data-act="i-nota" data-acara="${esc(id)}">${ic('printer', 15)} Nota Tagihan</button>
        ${f.sisa > 0.5 ? iWaBtn(a, 'tagih', '', 'Tagih Panitia') : ''}
        <button class="btn btn-soft btn-sm" data-act="v-foto" data-id="${esc(id)}">${ic('camera', 15)} Foto${fotoN ? ' (' + fotoN + ')' : ''}</button>
        <span class="grow"></span>
        ${mine ? `<button class="btn btn-ghost btn-sm" data-act="i-acara-edit" data-id="${esc(id)}">${ic('edit', 15)} Edit</button>${!items.length && !pays.length ? `<button class="btn btn-ghost btn-sm tx-bad" data-act="i-acara-del" data-id="${esc(id)}">${ic('trash', 15)} Hapus</button>` : ''}` : ''}
      </div>
    </div>
    <div class="mini-kpis mk-3 stagger section" style="margin-top:18px">
      <div class="mini-kpi" style="--i:0"><div class="l">Total Tagihan</div><div class="v">${countEl(f.tagihan)}</div><div class="s">${items.length} barang</div></div>
      <div class="mini-kpi" style="--i:1"><div class="l">Sudah Dibayar</div><div class="v tx-ok">${countEl(f.dibayar)}</div><div class="s">${pays.length} pembayaran</div></div>
      <div class="mini-kpi" style="--i:2"><div class="l ${f.sisa > 0.5 ? 'tx-bad' : ''}">Sisa Tagihan</div><div class="v ${f.sisa > 0.5 ? 'tx-bad' : 'tx-ok'}">${countEl(Math.max(0, f.sisa))}</div><div class="s">${f.sisa > 0.5 ? 'belum lunas' : 'LUNAS ✓'}</div></div>
    </div>
    <div class="card section"><div class="card-head"><div><h3><span class="card-title-ic">${ic('box', 18)}</span>Barang Disewa</h3><p>Ubah status pasang & unggah foto per barang.</p></div></div>
      ${DT.render('i-barang', {
        rows: items, pageSize: 20, empty: `${emptyState('Belum ada barang', 'Klik "Kelola Barang" untuk menambahkan dari katalog Anda.', 'box')}`,
        footer: (rows) => `Total ${rows.length} barang • ${rp(rows.reduce((s, r) => s + subRiil(r), 0))}`,
        cols: [
          { key: 'nama_barang', label: 'Barang', main: true, render: (r) => `<div class="t-main">${esc(r.nama_barang)}</div><div class="t-sub">${esc(r.kategori)}${r.spek ? ' • ' + esc(spekText(r)) : ''}</div>` },
          { key: 'jumlah', label: 'Qty', align: 'c', render: (r) => `<span class="tnum">${fmtQty(r.jumlah)} ${esc(r.satuan)}</span>${hariText(r) ? `<div class="xs muted">${esc(hariText(r))}</div>` : ''}` },
          { key: 'harga_vendor_satuan', label: 'Harga', align: 'r', render: (r) => `<span class="tnum">${rp(r.harga_vendor_satuan)}</span>` },
          { key: 'sub', label: 'Subtotal', align: 'r', sortVal: (r) => subRiil(r), render: (r) => `<b class="tnum">${rp(subRiil(r))}</b>` },
          { key: 'tanggal_pasang', label: 'Jadwal', render: (r) => `<span class="small">${r.tanggal_pasang ? tgl(r.tanggal_pasang) : '-'} → ${r.tanggal_bongkar ? tgl(r.tanggal_bongkar) : '-'}</span>` },
          { key: 'status_pasang', label: 'Status', render: (r) => `<select class="select sm v-st st-${esc(r.status_pasang)}" style="width:auto;min-width:118px" data-vstatus="${esc(r.id_pesanan)}">${selectOpts(STATUS_PASANG_V, r.status_pasang)}</select>` },
          { key: 'foto', label: 'Foto', sort: false, render: (r) => FotoBarang.btn(r) }
        ]
      })}</div>
    <div class="card section"><div class="card-head"><div><h3><span class="card-title-ic amber">${ic('wallet', 18)}</span>Pembayaran dari Panitia</h3></div><button class="btn btn-primary btn-sm" data-act="i-bayar-new" data-acara="${esc(id)}">${ic('plus', 14)} Catat</button></div>
      ${iBayarTable(pays, false)}</div>`;
  },

  /* ---------- Pembayaran ---------- */
  bayar: {
    title: 'Pembayaran Panitia',
    render() {
      const d = App.data, t = d.fin.total;
      return `
      <div class="page-head"><div><span class="eyebrow">${ic('wallet', 13)} Vendor Internal</span><h1>Pembayaran Panitia</h1><p>Semua pembayaran yang Anda terima langsung dari panitia, lengkap dengan nota.</p></div>
        <button class="btn btn-primary" data-act="i-bayar-new">${ic('plus', 16)} Catat Pembayaran</button></div>
      <div class="mini-kpis mk-3 stagger">
        <div class="mini-kpi" style="--i:0"><div class="l">Diterima</div><div class="v tx-ok">${countEl(t.dibayar)}</div><div class="s">${d.bayar_internal.length} transaksi</div></div>
        <div class="mini-kpi" style="--i:1"><div class="l">Total Tagihan</div><div class="v">${countEl(t.tagihan)}</div></div>
        <div class="mini-kpi" style="--i:2"><div class="l tx-bad">Belum Dibayar</div><div class="v tx-bad">${countEl(t.sisa)}</div><div class="s">${t.n_belum} acara</div></div>
      </div>
      <div class="card section">${iBayarTable(d.bayar_internal, true)}</div>`;
    }
  },

  /* ---------- Katalog ---------- */
  katalog: {
    title: 'Barang Saya',
    render() {
      const d = App.data;
      return `
      <div class="page-head"><div><span class="eyebrow">${ic('tag', 13)} Vendor Internal</span><h1>Barang Saya</h1><p>Katalog barang milik unit Anda yang bisa disewa panitia. Harga sewa = nominal yang ditagihkan ke panitia.</p></div>
        <button class="btn btn-primary" data-act="i-brg-new">${ic('plus', 16)} Tambah Barang</button></div>
      <div class="card">${DT.render('i-katalog', {
        rows: d.katalog, pageSize: 20, sort: 'nama_barang', search: (r) => r.nama_barang + ' ' + r.kategori + ' ' + r.spesifikasi, placeholder: 'Cari barang...',
        empty: emptyState('Belum ada barang', 'Tambahkan barang yang disewakan unit Anda.', 'tag'),
        cols: [
          { key: 'nama_barang', label: 'Barang', main: true, render: (r) => `<div class="row" style="gap:12px"><span class="t-ic">${ic(KAT_ICON[r.kategori] || 'box', 18)}</span><div style="min-width:0"><div class="t-main">${esc(r.nama_barang)}</div><div class="t-sub">${esc(r.kategori)}${r.spesifikasi ? ' • ' + esc(r.spesifikasi) : ''}</div></div></div>` },
          { key: 'harga_vendor', label: 'Harga Sewa', align: 'r', render: (r) => `<b class="tnum">${rp(r.harga_vendor)}</b><span class="xs muted">/${esc(r.satuan)}</span>` },
          { key: 'aktif', label: 'Status', render: (r) => r.aktif ? badge('Aktif', 'b-ok') : badge('Nonaktif', 'b-neu') },
          { key: '', label: '', acts: true, sort: false, render: (r) => `<div class="acts"><button class="btn btn-ghost btn-sm" data-act="i-brg-edit" data-id="${esc(r.id_barang)}" aria-label="Edit">${ic('edit', 15)}</button><button class="btn btn-soft btn-xs" data-act="toggle-barang" data-id="${esc(r.id_barang)}" data-v="${r.aktif ? '0' : '1'}">${r.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button></div>` }
        ]
      })}</div>`;
    }
  },

  /* ---------- Profil, logo & format pesan ---------- */
  profil: {
    title: 'Profil & Nota',
    render() {
      const v = IV(), u = App.data.user, th = document.documentElement.getAttribute('data-theme') === 'dark';
      return `
      <div class="page-head"><div><span class="eyebrow">${ic('user', 13)} Vendor Internal</span><h1>Profil & Nota</h1><p>Identitas, logo, dan format pesan yang tampil pada nota & WhatsApp ke panitia.</p></div></div>
      <div class="grid-2 stagger">
        <div class="card" style="--i:0"><div class="card-head"><div><h3><span class="card-title-ic">${ic('store', 18)}</span>Identitas Unit</h3><p>Nama unit diatur oleh Admin.</p></div></div>
          <form class="form-grid" id="ip-form">
            <div class="field full"><label>Nama unit / vendor</label><input class="input" value="${esc(v.nama_vendor)}" disabled></div>
            <div class="field"><label>Penanggung jawab (PIC)</label><input class="input" name="pic" value="${esc(v.pic)}"></div>
            <div class="field"><label>No. WhatsApp</label><input class="input" name="kontak" inputmode="tel" value="${esc(v.kontak)}"></div>
            <div class="field full"><label>Rekening pembayaran</label><input class="input" name="rekening" value="${esc(v.rekening)}" placeholder="mis. BSI 7200xxxx a.n. Unit ..."></div>
            <div class="field full"><label>Alamat / lokasi unit</label><input class="input" name="alamat" value="${esc(v.alamat)}"></div>
            <div class="field full"><label>Catatan di bawah nota</label><textarea class="textarea" name="nota_catatan" placeholder="mis. Barang mohon dijaga & dikembalikan dalam keadaan baik.">${esc(v.nota_catatan)}</textarea></div>
          </form>
          <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-primary" data-act="i-profil-save">${ic('check', 16)} Simpan Identitas</button></div></div>
        <div class="card" style="--i:1"><div class="card-head"><div><h3><span class="card-title-ic amber">${ic('image', 18)}</span>Logo Nota</h3><p>Logo tampil <b>utuh</b> di pojok kiri atas nota — tidak terpotong, otomatis menyesuaikan kotak.</p></div></div>
          <div class="logo-stage"><div class="logo-box" id="ip-logo-box">${v.id_logo ? `<span class="muted small">${ic('loader', 16)} Memuat logo...</span>` : `<span class="muted small">${ic('image', 22)}<br>Belum ada logo</span>`}</div>
            <div class="xs muted" style="margin-top:6px">Area logo pada nota (rasio 17 : 7). Logo lebar/tinggi akan diperkecil hingga muat.</div></div>
          <label class="upload" style="margin-top:12px"><span class="u-ic">${ic('upload', 20)}</span><span class="grow"><span class="u-t">${v.id_logo ? 'Ganti logo' : 'Unggah logo'}</span><br><span class="u-s">PNG (latar transparan disarankan) atau JPG</span></span><input type="file" id="ip-logo" accept="image/png,image/jpeg,image/webp"></label>
          <div class="row wrap" style="gap:8px;margin-top:10px">
            ${v.id_logo ? `<button class="btn btn-ghost btn-sm tx-bad" data-act="i-logo-del">${ic('trash', 14)} Hapus logo</button>` : ''}
            <button class="btn btn-soft btn-sm" data-act="i-nota-contoh">${ic('printer', 14)} Lihat Contoh Nota</button></div></div>
      </div>
      <div class="card section"><div class="card-head"><div><h3><span class="card-title-ic">${ic('chat', 18)}</span>Format Pesan WhatsApp</h3><p>Dikirim dari WhatsApp Anda sendiri. Kata di {kurung kurawal} diganti data asli.</p></div></div>
        <div class="grid-2">${Object.entries(TPL_I).map(([k, t]) => `<div class="remind" style="gap:10px"><div class="row" style="gap:10px"><span class="li-ic mint">${ic(t.icon, 18)}</span><b style="font-family:var(--font-head)">${esc(t.label)}</b></div>
          <div class="wa-box" style="max-height:170px;overflow:hidden;font-size:11.5px">${esc(fillTpl(iTpl(k), iSampleVars()))}</div>
          <div class="row between">${IV()[t.key] ? badge('Sudah diubah', 'b-ok') : '<span class="xs muted">Format bawaan</span>'}<button class="btn btn-soft btn-sm" data-act="i-tpl" data-tpl="${k}">${ic('edit', 14)} Edit Format</button></div></div>`).join('')}</div></div>
      <div class="grid-2 section">
        <div class="card"><div class="card-head"><div><h3><span class="card-title-ic">${ic('lock', 18)}</span>Ganti Kata Sandi</h3><p>Masuk sebagai <b>@${esc(u.username)}</b></p></div></div>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="field"><label>Kata sandi saat ini</label><input class="input" type="password" id="vp-old" autocomplete="current-password"></div>
            <div class="field"><label>Kata sandi baru</label><input class="input" type="password" id="vp-new" autocomplete="new-password" placeholder="min. 6 karakter"></div>
            <button class="btn btn-primary" data-act="v-pw">${ic('check', 16)} Simpan Kata Sandi</button></div></div>
        <div class="card"><div class="card-head"><div><h3><span class="card-title-ic">${ic('settings', 18)}</span>Tampilan & Akun</h3></div></div>
          <div class="row wrap"><button class="btn btn-soft" data-act="theme" data-label="Ganti tema">${ic(th ? 'sun' : 'moon', 18)} Ganti tema</button><button class="btn btn-danger" data-act="logout">${ic('logout', 16)} Keluar</button></div></div>
      </div>`;
    },
    after() {
      const v = IV();
      if (v.id_logo) iLoadLogo(v.id_logo);
      const inp = document.getElementById('ip-logo');
      if (inp) inp.addEventListener('change', async () => {
        const f = inp.files[0]; inp.value = '';
        if (!f) return;
        try {
          const lg = await prepareLogo(f);
          const box = document.getElementById('ip-logo-box');
          if (box) box.innerHTML = `<img src="${lg.preview}" alt="Logo">`;
          const res = await App.write('saveProfilInternal', { logo: { file: { name: lg.name, mime: lg.mime, base64: lg.base64 }, w: lg.w, h: lg.h } }, { close: false, busyText: 'Mengunggah...' });
          if (res.success) { IS.logoUrl = lg.preview; IS.logoFor = IV().id_logo; App.renderView(false); }
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  }
};

/* ---------- Komponen ---------- */
function iBayarTable(rows, withAcara) {
  return DT.render(withAcara ? 'i-bayar-all' : 'i-bayar', {
    rows, sort: 'tanggal_bayar', dir: 'desc', pageSize: 15,
    search: withAcara ? (r) => App.acara(r.id_acara).nama_acara + ' ' + r.nama_penyetor + ' ' + r.catatan : null, placeholder: 'Cari acara / penyetor...',
    empty: emptyState('Belum ada pembayaran', 'Catat setiap uang yang diterima dari panitia.', 'wallet'),
    cols: [
      { key: 'tanggal_bayar', label: 'Tanggal', main: true, render: (r) => `<div class="t-main">${tgl(r.tanggal_bayar)}</div><div class="t-sub">${withAcara ? esc(App.acara(r.id_acara).nama_acara) + ' • ' : ''}${esc(r.metode)}</div>` },
      { key: 'nama_penyetor', label: 'Penyetor', render: (r) => `<span class="small">${esc(r.nama_penyetor || '-')}</span>${r.catatan ? `<div class="xs muted">${esc(r.catatan)}</div>` : ''}` },
      { key: 'nominal', label: 'Nominal', align: 'r', render: (r) => `<b class="tnum tx-ok">${rp(r.nominal)}</b>` },
      { key: 'bukti', label: 'Bukti', sort: false, render: (r) => r.id_berkas_bukti ? fileLink(r.id_berkas_bukti, 'Bukti', 'Bukti Pembayaran') : '<span class="xs muted">-</span>' },
      { key: '', label: '', acts: true, sort: false, render: (r) => `<div class="acts"><button class="btn btn-soft btn-sm" data-act="i-nota" data-bayar="${esc(r.id_bayar)}">${ic('printer', 14)} Nota</button>${iWaBtn(App.acara(r.id_acara), 'terima', r.id_bayar, 'Terima kasih')}<button class="btn btn-ghost btn-sm" data-act="i-bayar-edit" data-id="${esc(r.id_bayar)}" aria-label="Edit">${ic('edit', 14)}</button><button class="btn btn-ghost btn-sm tx-bad" data-act="i-bayar-del" data-id="${esc(r.id_bayar)}" aria-label="Hapus">${ic('trash', 14)}</button></div>` }
    ]
  });
}
function iWaBtn(a, tpl, idb, label) {
  return `<button type="button" class="btn wa-btn btn-sm" data-act="i-wa" data-acara="${esc(a.id_acara || '')}" data-tpl="${tpl}" data-bayar="${esc(idb || '')}">${ic('chat', 14)} ${label}</button>`;
}
function iSampleVars() {
  const b = App.data.bayar_internal.slice().sort((x, y) => y.tanggal_bayar.localeCompare(x.tanggal_bayar))[0];
  if (b) return iVars(b.id_acara, b.id_bayar);
  const e = iList().find((x) => x.items.length) || iList()[0];
  if (e) return Object.assign(iVars(e.a.id_acara), { nominal: rp(ivOf(e.a.id_acara).tagihan), tanggal_bayar: tglPanjang(App.today) });
  const v = IV();
  return { panitia: 'Ust. Fajar', acara: 'Panggung Gembira', tanggal_acara: tgl(App.today), vendor: v.nama_vendor, pic: v.pic, rekening: v.rekening || '-', daftar_barang: '• Kursi Lipat — 200 buah = Rp 600.000', total: rp(600000), sudah_bayar: rp(400000), sisa: rp(200000), nominal: rp(400000), tanggal_bayar: tglPanjang(App.today), status: 'Sisa tagihan: Rp 200.000' };
}

/** Kecilkan logo (maks 800×400) tanpa memotong; PNG dipertahankan agar latar transparan tetap. */
async function prepareLogo(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Logo harus berupa gambar PNG atau JPG.');
  const url = await readAsDataURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Gambar tidak dapat dibaca.')); i.src = url; });
  let w = img.naturalWidth, h = img.naturalHeight;
  const k = Math.min(1, 800 / w, 400 / h);
  w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const png = file.type !== 'image/jpeg';
  if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(img, 0, 0, w, h);
  const out = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9);
  return { name: 'logo.' + (png ? 'png' : 'jpg'), mime: png ? 'image/png' : 'image/jpeg', base64: out.split(',')[1], preview: out, w, h };
}
async function iLoadLogo(id) {
  const box = () => document.getElementById('ip-logo-box');
  if (IS.logoFor === id && IS.logoUrl) { if (box()) box().innerHTML = `<img src="${IS.logoUrl}" alt="Logo">`; return; }
  const res = await API.call('getFile', { id_berkas: id });
  if (!res.success || !res.file || !res.file.base64) { if (box()) box().innerHTML = '<span class="muted small">Logo tidak dapat dimuat</span>'; return; }
  IS.logoUrl = 'data:' + res.file.mime + ';base64,' + res.file.base64; IS.logoFor = id;
  if (box()) box().innerHTML = `<img src="${IS.logoUrl}" alt="Logo">`;
}

/* ---------- Aksi ---------- */
ACT['i-filter'] = (el) => { IS.filter = el.dataset.f; App.renderView(false); };
ACT['i-pesanan'] = (el) => openPesananEditor(el.dataset.id || '');
ACT['i-acara-new'] = () => iAcaraForm();
ACT['i-acara-edit'] = (el) => iAcaraForm(App.maps.acara[el.dataset.id]);
ACT['i-acara-del'] = async (el) => {
  const a = App.maps.acara[el.dataset.id];
  if (!await confirmDialog({ title: 'Hapus acara?', message: `Acara <b>${esc(a.nama_acara)}</b> akan dihapus.`, okText: 'Hapus', danger: true })) return;
  const res = await App.write('deleteAcara', { id_acara: a.id_acara });
  if (res.success) App.go('acara');
};
function iAcaraForm(a) {
  a = a || {};
  const m = Modal.open({
    title: a.id_acara ? 'Edit Acara' : 'Buat Acara', sub: 'Acara buatan Anda juga terlihat oleh Admin.', size: 'lg',
    body: `<form class="form-grid" id="ia-form">
      <div class="field full"><label>Nama acara <span class="req">*</span></label><input class="input" name="nama_acara" value="${esc(a.nama_acara)}" placeholder="mis. Lomba Pidato 3 Bahasa"></div>
      <div class="field"><label>Tanggal mulai <span class="req">*</span></label><input class="input" type="date" name="tanggal_mulai" value="${esc(a.tanggal_mulai)}"></div>
      <div class="field"><label>Tanggal selesai</label><input class="input" type="date" name="tanggal_selesai" value="${esc(a.tanggal_selesai)}"></div>
      <div class="field full"><label>Lokasi</label><input class="input" name="lokasi" value="${esc(a.lokasi)}"></div>
      <div class="field"><label>Nama panitia (PJ)</label><input class="input" name="nama_panitia" value="${esc(a.nama_panitia)}" placeholder="Ust. ..."></div>
      <div class="field"><label>No. WhatsApp panitia</label><input class="input" name="kontak_panitia" inputmode="tel" value="${esc(a.kontak_panitia)}" placeholder="08xxxxxxxxxx"></div>
      <div class="field"><label>Status acara</label><select class="select" name="status_acara">${selectOpts(STATUS_ACARA, a.status_acara || 'Rencana')}</select></div>
      <div class="field full"><label>Catatan</label><textarea class="textarea" name="catatan">${esc(a.catatan)}</textarea></div></form>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="ia-save">${ic('check', 16)} Simpan</button>`
  });
  m.querySelector('#ia-save').addEventListener('click', async (e) => {
    const f = Object.fromEntries(new FormData(m.querySelector('#ia-form')));
    if (!f.nama_acara.trim()) return toast('Nama acara wajib diisi.', 'warn');
    if (!f.tanggal_mulai) return toast('Tanggal mulai wajib diisi.', 'warn');
    const res = await App.write('saveAcara', Object.assign(f, { id_acara: a.id_acara || '' }), { btn: e.currentTarget });
    if (res.success && !a.id_acara && res.id) { App.go('acara/' + encodeURIComponent(res.id)); setTimeout(() => openPesananEditor(res.id), 450); }
  });
}

ACT['i-brg-new'] = () => iBarangForm();
ACT['i-brg-edit'] = (el) => iBarangForm(App.maps.katalog[el.dataset.id]);
function iBarangForm(b) {
  b = b || {};
  const m = Modal.open({
    title: b.id_barang ? 'Edit Barang' : 'Tambah Barang', size: 'lg',
    body: `<form class="form-grid" id="ib-form">
      <div class="field full"><label>Nama barang <span class="req">*</span></label><input class="input" name="nama_barang" value="${esc(b.nama_barang)}" placeholder="mis. Sound Portable 2.000 W"></div>
      <div class="field"><label>Kategori</label><select class="select" name="kategori">${selectOpts(KATEGORI, b.kategori || 'Lainnya')}</select></div>
      <div class="field"><label>Satuan</label><input class="input" name="satuan" list="ib-sat" value="${esc(b.satuan || 'unit')}"><datalist id="ib-sat">${SATUAN.map((s) => `<option value="${s}">`).join('')}</datalist></div>
      <div class="field"><label>Harga sewa ke panitia <span class="req">*</span></label>${moneyInput('ib-h', b.harga_vendor)}<span class="hint">Per satuan, per hari pertama.</span></div>
      <div class="field"><label>Spesifikasi</label><input class="input" name="spesifikasi" value="${esc(b.spesifikasi)}" placeholder="Ukuran, warna, dll."></div></form>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="ib-save">${ic('check', 16)} Simpan</button>`
  });
  m.querySelector('#ib-save').addEventListener('click', async (e) => {
    const f = Object.fromEntries(new FormData(m.querySelector('#ib-form')));
    if (!f.nama_barang.trim()) return toast('Nama barang wajib diisi.', 'warn');
    const h = parseMoney(m.querySelector('#ib-h').value);
    if (!(h >= 0)) return toast('Isi harga sewa.', 'warn');
    await App.write('saveBarang', Object.assign(f, { id_barang: b.id_barang || '', id_vendor: IV().id_vendor, harga_vendor: h, harga_estimasi: h }), { btn: e.currentTarget });
  });
}

ACT['i-bayar-new'] = (el) => iBayarForm({ id_acara: el.dataset.acara || '' });
ACT['i-bayar-edit'] = (el) => iBayarForm(App.data.bayar_internal.find((b) => b.id_bayar === el.dataset.id));
ACT['i-bayar-del'] = async (el) => {
  const b = App.data.bayar_internal.find((x) => x.id_bayar === el.dataset.id);
  if (!await confirmDialog({ title: 'Hapus pembayaran?', message: `Pembayaran <b>${rp(b.nominal)}</b> (${tgl(b.tanggal_bayar)}) akan dihapus.`, okText: 'Hapus', danger: true })) return;
  App.write('deleteBayarInternal', { id_bayar: b.id_bayar });
};
function iBayarForm(b) {
  const edit = b && b.id_bayar ? b : null;
  const ida0 = (b && b.id_acara) || '';
  const acaraList = iList().map((e) => e.a);
  const m = Modal.open({
    title: edit ? 'Edit Pembayaran' : 'Catat Pembayaran dari Panitia', sub: 'Uang yang diterima langsung dari panitia.', size: 'lg',
    body: `<div class="form-grid">
      <div class="field full"><label>Acara <span class="req">*</span></label><select class="select" id="ib-acara">${selectOpts(acaraList.map((a) => ({ value: a.id_acara, label: a.nama_acara + ' — ' + tgl(a.tanggal_mulai) })), ida0, 'Pilih acara')}</select><span class="hint" id="ib-info"></span></div>
      <div class="field"><label>Tanggal bayar <span class="req">*</span></label><input class="input" type="date" id="ib-tgl" value="${edit ? edit.tanggal_bayar : App.today}"></div>
      <div class="field"><label>Metode</label>${seg('ib-metode', [{ value: 'Tunai', label: ic('wallet', 15) + ' Tunai' }, { value: 'Transfer', label: ic('checkCircle', 15) + ' Transfer' }], edit ? edit.metode : 'Tunai')}</div>
      <div class="field full"><label><span>Nominal diterima <span class="req">*</span></span><button class="btn btn-primary btn-xs" type="button" id="ib-lunas">${ic('zap', 13)} Isi sisa tagihan</button></label>
        <div class="input-group"><span class="pre big" style="font-family:var(--font-head);font-weight:700">Rp</span><input class="input tnum money money-big" id="ib-nom" inputmode="numeric" value="${edit ? fmtNum(edit.nominal) : ''}" placeholder="0"></div>
        <span class="terbilang">Terbilang: <b id="ib-terb">-</b></span></div>
      <div class="field"><label>Nama penyetor</label><input class="input" id="ib-nama" value="${esc(edit ? edit.nama_penyetor : '')}" placeholder="Nama panitia"></div>
      <div class="field"><label>Catatan</label><input class="input" id="ib-cat" value="${esc(edit ? edit.catatan : '')}" placeholder="mis. DP / pelunasan"></div>
      <div class="field full"><label>Bukti (opsional) ${edit && edit.id_berkas_bukti ? fileLink(edit.id_berkas_bukti, 'Lihat tersimpan', 'Bukti Pembayaran') : ''}</label>${uploadBox('ib-bukti', 'Unggah foto / bukti transfer', 'Foto/PDF • dikompres otomatis')}</div>
      ${edit ? '' : `<label class="check full"><input type="checkbox" id="ib-after" checked><span><b>Setelah disimpan, tampilkan Nota & pesan terima kasih</b><br><span class="small muted">Nota PDF ber-logo siap dikirim ke panitia.</span></span></label>`}
    </div>`,
    foot: `<button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="ib-save">${ic('check', 16)} Simpan</button>`
  });
  const $ = (q) => m.querySelector(q);
  const sisaOf = (ida) => { const f = ivOf(ida); return Math.max(0, f.sisa + (edit && edit.id_acara === ida ? num(edit.nominal) : 0)); };
  const info = () => {
    const ida = $('#ib-acara').value, a = App.maps.acara[ida];
    const f = ivOf(ida);
    $('#ib-info').innerHTML = ida ? `Tagihan ${rp(f.tagihan)} • sudah dibayar ${rp(f.dibayar - (edit && edit.id_acara === ida ? num(edit.nominal) : 0))} • <b class="${sisaOf(ida) > 0 ? 'tx-bad' : 'tx-ok'}">sisa ${rp(sisaOf(ida))}</b>` : '';
    if (a && !$('#ib-nama').value) $('#ib-nama').value = a.nama_panitia || '';
  };
  const terb = () => { const n = parseMoney($('#ib-nom').value); $('#ib-terb').textContent = n ? terbilang(n) : '-'; };
  $('#ib-acara').addEventListener('change', info);
  $('#ib-nom').addEventListener('input', terb);
  $('#ib-lunas').addEventListener('click', () => { const ida = $('#ib-acara').value; if (!ida) return toast('Pilih acara dulu.', 'warn'); $('#ib-nom').value = fmtNum(sisaOf(ida)); terb(); });
  info(); terb();
  $('#ib-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget, ida = $('#ib-acara').value, nominal = parseMoney($('#ib-nom').value);
    if (!ida) return toast('Pilih acara.', 'warn');
    if (!(nominal > 0)) return toast('Nominal harus lebih dari 0.', 'warn');
    if (nominal > sisaOf(ida) + 0.5 && !await confirmDialog({ title: 'Melebihi sisa tagihan', message: `Nominal melebihi sisa tagihan (${rp(sisaOf(ida))}). Tetap simpan sebagai uang muka/lebih bayar?`, okText: 'Tetap simpan' })) return;
    let fileBukti = null;
    try { setBusy(btn, true, 'Menyiapkan...'); fileBukti = await prepareFile($('#ib-bukti').files[0]); } catch (err) { setBusy(btn, false); return toast(err.message, 'error'); }
    setBusy(btn, false);
    const after = !edit && $('#ib-after') && $('#ib-after').checked;
    const res = await App.write('saveBayarInternal', { data: { id_bayar: edit ? edit.id_bayar : '', id_acara: ida, tanggal_bayar: $('#ib-tgl').value, metode: segVal(m, 'ib-metode'), nominal, nama_penyetor: $('#ib-nama').value, catatan: $('#ib-cat').value }, fileBukti }, { btn, busyText: 'Menyimpan...' });
    if (res.success && after && res.id) iAfterBayar(res.id);
  });
}
function iAfterBayar(idb) {
  const b = App.data.bayar_internal.find((x) => x.id_bayar === idb);
  if (!b) return;
  const f = ivOf(b.id_acara), a = App.acara(b.id_acara);
  Modal.open({
    title: 'Pembayaran tersimpan', sub: esc(a.nama_acara), size: 'sm',
    body: `<div class="center" style="padding:6px 0 12px"><div class="bold" style="font-family:var(--font-head);font-size:22px">${rp(b.nominal)}</div>
      <div class="small muted">${f.sisa > 0.5 ? 'Sisa tagihan ' + rp(f.sisa) : 'Tagihan acara ini LUNAS ✓'}</div></div>
      <div class="stack" style="gap:8px">
        <button class="btn btn-primary btn-block" data-act="i-nota" data-bayar="${esc(idb)}">${ic('printer', 16)} Unduh Nota Pembayaran (PDF)</button>
        ${iWaBtn(a, 'terima', idb, 'Kirim terima kasih via WhatsApp').replace('btn-sm', 'btn-block')}
      </div>`
  });
}

ACT['i-nota'] = async (el) => {
  setBusy(el, true, 'PDF...');
  const res = await API.call('notaInternal', el.dataset.bayar ? { id_bayar: el.dataset.bayar } : { id_acara: el.dataset.acara }, { timeout: 120000 });
  setBusy(el, false);
  if (!res.success) return toast(res.message, 'error', 6000);
  showFile(res.file, el.dataset.bayar ? 'Nota Pembayaran' : 'Nota Tagihan');
};
ACT['i-nota-contoh'] = (el) => {
  const b = App.data.bayar_internal.slice().sort((x, y) => y.tanggal_bayar.localeCompare(x.tanggal_bayar))[0];
  const e = iList().find((x) => x.items.length);
  if (!b && !e) return toast('Belum ada acara dengan barang untuk dijadikan contoh nota.', 'info', 4000);
  if (b) el.dataset.bayar = b.id_bayar; else el.dataset.acara = e.a.id_acara;
  ACT['i-nota'](el);
};
ACT['i-wa'] = (el) => {
  const a = App.acara(el.dataset.acara), tpl = el.dataset.tpl;
  const text = fillTpl(iTpl(tpl), iVars(el.dataset.acara, el.dataset.bayar));
  const m = Modal.open({
    title: 'Kirim WhatsApp', sub: esc(TPL_I[tpl].label + ' • ' + (a.nama_panitia || 'Panitia')), size: 'lg',
    body: `<div class="field"><label>Nomor WhatsApp panitia <span class="req">*</span></label><input class="input tnum" id="iw-to" inputmode="tel" value="${esc(a.kontak_panitia || '')}" placeholder="08xxxxxxxxxx"></div>
      <div class="field" style="margin-top:12px"><label><span>Isi pesan <span class="small muted">(bisa diubah)</span></span><button type="button" class="btn btn-ghost btn-xs" data-act="i-tpl" data-tpl="${tpl}">${ic('edit', 13)} Ubah format tetap</button></label>
        <textarea class="textarea" id="iw-text" style="min-height:240px;font-size:13.5px">${esc(text)}</textarea></div>
      <div class="hint">Pesan dibuka di WhatsApp Anda sendiri — tinggal tekan kirim. ${tpl === 'terima' ? 'Lampirkan juga PDF nota yang sudah diunduh.' : ''}</div>`,
    foot: `<button class="btn btn-soft" id="iw-copy" type="button">${ic('copy', 15)} Salin</button><button class="btn wa-btn" id="iw-open" type="button">${ic('chat', 15)} Buka WhatsApp</button>`
  });
  m.querySelector('#iw-copy').addEventListener('click', () => copyText(m.querySelector('#iw-text').value));
  m.querySelector('#iw-open').addEventListener('click', () => {
    const to = m.querySelector('#iw-to').value;
    if (!/^\d{9,15}$/.test(waNumber(to))) return toast('Isi nomor WhatsApp panitia.', 'warn');
    window.open(waLink(to, m.querySelector('#iw-text').value), '_blank', 'noopener');
  });
};
ACT['i-tpl'] = (el) => {
  const type = el.dataset.tpl, def = TPL_I[type], vars = iSampleVars();
  const m = Modal.open({
    title: 'Edit Format Pesan', sub: esc(def.label), size: 'lg',
    body: `<div class="lbl" style="margin-bottom:8px">Sisipkan data</div>
      <div class="row wrap" style="gap:6px;margin-bottom:12px">${Object.entries(def.vars).map(([k, dsc]) => `<button type="button" class="chip" data-ins="${k}" title="${esc(dsc)}" style="height:30px;padding:0 10px">{${k}}</button>`).join('')}</div>
      <div class="field"><label>Format pesan</label><textarea class="textarea mono" id="it-txt" style="min-height:200px;font-size:13px">${esc(iTpl(type))}</textarea></div>
      <div class="lbl" style="margin:14px 0 8px">Pratinjau</div><div class="wa-box" id="it-prev"></div>`,
    foot: `<button class="btn btn-ghost" id="it-reset" style="margin-right:auto">${ic('refresh', 15)} Kembalikan bawaan</button><button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" id="it-save">${ic('check', 16)} Simpan Format</button>`
  });
  const ta = m.querySelector('#it-txt');
  const upd = () => { m.querySelector('#it-prev').textContent = fillTpl(ta.value, vars); };
  ta.addEventListener('input', upd);
  m.querySelectorAll('[data-ins]').forEach((b) => b.addEventListener('click', () => {
    const ins = '{' + b.dataset.ins + '}', s0 = ta.selectionStart, e0 = ta.selectionEnd;
    ta.value = ta.value.slice(0, s0) + ins + ta.value.slice(e0); ta.focus(); ta.setSelectionRange(s0 + ins.length, s0 + ins.length); upd();
  }));
  m.querySelector('#it-reset').addEventListener('click', () => { ta.value = def.def; upd(); });
  m.querySelector('#it-save').addEventListener('click', async (e) => {
    const text = ta.value.trim();
    if (!text) return toast('Format tidak boleh kosong.', 'warn');
    const res = await App.write('saveProfilInternal', { [def.key]: text === def.def ? '' : text }, { btn: e.currentTarget, close: false });
    if (res.success) Modal.close();
  });
  upd();
};
ACT['i-profil-save'] = (el) => {
  const f = Object.fromEntries(new FormData(document.getElementById('ip-form')));
  App.write('saveProfilInternal', f, { btn: el });
};
ACT['i-logo-del'] = async (el) => {
  if (!await confirmDialog({ title: 'Hapus logo?', message: 'Nota akan dicetak tanpa logo.', okText: 'Hapus', danger: true })) return;
  const res = await App.write('saveProfilInternal', { hapusLogo: true }, { btn: el, close: false });
  if (res.success) { IS.logoUrl = ''; IS.logoFor = ''; }
};
