# Beyond the White and Blue

A free, mobile-first historical walking tour of **UNC Chapel Hill**. Visitors scan a QR code posted at each site; the code opens the tour zoomed to that stop with its history, images, key people, and sources.

> **Status: mockup.** All five stops are **placeholders**. They have no real historical content and their locations are arbitrary points near the campus center. Replace them with verified content before printing any signs.

- Static site: HTML, CSS, and vanilla JavaScript. No backend, no build step, no API keys.
- Map: [Leaflet](https://leafletjs.com) 1.9.4 (bundled in `js/vendor/leaflet/`) with © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors tiles.
- Hosting: GitHub Pages. All paths are relative, so the site works from a repo subfolder.

---

## Folder structure

```
index.html             The app (one page)
css/styles.css         Styles; brand colors are CSS variables at the top
js/app.js              App logic (map, panel, deep links, list view)
js/vendor/leaflet/     Leaflet library (BSD-2 license)
data/stops.json        ← ALL tour content and settings. Edit this.
data/route.geojson     The walking route (a GeoJSON LineString)
images/                Stop images (placeholders are SVGs)
qr/                    Generated QR PNGs + printable sheet.html
scripts/               QR generator, route builder, placeholder-image maker
```

---

## Preview it on your computer

The page loads `data/stops.json` with `fetch`, so opening `index.html` by double-clicking won't work. Run a small local web server from the project folder instead:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080/>. To try a deep link, open <http://localhost:8080/index.html#stop=placeholder-stop-3>.

---

## Edit the stops (no coding needed)

Everything lives in **`data/stops.json`**. Edit it in any text editor or directly on GitHub (open the file, click the pencil icon, then **Commit changes**). Keep the quotes, commas, and brackets intact. If the site shows "The tour couldn't load" after an edit, paste the file into <https://jsonlint.com> to find the typo.

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
  "id": "old-well",                 // URL slug: lowercase, hyphens, no spaces. Used in QR codes, so don't change it after printing.
  "order": 1,                       // Position in the route (1, 2, 3, …)
  "title": "Site name",
  "lat": 35.9050, "lng": -79.0469,  // Decimal degrees. In Google Maps, right-click a spot to copy them.
  "era": "1790s–1850s",
  "summary": "One or two sentences.",
  "history": [                      // One string per paragraph
    "First paragraph…",
    "Second paragraph…"
  ],
  "people": [
    { "name": "Full Name", "description": "One-line description." }
  ],
  "images": [
    { "src": "images/old-well-1.jpg", "alt": "What the image shows, for screen readers",
      "caption": "Caption text", "credit": "Archive / photographer, collection, item ID" }
  ],
  "sources": [
    { "title": "Full citation", "url": "https://… (optional)", "note": "optional" }
  ]
}
```

- **Add a stop:** copy an existing stop block, paste it after a comma, and give it a new `id` and `order`.
- **Remove placeholder labels:** stops whose title contains "PLACEHOLDER" show a yellow "PLACEHOLDER CONTENT" badge. The badge goes away once you rename the stop.
- `people`, `images`, and `sources` can be empty lists (`[]`). The section is then hidden.

After changing stop order or locations, update the route (below) and regenerate the QR codes if any `id` changed.

---

## Add images

1. Put the files in `images/`. JPG or WebP for photos, at most about 1600px wide and ideally under 300 KB each, since visitors are on cellular data.
2. Reference them in the stop's `images` list as `"src": "images/your-file.jpg"`.
3. Always fill in `alt` (what the image shows), `caption`, and `credit`. Confirm you have the rights to use each image and credit it the way the holding archive asks.
4. Use local copies. Don't link to images on other sites.

If an image fails to load (for example, when offline), the app shows a friendly "Image couldn't load" box.

To delete the placeholder SVGs, remove `images/stop-*-?.svg` after replacing them. `scripts/make-placeholders.js` can recreate them (`npm run placeholders`).

---

## Replace the route

`data/route.geojson` holds a single **LineString**, drawn as a dotted line on the map. Coordinates are listed as **`[lng, lat]`** (longitude first) in walking order.

The mockup uses straight lines between stops. To regenerate those straight lines after moving stops:

```bash
npm run route
```

**To draw a real walking path that follows sidewalks**, use either of these free tools:

1. **geojson.io (easiest):** go to <https://geojson.io>, choose the line tool, and click along the sidewalks from Stop 1 to the last stop. Double-click to finish. Then pick **Save → GeoJSON** and replace `data/route.geojson` with the downloaded file.
2. **Turn-by-turn routing:** plan a walking route on <https://www.openstreetmap.org/directions> (choose "Foot", using the OSRM or GraphHopper engines) with each stop as a waypoint. Export the route as GPX, convert it at <https://geojson.io> (**Open → File**, then **Save → GeoJSON**), and replace the file.

The app accepts either a single Feature or a FeatureCollection with LineString or MultiLineString geometry. Don't run `npm run route` after this step, because it would overwrite your hand-drawn path.

---

## Set BASE_URL and generate QR codes

QR codes point to `<BASE_URL>/index.html#stop=<id>`. **BASE_URL is set in one place:** `scripts/qr-config.json`.

