#!/usr/bin/env node
/*
 * Turns the team's illustrated campus map into web-map tiles (tiles/team-map/{z}/{x}/{y}.png).
 *
 * Why tiles: a phone only downloads the few small tiles on screen, sized for its zoom level,
 * instead of one large image. Tiles are 512px images for 256px map squares, so they stay
 * sharp on high-resolution phone screens.
 *
 * The illustration's flat background color is made transparent beyond a margin around the
 * drawn campus, so a faded street map can show around it.
 *
 * Settings: scripts/team-map.json
 *   source       PNG export of the illustration (e.g. from Illustrator, about 6000px wide)
 *   bounds       real-world corners of the illustration (it is north-up and to scale)
 *   background   the illustration's background color, to be faded out away from campus
 *   closeGapsMeters   fill gaps (lawns, courtyards) narrower than about twice this between drawn features
 *   edgeMarginMeters  how far the background color extends beyond drawn features before fading out
 *   borderFadeMeters  short fade at the artboard border so nothing ends in a hard cut
 *   featherMeters     final softening of the mask edge
 *   minZoom, maxZoom, output
 *
 * Run: npm run team-map            (requires `npm install` once; uses sharp, Apache-2.0)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'team-map.json'), 'utf8'));
const src = path.join(root, cfg.source);
const outDir = path.join(root, cfg.output);
const TILE = 512;                      // image pixels per tile (displayed at 256 CSS px)
const R = 6378137;                     // Web Mercator sphere radius
const WORLD = 2 * Math.PI * R;

const mercX = lng => R * lng * Math.PI / 180;
const mercY = lat => R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
const b = cfg.bounds;
const box = { x0: mercX(b.west), x1: mercX(b.east), y0: mercY(b.north), y1: mercY(b.south) };
const groundWidthM = (box.x1 - box.x0) * Math.cos(((b.north + b.south) / 2) * Math.PI / 180);

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// Squared-distance transform (two-pass, 8-neighbour chamfer): distance in pixels to the nearest `true` cell.
function distanceTo(grid, w, h) {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = grid[i] ? 0 : INF;
  const D = Math.SQRT2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) { v = Math.min(v, d[i - w] + 1); if (x > 0) v = Math.min(v, d[i - w - 1] + D); if (x < w - 1) v = Math.min(v, d[i - w + 1] + D); }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < h - 1) { v = Math.min(v, d[i + w] + 1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + D); if (x > 0) v = Math.min(v, d[i + w - 1] + D); }
    d[i] = v;
  }
  return d;
}

// Builds the alpha mask. Drawn features (buildings, paths, the cemetery) stay opaque; the flat
// background color is kept only near them and fades out with distance, so the edge of the
// illustration follows the shape of what's drawn rather than the rectangle of the artboard.
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

async function buildMask(W, H) {
  const small = 2000, sh = Math.round(small * H / W);      // ~0.55 m per mask pixel
  const mPerPx = groundWidthM / small;
  const { data } = await sharp(src).removeAlpha().resize(small, sh).raw().toBuffer({ resolveWithObject: true });
  const [br, bg, bb] = hex(cfg.background), tol = cfg.backgroundTolerance || 18;
  const n = small * sh, art = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], bl = data[i * 3 + 2];
    art[i] = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(bl - bb) > tol ? 1 : 0;
  }

  // 1. Closing (grow, then shrink) fills lawns and courtyards between drawn features. The artboard
  //    border counts as "outside" while shrinking, so the filled area pulls back from straight edges.
  const close = cfg.closeGapsMeters / mPerPx;
  const d1 = distanceTo(art, small, sh);
  const outside = new Uint8Array(n);
  for (let y = 0; y < sh; y++) for (let x = 0; x < small; x++) {
    const i = y * small + x;
    outside[i] = d1[i] > close || x === 0 || y === 0 || x === small - 1 || y === sh - 1 ? 1 : 0;
  }
  const d2 = distanceTo(outside, small, sh);
  const region = new Uint8Array(n);
  for (let i = 0; i < n; i++) region[i] = art[i] || d2[i] > close ? 1 : 0;

  // 2. Background fades out with distance from the drawn area: a halo that hugs its contour.
  const d3 = distanceTo(region, small, sh);
  const halo = cfg.edgeMarginMeters / mPerPx;
  const mask = Buffer.alloc(n);
  for (let i = 0; i < n; i++) mask[i] = Math.round(255 * (1 - smooth(d3[i] / halo)));

  // 3. A short fade at the artboard border so nothing ever ends in a hard cut.
  const ramp = Math.max(1, (cfg.borderFadeMeters || 12) / mPerPx);
  for (let y = 0; y < sh; y++) for (let x = 0; x < small; x++) {
    const i = y * small + x;
    mask[i] = Math.round(mask[i] * smooth(Math.min(x, y, small - 1 - x, sh - 1 - y) / ramp));
  }

  const featherPx = Math.max(1, (cfg.featherMeters || 2) * W / groundWidthM);
  return sharp(mask, { raw: { width: small, height: sh, channels: 1 } })
    .resize(W, H, { kernel: 'linear' }).blur(featherPx).extractChannel(0).raw().toBuffer();
}

(async () => {
  if (!fs.existsSync(src)) {
    console.error(`Source image not found: ${cfg.source}\nExport the illustration as a PNG (about 6000px wide) to that path.`);
    process.exit(1);
  }
  const meta = await sharp(src).metadata();
  const W = meta.width, H = meta.height;
  console.log(`source ${W}×${H}px, covering ${groundWidthM.toFixed(0)} m east–west`);

  const alpha = await buildMask(W, H);
  if (alpha.length !== W * H) throw new Error(`mask is ${alpha.length} bytes, expected ${W * H}`);
  const rgb = await sharp(src).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0, n = W * H; i < n; i++) {
    rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  const base = () => sharp(rgba, { raw: { width: W, height: H, channels: 4 } });

  fs.rmSync(outDir, { recursive: true, force: true });
  let count = 0, bytes = 0;
  for (let z = cfg.minZoom; z <= cfg.maxZoom; z++) {
    const scale = TILE * 2 ** z / WORLD;                    // image px per Mercator metre at this zoom
    const left = (box.x0 + WORLD / 2) * scale, top = (WORLD / 2 - box.y0) * scale;
    const w = Math.max(1, Math.round((box.x1 - box.x0) * scale));
    const h = Math.max(1, Math.round((box.y0 - box.y1) * scale));
    const tx0 = Math.floor(left / TILE), ty0 = Math.floor(top / TILE);
    const tx1 = Math.floor((left + w - 1) / TILE), ty1 = Math.floor((top + h - 1) / TILE);
    const offX = Math.round(left - tx0 * TILE), offY = Math.round(top - ty0 * TILE);
    const cw = (tx1 - tx0 + 1) * TILE, ch = (ty1 - ty0 + 1) * TILE;

    // Scale the illustration for this zoom, then place it on a canvas aligned to the tile grid.
    const scaled = await base().resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer();
    const canvas = await sharp(scaled, { raw: { width: w, height: h, channels: 4 } })
      .extend({ left: offX, top: offY, right: cw - w - offX, bottom: ch - h - offY, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw().toBuffer();

    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const tile = sharp(canvas, { raw: { width: cw, height: ch, channels: 4 } })
        .extract({ left: (tx - tx0) * TILE, top: (ty - ty0) * TILE, width: TILE, height: TILE });
      // Fully transparent tiles are still written (they compress to ~100 bytes) so phones never
      // request a missing file inside the map's bounds.
      const { data: px } = await tile.clone().raw().toBuffer({ resolveWithObject: true });
      const file = path.join(outDir, String(z), String(tx), `${ty}.png`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const png = await sharp(px, { raw: { width: TILE, height: TILE, channels: 4 } })
        .png({ palette: true, quality: 95, effort: 8, compressionLevel: 9 }).toBuffer();
      fs.writeFileSync(file, png);
      count++; bytes += png.length;
    }
    console.log(`zoom ${z}: tiles x ${tx0}–${tx1}, y ${ty0}–${ty1}`);
  }
  console.log(`wrote ${count} tiles to ${path.relative(root, outDir)} (${(bytes / 1024 / 1024).toFixed(2)} MB total)`);
})().catch(err => { console.error(err); process.exit(1); });
