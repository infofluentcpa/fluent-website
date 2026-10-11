/**
 * Builds the "save our contact" files from ONE set of details:
 *   assets/fluent-financials.vcf   the contact card a phone or computer opens
 *   assets/contact-qr.svg          a QR code holding the same card, for a phone camera
 *
 *   node tools/contact.js          rebuild both files after changing CONTACT
 *   node tools/contact.js --test   check the QR maker against published reference values
 *
 * The QR maker is written here (byte mode, versions 1-12) so the site needs no
 * outside service or library. It refuses rather than guessing: anything too long
 * for a version-12 code stops the build.
 */
const fs = require('fs');
const path = require('path');

const CONTACT = {
  first: 'Aviva', last: 'Hendry', suffix: 'CPA',
  org: 'Fluent Financials, LLC', title: 'CPA',
  phone: '+1-410-929-4884', email: 'info@fluentcpa.com',
  url: 'https://www.fluentcpa.com', linkedin: 'https://www.linkedin.com/company/fluent-financials-llc'
};

// ---------- vCard (3.0) ----------
const vesc = (s) => String(s).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');
function vcard(c, photoBase64) {
  const lines = [
    'BEGIN:VCARD', 'VERSION:3.0',
    'N:' + [vesc(c.last), vesc(c.first), '', '', vesc(c.suffix)].join(';'),
    'FN:' + vesc(c.first + ' ' + c.last + ', ' + c.suffix),
    'ORG:' + vesc(c.org),
    'TITLE:' + vesc(c.title),
    'TEL;TYPE=WORK,VOICE:' + c.phone,
    'EMAIL;TYPE=INTERNET,WORK:' + c.email,
    'URL;TYPE=WORK:' + c.url
  ];
  if (photoBase64) {
    lines.push('X-SOCIALPROFILE;TYPE=linkedin:' + c.linkedin);
    // Long lines are folded at 75 characters; a continuation line starts with a space.
    const photo = 'PHOTO;ENCODING=b;TYPE=PNG:' + photoBase64;
    const folded = [photo.slice(0, 75)];
    for (let i = 75; i < photo.length; i += 74) folded.push(' ' + photo.slice(i, i + 74));
    lines.push.apply(lines, folded);
  }
  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}

/** The card inside the QR code: essentials only, so the code stays small and easy to scan from a screen. */
function vcardCompact(c) {
  return ['BEGIN:VCARD', 'VERSION:3.0',
    'N:' + [vesc(c.last), vesc(c.first), '', '', vesc(c.suffix)].join(';'),
    'FN:' + vesc(c.first + ' ' + c.last + ', ' + c.suffix),
    'ORG:' + vesc(c.org),
    'TEL:' + c.phone.replace(/[^+0-9]/g, ''),
    'EMAIL:' + c.email,
    'URL:' + c.url,
    'END:VCARD'].join('\n') + '\n';
}

// ---------- QR code (ISO/IEC 18004), byte mode ----------
const EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };
// Reed-Solomon blocks per version and level: [count, total, data, (count2, total2, data2)].
const RS_BLOCKS = {
  1: { L: [1, 26, 19], M: [1, 26, 16], Q: [1, 26, 13], H: [1, 26, 9] },
  2: { L: [1, 44, 34], M: [1, 44, 28], Q: [1, 44, 22], H: [1, 44, 16] },
  3: { L: [1, 70, 55], M: [1, 70, 44], Q: [2, 35, 17], H: [2, 35, 13] },
  4: { L: [1, 100, 80], M: [2, 50, 32], Q: [2, 50, 24], H: [4, 25, 9] },
  5: { L: [1, 134, 108], M: [2, 67, 43], Q: [2, 33, 15, 2, 34, 16], H: [2, 33, 11, 2, 34, 12] },
  6: { L: [2, 86, 68], M: [4, 43, 27], Q: [4, 43, 19], H: [4, 43, 15] },
  7: { L: [2, 98, 78], M: [4, 49, 31], Q: [2, 32, 14, 4, 33, 15], H: [4, 39, 13, 1, 40, 14] },
  8: { L: [2, 121, 97], M: [2, 60, 38, 2, 61, 39], Q: [4, 40, 18, 2, 41, 19], H: [4, 40, 14, 2, 41, 15] },
  9: { L: [2, 146, 116], M: [3, 58, 36, 2, 59, 37], Q: [4, 36, 16, 4, 37, 17], H: [4, 36, 12, 4, 37, 13] },
  10: { L: [2, 86, 68, 2, 87, 69], M: [4, 69, 43, 1, 70, 44], Q: [6, 43, 19, 2, 44, 20], H: [6, 43, 15, 2, 44, 16] },
  11: { L: [4, 101, 81], M: [1, 80, 50, 4, 81, 51], Q: [4, 50, 22, 4, 51, 23], H: [3, 36, 12, 8, 37, 13] },
  12: { L: [2, 116, 92, 2, 117, 93], M: [6, 58, 36, 2, 59, 37], Q: [4, 46, 20, 6, 47, 21], H: [7, 42, 14, 4, 43, 15] }
};
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42],
                9: [6, 26, 46], 10: [6, 28, 50], 11: [6, 30, 54], 12: [6, 32, 58] };

