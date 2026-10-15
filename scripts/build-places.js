#!/usr/bin/env node
/*
 * Builds data/places.geojson: named campus spaces and features (lawns, plazas, monuments,
 * memorial gardens, the cemetery) that the map shows by name on hover or tap. Like the
 * building footprints, they are never drawn; they're invisible targets.
 *
 * Sources, all trimmed to the map area (AREA below):
 *   UNC Facilities GIS, Features/MapServer
 *     11  Historic Features   (points: Old Well, monuments, fountains, sculptures)
 *     14  Memorial Garden     (areas)
 *     15  Landmark Space      (areas: McCorkle Place, Polk Place, the Pit, Coker Arboretum…)
 *   OpenStreetMap (Overpass API): named cemeteries, which UNC's layers don't include
 *
 * Names are tidied with RENAME and EXCLUDE below (UNC's data includes entries like "gargoyle"
 * and "Kenan Woods3").
 *
 * After it's built, data/places.geojson is the file to edit: rename places, delete them, or
 * add new ones (see docs/editing-guide.md). Because re-running this script would overwrite
 * those edits, it refuses to replace an existing file unless run with --force:
 *   npm run places              first build
 *   npm run places -- --force   rebuild from the sources (hand edits are lost)
 *
 * Requires Node 18+ (built-in fetch).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outFile = path.join(root, 'data/places.geojson');

// South-west and north-east corners of the area to include: the illustrated map plus a margin.
const AREA = { south: 35.9065, west: -79.0575, north: 35.9170, east: -79.0390 };

const UNC = 'https://gismaps.unc.edu/arcgis/rest/services/Features/MapServer';
const UNC_LAYERS = [
  { id: 11, kind: 'feature', source: 'UNC Historic Features' },
  { id: 14, kind: 'area', source: 'UNC Memorial Gardens' },
  { id: 15, kind: 'area', source: 'UNC Landmark Spaces' }
];

// Entries with these names (or matching these patterns) are left out: generic or unclear labels.
const EXCLUDE = [/^gargoyle$/i, /^canon$/i, /^fountain$/i, /^time capsule$/i, /^metal sculpture$/i,
  /^student sculpture$/i, /^untitled sculpture$/i, /^saint wall sculpture$/i, /^gates, gift/i,
  /Remnant Forest/i, /Rock Outcropping/i];   // planning designations, not names people use

// Clearer names for UNC entries (UNC name → name shown on the map).
const RENAME = {
  'The Worlds Largest Ram': 'The World’s Largest Ram',
  'Susan Williams Graham': 'Susan Williams Graham Memorial Garden',
  'Battle Park / Forest Theater': 'Battle Park and Forest Theatre',
  'Morehead-Patterson Memorial Bell Tower': 'Morehead-Patterson Bell Tower',
  'Mitchell Hall / Coker Woods': 'Coker Woods',
  'Cameron Ave. Streetscape': 'Cameron Avenue'
};

const strip = s => String(s || '').trim().replace(/\s+/g, ' ');
// "Kenan Woods3" → "Kenan Woods", "Senior Walk2" → "Senior Walk" (UNC numbers the pieces of one place).
const unnumber = s => s.replace(/(\D)\d+$/, '$1').trim();
const round = g => JSON.parse(JSON.stringify(g, (k, v) => typeof v === 'number' ? +v.toFixed(6) : v));

async function getJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function fromUNC(layer) {
  const env = [AREA.west, AREA.south, AREA.east, AREA.north].join(',');
  const url = `${UNC}/${layer.id}/query?where=1%3D1&outFields=NAME&outSR=4326&f=geojson` +
    `&geometry=${env}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`;
  const geo = await getJSON(url);
  if (geo.error) throw new Error(geo.error.message);
  return (geo.features || []).map(f => ({ name: strip(f.properties && f.properties.NAME), geometry: f.geometry, layer }));
}

// Named cemeteries from OpenStreetMap, as polygons.
async function cemeteriesFromOSM() {
  const bbox = [AREA.south, AREA.west, AREA.north, AREA.east].join(',');
  const query = `[out:json][timeout:60];(way["landuse"="cemetery"]["name"](${bbox});way["amenity"="grave_yard"]["name"](${bbox}););out geom;`;
  const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
  for (const server of servers) {
    try {
      const data = await getJSON(server, {
        method: 'POST', body: new URLSearchParams({ data: query }),
        headers: { 'User-Agent': 'beyond-the-blue-and-white map build (github.com/taliakberler/beyond-the-blue-and-white)' }
      });
      return data.elements.filter(e => e.geometry && e.geometry.length > 3).map(e => ({
        name: strip(e.tags.name),
        geometry: { type: 'Polygon', coordinates: [e.geometry.map(p => [p.lon, p.lat])] },
        layer: { kind: 'area', source: `OpenStreetMap (way ${e.id})` }
      }));
    } catch (err) {
      console.warn(`  ${server}: ${err.message}`);
    }
  }
  throw new Error('OpenStreetMap (Overpass) is unavailable right now; try again later');
}

(async () => {
  if (fs.existsSync(outFile) && !process.argv.includes('--force')) {
    console.error(`${path.relative(root, outFile)} already exists and may have hand edits.\n` +
      'Edit it directly, or run "npm run places -- --force" to rebuild it from the sources (edits are lost).');
    process.exit(1);
  }

  let items = [];
  for (const layer of UNC_LAYERS) {
    const got = await fromUNC(layer);
    console.log(`${layer.source}: ${got.length}`);
    items = items.concat(got);
  }
  const cemeteries = await cemeteriesFromOSM();
  console.log(`OpenStreetMap cemeteries: ${cemeteries.length}`);
  items = items.concat(cemeteries);

  const features = [];
  for (const it of items) {
    if (!it.name || !it.geometry || EXCLUDE.some(re => re.test(it.name))) continue;
    const name = RENAME[it.name] || unnumber(it.name);
    features.push({
      type: 'Feature',
      properties: { name, kind: it.layer.kind, source: it.layer.source },
      geometry: round(it.geometry)
    });
  }
  // Features first, then areas from smallest to largest: the order the map stacks them in doesn't
  // depend on this, but it keeps the file easy to read.
  features.sort((a, b) => (a.properties.kind === b.properties.kind ? 0 : a.properties.kind === 'feature' ? -1 : 1) ||
    a.properties.name.localeCompare(b.properties.name));

  const out = {
    type: 'FeatureCollection',
    // Not part of the GeoJSON standard; ignored by the map. A note for whoever edits the file.
    note: 'Named campus spaces and features shown on hover/tap. Built by scripts/build-places.js, then edited by hand. See docs/editing-guide.md.',
    features
  };
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
  console.log(`wrote ${features.length} places to ${path.relative(root, outFile)}`);
  features.forEach(f => console.log(`  ${f.properties.kind.padEnd(7)} ${f.properties.name}`));
})().catch(err => { console.error(err.message || err); process.exit(1); });
