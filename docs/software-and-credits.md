# Software, services, and credits

This page lists every piece of outside software, map service, and data source the site uses, what it does, its license, and what credit it requires. The project uses only **free and open-source** tools and **free public services**. It requires no API keys, accounts, or payments.

---

## Running on the live site

These are the things a visitor's phone loads or contacts while using the map.

### Leaflet: interactive map library

| | |
|---|---|
| **What it does** | Draws the map, the illustrated-map tiles, and icon pins, and handles panning and zooming |
| **Version** | 1.9.4 |
| **License** | BSD 2-Clause (© 2010–2023 Volodymyr Agafonkin, © 2010–2011 CloudMade) |
| **Where it lives** | `js/vendor/leaflet/` (copied into the repository, with its `LICENSE` file) |
| **Website** | <https://leafletjs.com> |
| **Required credit** | Keep the license file. The "Leaflet" link in the map's corner credits it. |

**Why it's bundled rather than loaded from a CDN:** the site keeps working if a third-party CDN is slow or blocked (as on some campus or conference networks), visitors' browsers make no extra requests to outside servers, and the version can't change without anyone noticing.

### OpenStreetMap: surrounding streets

| | |
|---|---|
| **What it does** | Shows the streets and features around campus, beyond the illustrated map. The tiles are drawn grayscale at 38% opacity over the illustration's blue, so they stay in the background. |
| **Address** | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| **Data license** | Open Database License (ODbL). Map data © OpenStreetMap contributors. |
| **Usage policy** | <https://operations.osmfoundation.org/policies/tiles/>. Free for light use, with attribution, no bulk downloading, and a valid referrer (browsers send one automatically). |
| **Required credit** | "© OpenStreetMap contributors" with a link to <https://www.openstreetmap.org/copyright>. This is shown in the bottom-right of the map at all times and stays visible above the bottom sheet on phones. |

A campus map like this is well within normal use. If traffic ever grows very large (for example, a major campaign), switch to another free tile provider by changing the tile address in `js/app.js` (search for `tile.openstreetmap.org`) and updating the credit text.

### UNC Chapel Hill GIS: building names (optional)

| | |
|---|---|
| **What it does** | Supplies each campus building's footprint and name. The footprints are **never drawn**, because they don't align exactly with the illustrated map. They're invisible targets: hovering (desktop) or tapping (phones) a building shows its name. |
| **Service** | `https://gismaps.unc.edu/arcgis/rest/services/BuildingFeatures/FeatureServer/0` (ArcGIS REST FeatureServer) |
| **Request used** | `…/query?where=1%3D1&outFields=*&outSR=4326&f=geojson`, which asks for all buildings as GeoJSON in standard latitude/longitude |
| **Data observed (2026-10-13)** | 577 building polygons. The server returns up to 1,000 per request, so one request covers the whole layer (the app pages through larger layers automatically). The building name comes from the `BUILDINGNAME` field. |
| **Cross-origin access** | Checked 2026-10-13: the server allows requests from other websites (it returns an `Access-Control-Allow-Origin` header), which is what lets a GitHub Pages site load it |
| **Terms** | Published by UNC Chapel Hill as a public map service. Check with UNC Facilities/GIS about attribution preferences before the public launch. |
| **If it's unavailable** | Building names simply don't appear, and the rest of the map works normally |

The building layer is set in `data/stops.json` under `tour.buildingLayer` (`url`, `nameField`). Remove that block to turn it off.

### Campus place names: UNC Chapel Hill GIS and OpenStreetMap