// GF(256), primitive polynomial x^8 + x^4 + x^3 + x^2 + 1.
const EXP = new Array(512), LOG = new Array(256);
(function () { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const gmul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

function rsGenerator(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { next[j] ^= g[j]; next[j + 1] ^= gmul(g[j], EXP[i]); }
    g = next;
  }
  return g;
}
function rsEncode(data, n) {
  const g = rsGenerator(n), rem = data.concat(new Array(n).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = rem[i];
    if (coef !== 0) for (let j = 0; j < g.length; j++) rem[i + j] ^= gmul(g[j], coef);
  }
  return rem.slice(data.length);
}

function blocksFor(version, level) {
  const t = RS_BLOCKS[version][level], out = [];
  for (let k = 0; k < t.length; k += 3) for (let i = 0; i < t[k]; i++) out.push({ total: t[k + 1], data: t[k + 2] });
  return out;
}
const bchDigit = (d) => { let n = 0; while (d !== 0) { n++; d >>>= 1; } return n; };
function formatBits(level, mask) {
  const G15 = 0x537, MASK = 0x5412, data = (EC_BITS[level] << 3) | mask;
  let d = data << 10;
  while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15));
  return ((data << 10) | d) ^ MASK;
}
function versionBits(version) {
  const G18 = 0x1F25;
  let d = version << 12;
  while (bchDigit(d) - bchDigit(G18) >= 0) d ^= G18 << (bchDigit(d) - bchDigit(G18));
  return (version << 12) | d;
}
const MASKS = [
  (i, j) => (i + j) % 2 === 0, (i) => i % 2 === 0, (i, j) => j % 3 === 0, (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0, (i, j) => (i * j) % 2 + (i * j) % 3 === 0,
  (i, j) => ((i * j) % 2 + (i * j) % 3) % 2 === 0, (i, j) => ((i * j) % 3 + (i + j) % 2) % 2 === 0
];

/** The final codeword sequence (data + error correction, interleaved). */
function codewords(bytes, version, level) {
  const blocks = blocksFor(version, level);
  const dataTotal = blocks.reduce((s, b) => s + b.data, 0);
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(4, 4); put(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));
  if (bits.length > dataTotal * 8) throw new Error('data too long for version ' + version + '-' + level);
  for (let i = 0; i < 4 && bits.length < dataTotal * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0; data.length < dataTotal; pad++) data.push(pad % 2 ? 0x11 : 0xEC);
  let k = 0;
  const dBlocks = [], eBlocks = [];
  blocks.forEach((b) => { const d = data.slice(k, k + b.data); k += b.data; dBlocks.push(d); eBlocks.push(rsEncode(d, b.total - b.data)); });
  const out = [];
  const maxD = Math.max.apply(null, dBlocks.map((d) => d.length)), maxE = Math.max.apply(null, eBlocks.map((e) => e.length));
  for (let i = 0; i < maxD; i++) dBlocks.forEach((d) => { if (i < d.length) out.push(d[i]); });
  for (let i = 0; i < maxE; i++) eBlocks.forEach((e) => { if (i < e.length) out.push(e[i]); });
  return out;
}

