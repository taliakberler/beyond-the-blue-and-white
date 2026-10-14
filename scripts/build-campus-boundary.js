#!/usr/bin/env node
/*
 * Downloads UNC's campus boundary parcels, merges ("dissolves") them into one outline,
 * simplifies it, and writes data/campus-boundary.geojson for the map.
 *
 * Settings come from "tour.campusBoundary" in data/stops.json:
 *   sourceUrl  ArcGIS layer (…/FeatureServer/N or …/MapServer/N)
 *   where      which parcels to include (ArcGIS SQL, e.g. "BROADAREAS = 'Central Campus'")
 *   closeGapsMeters  bridge gaps narrower than about twice this (public streets between
 *                    University parcels) so campus reads as one area. 0 = exact parcels.
 *
 * Re-run (npm run boundary) whenever UNC updates its boundary data.
 * Uses Turf (MIT) for the geometry work. Requires Node 18+ (built-in fetch).
 */
const fs = require('fs');
const path = require('path');
const { union } = require('@turf/union');
const { buffer } = require('@turf/buffer');
const { simplify } = require('@turf/simplify');
const { truncate } = require('@turf/truncate');
const { featureCollection } = require('@turf/helpers');

const root = path.join(__dirname, '..');
const { tour } = JSON.parse(fs.readFileSync(path.join(root, 'data/stops.json'), 'utf8'));
const cfg = tour.campusBoundary || {};
if (!cfg.sourceUrl) {
  console.error('Add tour.campusBoundary.sourceUrl to data/stops.json');
  process.exit(1);
}
const base = cfg.sourceUrl.replace(/\/+$/, '').replace(/\/query$/, '');
const where = cfg.where || '1=1';
const outFile = path.join(root, cfg.file || 'data/campus-boundary.geojson');

async function fetchAll() {
  let features = [];
  for (let offset = 0, page = 0; page < 20; page++) {
    const url = `${base}/query?where=${encodeURIComponent(where)}&outFields=OBJECTID&outSR=4326&f=geojson` +
      (offset ? `&resultOffset=${offset}` : '');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    const geo = await res.json();
    if (geo.error) throw new Error(geo.error.message);
    const batch = geo.features || [];
    features = features.concat(batch);
    const more = geo.exceededTransferLimit || (geo.properties && geo.properties.exceededTransferLimit);
    if (!more || !batch.length) break;
    offset += batch.length;
  }
  return features.filter(f => f.geometry && /Polygon$/.test(f.geometry.type));
}

(async () => {
  const parcels = await fetchAll();
  if (!parcels.length) throw new Error('No parcels matched — check "where" in tour.campusBoundary');
  console.log(`downloaded ${parcels.length} parcels`);

  let merged = parcels.length > 1 ? union(featureCollection(parcels)) : parcels[0];
  // Morphological "closing": grow every edge outward, merge, then shrink back by the same amount.
  // Gaps narrower than ~2× the distance (streets between parcels) fill in; the outer edge stays put.
  const gap = Number(cfg.closeGapsMeters || 0);
  if (gap > 0) {
    merged = buffer(merged, gap, { units: 'meters', steps: 4 });
    merged = buffer(merged, -gap, { units: 'meters', steps: 4 });
  }
  // ~1 m tolerance: removes surveying detail that can't be seen at walking-tour zoom levels.
  const simple = truncate(simplify(merged, { tolerance: 0.00001, highQuality: true }), { precision: 6 });
  simple.properties = {
    name: cfg.label || 'Campus boundary',
    source: base,
    where,
    closeGapsMeters: gap,
    parcels: parcels.length,
    generated: new Date().toISOString().slice(0, 10)
  };

  const out = JSON.stringify(featureCollection([simple]));
  fs.writeFileSync(outFile, out + '\n');
  const pieces = simple.geometry.type === 'MultiPolygon' ? simple.geometry.coordinates.length : 1;
  console.log(`wrote ${path.relative(root, outFile)}: ${pieces} area(s), ${(out.length / 1024).toFixed(1)} KB`);
})().catch(err => { console.error(err.message || err); process.exit(1); });
