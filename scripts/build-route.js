#!/usr/bin/env node
// Rebuilds data/route.geojson as a STRAIGHT-LINE path through the stops in "order".
// Use this for drafts only — see README "Replace the route" for a real walking path.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { stops } = JSON.parse(fs.readFileSync(path.join(root, 'data/stops.json'), 'utf8'));
const ordered = [...stops].sort((a, b) => a.order - b.order);

const route = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'Route between stops (straight-line placeholder)' },
    geometry: { type: 'LineString', coordinates: ordered.map(s => [s.lng, s.lat]) }
  }]
};

fs.writeFileSync(path.join(root, 'data/route.geojson'), JSON.stringify(route, null, 2) + '\n');
console.log(`wrote data/route.geojson with ${ordered.length} points`);
