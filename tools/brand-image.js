// Brand images for the Google Business Profile (2026-10-18): a 16:9 cover (2400 x 1350) and a square (1200 x 1200).
// usage: node tools/brand-image.js "<output folder>"     (needs @napi-rs/canvas; uses the fluent-practice copy)
const fs = require('fs'), path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('C:/Users/aviva/Documents/fluent-practice/node_modules/@napi-rs/canvas');
const OUT = process.argv[2] || path.join(__dirname, '..', 'brand-out');
fs.mkdirSync(OUT, { recursive: true });
const F = 'C:/Windows/Fonts/';
GlobalFonts.registerFromPath(F + 'seguisb.ttf', 'SegoeSB');
GlobalFonts.registerFromPath(F + 'segoeui.ttf', 'SegoeR');
GlobalFonts.registerFromPath(F + 'segoeuil.ttf', 'SegoeL');
const C = { teal: '#15838E', deep: '#0E6570', slate: '#545A5C', ink: '#1B2021', wash: '#E8F2F3', mist: '#F5F9F9' };
const TAGLINE = 'Professional Expertise. Personal Attention.';

(async () => {
  const mark = await loadImage(fs.readFileSync(path.join(__dirname, '..', 'assets', 'mark-512.png')));

  // ---------- 16:9 cover ----------
  {
    const W = 2400, H = 1350, c = createCanvas(W, H), g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(0.55, C.mist); bg.addColorStop(1, C.wash);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // The mark, very large and faint, off the right edge (as on the website).
    g.globalAlpha = 0.07; g.drawImage(mark, W - 980, 120, 1300, 1290); g.globalAlpha = 1;
    // A slim teal band on the left edge.
    g.fillStyle = C.teal; g.fillRect(0, 0, 18, H);
    const X = 200;
    // Logo mark and name.
    g.drawImage(mark, X, 250, 230, 228);
    g.textBaseline = 'alphabetic';
    g.font = '118px SegoeSB'; g.fillStyle = C.slate; g.fillText('FLUENT', X + 270, 395);
    const w1 = g.measureText('FLUENT ').width;
    g.fillStyle = C.teal; g.fillText('FINANCIALS', X + 270 + w1, 395);
    const w2 = g.measureText('FINANCIALS').width;
    g.font = '46px SegoeSB'; g.fillStyle = C.slate; g.fillText('LLC', X + 270 + w1 + w2 + 14, 395);
    g.font = '46px SegoeL'; g.fillStyle = C.slate; g.fillText('Full-Service Accounting Firm', X + 274, 460);
    // Rule, tagline, services.
    g.fillStyle = C.teal; g.fillRect(X, 640, 150, 7);
    g.font = '92px SegoeSB'; g.fillStyle = C.ink; g.fillText(TAGLINE, X, 790);
    g.font = '52px SegoeR'; g.fillStyle = C.deep; g.fillText('Tax   \u00B7   Accounting   \u00B7   Fractional CFO', X, 890);
    // Footer line.
    g.fillStyle = 'rgba(84,90,92,.25)'; g.fillRect(X, 1090, W - 2 * X, 2);
    g.font = '42px SegoeR'; g.fillStyle = C.slate;
    g.fillText('Montgomery County, Maryland', X, 1170);
    const right = 'fluentcpa.com   |   410-929-4884';
    g.fillText(right, W - X - g.measureText(right).width, 1170);
    fs.writeFileSync(path.join(OUT, 'Fluent Financials cover 2400x1350.png'), await c.encode('png'));
    fs.writeFileSync(path.join(OUT, 'Fluent Financials cover 2400x1350.jpg'), await c.encode('jpeg', 93));
  }

  // ---------- square (profile picture / posts) ----------
  {
    const S = 1200, c = createCanvas(S, S), g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, S, S); bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, C.wash);
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    g.globalAlpha = 0.06; g.drawImage(mark, 420, 380, 1000, 992); g.globalAlpha = 1;
    g.drawImage(mark, (S - 380) / 2, 170, 380, 377);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = '104px SegoeSB';
    const a = 'FLUENT ', b = 'FINANCIALS', wa = g.measureText(a).width, wb = g.measureText(b).width, x0 = (S - wa - wb) / 2;
    g.textAlign = 'left'; g.fillStyle = C.slate; g.fillText(a, x0, 690); g.fillStyle = C.teal; g.fillText(b, x0 + wa, 690);
    g.textAlign = 'center';
    g.font = '44px SegoeL'; g.fillStyle = C.slate; g.fillText('Full-Service Accounting Firm', S / 2, 760);
    g.fillStyle = C.teal; g.fillRect(S / 2 - 70, 830, 140, 6);
    g.font = '50px SegoeSB'; g.fillStyle = C.ink; g.fillText('Professional Expertise.', S / 2, 930); g.fillText('Personal Attention.', S / 2, 1000);
    fs.writeFileSync(path.join(OUT, 'Fluent Financials square 1200x1200.png'), await c.encode('png'));
    fs.writeFileSync(path.join(OUT, 'Fluent Financials square 1200x1200.jpg'), await c.encode('jpeg', 93));
  }
  console.log('written to ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
