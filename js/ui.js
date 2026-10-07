/* =====================================================================
 *  UI.JS — ikon, format, komponen (modal, toast, tabel data, unggah)
 * ===================================================================== */

/* ---------- Ikon SVG (garis, 24px) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 9.5h18"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 10h-5a2 2 0 0 0 0 4h5v-4Z"/>',
  coins: '<circle cx="9" cy="9" r="6"/><path d="M18.1 10.4a6 6 0 1 1-7.7 7.7"/><path d="M8 7h1.5v4"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  store: '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v9h14v-9"/><path d="M10 21v-5h4v5"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>', chevR: '<path d="m9 18 6-6-6-6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5Z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  utensils: '<path d="M3 2v7a3 3 0 0 0 3 3v10M9 2v7a3 3 0 0 1-3 3M6 2v7"/><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3Zm0 0v7"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.7a1 1 0 0 0-.2-.6l-3.5-4.4A1 1 0 0 0 17.5 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>',
  tent: '<path d="M3.5 21 12 4l8.5 17"/><path d="M8 21l4-7 4 7"/><path d="M2 21h20"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9Z"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5Z"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  arrowR: '<path d="M5 12h14M13 5l7 7-7 7"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5.8 5.8 0 0 1 7.1-.9l.5.3a2 2 0 0 0 1.5.2L21 4"/><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8"/>',
  trending: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  loader: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5H3v7h4c0 4-2 5-4 5Zm11 0c3 0 7-1 7-8V5h-7v7h4c0 4-2 5-4 5Z"/>'
};
function ic(name, size = 18, cls = '') {
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.circle}</svg>`;
}

/* ---------- Format ---------- */
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function esc(s) {
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function num(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function fmtNum(n) { return Math.round(num(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function rp(n) { const v = Math.round(num(n)); return (v < 0 ? '-Rp ' : 'Rp ') + fmtNum(Math.abs(v)); }
function rpShort(n) {
  const v = Math.abs(num(n)), s = n < 0 ? '-' : '';
  if (v >= 1e9) return s + 'Rp ' + (v / 1e9).toFixed(2).replace('.', ',').replace(/,?0+$/, '') + ' M';
  if (v >= 1e6) return s + 'Rp ' + (v / 1e6).toFixed(2).replace('.', ',').replace(/,?0+$/, '') + ' jt';
  return rp(n);
}
function fmtQty(n) {
  const v = Math.round(num(n) * 100) / 100;
  if (Number.isInteger(v)) return fmtNum(v);
  const [a, b] = v.toFixed(2).replace(/0+$/, '').split('.');
  return fmtNum(Number(a)) + ',' + b;
}
/* Satuan luas (m²): jumlah = jumlah unit × panjang × lebar dari spek "6x6" */
function isLuas(satuan) { return /^(m²|m2|m\^2|meter persegi|mtr2)$/i.test(String(satuan || '').trim()); }
function parseSpek(spek) {
  const m = String(spek || '').replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*(?:m(?:eter)?)?\s*[x×X*]\s*(\d+(?:\.\d+)?)/);
  return m ? { p: parseFloat(m[1]), l: parseFloat(m[2]) } : null;
}
function spekText(it) {
  if (!it.spek) return '';
  return it.spek + (isLuas(it.satuan) ? ' × ' + (num(it.qty_unit) || 1) + ' unit' : '');
}
function parseMoney(s) { const d = String(s || '').replace(/[^\d]/g, ''); return d ? parseInt(d, 10) : 0; }
function isYMD(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '').slice(0, 10)); }
function parseYMD(s) { const p = String(s).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function toYMD(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function addDays(s, n) { const d = parseYMD(s); d.setDate(d.getDate() + n); return toYMD(d); }
function diffDays(a, b) { return Math.round((parseYMD(b) - parseYMD(a)) / 86400000); }
function tgl(s) { if (!isYMD(s)) return s ? esc(s) : '-'; const d = parseYMD(s); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); }
function tglPanjang(s) { if (!isYMD(s)) return '-'; const d = parseYMD(s); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); }
function tglRange(a, b) {
  if (!isYMD(a)) return '-';
  if (!b || a === b) return tgl(a);
  const x = parseYMD(a), y = parseYMD(b);
  if (x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth()) return x.getDate() + '–' + y.getDate() + ' ' + BLN[y.getMonth()] + ' ' + y.getFullYear();
  return tgl(a) + ' – ' + tgl(b);
}
function hijri(s) {
  try {
    return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(isYMD(s) ? parseYMD(s) : new Date());
  } catch (e) { return ''; }
}
function hijriYear(s) {
  try { return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { year: 'numeric' }).format(isYMD(s) ? parseYMD(s) : new Date()).replace(/[^\d]/g, ''); } catch (e) { return ''; }
}
function relDay(s, today) {
  if (!isYMD(s)) return '';
  const n = diffDays(today, s);
  if (n === 0) return 'Hari ini';
  if (n === 1) return 'Besok';
  if (n === -1) return 'Kemarin';
  return n > 0 ? n + ' hari lagi' : Math.abs(n) + ' hari lalu';
}
function initials(name) { return String(name || '?').replace(/\(.*?\)/g, ' ').replace(/^(ust\.?|ustadz|pak|bu|mas)\s+/i, '').split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'; }
function terbilang(n) {
  n = Math.floor(Math.abs(num(n)));
  const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  const t = (x) => x < 12 ? s[x] : x < 20 ? t(x - 10) + ' belas' : x < 100 ? t(Math.floor(x / 10)) + ' puluh ' + t(x % 10)
    : x < 200 ? 'seratus ' + t(x - 100) : x < 1000 ? t(Math.floor(x / 100)) + ' ratus ' + t(x % 100)
    : x < 2000 ? 'seribu ' + t(x - 1000) : x < 1e6 ? t(Math.floor(x / 1000)) + ' ribu ' + t(x % 1000)
    : x < 1e9 ? t(Math.floor(x / 1e6)) + ' juta ' + t(x % 1e6) : x < 1e12 ? t(Math.floor(x / 1e9)) + ' miliar ' + t(x % 1e9)
    : t(Math.floor(x / 1e12)) + ' triliun ' + t(x % 1e12);
  if (!n) return 'Nol Rupiah';
  return (t(n) + ' rupiah').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
function waNumber(p) {
  let d = String(p || '').replace(/[^\d]/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}
function waLink(phone, text) {
  const n = waNumber(phone);
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text || '');
}

/* ---------- Badge status ---------- */
const STATUS_CLASS = {
  Lunas: 'b-ok', Terpasang: 'b-ok', Selesai: 'b-ok', Dibongkar: 'b-neu', 'Sudah Diingatkan': 'b-ok',
  Sebagian: 'b-warn', Rencana: 'b-warn', Penataan: 'b-warn', 'Estimasi Dikirim': 'b-info', Disetujui: 'b-info', Dipesan: 'b-info',
  Belum: 'b-bad', Batal: 'b-neu', '-': 'b-neu', Transfer: 'b-info', Tunai: 'b-neu', Pasang: 'b-info', Bongkar: 'b-warn'
};
function badge(text, cls) { return `<span class="badge ${cls || STATUS_CLASS[text] || 'b-neu'}">${esc(text)}</span>`; }
function payBadge(status, label) {
  if (status === '-') return badge('Belum ada tagihan', 'b-neu');
  return badge(label ? label + ' ' + status : status, STATUS_CLASS[status]);
}
/* Jatuh tempo = sekian hari (ambang) setelah acara selesai/dibongkar */
function agingPill(umur, ambang, done) {
  if (done) return badge('Selesai', 'b-ok');
  if (!umur) return badge('Belum jatuh tempo', 'b-neu');
  const sisa = ambang - umur;
  if (sisa > 0) return badge((sisa === 1 ? 'Besok' : sisa + ' hari lagi') + ' jatuh tempo', sisa <= Math.ceil(ambang / 2) ? 'b-warn' : 'b-info');
  if (sisa === 0) return '<span class="badge b-bad aging pulse">Jatuh tempo hari ini</span>';
  return `<span class="badge b-bad aging pulse">Lewat ${-sisa} hari — Tagih</span>`;
}

/* ---------- Toast ---------- */
function toast(message, type = 'success', ms = 3800) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icn = { success: 'checkCircle', error: 'alertCircle', warn: 'alert', info: 'info' }[type] || 'info';
  el.innerHTML = ic(icn, 20) + '<div>' + esc(message) + '</div>';
  root.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  el.addEventListener('click', close);
  setTimeout(close, ms);
}

/* ---------- Modal ---------- */
const Modal = {
  stack: [],
  open({ title, sub = '', body = '', foot = '', size = '', onClose = null, id = '', dismissable = true }) {
    const root = document.getElementById('modal-root');
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" ${id ? 'id="' + id + '"' : ''}>
      <div class="modal-head"><div><h3>${title}</h3>${sub ? '<p>' + sub + '</p>' : ''}</div>
      ${dismissable ? `<button class="icon-btn" data-modal-close aria-label="Tutup">${ic('x', 18)}</button>` : ''}</div>
      <div class="modal-body">${body}</div>${foot ? '<div class="modal-foot">' + foot + '</div>' : ''}</div>`;
    bd.addEventListener('mousedown', (e) => { if (e.target === bd && dismissable) Modal.close(); });
    bd.querySelectorAll('[data-modal-close]').forEach((b) => b.addEventListener('click', () => Modal.close()));
    root.appendChild(bd);
    document.body.style.overflow = 'hidden';
    this.stack.push({ bd, onClose, dismissable });
    setTimeout(() => { const f = bd.querySelector('input:not([type=hidden]):not([type=file]):not([readonly]), select, textarea'); if (f && window.innerWidth > 768) f.focus(); }, 60);
    return bd.querySelector('.modal');
  },
  close() {
    const top = this.stack.pop();
    if (!top) return;
    top.bd.classList.add('closing');
    setTimeout(() => { top.bd.remove(); if (!this.stack.length) document.body.style.overflow = ''; }, 200);
    if (top.onClose) top.onClose();
  },
  closeAll() { while (this.stack.length) this.close(); },
  get el() { const t = this.stack[this.stack.length - 1]; return t ? t.bd.querySelector('.modal') : null; }
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && Modal.stack.length && Modal.stack[Modal.stack.length - 1].dismissable) Modal.close();
});

function confirmDialog({ title = 'Konfirmasi', message = '', okText = 'Ya, lanjutkan', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const m = Modal.open({
      title, size: 'sm', body: `<p style="margin:0;color:var(--text-2)">${message}</p>`,
      foot: `<button class="btn btn-ghost" data-c="0">Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-c="1">${okText}</button>`,
      onClose: () => { if (!done) resolve(false); }
    });
    m.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { done = true; resolve(b.dataset.c === '1'); Modal.close(); }));
  });
}

function setBusy(btn, busy, text) {
  if (!btn) return;
  if (busy) {
    btn.dataset.html = btn.innerHTML;
    btn.classList.add('loading');
    btn.disabled = true;
    btn.innerHTML = ic('loader', 16) + (text || 'Memproses...');
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
  }
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (x) { /* */ } ta.remove();
  }
  toast('Teks disalin. Tempel di WhatsApp.', 'success', 2500);
}

/* ---------- Angka berjalan (count-up) ---------- */
function animateCounts(root) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  (root || document).querySelectorAll('[data-count]').forEach((el) => {
    const target = num(el.dataset.count);
    const fmt = el.dataset.fmt || 'rp';
    const f = (v) => fmt === 'rp' ? rp(v) : fmt === 'pct' ? Math.round(v) + '%' : fmtNum(v);
    if (reduce || Math.abs(target) < 1) { el.textContent = f(target); return; }
    const t0 = performance.now(), dur = 900;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = f(target * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
function countEl(value, fmt = 'rp', cls = '') {
  const f = fmt === 'rp' ? rp(value) : fmt === 'pct' ? Math.round(value) + '%' : fmtNum(value);
  return `<span class="tnum ${cls}" data-count="${num(value)}" data-fmt="${fmt}">${f}</span>`;
}

/* ---------- Komponen kecil ---------- */
function emptyState(title, sub = '', icon = 'checkCircle') {
  return `<div class="empty"><div class="e-ic">${ic(icon, 26)}</div><b>${title}</b>${sub ? '<div class="small">' + sub + '</div>' : ''}</div>`;
}
function selectOpts(list, val, placeholder) {
  return (placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : '') +
    list.map((o) => {
      const v = typeof o === 'object' ? o.value : o, l = typeof o === 'object' ? o.label : o;
      return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`;
    }).join('');
}
function moneyInput(id, value, attrs = '') {
  return `<input class="input tnum money" id="${id}" inputmode="numeric" autocomplete="off" value="${value ? fmtNum(value) : ''}" placeholder="0" ${attrs}>`;
}
function seg(name, options, val, cls = '') {
  return `<div class="seg ${cls}" data-seg="${name}">${options.map((o) => {
    const v = typeof o === 'object' ? o.value : o, l = typeof o === 'object' ? o.label : o;
    return `<button type="button" data-v="${esc(v)}" class="${v === val ? 'on' : ''}">${l}</button>`;
  }).join('')}</div>`;
}
function segVal(root, name) { const b = root.querySelector(`[data-seg="${name}"] button.on`); return b ? b.dataset.v : ''; }

// Format otomatis input uang (titik ribuan) + aktifkan tombol segmen
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.classList && t.classList.contains('money')) {
    const v = parseMoney(t.value);
    t.value = v ? fmtNum(v) : '';
  }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('.seg button');
  if (!b) return;
  b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  b.parentElement.dispatchEvent(new CustomEvent('segchange', { bubbles: true, detail: b.dataset.v }));
});