```json
{ "BASE_URL": "https://taliakberler.github.io/beyond-the-white-and-blue" }
```

If you move the site (to a custom domain, a different repo name, or a university server), change this value and regenerate the codes.

**One-time setup:** install [Node.js](https://nodejs.org) (LTS), then run this in the project folder:

```bash
npm install
```

**Generate the codes:**

```bash
npm run qr
```

This writes:

- `qr/<stop-id>.png`: one 1200×1200 PNG per stop, with error correction level Q (holds up to scuffs on outdoor signs).
- `qr/sheet.html`: a printable page with one sign per US Letter page (stop number, title, QR code, and a "scan me" line). Open it in a browser and print at 100% scale.

You can also override the URL for a single run without editing the config file: `BASE_URL=https://example.org/tour npm run qr`.

The codes are **static**: the URL is encoded directly in the image, with no redirect or "dynamic QR" service involved. Once signs are printed, **don't change a stop's `id` or the BASE_URL**, or the printed codes will stop working. Test-scan every printed sign before installing it.

---

## Deploy to GitHub Pages

The site is already in the repository `taliakberler/beyond-the-white-and-blue`.

1. On GitHub, open the repo and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to `main` and folder to `/ (root)`, then click **Save**.
4. Wait about a minute. The site is then live at **https://taliakberler.github.io/beyond-the-white-and-blue/**.
5. Open `…/index.html#stop=placeholder-stop-1` on your phone to confirm deep links work.
6. If the final URL differs from `scripts/qr-config.json`, update `BASE_URL`, run `npm run qr`, and commit the new `qr/` files.

**Updating content later:** edit `data/stops.json` (on GitHub or locally), commit, and push. Pages redeploys automatically within a minute or two. The app re-checks the data files on every load, so visitors see updates without clearing their cache.

To host from a subfolder of another repo instead, copy everything except `node_modules/` into that folder. Paths are relative, so it works as-is. Just set BASE_URL to include the subfolder.

---

## Brand colors and design

All colors are CSS variables at the top of `css/styles.css`: one block for light mode and one for dark mode. The current palette is a neutral placeholder. To apply university colors, change `--color-primary`, `--color-accent`, `--color-header-bg`, and so on in **both** blocks, and check contrast at <https://webaim.org/resources/contrastchecker/> (aim for at least 4.5:1 for text).

- The theme follows the phone's light/dark setting. Visitors can override it with the moon button (automatic → light → dark).
- Tap targets are at least 44px. The base font size is 17px.

---

## Features at a glance

| Feature | Details |
|---|---|
| Map | Numbered markers, dotted route line, zoom controls, OSM attribution |
| You are here | Uses browser geolocation and needs https (GitHub Pages provides it). If permission is denied, the app shows a friendly message and the tour keeps working. |
| Stop panel | Bottom sheet on phones (tap the handle or swipe up to expand), side panel on screens 900px and wider. Includes title, era, a swipeable image gallery with captions and credits, history, key people, and sources. |
| Deep links | `index.html#stop=<id>` zooms to the stop and opens it. An unknown id falls back to the List view with a message. The browser back button moves between stops. |
| Route navigation | Previous / Next buttons, a "Stop 3 of 5" indicator, and a "Get walking directions" link that opens Apple Maps on iPhone/iPad and Google Maps everywhere else. On the last stop, Next becomes "Back to Stop 1". |
| List view | All stops in route order. Tapping one opens it on the map. |
| Building layer | Loads `<url>/query?where=1%3D1&outFields=*&outSR=4326&f=geojson`, following pages if the server has more than its record limit, and draws light polygons beneath the stops with an on/off toggle. If loading fails or times out (15s), the toggle hides and the tour carries on. |
| Offline tolerance | Shows a message if map tiles fail ("you may be offline", with a shortcut to the List view), a fallback box for images that don't load, and notices when the device goes offline or comes back online. |
| Accessibility | Alt text, keyboard-operable markers (Tab, then Enter or Space), Escape closes the panel, visible focus rings, a skip link, live-region status messages, and reduced-motion support. |

### Notes and limits

- **OpenStreetMap tiles** are free but come with a [usage policy](https://operations.osmfoundation.org/policies/tiles/). A campus walking tour is well within normal use. For heavy traffic, switch to another free tile provider in `js/app.js` (search for `tile.openstreetmap.org`).
- **Offline:** the tour needs a connection the first time it's opened. Full offline support (a service worker that caches tiles) is not included in this mockup.
- **Building layer:** UNC's server currently allows cross-origin requests, which the browser needs in order to load the layer. If UNC changes that, the toggle simply won't appear.