function matrix(version, level, mask, cw) {
  const n = 17 + 4 * version;
  const m = Array.from({ length: n }, () => new Array(n).fill(null));
  const finder = (r, c) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const rr = r + i, cc = c + j;
      if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
      const on = (i >= 0 && i <= 6 && (j === 0 || j === 6)) || (j >= 0 && j <= 6 && (i === 0 || i === 6)) || (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      m[rr][cc] = on;
    }
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  const al = ALIGN[version];
  al.forEach((r) => al.forEach((c) => {
    if (m[r][c] !== null) return;   // overlaps a finder
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) m[r + i][c + j] = Math.max(Math.abs(i), Math.abs(j)) !== 1;
  }));
  for (let i = 8; i < n - 8; i++) { if (m[i][6] === null) m[i][6] = i % 2 === 0; if (m[6][i] === null) m[6][i] = i % 2 === 0; }
  const fb = formatBits(level, mask);
  for (let i = 0; i < 15; i++) {
    const on = ((fb >> i) & 1) === 1;
    if (i < 6) m[i][8] = on; else if (i < 8) m[i + 1][8] = on; else m[n - 15 + i][8] = on;
    if (i < 8) m[8][n - i - 1] = on; else if (i < 9) m[8][15 - i] = on; else m[8][15 - i - 1] = on;
  }
  m[n - 8][8] = true;   // the dark module
  if (version >= 7) {
    const vb = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const on = ((vb >> i) & 1) === 1;
      m[Math.floor(i / 3)][i % 3 + n - 11] = on;
      m[i % 3 + n - 11][Math.floor(i / 3)] = on;
    }
  }
  // Data, in the zig-zag from the bottom right, two columns at a time.
  const fn = MASKS[mask];
  let row = n - 1, inc = -1, bit = 7, byte = 0;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (let c = 0; c < 2; c++) {
        if (m[row][col - c] === null) {
          let dark = byte < cw.length ? ((cw[byte] >>> bit) & 1) === 1 : false;
          if (fn(row, col - c)) dark = !dark;
          m[row][col - c] = dark;
          if (--bit === -1) { byte++; bit = 7; }
        }
      }
      row += inc;
      if (row < 0 || row >= n) { row -= inc; inc = -inc; break; }
    }
  }
  return m;
}

function penalty(m) {
  const n = m.length;
  let p = 0;
  const runs = (get) => {
    for (let a = 0; a < n; a++) {
      let len = 1;
      for (let b = 1; b <= n; b++) {
        if (b < n && get(a, b) === get(a, b - 1)) len++;
        else { if (len >= 5) p += 3 + (len - 5); len = 1; }
      }
    }
  };
  runs((r, c) => m[r][c]); runs((c, r) => m[r][c]);
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = m[r][c];
    if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
  }
  const pat = [true, false, true, true, true, false, true];
  const finderLike = (get) => {
    for (let a = 0; a < n; a++) for (let b = 0; b + 6 < n; b++) {
      if (!pat.every((v, k) => get(a, b + k) === v)) continue;
      const lightBefore = [1, 2, 3, 4].every((k) => b - k < 0 || !get(a, b - k));
      const lightAfter = [1, 2, 3, 4].every((k) => b + 6 + k >= n || !get(a, b + 6 + k));
      if (lightBefore || lightAfter) p += 40;
    }
  };
  finderLike((r, c) => m[r][c]); finderLike((c, r) => m[r][c]);
  let dark = 0; m.forEach((r) => r.forEach((v) => { if (v) dark++; }));
  p += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
  return p;
}

/** Smallest version that fits, best of the eight masks. */
function makeQr(text, level) {
  const bytes = Array.from(Buffer.from(text, 'utf8'));
  for (let v = 1; v <= 12; v++) {
    const cap = blocksFor(v, level).reduce((s, b) => s + b.data, 0) * 8;
    if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 > cap) continue;
    const cw = codewords(bytes, v, level);
    let best = null;
    for (let mask = 0; mask < 8; mask++) {
      const m = matrix(v, level, mask, cw), p = penalty(m);
      if (!best || p < best.p) best = { m: m, p: p, mask: mask };
    }
    return { version: v, level: level, mask: best.mask, modules: best.m, codewords: cw };
  }
  throw new Error('Too long for a version-12 QR code (' + bytes.length + ' bytes). Shorten the contact details.');
}

