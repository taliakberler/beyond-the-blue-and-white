#!/usr/bin/env node
/*
 * Adds a content-based version to the CSS and JavaScript links in index.html
 * (e.g. js/app.js?v=1a2b3c4d), so browsers never combine a new page with an old cached script.
 *
 * Run after changing any CSS or JS file:  npm run stamp
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const page = path.join(root, 'index.html');
const ASSETS = ['css/styles.css', 'js/app.js', 'js/vendor/leaflet/leaflet.css', 'js/vendor/leaflet/leaflet.js'];

let html = fs.readFileSync(page, 'utf8');
for (const asset of ASSETS) {
  const hash = crypto.createHash('sha1').update(fs.readFileSync(path.join(root, asset))).digest('hex').slice(0, 8);
  const pattern = new RegExp(`(["'])${asset.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(\\?v=[0-9a-f]+)?\\1`, 'g');
  const found = pattern.test(html);
  pattern.lastIndex = 0;
  html = html.replace(pattern, `$1${asset}?v=${hash}$1`);
  console.log(`${asset}?v=${hash}${found ? '' : '  (not referenced in index.html)'}`);
}
fs.writeFileSync(page, html);