/* ---------- Tabel data generik (cari, urut, halaman, jadi kartu di HP) ---------- */
const DT = {
  reg: {},
  state: {},
  render(id, cfg) {
    this.reg[id] = cfg;
    if (!this.state[id]) this.state[id] = { q: '', sort: cfg.sort || null, dir: cfg.dir || 'asc', page: 1 };
    return `<div class="dt" id="dt-${id}">${this.inner(id)}</div>`;
  },
  refresh(id) { const el = document.getElementById('dt-' + id); if (el) el.innerHTML = this.inner(id); },
  inner(id) {
    const cfg = this.reg[id], st = this.state[id];
    let rows = cfg.rows.slice();
    if (st.q && cfg.search) {
      const q = st.q.toLowerCase();
      rows = rows.filter((r) => cfg.search(r).toLowerCase().includes(q));
    }
    if (st.sort) {
      const col = cfg.cols.find((c) => c.key === st.sort);
      const get = (col && col.sortVal) || ((r) => r[st.sort]);
      rows.sort((a, b) => {
        const x = get(a), y = get(b);
        const c = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), 'id');
        return st.dir === 'asc' ? c : -c;
      });
    }
    const size = cfg.pageSize || 10;
    const pages = Math.max(1, Math.ceil(rows.length / size));
    if (st.page > pages) st.page = pages;
    const view = rows.slice((st.page - 1) * size, st.page * size);
    const tools = cfg.search || cfg.tools ? `<div class="dt-tools">
      ${cfg.search ? `<div class="search">${ic('search', 16)}<input type="search" placeholder="${esc(cfg.placeholder || 'Cari...')}" value="${esc(st.q)}" data-dt-search="${id}"></div>` : ''}
      ${cfg.tools || ''}</div>` : '';
    const head = cfg.cols.map((c) => {
      const sortable = c.sort !== false && c.key;
      const sorted = st.sort === c.key;
      return `<th class="${c.align || ''} ${sortable ? 'sortable' : ''} ${sorted ? 'sorted' : ''}" ${sortable ? `data-dt-sort="${id}" data-key="${c.key}"` : ''} ${c.width ? `style="width:${c.width}"` : ''}>${c.label}${sortable ? `<span class="sort">${sorted ? (st.dir === 'asc' ? '▲' : '▼') : '↕'}</span>` : ''}</th>`;
    }).join('');
    const body = view.length ? view.map((r) => `<tr ${cfg.rowAttr ? cfg.rowAttr(r) : ''}>${cfg.cols.map((c) => {
      const cls = [c.align || '', c.main ? 'td-main' : '', c.acts ? 'td-acts' : ''].join(' ');
      return `<td class="${cls}" data-label="${esc(c.mLabel || c.label)}">${c.render ? c.render(r) : esc(r[c.key])}</td>`;
    }).join('')}</tr>`).join('') : `<tr><td colspan="${cfg.cols.length}" class="dt-empty td-main">${cfg.empty || 'Belum ada data.'}</td></tr>`;
    let pager = '';
    if (pages > 1) {
      const btns = [];
      for (let i = 1; i <= pages; i++) {
        if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - st.page) > 1) { if (btns[btns.length - 1] !== '…') btns.push('…'); continue; }
        btns.push(i);
      }
      pager = `<div class="pager"><button data-dt-page="${id}" data-p="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''}>‹</button>${btns.map((b) => b === '…' ? '<button disabled>…</button>' : `<button data-dt-page="${id}" data-p="${b}" class="${b === st.page ? 'on' : ''}">${b}</button>`).join('')}<button data-dt-page="${id}" data-p="${st.page + 1}" ${st.page === pages ? 'disabled' : ''}>›</button></div>`;
    }
    return `${tools}<div class="dt-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      ${rows.length > size || cfg.footer ? `<div class="dt-foot"><span>${cfg.footer ? cfg.footer(rows) : 'Menampilkan ' + view.length + ' dari ' + rows.length + ' data'}</span>${pager}</div>` : ''}`;
  }
};
document.addEventListener('input', (e) => {
  const id = e.target.dataset && e.target.dataset.dtSearch;
  if (!id) return;
  DT.state[id].q = e.target.value;
  DT.state[id].page = 1;
  const pos = e.target.selectionStart;
  DT.refresh(id);
  const inp = document.querySelector(`[data-dt-search="${id}"]`);
  if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (x) { /* */ } }
});
document.addEventListener('click', (e) => {
  const s = e.target.closest('[data-dt-sort]');
  if (s) {
    const st = DT.state[s.dataset.dtSort];
    if (st.sort === s.dataset.key) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = s.dataset.key; st.dir = 'asc'; }
    DT.refresh(s.dataset.dtSort);
    return;
  }
  const p = e.target.closest('[data-dt-page]');
  if (p && !p.disabled) { DT.state[p.dataset.dtPage].page = Number(p.dataset.p); DT.refresh(p.dataset.dtPage); }
});

