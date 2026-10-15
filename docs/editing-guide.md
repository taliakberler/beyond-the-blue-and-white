# Editing guide

This guide covers updating the map without writing code: stops, images, icons, QR codes, and publishing. For what each feature does, see [site-overview.md](site-overview.md). For standards on what goes *into* a stop, see [content-guidelines.md](content-guidelines.md).

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

All of the map's content and settings live in **`data/stops.json`**. Keep the quotes, commas, and brackets intact. If the site shows "The map couldn't load" after an edit, paste the file into <https://jsonlint.com> to find the typo.

### Tour settings (`"tour"`)

| Field | What it does |
|---|---|
| `title`, `subtitle` | Shown in the header |
| `center`, `zoom` | Starting map view, `[lat, lng]` |
| `intro` | Paragraph shown at the top of the All stops page |
| `welcome` | The intro (home) screen: `eyebrow` (small line at the top), `text` (the paragraph under the logo), `cta` (the button label) |
| `mapHint` | The hint card on the map ("Explore the map. Tap a location to get more details.") |
| `about` | The About page (see below) |
| `buildingLayer.url` | Optional ArcGIS layer (ends in `/FeatureServer/N` or `/MapServer/N`). The footprints are never drawn; hovering or tapping a building shows its info. Delete the whole `buildingLayer` block to turn it off. |
| `buildingLayer.nameField` | Attribute shown as the building's name on hover or tap (`BUILDINGNAME` for UNC's layer) |
| `basemap` | The illustrated map: `tiles` (tile path), `bounds` (its real-world corners), `minNativeZoom` / `maxNativeZoom` (zooms the tiles were built for), `streetsOpacity` (how faint the surrounding streets are), and `attribution` (credit line) |

### The About page (`"tour"` → `"about"`)

| Field | What it does |
|---|---|
| `tagline`, `description` | The project's tagline and one-paragraph description, shown at the top |
| `context`, `prompt` | Where the project was made, and the team's prompt |
| `team`, `coaches` | Lists of people: `{ "name": "…", "role": "…" }`. Leave `role` as `""` until roles are decided; it appears under the name once filled in. |
| `advisors` | `description` (who they are and how they helped) and `people` (same format as `team`) |
| `credits` | Short lines crediting the map, data, and software |
| `links` | `{ "title": "…", "url": "…" }`, shown at the end of the credits |

### Each stop (`"stops": [ … ]`)

```json
{
  "id": "example-site",             // URL slug: lowercase, hyphens, no spaces. Used in QR codes, so don't change it after printing.
  "order": 1,                       // Position in the All stops list and for Previous / Next (not shown)
  "title": "Site name",
  "icon": "buildings",              // Pin icon: buildings, carpenters, cemetery, masons, memorial, painters, people, or seamstress
  "placeholder": true,              // Shows the "PLACEHOLDER CONTENT" badge. Set to false once the content is verified.
  "lat": 35.9050, "lng": -79.0469,  // Decimal degrees. In Google Maps, right-click a spot to copy them.
  "era": "Decade or date range",
  "summary": "One or two sentences.",
  "history": [                      // One string per paragraph
    "First paragraph…",
    "Second paragraph…"
  ],
  "people": [
    { "name": "Full Name", "description": "One-line description.",
      "image": "images/people/full-name.jpg",   // Square photo for the Key People card (optional; a placeholder portrait is used if empty)
      "imageAlt": "Portrait of Full Name, about 1890",
      "link": "https://… (optional: adds a 'Learn more' link)" }
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

If any `id` changed, regenerate the QR codes.

---

## Add images

1. Put the files in `images/` (photos of people can go in `images/people/`; use square crops for the Key People cards). JPG or WebP for photos, at most about 1600px wide and ideally under 300 KB each, since visitors are on cellular data.
2. Reference them in the stop's `images` list as `"src": "images/your-file.jpg"`.
3. Always fill in `alt`, `caption`, and `credit`. See [content-guidelines.md](content-guidelines.md#images-and-rights) for how to write alt text and confirm image rights.
4. Use local copies. Don't link to images on other sites.

If an image fails to load (for example, when offline), the app shows an "Image couldn't load" box instead.

The placeholder SVGs (`images/stop-*-?.svg`) can be deleted once real images replace them. `npm run placeholders` recreates them.

---

## Map pin icons

Each stop's `"icon"` picks its pin. The icons are the team's designs:

- `images/icons/source/` holds the icons exactly as delivered. Don't edit these by hand; replace them with new exports from the design file.
- `images/icons/pins/` holds the pin versions, made by `npm run pins`. They're recolored so the navy parts show on the navy pins, and cropped to a square.

**To add or change an icon:** save the SVG to `images/icons/source/<name>.svg` (lowercase, no spaces), run `npm run pins`, then use `"icon": "<name>"` on a stop. Use `npm run stamp` too if you changed any CSS or JS.

The current assignments (the Pit's memorial icon was chosen by the team): memorial for the Unsung Founders Memorial and the Pit, buildings for Steele Building and Lenoir Hall, and cemetery for Old Chapel Hill Cemetery. The carpenters, masons, painters, people, and seamstress icons aren't assigned yet. **The team should choose** which icon best represents each stop's history.

---

## Update the campus boundary (comparison page only)

The campus boundary is **no longer shown on the map**. It's only used by the basemap comparison page in `tools/`. The outline is a pre-built file, `data/campus-boundary.geojson`, made from UNC's campus-boundary parcels. To rebuild it (for example, after UNC updates its data), run this after `npm install`:

```bash
npm run boundary
```

The settings are in `data/stops.json` under `tour.campusBoundary`:

| Field | What it does |
|---|---|
| `sourceUrl` | UNC's boundary layer |
| `where` | Which parcels to include. `BROADAREAS = 'Central Campus'` is the main campus. `1=1` includes every UNC property, including distant ones. |
| `closeGapsMeters` | Bridges gaps narrower than about twice this distance (the public streets between University parcels), so campus reads as one area. Use `0` to show exact parcel lines. |
| `label` | Label in the comparison page |

---

## Update the team's illustrated map (the site's basemap)

The illustrated map is served as map tiles in `tiles/team-map/`, built from a PNG export of the Illustrator file. To update it after editing the art:

1. In Illustrator, export the map as a PNG about 6000px wide to `map-source/team-map.png`. This folder is ignored by git, so the large export isn't committed.
2. If the artboard's extent changed (rather than just the drawing inside it), the map's real-world corners in `scripts/team-map.json` (`bounds`) need to be recalculated by matching buildings again.
3. Run `npm run team-map`.
4. Commit the updated `tiles/team-map/` folder.

Other settings in `scripts/team-map.json`:
- `background`: the art's flat background color. Drawn features stay solid, and this color fades out with distance from them, so the map's edge follows the shape of the drawing.
- `closeGapsMeters`: fills lawns and courtyards narrower than about twice this between drawn features, so no holes appear inside campus
- `edgeMarginMeters`: how far the background color extends beyond drawn features before it has faded out completely
- `borderFadeMeters`: a short fade at the artboard's own border, so nothing ends in a hard cut
- `featherMeters`: final softening of the edge
- `minZoom` / `maxZoom`: which zoom levels get tiles

---

## Set BASE_URL and generate QR codes

There are two kinds of QR code:

- **Whole map:** `qr/map.png` points to `<BASE_URL>/`, the home page with every stop on the map. Use it on flyers, posters, social media, entrance signs, and other promotion.
- **Each stop:** `qr/<stop-id>.png` points to `<BASE_URL>/index.html#stop=<id>`. Use these on the sign at each site.

