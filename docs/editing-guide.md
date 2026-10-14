# Editing guide

This guide covers updating the tour without writing code: stops, images, the route, QR codes, and publishing. For what each feature does, see [site-overview.md](site-overview.md). For standards on what goes *into* a stop, see [content-guidelines.md](content-guidelines.md).

---

## Preview your changes locally

The page loads `data/stops.json` with `fetch`, so opening `index.html` by double-clicking won't work. Run a local web server from the project folder instead:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080/>. To test a deep link, open <http://localhost:8080/index.html#stop=lenoir-hall>.

You can also edit files directly on GitHub (open a file, click the pencil icon, then **Commit changes**). The live site updates within a minute or two.

---

## Edit the stops

All tour content and settings live in **`data/stops.json`**. Keep the quotes, commas, and brackets intact. If the site shows "The tour couldn't load" after an edit, paste the file into <https://jsonlint.com> to find the typo.

### Tour settings (`"tour"`)

| Field | What it does |
|---|---|
| `title`, `subtitle` | Shown in the header |
| `center`, `zoom` | Starting map view, `[lat, lng]` |
| `intro` | Paragraph shown at the top of the List view |
| `buildingLayer.url` | Optional ArcGIS layer (ends in `/FeatureServer/N` or `/MapServer/N`). Delete the whole `buildingLayer` block to turn it off. |
| `buildingLayer.nameField` | Attribute shown when hovering over a building (`BUILDINGNAME` for UNC's layer) |
| `buildingLayer.label` | Text on the toggle button |

### Each stop (`"stops": [ … ]`)

```json
{
  "id": "example-site",             // URL slug: lowercase, hyphens, no spaces. Used in QR codes, so don't change it after printing.
  "order": 1,                       // Position in the route (1, 2, 3, …)
  "title": "Site name",
  "placeholder": true,              // Shows the "PLACEHOLDER CONTENT" badge. Set to false once the content is verified.
  "lat": 35.9050, "lng": -79.0469,  // Decimal degrees. In Google Maps, right-click a spot to copy them.
  "era": "Decade or date range",
  "summary": "One or two sentences.",
  "history": [                      // One string per paragraph
    "First paragraph…",
    "Second paragraph…"
  ],
  "people": [
    { "name": "Full Name", "description": "One-line description." }
  ],
  "images": [
    { "src": "images/example-site-1.jpg", "alt": "What the image shows, for screen readers",
      "caption": "Caption text", "credit": "Archive / photographer, collection, item ID" }
  ],
  "sources": [
    { "title": "Full citation", "url": "https://… (optional)", "note": "optional" }
  ]
}
```

- **Add a stop:** copy an existing stop block, paste it after a comma, and give it a new `id` and `order`.
- **Placeholder badge:** stops with `"placeholder": true` show a yellow "PLACEHOLDER CONTENT" badge. Change it to `false` (or delete the line) once the stop's content has been verified. A stop whose title contains the word "PLACEHOLDER" also shows the badge.
- `people`, `images`, and `sources` can be empty lists (`[]`). The section is then hidden.
- The comments (`// …`) in the example above are for explanation only. JSON doesn't allow comments, so leave them out of the real file.

After changing stop order or locations, update the route (below). If any `id` changed, regenerate the QR codes.

---

## Add images

1. Put the files in `images/`. JPG or WebP for photos, at most about 1600px wide and ideally under 300 KB each, since visitors are on cellular data.
2. Reference them in the stop's `images` list as `"src": "images/your-file.jpg"`.
3. Always fill in `alt`, `caption`, and `credit`. See [content-guidelines.md](content-guidelines.md#images-and-rights) for how to write alt text and confirm image rights.
4. Use local copies. Don't link to images on other sites.

If an image fails to load (for example, when offline), the app shows an "Image couldn't load" box instead.

The placeholder SVGs (`images/stop-*-?.svg`) can be deleted once real images replace them. `npm run placeholders` recreates them.

---

## Replace the route

`data/route.geojson` holds a single **LineString**, drawn as a dotted line on the map. Coordinates are listed as **`[lng, lat]`** (longitude first) in walking order.

The mockup uses straight lines between stops. To regenerate those straight lines after moving stops:

```bash
npm run route
```

**To draw a real walking path that follows sidewalks**, use either of these free tools:

1. **geojson.io (easiest):** go to <https://geojson.io>, choose the line tool, and click along the sidewalks from Stop 1 to the last stop. Double-click to finish. Then pick **Save → GeoJSON** and replace `data/route.geojson` with the downloaded file.
2. **Turn-by-turn routing:** plan a walking route on <https://www.openstreetmap.org/directions> (choose "Foot") with each stop as a waypoint. Export the route as GPX, convert it at <https://geojson.io> (**Open → File**, then **Save → GeoJSON**), and replace the file.

The app accepts either a single Feature or a FeatureCollection with LineString or MultiLineString geometry. Don't run `npm run route` after drawing a real path, because it would overwrite it.

---

## Update the campus boundary

The campus outline is a pre-built file, `data/campus-boundary.geojson`, made from UNC's campus-boundary parcels. To rebuild it (for example, after UNC updates its data), run this after `npm install`:

```bash
npm run boundary
```

The settings are in `data/stops.json` under `tour.campusBoundary`:

| Field | What it does |
|---|---|
| `sourceUrl` | UNC's boundary layer |
| `where` | Which parcels to include. `BROADAREAS = 'Central Campus'` is the main campus. `1=1` includes every UNC property, including distant ones. |
| `closeGapsMeters` | Bridges gaps narrower than about twice this distance (the public streets between University parcels), so campus reads as one area. Use `0` to show exact parcel lines. |
| `label` | Text on the toggle button |

To turn the boundary off, delete the `campusBoundary` block.

---

## Set BASE_URL and generate QR codes

There are two kinds of QR code:

- **Whole tour:** `qr/tour.png` points to `<BASE_URL>/`, the home page with every stop on the map. Use it on flyers, posters, social media, entrance signs, and other promotion.
- **Each stop:** `qr/<stop-id>.png` points to `<BASE_URL>/index.html#stop=<id>`. Use these on the sign at each site.

**BASE_URL is set in one place:** `scripts/qr-config.json`.

```json
{ "BASE_URL": "https://taliakberler.github.io/beyond-the-white-and-blue" }
```

If the site moves (to a custom domain, a different repo name, or a university server), change this value and regenerate the codes.

**One-time setup:** install [Node.js](https://nodejs.org) (LTS), then run this in the project folder:

```bash
npm install
```

**Generate the codes:**

```bash
npm run qr
```

This writes:

- `qr/tour.png`: the whole-tour code.
- `qr/<stop-id>.png`: one code per stop.
- `qr/sheet.html`: a printable page with one sign per US Letter page. The first page is a "Scan to start the tour" sign with the whole-tour code. The rest are one per stop (stop number, title, QR code, and a "scan me" line). Open it in a browser and print at 100% scale.

All codes are 1200×1200 PNGs with error correction level Q (holds up to scuffs on outdoor signs).

You can also override the URL for a single run without editing the config file: `BASE_URL=https://example.org/tour npm run qr`.

The codes are **static**: the URL is encoded directly in the image, with no redirect service. Once signs are printed, **don't change a stop's `id` or the BASE_URL**, or the printed codes will stop working. Test-scan every printed sign before installing it.

---

## Publish (GitHub Pages)

GitHub Pages is already enabled for this repository, serving the `main` branch from the root folder. Any commit pushed to `main` goes live at **https://taliakberler.github.io/beyond-the-white-and-blue/** within a minute or two. The app re-checks its data files on every load, so visitors see updates without clearing their cache.

To set this up from scratch (for example, on a fork or a new repo):

1. On GitHub, open the repo and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to `main` and folder to `/ (root)`, then click **Save**.
4. Wait about a minute, then open the URL shown on that page.
5. Update `BASE_URL` in `scripts/qr-config.json` to match, run `npm run qr`, and commit the new `qr/` files.

To host from a subfolder of another site instead, copy everything except `node_modules/` into that folder. All paths are relative, so it works as-is. Just set BASE_URL to include the subfolder.

---

## Record your changes

When you make a meaningful change (new stops, a design update, a code fix), add an entry to [PROCESS_LOG.md](../PROCESS_LOG.md) describing what changed and why.