/* ---------- Berkas: baca, kompres, tampilkan ---------- */
function readAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
async function prepareFile(file) {
  if (!file) return null;
  const cfg = window.APP_CONFIG;
  if (file.type === 'application/pdf') {
    if (file.size > cfg.MAX_PDF_MB * 1024 * 1024) throw new Error('PDF maksimal ' + cfg.MAX_PDF_MB + ' MB.');
    const url = await readAsDataURL(file);
    return { name: file.name, mime: file.type, base64: url.split(',')[1], preview: '' };
  }
  if (!/^image\//.test(file.type)) throw new Error('Hanya gambar (JPG/PNG) atau PDF yang didukung.');
  const url = await readAsDataURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Gambar tidak dapat dibaca.')); i.src = url; });
  const max = cfg.MAX_IMAGE_PX;
  let { width: w, height: h } = img;
  if (w > max || h > max) { const k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
  const out = c.toDataURL('image/jpeg', cfg.IMAGE_QUALITY);
  return { name: file.name.replace(/\.[^.]+$/, '') + '.jpg', mime: 'image/jpeg', base64: out.split(',')[1], preview: out };
}
function b64ToBlob(b64, mime) {
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function showFile(file, title) {
  if (file.tooLarge) { window.open(file.url, '_blank'); return; }
  const blob = b64ToBlob(file.base64, file.mime);
  const url = URL.createObjectURL(blob);
  const isImg = /^image\//.test(file.mime);
  const isPdf = file.mime === 'application/pdf';
  const mobile = window.innerWidth < 769;
  Modal.open({
    title: title || 'Pratinjau Berkas', sub: esc(file.name), size: 'lg',
    body: `<div class="viewer">${isImg ? `<img src="${url}" alt="${esc(file.name)}">` : isPdf && !mobile ? `<iframe src="${url}" title="${esc(file.name)}"></iframe>` : emptyState('Berkas siap diunduh', esc(file.name), 'file')}</div>`,
    foot: `${isPdf ? `<a class="btn btn-soft" href="${url}" target="_blank" rel="noopener">${ic('external', 16)} Buka di tab baru</a>` : ''}<a class="btn btn-primary" href="${url}" download="${esc(file.name)}">${ic('download', 16)} Unduh</a>`,
    onClose: () => setTimeout(() => URL.revokeObjectURL(url), 60000)
  });
}