function svg(qr, fg) {
  const n = qr.modules.length, q = 4, size = n + q * 2;
  let d = '';
  qr.modules.forEach((row, r) => row.forEach((on, c) => { if (on) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z'; }));
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges" role="img" aria-label="QR code: scan to save our contact">' +
         '<rect width="' + size + '" height="' + size + '" fill="#fff"/><path fill="' + fg + '" d="' + d + '"/></svg>\n';
}

/** Reads the codewords back out of a finished matrix (undoing the mask): proves placement is reversible. */
function readBack(qr) {
  const n = qr.modules.length, unmask = MASKS[qr.mask];
  const layer = functionLayer(qr.version, qr.level, qr.mask);
  const bits = [];
  let row = n - 1, inc = -1;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (let c = 0; c < 2; c++) if (layer[row][col - c] === null) bits.push(qr.modules[row][col - c] !== unmask(row, col - c) ? 1 : 0);
      row += inc;
      if (row < 0 || row >= n) { row -= inc; inc = -inc; break; }
    }
  }
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  return out;
}
/** Only the fixed patterns (finders, alignment, timing, format, version); data cells stay null. */
function functionLayer(version, level, mask) {
  const n = 17 + 4 * version, m = matrix(version, level, mask, []);
  const f = Array.from({ length: n }, () => new Array(n).fill(null));
  const take = (r, c) => { if (r >= 0 && r < n && c >= 0 && c < n) f[r][c] = m[r][c]; };
  [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([r, c]) => { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) take(r + i, c + j); });
  const al = ALIGN[version];
  al.forEach((r) => al.forEach((c) => { if (f[r][c] !== null) return; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) take(r + i, c + j); }));
  for (let i = 0; i < n; i++) { take(i, 6); take(6, i); }
  for (let i = 0; i < 9; i++) { take(i, 8); take(8, i); }
  for (let i = n - 8; i < n; i++) { take(i, 8); take(8, i); }
  if (version >= 7) for (let i = 0; i < 6; i++) for (let j = n - 11; j < n - 8; j++) { take(i, j); take(j, i); }
  return f;
}

