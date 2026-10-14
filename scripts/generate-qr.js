#!/usr/bin/env node
/*
 * Generates static PNG QR codes into qr/, plus a printable qr/sheet.html:
 *   qr/tour.png       the whole tour (home page, all stops on the map): <BASE_URL>/
 *   qr/<stop-id>.png  one per stop: <BASE_URL>/index.html#stop=<id>
 *
 * BASE_URL is set in scripts/qr-config.json (or override: BASE_URL=https://... npm run qr).
 * Uses the open-source "qrcode" package (MIT). No third-party redirect services.
 */
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'qr-config.json'), 'utf8'));
const BASE_URL = (process.env.BASE_URL || config.BASE_URL || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(BASE_URL)) {
  console.error('Set BASE_URL in scripts/qr-config.json (must start with https://)');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(path.join(root, 'data/stops.json'), 'utf8'));
const tour = data.tour || {};
const stops = [...data.stops].sort((a, b) => a.order - b.order);
const outDir = path.join(root, 'qr');
fs.mkdirSync(outDir, { recursive: true });

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const urlFor = s => `${BASE_URL}/index.html#stop=${encodeURIComponent(s.id)}`;
const TOUR_URL = `${BASE_URL}/`;

const writeQR = (name, url) => QRCode.toFile(path.join(outDir, name), url, {
  type: 'png',
  errorCorrectionLevel: 'Q',  // tolerates scuffs/dirt on outdoor signs
  margin: 4,                  // quiet zone required by scanners
  width: 1200,                // crisp when printed ~4–6 in wide
  color: { dark: '#000000', light: '#ffffff' }
}).then(() => console.log(`qr/${name}  ->  ${url}`));

(async () => {
  await writeQR('tour.png', TOUR_URL);
  for (const s of stops) await writeQR(`${s.id}.png`, urlFor(s));

  const tourCard = `
  <section class="sign">
    <p class="tour">${esc(tour.title || 'Walking Tour')}</p>
    <h1>${esc(tour.subtitle || 'A self-guided walking tour')}</h1>
    <img src="tour.png" alt="QR code linking to the ${esc(tour.title || 'walking')} tour">
    <p class="cta">Scan with your phone camera to start the tour</p>
    <p class="detail">${stops.length} stops · free · no app needed</p>
    <p class="url">${esc(TOUR_URL)}</p>
  </section>`;

  const cards = stops.map(s => `
  <section class="sign">
    <p class="tour">${esc(tour.title || 'Walking Tour')}</p>
    <div class="num" aria-hidden="true">${s.order}</div>
    <h1>Stop ${s.order}: ${esc(s.title)}</h1>
    <img src="${esc(s.id)}.png" alt="QR code linking to stop ${s.order}, ${esc(s.title)}">
    <p class="cta">Scan with your phone camera to open this stop</p>
    <p class="url">${esc(urlFor(s))}</p>
  </section>`).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tour.title || 'Walking Tour')} — QR signs</title>
<style>
  @font-face { font-family: "Gasoek One"; src: url("../fonts/gasoek-one-400-latin.woff2") format("woff2"); font-weight: 400; }
  @font-face { font-family: "Oswald"; src: url("../fonts/oswald-700-latin.woff2") format("woff2"); font-weight: 700; }
  @font-face { font-family: "Lato"; src: url("../fonts/lato-400-latin.woff2") format("woff2"); font-weight: 400; }
  @font-face { font-family: "Lato"; src: url("../fonts/lato-700-latin.woff2") format("woff2"); font-weight: 700; }
  @page { size: letter portrait; margin: 0.5in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Lato", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #000; background: #e9edf1; }
  .help { max-width: 7.5in; margin: 16px auto; padding: 12px 16px; background: #fff; border-radius: 8px; font-size: 14px; }
  .sign { width: 7.5in; height: 10in; margin: 16px auto; padding: 0.4in; background: #fff;
          display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
          border: 2px solid #000; page-break-after: always; break-after: page; }
  .tour { margin: 0; font-family: "Gasoek One", "Arial Black", sans-serif; font-size: 22pt; font-weight: 400; letter-spacing: 0.02em; }
  .num { margin: 0.2in 0 0.1in; width: 1.3in; height: 1.3in; border-radius: 50%; background: #000; color: #fff;
         display: grid; place-items: center; font-family: "Oswald", "Arial Narrow", sans-serif; font-size: 64pt; font-weight: 700; line-height: 1; }
  h1 { margin: 0 0 0.2in; font-family: "Oswald", "Arial Narrow", sans-serif; font-size: 28pt; font-weight: 700; line-height: 1.15; }
  img { width: 5in; height: 5in; image-rendering: pixelated; }
  .cta { margin: 0.15in 0 0.05in; font-size: 18pt; font-weight: 700; }
  .detail { margin: 0 0 0.1in; font-size: 14pt; }
  .url { margin: 0; font-size: 9pt; color: #333; word-break: break-all; }
  @media print { body { background: #fff; } .help { display: none; } .sign { margin: 0; border: 0; } }
</style>
</head>
<body>
<div class="help">One sign per page (US Letter). The first page is a whole-tour sign (for flyers, entrances, and promotion); the rest are one per stop. Print at 100% scale. Codes point to <code>${esc(BASE_URL)}</code> — regenerate with <code>npm run qr</code> after changing BASE_URL or stop IDs.</div>
${tourCard}
${cards}
</body>
</html>
`;
  fs.writeFileSync(path.join(outDir, 'sheet.html'), html);
  console.log('qr/sheet.html written');
})().catch(err => { console.error(err); process.exit(1); });