**BASE_URL is set in one place:** `scripts/qr-config.json`.

```json
{ "BASE_URL": "https://taliakberler.github.io/beyond-the-blue-and-white" }
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

- `qr/map.png`: the whole-map code.
- `qr/<stop-id>.png`: one code per stop.
- `qr/sheet.html`: a printable page with one sign per US Letter page. The first page is a "Scan to explore the map" sign with the whole-map code. The rest are one per stop (stop number, title, QR code, and a "scan me" line). Open it in a browser and print at 100% scale.

All codes are 1200×1200 PNGs with error correction level Q (holds up to scuffs on outdoor signs).

You can also override the URL for a single run without editing the config file: `BASE_URL=https://example.org/map npm run qr`.

The codes are **static**: the URL is encoded directly in the image, with no redirect service. Once signs are printed, **don't change a stop's `id` or the BASE_URL**, or the printed codes will stop working. Test-scan every printed sign before installing it.

---

## Publish (GitHub Pages)

GitHub Pages is already enabled for this repository, serving the `main` branch from the root folder. Any commit pushed to `main` goes live at **https://taliakberler.github.io/beyond-the-blue-and-white/** within a minute or two. The app re-checks its data files on every load, so visitors see updates without clearing their cache.

To set this up from scratch (for example, on a fork or a new repo):

1. On GitHub, open the repo and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to `main` and folder to `/ (root)`, then click **Save**.
4. Wait about a minute, then open the URL shown on that page.
5. Update `BASE_URL` in `scripts/qr-config.json` to match, run `npm run qr`, and commit the new `qr/` files.

To host from a subfolder of another site instead, copy everything except `node_modules/` into that folder. All paths are relative, so it works as-is. Just set BASE_URL to include the subfolder.

---

## After changing CSS or JavaScript

The links to `css/styles.css` and `js/app.js` in `index.html` carry a version stamp (for example `js/app.js?v=71ee66bf`) based on each file's contents. **After editing any CSS or JS file, run:**

```bash
npm run stamp
```

This updates the stamps, so visitors' browsers fetch the new files instead of mixing a new page with an old cached script. Mixing them can break the map until the browser's cache expires (up to 10 minutes on GitHub Pages). Content edits to `data/stops.json` don't need this, because the app always checks for the latest data.

---

## Record your changes

When you make a meaningful change (new stops, a design update, a code fix), add an entry to [PROCESS_LOG.md](../PROCESS_LOG.md) describing what changed and why.
