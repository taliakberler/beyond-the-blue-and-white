#!/usr/bin/env node
// Writes simple SVG placeholder images (images/stop-N-a.svg, -b.svg) for every stop
// in data/stops.json. Safe to delete once real images are added.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { stops } = JSON.parse(fs.readFileSync(path.join(root, 'data/stops.json'), 'utf8'));

const svg = (stop, letter, n) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="Placeholder image ${n} for stop ${stop}">
  <rect width="800" height="600" fill="#d9dee4"/>
  <path d="M0 470 L210 300 L360 420 L520 250 L800 470 V600 H0 Z" fill="#b9c1ca"/>
  <circle cx="620" cy="150" r="56" fill="#c6cdd5"/>
  <rect x="40" y="40" width="300" height="56" rx="8" fill="#3b4652"/>
  <text x="190" y="78" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#ffffff" text-anchor="middle">PLACEHOLDER</text>
  <text x="400" y="560" font-family="system-ui, sans-serif" font-size="34" font-weight="600" fill="#2a333d" text-anchor="middle">Stop ${stop} · Image ${n} (${letter})</text>
</svg>
`;

for (const s of stops) {
  ['a', 'b'].forEach((letter, i) => {
    const file = path.join(root, 'images', `stop-${s.order}-${letter}.svg`);
    fs.writeFileSync(file, svg(s.order, letter, i + 1));
    console.log('wrote', path.relative(root, file));
  });
}
