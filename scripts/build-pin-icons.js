#!/usr/bin/env node
/*
 * Builds map-pin versions of the team's icons.
 *   images/icons/source/<name>.svg  the icons exactly as delivered by the design team
 *   images/icons/pins/<name>.svg    versions for the navy map pins (written by this script)
 *
 * For the pins, each icon is:
 *   - recolored: navy parts (#172849) become fog (#eceded) so they show on the navy pin;
 *     the light-blue parts (#87aed0) are kept
 *   - cropped to a square around the drawing, so every icon fills its pin the same way
 *
 * Run after adding or changing an icon:  npm run pins
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'images/icons/source');
const outDir = path.join(root, 'images/icons/pins');
const RECOLOR = { '#172849': '#eceded' };
const MARGIN = 0.06;   // breathing room around the drawing, as a fraction of its size

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.svg')).sort()) {
    let svg = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1];
    if (!vb) { console.warn(`skipped ${file}: no viewBox`); continue; }
    const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number);

    // Find the drawing's bounding box by rendering it (1 px per viewBox unit) and scanning alpha.
    const { data, info } = await sharp(Buffer.from(svg), { density: 72 })
      .resize(Math.round(vw), Math.round(vh)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    const sx = vw / info.width, sy = vh / info.height;
    const bx = vx + x0 * sx, by = vy + y0 * sy, bw = (x1 - x0 + 1) * sx, bh = (y1 - y0 + 1) * sy;
    const side = Math.max(bw, bh) * (1 + 2 * MARGIN);
    const cx = bx + bw / 2, cy = by + bh / 2;
    const square = [cx - side / 2, cy - side / 2, side, side].map(n => +n.toFixed(2)).join(' ');

    svg = svg.replace(/viewBox="[^"]+"/, `viewBox="${square}"`);
    for (const [from, to] of Object.entries(RECOLOR)) svg = svg.replace(new RegExp(from, 'gi'), to);
    // Give each file's CSS classes a unique prefix, in case icons are ever inlined together.
    const prefix = path.basename(file, '.svg');
    svg = svg.replace(/\bcls-(\d+)\b/g, `${prefix}-$1`);

    fs.writeFileSync(path.join(outDir, file), svg);
    console.log(`${file}: drawing ${Math.round(bw)}×${Math.round(bh)} → square viewBox ${square}`);
  }
})().catch(err => { console.error(err); process.exit(1); });