function tests() {
  const out = [];
  const check = (label, ok, extra) => out.push((ok ? 'PASS ' : 'FAIL ') + label + (extra !== undefined ? '   [' + extra + ']' : ''));
  // Reference values: thonky.com QR tutorial ("HELLO WORLD", version 1-M) and the ISO 18004 format/version tables.
  const hello = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  check('Reed-Solomon matches the published HELLO WORLD 1-M error codewords', rsEncode(hello, 10).join(',') === '196,35,39,119,235,215,231,226,93,23', rsEncode(hello, 10).join(','));
  check('format info, level M mask 0 = 101010000010010', formatBits('M', 0).toString(2).padStart(15, '0') === '101010000010010');
  check('format info, level L mask 0 = 111011111000100', formatBits('L', 0).toString(2).padStart(15, '0') === '111011111000100');
  check('format info, level H mask 0 = 001011010001001', formatBits('H', 0).toString(2).padStart(15, '0') === '001011010001001');
  check('format info, level Q mask 0 = 011010101011111', formatBits('Q', 0).toString(2).padStart(15, '0') === '011010101011111');
  check('version info, version 7 = 000111110010010100', versionBits(7).toString(2).padStart(18, '0') === '000111110010010100');
  // Block tables add up to each version's codeword count.
  const totals = { 1: 26, 2: 44, 3: 70, 4: 100, 5: 134, 6: 172, 7: 196, 8: 242, 9: 292, 10: 346, 11: 404, 12: 466 };
  const bad = [];
  Object.keys(RS_BLOCKS).forEach((v) => ['L', 'M', 'Q', 'H'].forEach((l) => { if (blocksFor(+v, l).reduce((s, b) => s + b.total, 0) !== totals[v]) bad.push(v + l); }));
  check('every block table adds up to its version\'s codeword count', !bad.length, bad.join(','));
  // Refusals first: too long is refused, not squeezed.
  let refused = false; try { makeQr('x'.repeat(400), 'M'); } catch (e) { refused = /Too long/.test(e.message); }
  check('400 bytes is refused (larger than a version-12 code)', refused);
  // Round trip: what is placed can be read back exactly, for several versions and every mask.
  const rt = [];
  ['hi', 'https://www.fluentcpa.com/', vcard(CONTACT), vcardCompact(CONTACT)].forEach((t) => {
    const q = makeQr(t, 'M');
    for (let mask = 0; mask < 8; mask++) {
      const m = matrix(q.version, 'M', mask, q.codewords);
      const back = readBack({ version: q.version, level: 'M', mask: mask, modules: m });
      if (back.slice(0, q.codewords.length).join(',') !== q.codewords.join(',')) rt.push(q.version + '/' + mask);
    }
  });
  check('every codeword reads back exactly (versions used here, all 8 masks)', !rt.length, rt.join(','));
  const q = makeQr(vcardCompact(CONTACT), 'M');
  const n = q.modules.length;
  // Decode the finished code the way a reader would: codewords → de-interleave → check error correction → text.
  const cw = readBack(q).slice(0, q.codewords.length);
  const blocks = blocksFor(q.version, 'M');
  const dB = blocks.map(() => []), eB = blocks.map(() => []);
  let k = 0;
  const maxD = Math.max.apply(null, blocks.map((b) => b.data)), maxE = Math.max.apply(null, blocks.map((b) => b.total - b.data));
  for (let i = 0; i < maxD; i++) blocks.forEach((b, bi) => { if (i < b.data) dB[bi].push(cw[k++]); });
  for (let i = 0; i < maxE; i++) blocks.forEach((b, bi) => { if (i < b.total - b.data) eB[bi].push(cw[k++]); });
  check('each block\'s error correction matches its data (as a reader checks it)', dB.every((d, bi) => rsEncode(d, eB[bi].length).join() === eB[bi].join()));
  const bitsOut = [].concat.apply([], [].concat.apply([], dB).map((b) => b.toString(2).padStart(8, '0').split('').map(Number)));
  const take = (from, len) => parseInt(bitsOut.slice(from, from + len).join(''), 2);
  const len = take(4, q.version < 10 ? 8 : 16), start = 4 + (q.version < 10 ? 8 : 16);
  const text = Buffer.from(Array.from({ length: len }, (_, i) => take(start + i * 8, 8))).toString('utf8');
  check('the code decodes to exactly the contact card (byte mode)', take(0, 4) === 4 && text === vcardCompact(CONTACT), JSON.stringify(text.slice(0, 40)));
  check('…and the card has the name, phone and email', /FN:Aviva Hendry\\, CPA/.test(text) && /TEL:\+14109294884/.test(text) && /EMAIL:info@fluentcpa\.com/.test(text));
  check('finder patterns in three corners, dark module present', q.modules[0][0] && q.modules[6][6] && !q.modules[7][7] && q.modules[n - 1][0] && q.modules[0][n - 1] && q.modules[n - 8][8]);
  check('timing pattern alternates', [8, 9, 10, 11].every((i) => q.modules[6][i] === (i % 2 === 0) && q.modules[i][6] === (i % 2 === 0)));
  // Both copies of the format information agree.
  const f1 = [], f2 = [];
  for (let i = 0; i < 15; i++) {
    f1.push(i < 6 ? q.modules[i][8] : i < 8 ? q.modules[i + 1][8] : q.modules[n - 15 + i][8]);
    f2.push(i < 8 ? q.modules[8][n - i - 1] : i < 9 ? q.modules[8][15 - i] : q.modules[8][15 - i - 1]);
  }
  check('both copies of the format information agree and decode to level M', f1.join() === f2.join() &&
        parseInt(f1.map((b) => (b ? 1 : 0)).reverse().join(''), 2) === formatBits('M', q.mask));
  const failed = out.filter((l) => l.startsWith('FAIL')).length;
  console.log(out.join('\n') + '\n' + (out.length - failed) + '/' + out.length);
  return failed === 0;
}

if (process.argv.includes('--test')) process.exit(tests() ? 0 : 1);

const root = path.join(__dirname, '..');
const photoFile = path.join(root, 'assets', 'apple-touch-icon.png');
const photo = fs.existsSync(photoFile) ? fs.readFileSync(photoFile).toString('base64') : '';
fs.writeFileSync(path.join(root, 'assets', 'fluent-financials.vcf'), vcard(CONTACT, photo));
const qr = makeQr(vcardCompact(CONTACT), 'M');   // the QR holds the essentials, without the photo
fs.writeFileSync(path.join(root, 'assets', 'contact-qr.svg'), svg(qr, '#1B2021'));
console.log('Wrote assets/fluent-financials.vcf and assets/contact-qr.svg (QR version ' + qr.version + '-M, mask ' + qr.mask + ', ' +
            Buffer.byteLength(vcardCompact(CONTACT)) + ' bytes).');
