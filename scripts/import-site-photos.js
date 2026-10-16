#!/usr/bin/env node
/*
 * Imports the team's site photos, as listed in scripts/site-photos.json:
 *   - makes a web-sized JPEG of each (longest side at most maxSize px, EXIF rotation applied,
 *     metadata removed) at images/<stop-id>/<dest>
 *   - replaces each listed stop's "images" in data/stops.json with the manifest's entries, in order
 *     (the first is the site's hero)
 *   - deletes image files in images/<stop-id>/ that are no longer used by that stop
 *
 * Run after the team sends new or updated photos:  npm run photos
 * Optionally pass a different source folder:      npm run photos -- "/path/to/folder"
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'site-photos.json'), 'utf8'));
const srcDir = (process.argv[2] || manifest.sourceFolder).replace(/^~(?=\/|$)/, os.homedir());
const dataFile = path.join(root, 'data/stops.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const MAX = manifest.maxSize || 1600;

(async () => {
  for (const [stopId, photos] of Object.entries(manifest.stops)) {
    const stop = data.stops.find(s => s.id === stopId);
    if (!stop) throw new Error(`No stop with id "${stopId}" in data/stops.json`);
    const outDir = path.join(root, 'images', stopId);
    fs.mkdirSync(outDir, { recursive: true });

    const images = [];
    for (const p of photos) {
      const src = path.join(srcDir, p.source);
      if (!fs.existsSync(src)) throw new Error(`Missing source photo: ${src}`);
      const out = path.join(outDir, p.dest);
      const info = await sharp(src)
        .rotate()                                            // apply camera orientation
        .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })                  // any transparency → white
        .toColourspace('srgb')
        .jpeg({ quality: 80, mozjpeg: true })                // no metadata is kept
        .toFile(out);
      console.log(`${stopId}/${p.dest}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`);
      images.push({ src: `images/${stopId}/${p.dest}`, alt: p.alt, caption: p.caption, credit: p.credit, permission: p.permission });
    }
    stop.images = images;

    // Remove this stop's old photos that are no longer listed.
    const keep = new Set(photos.map(p => p.dest));
    for (const f of fs.readdirSync(outDir)) {
      if (!keep.has(f) && /\.(jpe?g|png|webp|gif|svg)$/i.test(f)) {
        fs.unlinkSync(path.join(outDir, f));
        console.log(`  removed old ${stopId}/${f}`);
      }
    }
  }
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2) + '\n');
  console.log('updated data/stops.json');
})().catch(err => { console.error(err.message || err); process.exit(1); });