| | |
|---|---|
| **What it does** | Names of campus spaces and features (McCorkle Place, Polk Place, the Pit, the Old Well, monuments, memorial gardens, Old Chapel Hill Cemetery). Like the buildings, they're **never drawn**: hovering or tapping shows the name. |
| **Where the map reads it** | `data/places.geojson`, a file in this repository (set by `tour.placesLayer` in `data/stops.json`). The map doesn't contact UNC or OpenStreetMap for these at all. |
| **How the file was made** | `scripts/build-places.js` (`npm run places`), run 2026-10-14. It downloaded, within the map area: UNC's `Features/MapServer` layers 11 (Historic Features, points), 14 (Memorial Garden), and 15 (Landmark Space) from `https://gismaps.unc.edu/arcgis/rest/services/`, plus named cemeteries from OpenStreetMap through the Overpass API. It left out generic labels ("gargoyle", "fountain", "time capsule"…) and planning designations ("Remnant Forest", "Rock Outcropping"), and joined numbered pieces of one place ("Kenan Woods3" → "Kenan Woods"). |
| **Result** | 53 places: 18 points and 35 areas |
| **Licenses** | UNC data: published by UNC Chapel Hill as a public map service (confirm attribution preferences, as for buildings). The cemetery outline: © OpenStreetMap contributors, under the [Open Database License](https://www.openstreetmap.org/copyright), which the map's existing OpenStreetMap credit covers. |
| **Editing** | The file is meant to be edited by hand from now on; see [editing-guide.md](editing-guide.md#campus-place-names). The script won't overwrite it unless run with `--force`. |

### Fonts: Gasoek One, Oswald, Lato

| Typeface | Role | Designer / copyright | License |
|---|---|---|---|
| **Gasoek One** | Logo | © 2022 The Gasoek Project Authors (JAMO Typeface), <https://github.com/JAMO-TYPEFACE/Gasoek> | SIL Open Font License 1.1 |
| **Oswald** (Bold) | Headers | © 2016 The Oswald Project Authors, <https://github.com/googlefonts/OswaldFont> | SIL Open Font License 1.1 |
| **Lato** (Regular, Bold) | Body copy | © 2010–2014 Łukasz Dziedzic (tyPoland), Reserved Font Name "Lato" | SIL Open Font License 1.1 |

| | |
|---|---|
| **Where they live** | `fonts/`: Latin-subset `.woff2` files downloaded from Google Fonts on 2026-10-14, with each family's license (`OFL-GasoekOne.txt`, `OFL-Oswald.txt`, `OFL-Lato.txt`) |
| **Why they're self-hosted** | Loading fonts from Google's servers would send each visitor's IP address to Google. Hosting the files with the site avoids that and removes a dependency on an outside service. |
| **License terms in brief** | Free to use, bundle, and redistribute, including commercially and in print. Keep the license files with the fonts, and don't sell the font files themselves. A modified version can't use a font's Reserved Font Name. |
| **Required credit** | No visible credit is required. The license files must stay in `fonts/`. |

### UNC Chapel Hill GIS: campus boundary

| | |
|---|---|
| **What it does** | Supplies the parcels that make up UNC's campus, merged into one outline. **It's no longer shown on the map** (removed 2026-10-14 when the illustrated map became the basemap). It's still used by the basemap comparison page in `tools/`. |
| **Service** | `https://gismaps.unc.edu/arcgis/rest/services/basemap/FeatureServer/16` ("Campus Boundary") |
| **Data observed (2026-10-14)** | 195 land parcels across UNC's Central, North, South, East, West, and Outlying areas (about 1.4 MB as GeoJSON). The site uses only the 121 parcels where `BROADAREAS = 'Central Campus'`. |
| **How it's used** | Visitors' browsers **don't** contact this service. `npm run boundary` (`scripts/build-campus-boundary.js`) downloads the parcels, merges them, bridges the public streets between parcels (15 m gap-closing), and simplifies the result to about 1 m accuracy. It saves the outline as `data/campus-boundary.geojson` (about 22 KB). Re-run it if UNC updates the boundary. |
| **Settings** | `tour.campusBoundary` in `data/stops.json`: `sourceUrl`, `where`, `closeGapsMeters`, `file`, `label` |
| **Note** | Old Chapel Hill Cemetery isn't part of UNC's campus parcels, so it appears just outside the boundary. |

### The team's illustrated campus map

| | |
|---|---|
| **What it does** | The site's basemap: the project team's own illustration of central campus, placed on real-world coordinates so sites and "You are here" line up with it |
| **Where it lives** | `tiles/team-map/{z}/{x}/{y}.png`: 99 web-map tiles for zooms 14–18, built by `npm run team-map` from a PNG export of the team's Illustrator file. The export itself isn't in the repository. |
| **Settings** | `tour.basemap` in `data/stops.json` (tile path, bounds, zoom range, street opacity, credit), and `scripts/team-map.json` for building the tiles |
| **Credit** | "Illustrated map: Beyond the Blue and White team", shown in the map's credit line |

### The team's logo and icons

| | |
|---|---|
| **What** | The *Beyond the Blue and White* logo (horizontal and stacked, in Carolina Blue, Franklin Fog, and Navy) and eight map icons (buildings, carpenters, cemetery, masons, memorial, painters, people, seamstress) |
| **Where they live** | `images/logo/` (SVG, unchanged) and `images/icons/source/` (SVG, unchanged). The pin versions in `images/icons/pins/` are built from them by `npm run pins`. |
| **Created by** | The Beyond the Blue and White team |
| **Checked** | 2026-10-14: valid and fully vector, with no scripts or outside references (see [PROCESS_LOG.md](../PROCESS_LOG.md)) |

### Phone map apps: walking directions

The "Get walking directions" link opens the visitor's own map app. It uses only public link formats, with no API keys:

| Device | Link format |
|---|---|
| iPhone / iPad | Apple Maps: `https://maps.apple.com/?daddr=<lat>,<lng>&dirflg=w` |
| Everything else | Google Maps: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=walking` |

The link sends the site's coordinates to Apple or Google only when the visitor taps it. The site itself never shares the visitor's location with anyone.

### Browser features (no outside service)

| Feature | Used for | Privacy |
|---|---|---|
| Geolocation | "You are here" dot | Only runs when the visitor taps the button, and the browser asks permission first. The location stays on the device and is never sent or stored. |

The site uses **no analytics, cookies, trackers, or ads.** Its web fonts are self-hosted (see below), so no font service is contacted.

---

## Used only by the project team (not loaded by visitors)

These tools run on a team member's computer to prepare files. They aren't part of the published site.

### `qrcode` (npm package): QR code generator

| | |
|---|---|
| **What it does** | `scripts/generate-qr.js` uses it to create one PNG QR code per site, plus the printable `qr/sheet.html` |
| **Version** | 1.5.4 |
| **License** | MIT |
| **Source** | <https://github.com/soldair/node-qrcode> |
| **Settings** | Error correction level Q (about 25% of the code can be damaged and still scan), 4-module quiet zone, 1200×1200px, black on white |

The codes are **static**: each site's web address is encoded directly in the image. No QR-code service, redirect, or tracking is involved, so the codes keep working as long as the website address does.

### Turf (npm packages): geometry tools

| | |
|---|---|
| **What it does** | `scripts/build-campus-boundary.js` uses `@turf/union`, `@turf/buffer`, `@turf/simplify`, `@turf/truncate`, and `@turf/helpers` to merge, gap-close, and simplify the campus parcels |
| **Version** | 7.4.0 |
| **License** | MIT |
| **Source** | <https://turfjs.org> |

These are used only when building the boundary file, not by visitors.

### sharp (npm package): image processing

| | |
|---|---|
| **What it does** | `scripts/build-team-map-tiles.js` uses it to cut the team's illustrated map into web-map tiles and fade out its background beyond campus |
| **Version** | 0.35.5 (0.33.5 was tried first but has known vulnerabilities in its bundled image libraries; `npm audit` reports 0 issues for 0.35.5) |
| **License** | Apache-2.0 |
| **Source** | <https://sharp.pixelplumbing.com> |

Used only when building tiles, not by visitors.

### AVFoundation (macOS): video encoding

`scripts/encode-video.swift` uses Apple's built-in AVFoundation framework to make the web copy of the opening animation (H.264 MP4, 720×1280, 1.4 Mbps, no audio, "fast start" so it plays while downloading). `scripts/make-splash-backdrop.swift` makes `media/splash-backdrop.mp4` (under 2 KB): a 1-second clip holding the video's first frame, with its color data copied as-is and the same color tags. It needs a Mac with Swift (included with Xcode or the Command Line Tools); nothing to install. The team's animation file is credited to the Beyond the Blue and White team, like the logo.

### Node.js and npm

Node.js runs the helper scripts (`npm run qr`, `npm run pins`, `npm run team-map`, `npm run boundary`, `npm run stamp`, `npm run placeholders`). It's free and open source (MIT): <https://nodejs.org>. `package.json` pins the exact versions of `leaflet` and `qrcode`, and `package-lock.json` records the full dependency tree.

### Python (optional)

`python3 -m http.server` is used for local previews. It's included with Python (PSF License). Any static web server works.

### GitHub and GitHub Pages

The code is hosted at <https://github.com/taliakberler/beyond-the-blue-and-white>, and the site is served free by GitHub Pages from the `main` branch, over https.

### Free web tools suggested in the docs

These are optional, browser-based helpers for team members:

- **jsonlint.com**: finding typos in `stops.json`
- **WebAIM Contrast Checker**: checking brand colors

### Claude Code (AI coding assistant)

The site's code, scripts, and documentation were drafted with help from Claude Code (Anthropic), working under the project team's direction. AI was **not** used to produce historical content. See [PROCESS_LOG.md](../PROCESS_LOG.md).

---

## Credits checklist for launch

- [ ] OpenStreetMap credit visible on the map (built in, so leave it)
- [ ] Leaflet license file kept in `js/vendor/leaflet/LICENSE`
- [ ] Font license files kept in `fonts/`
- [ ] Every image has a `credit` that matches the holding repository's requirements
- [ ] Every site lists its `sources`
- [ ] Confirmed attribution preferences for the UNC GIS building layer and campus place names
- [ ] Credit for the illustrated map's designers added (the map credit currently says "Beyond the Blue and White team")
- [x] Credits for the project team, coaches, and community advisors added (the About page and the README)
- [ ] Team members' roles added (in `tour.about.team` in `data/stops.json`)
