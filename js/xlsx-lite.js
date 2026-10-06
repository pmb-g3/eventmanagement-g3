/* =====================================================================
 *  XLSX-LITE.JS — baca & tulis Excel (.xlsx) tanpa pustaka luar
 *  - Tulis: ZIP "stored" + XML SpreadsheetML (dengan dropdown validasi)
 *  - Baca : ZIP (deflate via DecompressionStream) + DOMParser
 *  - Juga membaca CSV (pemisah koma atau titik koma)
 * ===================================================================== */
const XLSXLite = (() => {
  /* ---------- CRC32 & ZIP ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder();

  function zip(files) { // files: [{name, data(string)}]
    const parts = [], central = [];
    let offset = 0;
    files.forEach((f) => {
      const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Berkas bukan .xlsx yang valid. Simpan ulang dari Excel sebagai "Excel Workbook (*.xlsx)".');
    const n = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const out = {};
    const dec = new TextDecoder();
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      out[name] = { method, data: u8.subarray(start, start + csize) };
      p += 46 + nlen + xlen + clen;
    }
    return {
      has: (name) => !!out[name],
      async text(name) {
        const f = out[name];
        if (!f) return null;
        if (f.method === 0) return dec.decode(f.data);
        if (f.method !== 8) throw new Error('Kompresi berkas tidak didukung.');
        if (typeof DecompressionStream === 'undefined') throw new Error('Browser terlalu lama untuk membaca Excel. Gunakan Chrome/Edge terbaru, atau simpan sebagai CSV.');
        const stream = new Blob([f.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return await new Response(stream).text();
      }
    };
  }

  /* ---------- Tulis XLSX ---------- */
  const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const col = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

  function sheetXml(sh, selected) {
    const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
      if (v === '' || v === null || v === undefined) return '';
      const ref = col(ci) + (ri + 1);
      const style = ri === 0 && sh.header ? 1 : (sh.money || []).includes(ci) && typeof v === 'number' ? 2 : sh.wrap ? 3 : 0;
      const s = style ? ` s="${style}"` : '';
      return typeof v === 'number' ? `<c r="${ref}"${s}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${x(v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const cols = sh.widths ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const pane = sh.header ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : '';
    const dv = (sh.validations || []).length ? `<dataValidations count="${sh.validations.length}">${sh.validations.map((v) =>
      `<dataValidation type="${v.type}"${v.operator ? ` operator="${v.operator}"` : ''} allowBlank="1" showErrorMessage="1" errorStyle="${v.style || 'stop'}" errorTitle="${x(v.title || 'Isian tidak valid')}" error="${x(v.error || '')}" showInputMessage="${v.prompt ? 1 : 0}" promptTitle="${x(v.promptTitle || '')}" prompt="${x(v.prompt || '')}" sqref="${v.ref}"><formula1>${x(v.formula)}</formula1></dataValidation>`).join('')}</dataValidations>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"${selected ? ' tabSelected="1"' : ''}>${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData>${dv}</worksheet>`;
  }

  function write(sheets, filename) {
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B4D3E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const files = [
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${x(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', data: styles },
      ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s, i === 0) }))
    ];
    const blob = zip(files);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return blob;
  }

  /* ---------- Baca XLSX ---------- */
  const NS = '*';
  const tags = (node, name) => Array.from(node.getElementsByTagNameNS(NS, name));
  const parseXml = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const colIndex = (ref) => { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

  async function readXlsx(buf) {
    const z = await unzip(buf);
    const wbXml = await z.text('xl/workbook.xml');
    if (!wbXml) throw new Error('Struktur Excel tidak dikenali (workbook.xml tidak ada).');
    const wb = parseXml(wbXml);
    const relsXml = await z.text('xl/_rels/workbook.xml.rels');
    const rels = {};
    if (relsXml) tags(parseXml(relsXml), 'Relationship').forEach((r) => (rels[r.getAttribute('Id')] = r.getAttribute('Target')));
    const sst = [];
    const ssXml = await z.text('xl/sharedStrings.xml');
    if (ssXml) tags(parseXml(ssXml), 'si').forEach((si) => {
      sst.push(tags(si, 't').filter((t) => !(t.parentNode && t.parentNode.localName === 'rPh')).map((t) => t.textContent).join(''));
    });
    const sheets = [];
    for (const s of tags(wb, 'sheet')) {
      const rid = s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || s.getAttribute('r:id');
      let target = rels[rid] || '';
      target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
      sheets.push({ name: s.getAttribute('name'), path: target });
    }
    return {
      names: sheets.map((s) => s.name),
      async rows(name) {
        const sh = sheets.find((s) => s.name === name) || sheets[0];
        const xml = await z.text(sh.path);
        if (!xml) return [];
        const doc = parseXml(xml);
        const out = [];
        tags(doc, 'row').forEach((row, ri) => {
          const rIdx = (parseInt(row.getAttribute('r'), 10) || ri + 1) - 1;
          const arr = [];
          let auto = 0;
          tags(row, 'c').forEach((c) => {
            const ci = c.getAttribute('r') ? colIndex(c.getAttribute('r')) : auto;
            auto = ci + 1;
            const t = c.getAttribute('t');
            const vEl = tags(c, 'v')[0];
            let v = vEl ? vEl.textContent : '';
            if (t === 's') v = sst[parseInt(v, 10)] ?? '';
            else if (t === 'inlineStr') v = tags(c, 't').map((n) => n.textContent).join('');
            else if (t === 'b') v = v === '1';
            else if (t === 'e') v = '#ERROR ' + v;
            else if (t === 'str') v = v;
            else if (v !== '') v = Number(v);
            arr[ci] = v;
          });
          for (let i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = '';
          out[rIdx] = arr;
        });
        for (let i = 0; i < out.length; i++) if (!out[i]) out[i] = [];
        return out;
      }
    };
  }

  /* ---------- Baca CSV ---------- */
  function readCsv(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.includes('\t') && !first.includes(',') ? '\t' : ',');
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
      } else if (ch === '"' && cur === '') q = true;
      else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  /* Baca berkas pilihan pengguna → { sheetName, rows } */
  async function readFile(file, preferSheet) {
    const name = file.name.toLowerCase();
    if (/\.(csv|txt)$/.test(name)) return { sheet: 'CSV', rows: readCsv(await file.text()) };
    if (/\.xls$/.test(name)) throw new Error('Format .xls (Excel lama) belum didukung. Di Excel: File → Save As → "Excel Workbook (*.xlsx)".');
    if (!/\.xlsx$/.test(name)) throw new Error('Gunakan berkas .xlsx (Excel) atau .csv.');
    const wb = await readXlsx(await file.arrayBuffer());
    const sheet = wb.names.find((n) => preferSheet && preferSheet.test(n)) || wb.names[0];
    return { sheet, rows: await wb.rows(sheet) };
  }

  return { write, readFile, readCsv };
})();
