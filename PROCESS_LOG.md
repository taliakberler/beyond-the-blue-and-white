# Process log

A public record of how *Beyond the White and Blue* is being built: what was decided, why, and what changed in the code. Entries are in chronological order, and new entries go at the bottom.

**About this project's process.** The project team sets the goals, requirements, and all historical content. The code, scripts, and documentation have been drafted with **Claude Code**, an AI coding assistant made by Anthropic, working from the team's written instructions. Each entry notes who directed the work. AI is not used to research or write historical content. That boundary was written into the original requirements ("Do NOT invent real historical facts, people, or events") and is restated in [docs/content-guidelines.md](docs/content-guidelines.md).

### How to add an entry

Copy this template to the bottom of the file:

```markdown
## YYYY-MM-DD — Short title

**Directed by:** who asked for or approved the change
**Commit(s):** short hash(es), if known

### What changed
- …

### Decisions and reasons
- **Decision:** … **Why:** …

### Verified
- …
```

---

## 2026-10-13 — Project requirements set

**Directed by:** project team

The team set the following requirements for a first working mockup:

- **Tour:** *Beyond the White and Blue*, a historical walking tour of UNC Chapel Hill. Visitors scan a QR code at each site, and the code opens the tour zoomed to that site.
- **Campus center:** 35.904613, −79.046761.
- **Building data:** UNC's ArcGIS layer `https://gismaps.unc.edu/arcgis/rest/services/BuildingFeatures/FeatureServer/0`.
- **Constraints:**
  - 100% free: a static site (HTML/CSS/vanilla JavaScript) with no backend, paid services, or API keys.
  - Leaflet with OpenStreetMap tiles, hosted on GitHub Pages with relative paths.
  - Phone-first and accessible.
- **Content:** all content in one editable file (`data/stops.json`), with a separate route file (`data/route.geojson`). The mockup gets **five clearly labeled placeholder stops**, and **no invented historical facts, people, or events**.
- **Features:**
  - numbered markers and a route line
  - "You are here" location
  - a bottom-sheet / side-panel stop view with an image gallery, history, key people, and sources
  - per-stop deep links (`#stop=<id>`)
  - Previous / Next navigation, a "Stop N of 5" indicator, and a walking-directions link
  - a list view
  - an optional building layer that fails safely
  - friendly offline messages
- **QR codes:** a script that generates static PNG codes from `stops.json` using a single BASE_URL setting, plus a printable sign sheet. No dynamic or redirect QR services.
- **Design:** a placeholder until further design instructions. It should be clean and high-contrast, with tap targets of at least 44px, a neutral palette in CSS variables so brand colors can be swapped in, and light and dark modes.

The request was sent twice. The second version added that the design is a **placeholder until further design instructions are provided**, so all visual choices below are provisional.

---

## 2026-10-13 — Separate repository

**Directed by:** project team

### Decisions and reasons
- **Decision:** build the tour in its own repository, `taliakberler/beyond-the-white-and-blue`, kept completely separate from other projects (in particular, not inside the Resilience Finance repository). **Why:** the team's explicit instruction. It also keeps the tour's history, issues, and GitHub Pages site independent.
- **Decision:** make the repository **public**. **Why:** it's part of a public portfolio, and free GitHub Pages hosting requires a public repository.

---

## 2026-10-13 — First build of the mockup

**Directed by:** project team (requirements above). Drafted by Claude Code.
**Commit:** `491a8d4`

### What changed
Created the full site:
- `index.html`
- `css/styles.css`
- `js/app.js`
- `js/vendor/leaflet/`
- `data/stops.json`
- `data/route.geojson`
- 10 placeholder SVG images in `images/`
- three scripts: `scripts/generate-qr.js`, `scripts/build-route.js`, `scripts/make-placeholders.js`
- `scripts/qr-config.json`
- generated QR codes and `qr/sheet.html`
- `package.json`
- a README

### Decisions and reasons

**Technology**
- **Decision:** bundle a copy of Leaflet 1.9.4 in the repository instead of loading it from a CDN. **Why:** the map keeps working if a CDN is blocked or slow, visitors make no extra outside requests, and the version can't change silently.
- **Decision:** no frameworks, build tools, or web fonts. **Why:** this follows the static-site requirement. It also keeps the page small for cellular connections and lets non-developers edit files directly on GitHub.
- **Decision:** Node.js for the QR script, using the open-source `qrcode` package (MIT, v1.5.4). **Why:** Node was already installed, and the same `package.json` also pins the Leaflet version.

**Content model**
- **Decision:** put tour-wide settings (title, subtitle, intro, map center, building layer) in `stops.json` under `"tour"`, alongside the stops. **Why:** this keeps everything a non-developer might change in one file, as required.
- **Decision:** store `history` as a list with one string per paragraph. The app also accepts a single string with blank lines between paragraphs. **Why:** a list is less error-prone to edit in JSON than escaped line breaks.
- **Decision:** make `sources` objects with `title`, an optional `url`, and an optional `note`, and give each image `src`, `alt`, `caption`, and `credit`. **Why:** this is enough for a proper citation and image credit, while keeping links optional for offline-only archival sources.
- **Decision:** render all content as plain text (never as HTML). **Why:** an editing mistake in `stops.json` can't break the page or inject code.

**Placeholder content**
- **Decision:** give the five stops the ids `placeholder-stop-1` … `-5`, titles like "PLACEHOLDER Stop 1 — Site name TBD", and history text that reads "Placeholder history — replace with verified content." People are named "Placeholder Person A–F", and sources are empty citation templates. **Why:** the requirements forbid invented history, and generic names prevent anyone from mistaking a placeholder for a real person or event.
- **Decision:** place the stops at arbitrary points in a loop about 100–200 m around the given campus center. They're deliberately not tied to any named building. **Why:** this tests the map and route without suggesting real tour sites.
- **Decision:** show an automatic "PLACEHOLDER CONTENT" badge on any stop whose title contains "PLACEHOLDER". **Why:** it makes unfinished stops obvious during review and disappears on its own once a stop is renamed.
- **Decision:** generate placeholder images as simple gray SVGs labeled "PLACEHOLDER · Stop N · Image N". **Why:** this meets the no-hotlinking requirement, the files are tiny, and they can't be mistaken for historical images.

**Map and route**
- **Decision:** start with a straight-line route, plus `npm run route` to rebuild it from stop order. **Why:** the requirements allow it for the mockup. Instructions for drawing a real sidewalk route are in the docs.
- **Decision:** draw the route as a dotted line, with building outlines at 22% opacity in their own layer beneath the route and markers. **Why:** the tour should stand out, and buildings are context only.
- **Decision:** before building the building-layer feature, check UNC's service directly. **Why:** to confirm it would work from a GitHub Pages site. The check found 577 polygons, a server limit of 1,000 per request, a `BUILDINGNAME` field, and cross-origin requests allowed.
- **Decision:** have the building-layer loader page through results if the server reports more data, cap it at 10 pages, time out after 15 seconds, and hide the toggle on any failure. **Why:** it should handle larger layers if the URL changes, and the requirements say the tour must work without the layer.

**Navigation and deep links**
- **Decision:** add each stop to the browser history as it's visited (using `#stop=<id>` in the address). **Why:** the phone's Back button then steps back through stops, and every stop's address can be shared.
- **Decision:** send the walking-directions link to Apple Maps on iPhone/iPad and Google Maps elsewhere, using public URL formats. **Why:** this opens each device's usual map app with no API key.
- **Decision:** on the last stop, change "Next stop" to "Back to Stop 1" and point directions at the current site. **Why:** there's no next stop, and a dead button is confusing.
- **Decision:** when a stop opens, center it in the part of the map not covered by the panel. **Why:** otherwise the stop would sit hidden behind the bottom sheet.

**Layout and design** (provisional)
- **Decision:** use a bottom sheet (58% of screen height, expandable) below 900px wide, and a 420px side panel at 900px and above. **Why:** phones are the primary device. The sheet keeps the map visible, and 900px is roughly where a side panel leaves enough map.
- **Decision:** use a neutral slate palette with a muted blue (`#2b5c8a`) and a burnt-orange accent (`#b4541a`) for the active stop and focus rings. **Why:** the requirements ask for a neutral placeholder. The orange provides a distinct active and focus color that passes contrast checks.
- **Decision:** use a 17px base font with system fonts only. **Why:** readability outdoors and fast loading.
- **Decision:** support dark mode automatically plus a manual automatic → light → dark toggle, and filter the map tiles in dark mode. **Why:** this was a requirement. OpenStreetMap only offers light tiles, which glare at night.
- **Decision:** move the map credit line up above the bottom sheet on phones. **Why:** OpenStreetMap credit must stay visible.

**QR codes**
- **Decision:** set BASE_URL in `scripts/qr-config.json`, which can be overridden for one run with a `BASE_URL=` prefix, and default it to `https://taliakberler.github.io/beyond-the-white-and-blue`. **Why:** a single config value was required, and a JSON file can be edited without touching code.
- **Decision:** use error correction level Q, 1200×1200px images, and a 4-module quiet zone. **Why:** outdoor signs get dirty and scuffed, and the codes need to print sharply at about 5 inches.
- **Decision:** make the sign sheet one US Letter page per stop (tour name, large stop number, title, 5-inch code, "scan with your phone camera" line, and the printed URL). **Why:** "sized for printing on signs" was the requirement, and Letter is the easiest size to print and laminate.

### Verified
Tested in a browser on a local server at 375px phone width and at 1280px desktop width:
- **Map:** loads with OpenStreetMap credit, with 5 markers, the route line, and all 577 buildings, and no sideways scrolling.
- **Deep link:** `#stop=placeholder-stop-3` opens Stop 3 and centers it above the sheet.
- **Navigation:**
  - Next and Previous work, along with the counter.
  - Previous is disabled on Stop 1, and "Back to Stop 1" appears on Stop 5.
  - Back-button history works, as do Close and Escape.
- **List view:** opening a stop from the list works, and a mistyped stop id falls back to the list.
- **Images:** the gallery swipes between images, and a broken image shows the fallback box.
- **Other checks:** a denied location permission shows a friendly message, the building toggle works, and dark mode works.
- **Building layer failure:** tested by temporarily pointing the building-layer URL at a nonexistent service. The toggle hid itself after the server's 404 and the tour kept working. The real URL was then restored.
- **QR codes:** a generated code was decoded in the browser and contained the correct URL.

---

## 2026-10-13 — Fixes found during testing

**Directed by:** found during testing by Claude Code. Included in commit `491a8d4`.

### What changed
- **Keyboard access to markers:** pressing Enter on a focused map marker didn't open the stop in testing. Added a direct key handler so **Enter or Space** on a marker opens its stop. Re-tested with a real key press: the stop opened and focus moved into the panel.
- **Stale content after edits:** during testing, the browser kept showing an older copy of `stops.json` after the file changed. Visitors could see out-of-date content for a while after an update. Changed both data requests to `cache: 'no-cache'`, so the browser checks for a newer version on every visit.

---

## 2026-10-13 — GitHub Pages enabled

**Directed by:** project team

### What changed
- Turned on GitHub Pages for the repository, serving the `main` branch from the root folder over https.
- Live site: <https://taliakberler.github.io/beyond-the-white-and-blue/>

### Verified
- The first Pages build completed.
- The home page, `data/stops.json`, and `qr/sheet.html` all returned successfully.
- On the live site, `#stop=placeholder-stop-3` opened Stop 3 with 5 markers, the route, map tiles, and all 577 buildings loaded.
- The page runs in a secure (https) context, which "You are here" requires.
- The QR codes generated earlier already point to this address.

---

## 2026-10-13 — Project documentation and statement of purpose

**Directed by:** project team. Drafted by Claude Code.
**Commit:** `1baf34a`

### What changed
- **README rewritten** around the tour's purpose: an interactive experience for learning about **Black history at UNC Chapel Hill** and the sites, events, and people significant to that history around campus. The step-by-step editing instructions moved out of the README into their own guide.
- **New documentation in `docs/`:**
  - `site-overview.md`: how the site works, accessibility, offline behavior, privacy, and known limits
  - `editing-guide.md`: editing stops, images, route, QR codes, and publishing
  - `content-guidelines.md`: a **draft** of standards for sourcing, language, image rights, and review, for the team to revise
  - `design-and-styles.md`: color tokens, measured contrast ratios, typography, layout, components, dark mode, and how to apply brand colors
  - `software-and-credits.md`: every library, service, and data source, with licenses and required credits
- **This process log** created.
- **Subtitle and page description updated** to reflect the tour's purpose. The header now reads "A walking tour of Black history at UNC Chapel Hill" (in `data/stops.json` and `index.html`), and the search-engine description was updated to match. The placeholder `intro` text was left for the team to write.

### Decisions and reasons
- **Decision:** keep the README short (purpose, how the tour works, status, and links) and put detailed documentation in `docs/`. **Why:** the README is the public face of the project, and editors need a step-by-step guide that doesn't bury the purpose.
- **Decision:** add content guidelines covering sourcing, language (e.g. "enslaved people" rather than "slaves"), image rights, uncertainty in the archival record, review by historians and community members, and a corrections process. **Why:** a public tour of Black history carries a particular responsibility for accuracy and care. These are marked as a draft because editorial policy belongs to the project team.
- **Decision:** measure color contrast with the WCAG formula and publish the results, rather than only describing the palette as "high contrast." **Why:** these are verifiable claims, and they'll need re-checking when brand colors are applied. All pairs passed AA (the lowest is 5.0:1).
- **Decision:** state openly in the README, credits, and this log that the code was developed with an AI assistant, and that historical content is not AI-generated. **Why:** transparency about process, which is the purpose of this log.

---

## 2026-10-13 — Project framing added to the README

**Directed by:** project team (wording supplied by the team, marked as a work in progress)

### What changed
- **README:** replaced the purpose section with the team's own framing:
  - the tagline *"Every stop has a story."*
  - a one-sentence project description
  - **The problem**, **The insight**, **The solution**, and **The desired impact**
  - **Storytelling structure ideas**: **01. Discover** (the surface story), **02. Dig deeper** (the historical context), and **03. Reflect** (the present-day connection)
  - the earlier bullet points kept under a new heading, "Design principles for the story map"

### Decisions and reasons
- **Decision:** use the team's wording as supplied, changing only typography. **Why:** the framing belongs to the team. The pasted text used modifier-letter apostrophes (ʼ), which were changed to standard apostrophes (’) so the words display, search, and read aloud correctly.
- **Decision:** don't restructure the stop panel or the stop data around Discover / Dig deeper / Reflect for now. **Why:** the team considers the storytelling structure an idea at this stage, not a requirement. A mapping of the layers into the content guidelines was drafted and then withdrawn for the same reason.

---

## 2026-10-14 — Brand typefaces

**Directed by:** project team (typeface choices). Implemented by Claude Code.

### What changed
- **Typefaces set by the team:**
  - **Logo:** Gasoek One
  - **Headers:** Oswald Bold
  - **Body copy:** Lato Regular
- **New `fonts/` folder:** Latin-subset `.woff2` files for Gasoek One 400, Oswald 700, Lato 400, and Lato 700 (about 54 KB total), with each family's SIL Open Font License file.
- **`css/styles.css`:**
  - added `@font-face` rules and the `--font-logo`, `--font-heading`, and `--font-body` tokens, each with a similar-shaped fallback
  - applied the logo font to the header tour name
  - applied Oswald to all headings, list-card titles, and the numbers in map markers and list cards
  - set every bold weight to 700
  - increased the logo's line height to 1.3
- **`index.html`:** preloads the logo and body fonts.
- **`scripts/generate-qr.js` and `qr/sheet.html`:** the printable QR signs now use the same three typefaces. The QR code images themselves are unchanged.
- **Docs:** updated the typography section of `docs/design-and-styles.md`, added the fonts and their licenses to `docs/software-and-credits.md`, and added `fonts/` to the README's file list.

### Decisions and reasons
- **Decision:** read "Gaoesk One" in the team's note as **Gasoek One**. **Why:** no font named "Gaoesk One" exists on Google Fonts, and Gasoek One is a heavy display typeface that fits the logo role. **Confirmed by the team.**
- **Decision:** self-host the font files instead of linking to Google Fonts. **Why:** linking would send each visitor's IP address to Google, contradicting the site's no-tracking promise. Self-hosting also keeps fonts working on any host. **Approved by the team.**
- **Decision:** also include **Lato Bold**, which the team didn't specify. **Why:** the body copy has bold text (the summary line, people's names, button labels). Without the real bold file, browsers draw a blurry imitation bold. **Approved by the team.**
- **Decision:** use Oswald for numbers in markers and list cards, not only for headings. **Why:** the numbers act as headings for each stop, and Oswald's condensed figures read clearly inside the small circles.
- **Decision:** load only the Latin subset. **Why:** it covers English and Western European names at about a quarter of the full download size. Other characters fall back to a system font.
- **Decision:** apply the typefaces to the QR sign sheet. **Why:** the signs are part of the campaign materials and should match the site.
- **Decision:** don't record new contrast measurements. **Why:** typefaces don't change color contrast, so the existing measurements still hold.

### Verified
- In a browser at 375px and 1280px, all four font files loaded. The header uses Gasoek One, the stop and list titles use Oswald, and the body text uses Lato.
- There's no sideways scrolling at 375px.
- The QR sign sheet loads all four fonts.

---

## 2026-10-14 — The five tour sites

**Directed by:** project team (sites and coordinates). Implemented by Claude Code.

### What changed
- **`data/stops.json`:** replaced the five placeholder locations with the team's five sites:

  | Order (provisional) | Site | id (used in URL and QR code) | Coordinates |
  |---|---|---|---|
  | 1 | The Unsung Founders Memorial | `unsung-founders-memorial` | 35.913913, −79.051746 |
  | 2 | Steele Building | `steele-building` | 35.911508, −79.050345 |
  | 3 | Lenoir Hall | `lenoir-hall` | 35.910578, −79.048856 |
  | 4 | The Pit | `the-pit` | 35.910092, −79.048583 *(see below)* |
  | 5 | Old Chapel Hill Cemetery | `old-chapel-hill-cemetery` | 35.911029, −79.045639 |

  Each stop's era, summary, history, people, and sources are still **placeholder text**, and its images are still placeholder graphics. No historical content was added. The map's starting center moved to the middle of the five sites (35.912003, −79.048693).
- **New `"placeholder": true` field** on each stop. It now controls the "PLACEHOLDER CONTENT" badge (`js/app.js`), since the real site names no longer contain the word "PLACEHOLDER".
- **Regenerated** `data/route.geojson` (straight lines in the provisional order), the placeholder images, and the QR codes. The old `qr/placeholder-stop-*.png` files were deleted and replaced by one PNG per new stop id, and `qr/sheet.html` was rebuilt.
- **Overview map fit (`js/app.js`):**
  - The overview now frames the stops with a fixed 24-pixel margin, plus extra space at the bottom for the Start button, instead of a 25% margin. This keeps the five sites at a closer zoom level on phones.
  - The overview also re-fits when the screen size changes (for example, when a phone is rotated), unless the visitor has already moved the map or opened a stop.
- **Docs:** updated the README status note, the deep-link example in the editing guide, the placeholder-badge instructions (editing guide, design doc, content guidelines), and the known limits in `docs/site-overview.md`.

### Decisions and reasons
- **Decision:** use **35.910092, −79.048583** for the Pit instead of the supplied 35.904613, −79.046761. **Why:**
  - The supplied point is the same "campus center" given in the original requirements, which suggests a copy-paste slip.
  - When checked against UNC's building layer, that point falls on Morrison Residence Hall on South Campus, about 700 m from the Pit.
  - OpenStreetMap places the Pit (a pedestrian plaza) at 35.910092, −79.048583, between Lenoir Hall, Student Stores, and the Student Union.

  **Confirmed by the team.**
- **Decision:** check every supplied coordinate against UNC's building layer before using it. **Why:** QR signs will send visitors to these points, so a wrong coordinate would misdirect people on the ground. The other four sites matched: Steele Building and Lenoir Hall fall on those buildings, the Unsung Founders Memorial point is beside Graham Memorial, and the cemetery point is beside Connor Residence Hall.
- **Decision:** set a **provisional** walking order using the shortest straight-line path through the five sites (about 810 m): north to south-east, from the Unsung Founders Memorial to Old Chapel Hill Cemetery. **Why:** the team hasn't decided the path yet, but the app needs an order for numbering and Previous / Next. This order can change freely until signs are printed.
- **Decision:** base stop ids on the site names (e.g. `lenoir-hall`) rather than stop numbers. **Why:** ids appear in the QR codes, so they must stay the same even if the route order changes.
- **Decision:** mark unverified content with an explicit `placeholder` field instead of putting "PLACEHOLDER" in the title. **Why:** the stops now have real names, but their content is still unverified, and the badge must keep flagging that.

### Verified
- In a browser at 375px width:
  - All five markers appear with their names, along with the route line.
  - The overview fits all five sites at zoom 16.
  - Each deep link (`#stop=<id>`) opens the right stop with the correct "Stop N of 5" and the placeholder badge.
  - Next and Previous work, and "Back to Stop 1" appears on the last stop.
  - The panel stays open when the window is resized.
  - The List view shows the five sites in order.
  - An old `#stop=placeholder-stop-3` link falls back to the List view with a message.

---

## 2026-10-14 — Campus boundary layer, and basemap research

**Directed by:** project team (add UNC's campus boundary; explore better basemaps). Implemented by Claude Code.

### What changed
- **New `scripts/build-campus-boundary.js` (`npm run boundary`):** downloads UNC's campus-boundary parcels (`basemap/FeatureServer/16`), merges them into one outline, bridges the streets between parcels, simplifies the result, and writes **`data/campus-boundary.geojson`** (about 22 KB).
- **New `tour.campusBoundary` settings** in `data/stops.json`: `sourceUrl`, `where`, `closeGapsMeters`, `file`, and `label`.
- **Map (`js/app.js`, `index.html`, `css/styles.css`):** the campus boundary is drawn as a solid 2px outline with an 8% tint, beneath the buildings and route, with a new "Campus boundary" toggle button. It's turned on by default. Added the `--color-boundary-line` and `--color-boundary-fill` color tokens (light and dark).
- **New dev dependencies:** `@turf/union`, `@turf/buffer`, `@turf/simplify`, `@turf/truncate`, and `@turf/helpers` (7.4.0, MIT). These are used only by the build script.
- **New team tool `tools/basemap-preview.html`:** shows the tour's stops, route, and campus boundary over ten interchangeable basemaps for comparison. It isn't linked from the tour.
  - It's **published temporarily** on GitHub Pages so the team can compare options and give input: <https://taliakberler.github.io/beyond-the-white-and-blue/tools/basemap-preview.html>.
  - Options are lettered A–J, and links can open a specific option (e.g. `#C`).
  - It's marked `noindex` so search engines skip it.
  - It's to be deleted once a basemap is chosen.
- **Docs:** documented the boundary in the software and credits, site overview, editing guide, and design docs.

### Decisions and reasons
- **Decision:** pre-build the boundary as a small file instead of loading UNC's layer live. **Why:**
  - The live layer is 195 separate parcels (about 1.4 MB), which is heavy for visitors on cellular data.
  - Drawing the parcels as they are produces internal lines along every street.
  - A static file also keeps working if UNC's server is down. Campus boundaries change rarely, and the script can be re-run when they do.
- **Decision:** include only `BROADAREAS = 'Central Campus'` (121 parcels). **Why:** the full layer includes properties miles away (for example, a park-and-ride in Chatham County, and Carolina North), which would pull the map far from the tour.
- **Decision:** close gaps of up to about 30 m (`closeGapsMeters: 15`). **Why:** public streets separate University parcels, so a plain merge produced 49 fragments with outlines along both sides of each street. That looked like a second street network and competed with the dotted route. Gap-closing reduced it to 12 areas that read as one campus. The outer edge stays in place, but the outline is approximate where streets were bridged.
- **Decision:** draw the boundary as a solid thin line with a faint tint, not a dashed line. **Why:** the first version used a dashed line, which was easily confused with the dotted tour route.
- **Observation:** Old Chapel Hill Cemetery falls outside UNC's campus parcels, so it appears just outside the boundary.

### Basemap research (no change made yet)
The current OpenStreetMap Standard tiles are free, but they're visually busy and can't be restyled. These options were checked against the project's constraint of no API keys or paid services:

| Option | Key or account? | Notes |
|---|---|---|
| **OpenFreeMap** (Positron, Bright, Liberty, Dark) | None | Free vector tiles with no usage limits, funded by donations and provided as-is. Colors can be fully restyled to match the brand palette, and there's a true dark style. Needs the open-source MapLibre GL library (larger download than Leaflet alone). |
| **UNC campus basemaps** (standard, blue buildings, aerial) | None | UNC's own campus maps, with building names. They're published in North Carolina's state map projection, so the server has to draw each map tile when it's requested, which is slower. Campus area only. |
| **OpenStreetMap Humanitarian** | None | Softer colors than Standard. Volunteer-hosted with no guarantees. |
| **No basemap** (brand-colored background with UNC buildings and boundary) | None | Fully on-brand, but has no streets or labels. |
| **CARTO** (Positron, Voyager, Dark Matter) | **API key now required** | Keyless requests now show an "API key required" watermark. Excluded by the no-keys constraint. |
| **Esri** (Light Gray Canvas, imagery) | Current key requirements unconfirmed | Esri basemaps generally require an ArcGIS account for apps. Not pursued. |
| **Stadia / Stamen, MapTiler, Thunderforest** | Account or key required | Excluded by the no-keys constraint. |

### Verified
- In a browser at 375px width, the campus boundary loads as one outline around central campus, beneath the buildings and route, and the toggle button appears.
- In the preview tool, these basemaps were checked to load:
  - OpenFreeMap Positron, Bright, and Liberty (tested directly with MapLibre)
  - UNC's blue-buildings basemap
  - the no-basemap option

  The browser pane used for testing pauses WebGL drawing while hidden, which briefly made OpenFreeMap look broken during testing. This doesn't affect visitors.

---

## 2026-10-14 — Whole-tour QR code

**Directed by:** project team. Implemented by Claude Code.

### What changed
- **`scripts/generate-qr.js`:**
  - now also generates **`qr/tour.png`**, which points to the tour's home page: <https://taliakberler.github.io/beyond-the-white-and-blue/>
  - adds a whole-tour sign as the first page of `qr/sheet.html`, with the tour name, subtitle, QR code, "Scan with your phone camera to start the tour", and "5 stops · free · no app needed"
- **`docs/editing-guide.md`:** explains the two kinds of QR code and where each is used.

### Decisions and reasons
- **Decision:** point the whole-tour code at the bare site address (`<BASE_URL>/`) rather than `index.html`. **Why:** a shorter address makes a simpler code that's easier to scan from a distance, and GitHub Pages serves `index.html` there automatically.
- **Decision:** use the same settings as the stop codes (error correction Q, 1200px, 4-module quiet zone, black on white). **Why:** this keeps the codes consistent and gives the same scan reliability on posters and flyers as on outdoor signs.

### Verified
- All six QR codes were decoded with an open-source QR reader (jsQR), and each contains the expected address.

---

## 2026-10-14 — Team illustrated map added to the basemap preview

**Directed by:** project team (supplied `Unc Map.ai`). Implemented by Claude Code.

### What changed
- Rendered the team's Illustrator map to a 4000×2588 PNG, `tools/assets/team-illustrated-map.png`. The `.ai` file itself isn't in the repository.
- Added it to `tools/basemap-preview.html` as option **K. Team illustrated map (draft)**, drawn beneath the route, boundary, and stops. Outside the illustration, the page uses the illustration's own background color (`#9fc6e0`) so its edges blend in.

### Decisions and reasons
- **Decision:** place the illustration on the real map by matching buildings, not by guessing its corners. **Why:** the stops must line up with the drawing. 23 buildings drawn in the illustration (for example, Davis Library, Wilson Library, Graham Memorial, Cobb, Peabody, and Joyner) were matched to UNC's building data, and a best-fit position and scale were calculated. The fit showed:
  - The illustration is **north-up and drawn to scale.** Rotation is under 2°, and the scale is the same horizontally and vertically, about 0.27 m per pixel at full resolution.
  - So it can be placed as a simple rectangle. Its corners are 35.908692, −79.054346 (south-west) and 35.915009, −79.042162 (north-east), covering about 1.1 km east to west.
  - The median position error is about **6 m**, and the largest is 16 m.
- **Decision:** leave "Old East" out of the fit. **Why:** the shape labeled "Old East" sits about 58 m from Old East's position in UNC's data. That's either an artistic choice or a mismatch in identifying the shape, and including it would have distorted the fit.
- **Decision:** add it as option K at the end of the list. **Why:** options A–J may already have been shared with the team, and inserting it earlier would change their letters.

### Observation for the team
- **Stop 1 (the Unsung Founders Memorial) may have the wrong coordinates.** The supplied point (35.913913, −79.051746) is about 62 m north of where both OpenStreetMap (35.913360, −79.051791) and the team's illustration place the memorial. The supplied point is close to Graham Memorial. **The team confirmed it, and Stop 1 was moved to the OpenStreetMap location (see the next entry).**

### Verified
- In a browser, option K loads the full image beneath the stops, route, and boundary, and Stops 2–5 line up with the illustration.

---

## 2026-10-14 — Stop 1 location corrected

**Directed by:** project team

### What changed
- **`data/stops.json`:** moved the Unsung Founders Memorial (Stop 1) from 35.913913, −79.051746 to **35.913360, −79.051791**, OpenStreetMap's location for the memorial. It's about 62 m south of the original point.
- **`data/route.geojson`:** rebuilt (still straight lines in the provisional order).
- The stop's id (`unsung-founders-memorial`) is unchanged, so its QR code didn't need to change.

### Decisions and reasons
- **Decision:** use OpenStreetMap's position. **Why:** OpenStreetMap and the team's illustrated map agree on where the memorial is, and the original point was near Graham Memorial instead.

---

## 2026-10-14 — Team illustrated map: fast tiles, faded surrounding streets, and "Find me"

**Directed by:** project team. The team chose to decide between options C, H, and K, leaning toward K (the team's illustrated map), provided that:
1. it renders quickly
2. surrounding roads and map features are shown, but with less prominence
3. visitors can still find their location on it

Implemented by Claude Code.

### What changed
- **New `scripts/build-team-map-tiles.js` (`npm run team-map`) and `scripts/team-map.json`:** cuts the illustration into standard web-map tiles, `tiles/team-map/{z}/{x}/{y}.png`, for zoom levels 14–18. That's 99 tiles and 1.4 MB in total, but a phone loads only the tiles on screen. Each tile is a 512px image drawn in a 256px map square, so it stays sharp on high-resolution phone screens. The tiles use compressed palette PNGs.
- **Background fade:** the illustration's flat background (`#9fc6e0`) is kept around the drawn campus, with an 18 m margin, and fades softly to transparent beyond it. Gaps between drawn features are filled so no holes appear, and the image borders are faded so there's no hard rectangular edge.
- **Option K in `tools/basemap-preview.html`** now uses the tiles instead of the single image. Underneath, OpenStreetMap is shown grayscale at 38% opacity over the illustration's blue, so nearby roads and features appear in the background.
- **"Find me" button** added to the preview, using the same browser geolocation as the tour.
- **Removed** `tools/assets/team-illustrated-map.png` (the 1.9 MB single image).
- **New dev dependency:** `sharp` 0.35.5 (Apache-2.0).
- **`.gitignore`:** added `map-source/`, the large PNG export the tiles are built from.
- **Docs:** added sharp to the software and credits doc, and added "Update the team's illustrated map" to the editing guide.

### Decisions and reasons
- **Decision:** use map tiles rather than one image. **Why:** the single image was 1.9 MB, and every visitor would download all of it before seeing the map. With tiles, the opening phone view loads **6 tiles (152 KB)**, about 12 times less, and zooming in loads only the detail needed.
- **Decision:** render the source from the `.ai` file at 6000px wide. **Why:** at zoom 18 on a high-resolution screen, the tiles need about 0.24 m per pixel. At 6000px across 1.1 km, the source has about 0.18 m per pixel, so text and building edges stay crisp. Zooms 19–20 enlarge the zoom-18 tiles.
- **Decision:** show surrounding streets by fading OpenStreetMap into the illustration's blue (grayscale, 38% opacity), not with a second vector map library. **Why:** it adds no extra code library, which keeps the map fast, and it matches the illustration's palette. It's also lower-contrast than the illustration, so campus stays the focus.
- **Decision:** write fully transparent tiles too (about 100 bytes each). **Why:** without them, phones would request missing files inside the map area and get 404 errors.
- **Decision:** `sharp` 0.35.5 rather than 0.33.5. **Why:** `npm audit` flagged high-severity vulnerabilities in 0.33.5's bundled image libraries (libvips, libheif, librsvg). 0.35.5 reports none.
- **How "Find me" works on the illustration:** the illustration is positioned on real-world coordinates (from the 23-building fit), so a phone's GPS position lands on the matching spot in the drawing. No link to an outside web map is needed.

### Verified
- At 375px width, option K's opening view loaded 6 illustration tiles (152 KB) with no missing images, and each tile loaded in under 15 ms locally.
- Faded streets appear around campus (Franklin, Rosemary, and Raleigh Streets) beneath the illustration.
- A simulated location at Davis Library put the "Find me" dot on Davis Library in the illustration.

---

## 2026-10-14 — Building info on hover (option K), and preview checkbox removed

**Directed by:** project team. Implemented by Claude Code.

### What changed
- **Option K in `tools/basemap-preview.html`:**
  - adds an **invisible** copy of UNC's building layer: no outline or fill is drawn, but hovering a building (or tapping it on a phone) shows a tooltip with its name and year built, from UNC's `BUILDINGNAME` and `YEARBUILT` fields
  - adds this to the option's description
- **Removed the "UNC buildings" checkbox** from the preview header. Option J (No basemap) still shows visible building outlines automatically, since they're its only content.
- The visible and invisible building layers share a single download of UNC's building data.

### Decisions and reasons
- **Decision:** keep UNC's footprints interactive but fully transparent on the illustrated map. **Why:** UNC's outlines don't align perfectly with the illustration (median offset about 6 m), so drawing them would look like a misprint. The information is still useful, so it's shown on hover or tap only.
- **Decision:** open the tooltip on tap as well as hover. **Why:** phones have no hover, and phones are the main device.
- **Decision:** show the building name and year built only. **Why:** these are the fields that make sense to visitors. Other fields in UNC's layer (building numbers, funding codes, square footage) are administrative.
- **Note:** names come straight from UNC's data, so some are abbreviated (for example, "Steele Bldg" and "Cobb Res Hall"). Near building edges, the small misalignment can occasionally show a neighboring building's name.

### Verified
- On option K, all 577 building shapes are present and interactive, with no visible outline or fill.
- A real mouse hover over Davis Library on the illustration showed "Davis Library — Built 1983".
- Option J shows 577 outlined buildings, and option C shows no building layer.
- The "UNC buildings" checkbox no longer appears.

---

## 2026-10-14 — Softer edges on the illustrated map

**Directed by:** project team (the left and bottom edges looked like hard, unnatural cuts). Implemented by Claude Code.

### What changed
- **`scripts/build-team-map-tiles.js`:** the illustration now fades gradually to transparent over the last **45 m** inside each of its borders, using a smooth (smoothstep) ramp. This replaced a 6 m fade that only cleared a thin frame. The setting is the new `borderFadeMeters` in `scripts/team-map.json`.
- **`tiles/team-map/`:** rebuilt (99 tiles, 1.4 MB).
- **`tools/basemap-preview.html`:** switching basemaps now also clears the old one's credit line. OpenFreeMap's credit had stayed visible after switching from option C to K.
- **`docs/editing-guide.md`:** documented `borderFadeMeters`.

### Decisions and reasons
- **Decision:** fade toward the image's own borders, not just around the drawn campus. **Why:** on the left and bottom, the drawing (Peabody, Sitterson, Kenan Labs, and the paths beside them) runs almost to the edge of the artboard. The background around campus was kept solid all the way to that edge, so it ended in straight lines. A wider fade at every border lets the drawing dissolve into the faded street map instead.
- **Note:** the long straight white lines that fade out near the edges are walkway lines in the illustration itself, not tile seams. Pixel values across tile boundaries were checked and match.

### Verified
- With the browser cache cleared, the left and bottom edges at zoom 16 and 17 fade smoothly into the surrounding streets on a 2x-resolution screen. Option C's credit no longer remains after switching to K.

---

## 2026-10-14 — Illustrated map edge follows the drawing

**Directed by:** project team (the left edge was still too sharp and should follow the illustration's content). Implemented by Claude Code.

### What changed
- **`scripts/build-team-map-tiles.js`:** rewrote how the transparency mask is built:
  1. Drawn features (buildings, paths, the cemetery) are found by color and stay opaque.
  2. Lawns and courtyards between them are filled in (55 m gap-closing). The artboard border now counts as "outside" during this step, so the filled area pulls back from straight edges instead of running into them.
  3. The flat background color fades out with **distance from the nearest drawn feature**, reaching zero at 22 m, so the edge forms a soft halo that follows the drawing's contour.
  4. A short 12 m fade at the artboard border remains as a safety net, followed by a 2 m final softening.
  5. The mask is now built at about 0.55 m per pixel (previously 1.1 m), so the halo follows smaller details.
- **`scripts/team-map.json`:** `edgeMarginMeters` 22, `closeGapsMeters` 55, `borderFadeMeters` 12, `featherMeters` 2.
- **`tiles/team-map/`:** rebuilt (99 tiles, 1.4 MB).
- **`docs/editing-guide.md`:** updated the settings descriptions.

### Decisions and reasons
- **Decision:** fade by distance from the drawing, not from the artboard edge. **Why:** the previous 45 m border fade was smooth, but still ran parallel to the artboard's straight edges. On the left side, Hill, Smith, Peabody, Sitterson, and the paths beside them sit close to the edge, so the fade there looked like a blurred straight line. Tying the fade to the drawn features makes the outline wrap around them.

### Verified
- At zoom 17, the left side's halo wraps around Hill, Smith, Peabody, Sitterson, Murray, and Kenan Labs with no straight line visible. At zoom 16, the illustration's whole outline follows the campus shape on all sides.

---

## 2026-10-14 — Remaining straight edges removed from the illustrated map

**Directed by:** project team (a straight edge was still visible on the left and bottom, outside the contoured fade). Implemented by Claude Code.

### What changed
- **Cause found:** the PNG rendered from the `.ai` file (via the macOS PDF renderer) has a 2-pixel white line along its left and bottom edges. That line isn't in the artwork; it's an export artifact. The tile script treated it as drawing, so it got its own faint halo and showed as a straight line along those two sides.
- **`scripts/build-team-map-tiles.js`:** ignores the outermost 1.5 m of the artboard when finding drawn features (new `ignoreEdgeMeters` setting in `scripts/team-map.json`). The nearest real artwork (Peabody, Sitterson, and the paths beside them) is about 30 m from the edge, so it isn't affected.
- **`tiles/team-map/`:** rebuilt (99 tiles, 1.5 MB). A stitched transparency check at zoom 16 now shows only the contoured outline, with no lines along the artboard edges.
- **`tools/basemap-preview.html`:** the faded street tiles now overlap by 1 pixel. Where two street tiles met, the browser left a hairline gap that showed as a faint straight line through the faded streets. The street tiles are opaque, so the overlap isn't visible.

### Verified
- With the browser cache cleared, the left and bottom areas at zoom 17 show no straight edges or tile lines. The illustration's outline follows the drawing.

---

## 2026-10-14 — Illustrated map (option K) becomes the tour's basemap

**Directed by:** project team. The team chose option K in its present form, asked to remove the campus boundary toggle, and confirmed the boundary shouldn't be shown at all. Implemented by Claude Code.

### What changed
- **`js/app.js`:**
  - The basemap is now the team's illustrated map (`tiles/team-map/`, in its own pane), drawn over OpenStreetMap streets in grayscale at 38% opacity. Both layers feed the "map tiles couldn't load" message. The map allows zooming to 20.
  - The UNC building layer is now **invisible**. Hovering (desktop) or tapping (phones) a building shows its name and year built. Only the name and year fields are downloaded.
  - **Removed** the campus boundary layer and its loader.
- **`index.html`:** removed the "Campus boundary" and "Campus buildings" toggle buttons. Only "You are here" remains.
- **`data/stops.json`:**
  - new `tour.basemap` block: tile path, bounds, zoom range, street opacity, and credit
  - `tour.buildingLayer` now has `yearField: "YEARBUILT"`, and its `label` is removed (there's no button for it anymore)
  - `tour.campusBoundary` is kept for the comparison page and `npm run boundary`, but the tour no longer uses it
- **`css/styles.css`:**
  - new `--color-map-bg` and map-symbol tokens (`--color-map-marker`, `--color-map-active`, and others), which keep markers, the route, and the location dot in their light colors in both themes
  - removed the dark-mode filter that inverted map tiles
  - removed the unused `--color-route`, `--color-building-*`, and `--color-boundary-*` tokens
  - added faded-street styles (with the 1px overlap that prevents tile seams)
  - added building tooltip styles
  - no focus ring is drawn on the invisible building shapes
- **Docs:** updated the README credits, the site overview, the design doc (map symbol tokens, components, dark mode), the software and credits doc (illustrated map; OpenStreetMap's new role; building names; the boundary used only by the comparison page), and the editing guide (`basemap` settings, `yearField`).

### Decisions and reasons
- **Decision:** remove the "Campus buildings" button too. **Why:** with option K, building footprints are never drawn, so there's nothing visible for the button to switch. Building info is always available on hover or tap.
- **Decision:** remove the campus boundary entirely rather than always showing it. **Why:** the team's choice. The illustration already shows campus, and the outline overlapped the art.
- **Decision:** keep the map light in dark mode. **Why:** the illustration is the team's artwork, and inverting its colors would distort it. Dark mode now changes only the interface around the map.
- **Decision:** fix the marker, route, and location-dot colors in both themes. **Why:** in dark mode these had switched to a pale blue (`#8cb8e6`), which nearly disappeared against the light illustration.
- **Decision:** hide the focus ring on the invisible building shapes. **Why:** tapping a building made the browser draw a focus outline around it, revealing the misaligned footprint the design deliberately hides. The shapes can't be reached with the keyboard, so no keyboard focus is lost.
- **Note:** `tools/basemap-preview.html` (the temporary comparison page) is still published. It can be deleted now that a basemap has been chosen.

### Verified
- At 375px width in light mode:
  - The opening view shows the illustration (6 tiles, none missing), the faded streets, 5 markers, and the route, with no sideways scrolling.
  - The map credit line reads "© OpenStreetMap contributors, Illustrated map: Beyond the White and Blue team".
  - Only the "You are here" button appears.
- Tapping Davis Library showed "Davis Library — Built 1983" with no outline or focus ring, and no stop opened.
- The `#stop=lenoir-hall` deep link opened Stop 3 at zoom 18, with its marker on Lenoir Hall in the illustration.
- In dark mode, the map stays light, markers are dark blue with a white ring, and the interface around the map is dark.

---

## 2026-10-14 — Fix: "The tour couldn't load" after an update (browser caching)

**Directed by:** project team (reported that the live link showed "The tour couldn't load"). Fixed by Claude Code.

### What happened
- GitHub Pages lets browsers reuse files for up to 10 minutes. After the illustrated-map update, a browser that had recently visited could combine the **new** `index.html` (without the "Campus buildings" button) with its **old** cached `js/app.js`, which still expected that button. The old script crashed while starting, and the tour showed "The tour couldn't load". The message also wrongly blamed the tour data.
- This was reproduced locally by serving the new page with the previous `app.js`, which produced the same error. A fresh load of the live site worked correctly.

### What changed
- **New `scripts/stamp-assets.js` (`npm run stamp`):** adds a content-based version to the CSS and JavaScript links in `index.html` (for example `js/app.js?v=71ee66bf`). When a file changes, its address changes, so a browser can't pair a new page with an old script.
- **`index.html`:** the CSS and JS links are now stamped.
- **`js/app.js`:**
  - The startup error now distinguishes "the data didn't load" from "something went wrong starting the tour", and both offer a **Reload** button.
  - The optional building layer is now started inside a safety wrapper, so a failure there can't stop the rest of the tour.
- **`docs/editing-guide.md`:** new section, "After changing CSS or JavaScript": run `npm run stamp`.

### Verified
- New page with the old script: reproduced the original error (before the fix).
- New stamped page: loads normally, with 5 markers and the illustrated map.
- Old cached page with the new script: also loads normally.

---

## 2026-10-14 — New name, digital-map framing, About page, compass and scale, seamless tiles, asset review

**Directed by:** project team. Implemented by Claude Code.

### Name
- **The project is now "Beyond the Blue and White"** (previously "Beyond the White and Blue"), matching the team's logo, icon files, and wireframes. The team chose this wording. The logo itself reads "Beyond the Blue & White"; text on the site uses "and".
- Updated the site title, page title, header, subtitle, map credit line, QR sign sheet, README, and docs. Earlier entries in this log keep the old name, as a record.
- **Not renamed:** the GitHub repository and web address (`…/beyond-the-white-and-blue`). Renaming them would break existing links and any QR codes already shared.

### From "walking tour" to "multimedia digital map"
- **Decision (team):** the project is no longer framed as a walking tour, but as a multimedia digital map with resources and related information.
- **Site text:**
  - The page title is now "Beyond the Blue and White — A Digital Map".
  - The subtitle is now "A digital map of Black history at UNC Chapel Hill".
  - "Start the tour at Stop 1" became **"Start exploring"**.
  - "Tour stops" became "All stops".
  - Error and status messages refer to "the map".
  - The placeholder intro was reworded.
- **Docs and QR signs:** tour wording replaced throughout. The whole-site QR code file was renamed from `qr/tour.png` to **`qr/map.png`** (its address is unchanged), and its sign now reads "Scan with your phone camera to explore the map".
- **Kept:** stop numbers, "Stop 3 of 5", Previous / Next, and "Get walking directions". These still help people move between sites, and the team's wireframes use "Stop #". The settings section in `data/stops.json` is still named `"tour"`; renaming it would add risk without changing anything visitors see.

### Seamless map tiles
- **Problem (team):** the edges of map tiles were faintly visible as straight lines across the map.
- **Cause:** browsers soften each tile image's edges slightly, leaving hairline seams where tiles meet. Leaflet 1.9.4 already uses `mix-blend-mode: plus-lighter` on tiles to fix this. But the illustrated map's tiles sit in a separate pane, so they were blending into the street layer beneath instead of only with each other.
- **Fix (`css/styles.css`):** the illustrated-map pane and the faded-streets layer now each use `isolation: isolate`, so the softened edges of neighboring tiles add back up to a solid join within their own layer. The earlier 1-pixel overlap workaround for street tiles was removed, since it also slightly stretched those tiles.
- **Verified:** at zoom 16 and 18 on a 2x screen, and at 700px and 1280px window widths, no seams were visible at tile boundaries in full-resolution captures.

### Compass and scale
- **`js/app.js`:**
  - Leaflet's scale bar (meters and feet, up to 110 px wide) in the bottom-left corner
  - a custom north-pointing compass above it (SVG, 44 px, announced to screen readers as "north is at the top of the map")
- **`css/styles.css`:** styles for both, in the map-symbol colors, so they look the same on the light map in light and dark mode.
- **Responsive behavior:**
  - On screens 640 px wide or narrower, the map's credit line is limited to the space right of the compass and scale.
  - The "Start exploring" button sits above the credit line, and the compass and scale rise above the button while it's showing.
  - When a stop's bottom sheet is open on a phone, they move up above it.
- **Verified:** at 375 px, 700 px, and 1280 px, measured element positions showed no overlaps between the compass, the scale, the button, and the credit line. With a stop open on a phone, both sit above the sheet.

### About page and credits
- **New About page:** the **ⓘ** button in the header, or the `#about` address. It shows:
  - the team's tagline and description
  - the project's context ("created at the Visual Discovery Conference 2026 at UNC Chapel Hill")
  - the team's prompt ("Highlight Black history at UNC Chapel Hill")
  - credits for the team, coaches, and community advisors
  - map and software credits, and a link to the repository
- **Content** is stored in `tour.about` in `data/stops.json` so it can be edited without code. Each person has a `role` field, left empty until the team adds roles.
- **People credited:**
  - **Team:** Talia Berler, Cayla Quintero, Trinity Gill, Gwyneth Shoemaker, Jori Husted, Andrea Perez, Victor Morgan, Leticia Oteng, Anderson Day
  - **Coaches:** Adonis Durado, Randy Stano
  - **Community advisors** (from Chapel Hill, who advised the team on the history of Black labor and community there): Samuel Scarborough, Nicholas Graham
- **README:** new "Project context" and "Team and credits" sections with the same names.
- **Docs:** the About page is documented in the site overview, design doc, and editing guide (including the `about` fields).
- **Verified:** at 375 px, the ⓘ button opens the About page (and sets `#about`), closes any open stop, and shows all 13 names in five sections. Map and List return to the map.

### Asset review (logos, fonts, icons, wireframe)
The team supplied logo files and fonts, map-pin icons, and a UI wireframe for upcoming design work. Each file was checked for corruption and quality. **Nothing is corrupted**, but a few issues were found:

| Asset | Result |
|---|---|
| **Logo SVGs** (6: horizontal and stacked, in Carolina Blue, Franklin Fog, and Navy) | Valid; fully vector (text outlined, no embedded images or fonts); transparent backgrounds. Colors: `#4b9cd3`, `#11294b`, `#eceded`. **Best choice for the website.** |
| **Logo PNGs** (6) | Valid, 300 dpi. ⚠ **`BTBB_horizontal_NAVY.png` is an exact copy of `BTBB_stacked_NAVY.png`** (the stacked logo), so there's no correct horizontal navy PNG. ⚠ **None of the logo PNGs has a transparent background,** so white rectangles show beside the shorter bars of the stacked logos on any colored background. |
| **Logo `.ai` files** (6) | All open and render correctly. The horizontal navy `.ai` is the right (horizontal) layout, so a correct PNG can be re-exported from it. |
| **`~ai-81d1a9c9-….tmp`** in Logo Files | An Illustrator temporary or autosave file, not an asset. It can be deleted from the shared folder. |
| **Logo fonts** (Gasoek One; Lato in 10 styles; Oswald, variable and 6 static weights) | All 18 files are valid, with complete Latin character sets including curly quotes, dashes, and accented letters. Licenses (SIL OFL) are included. They're the same families and versions the site already uses. Note: `Lato-Thin.ttf` names itself "Lato Hairline" internally (as in that Lato release), so it appears under that name in font menus. |
| **Icon SVGs** (8: Buildings, Carpenters, Cemetery, Masons, Memorial, Painters, People, Seamstress) | Valid and fully vector, on a consistent 595×517 artboard; the icons fill 86–88% of its height. Colors: `#87aed0` and `#172849`. Note: the icon navy (`#172849`) is slightly different from the logo navy (`#11294b`). The four hand-tool icons are tall and narrow, so they'll look narrower than the others at pin size. |
| **Icon PNGs** (8) | Valid, high resolution (about 2480×2156), with transparency; they match the SVGs |
| **Icons `.ai`** | Opens and renders; 8 artboards, one per icon |
| **Wireframe** (`1.webp`) | Valid image, 2000×1194 |

The assets haven't been added to the repository yet. They'll be brought in as the wireframe's design is implemented.

---

## 2026-10-14 — Repository renamed; QR codes regenerated

**Directed by:** project team. Implemented by Claude Code.

### What changed
- **GitHub repository renamed** from `taliakberler/beyond-the-white-and-blue` to **`taliakberler/beyond-the-blue-and-white`**, to match the project's name.
- **New site address:** **https://taliakberler.github.io/beyond-the-blue-and-white/**. GitHub Pages moved to it automatically.
- **Local git remote** updated to the new repository address.
- **References updated** to the new name and address: README, `package.json` and `package-lock.json`, the editing guide, site overview, software and credits doc, `scripts/qr-config.json` (`BASE_URL`), and the About page's repository link in `data/stops.json`.
- **QR codes regenerated:** `qr/map.png` and the five stop codes, plus `qr/sheet.html`, now point to the new address.

### Decisions and reasons
- **Decision:** rename now, before any signs are printed. **Why:** GitHub forwards old **repository** links to the new name, but it doesn't forward **GitHub Pages** sites. The old site address now returns "404 Not Found", so every QR code had to be regenerated. Doing this before printing means no physical signs are affected.
- **Note:** earlier entries in this log still mention the old repository name and site address, as a record. Links to the old site address in those entries no longer work.
- **Note:** the local working folder on the developer's computer is still named `beyond-the-white-and-blue`. That doesn't affect GitHub or the site.

### Verified
- All six QR codes were decoded with jsQR and point to `https://taliakberler.github.io/beyond-the-blue-and-white/…`.
- The new site address and its `data/stops.json` return 200 (OK), and the old site address returns 404.

---

## 2026-10-14 — Wireframe design implemented, with the team's logo and icons

**Directed by:** project team (supplied the wireframe, logo files, and icons; asked to start implementing the wireframe with the new icons). Implemented by Claude Code.

### What changed
- **New screens, following the six wireframe frames:**
  1. **Splash:** navy with the stacked Carolina Blue logo, while the data loads
  2. **Intro / home:** tagline, stacked logo, project description, coral **Explore the map** button, and links to All stops and About
  3. **Map:** navy header (horizontal navy logo; All stops, About, and Home), the illustrated map with **icon pins**, the dotted route, and a fog **hint card** at the bottom
  4. **Stop preview:** a short navy sheet with "STOP N OF 5 / NAME" and the era
  5. **Full story:** gallery, caption and credit, history
  6. **Key People** cards: sky blue, with photo, uppercase name, a short fog underline, description, and an optional "Learn more"
- **`index.html`:** rebuilt for these screens. The header uses the logo image in place of text, and the theme toggle was removed.
- **`css/styles.css`:** rewritten around the wireframe palette:
  - navy `#172849`, fog `#eceded`, Carolina Blue `#4b9cd3`, sky `#87aed0`, coral `#d85c54`
  - wireframe-style components (sheet, cards, buttons, pins, hint card)
  - map controls restyled in navy and fog
  - an amber focus ring
  - the compass and scale, the seamless-tile fix, and the faded streets are kept
- **`js/app.js`:**
  - **Screens:** splash and intro screens, and Home buttons.
  - **Map:** icon pins with number badges, and the hint card (replacing "Start exploring").
  - **Stop sheet:** opens as a preview from a pin. Tap it, swipe up, or use the handle to expand it; swipe down to shrink it or close it. Stop links and QR codes open it fully expanded.
  - **Key People cards:** photo, name, description, and optional "Learn more" link.
  - **Corner controls:** sized to keep clear of the sheet and hint card, and hidden while the full story covers the map.
  - The splash is removed from the page after it fades.
  - The light/dark theme code was removed.
- **New assets:**
  - `images/logo/`: the six logo SVGs, unchanged
  - `images/icons/source/`: the eight icon SVGs, unchanged, renamed to lowercase (for example `Memorial Icon.svg` became `memorial.svg`)
  - `images/icons/pins/`: pin versions built by the new **`scripts/build-pin-icons.js` (`npm run pins`)**
  - `images/person-placeholder.svg`: a coral duotone placeholder portrait
- **`data/stops.json`:**
  - each stop now has an `icon`
  - people have `image`, `imageAlt`, and `link` fields (set to the placeholder portrait for now)
  - new `tour.welcome` (intro screen text) and `tour.mapHint` (hint card text)
- **Docs:**
  - `docs/design-and-styles.md` rewritten for the wireframe design (palette, contrast, screens, components, logos and icons)
  - the site overview, editing guide (`icon`, `welcome`, `mapHint`, people `image`/`link`, "Map pin icons"), software and credits (the team's logo and icons; the `localStorage` theme note removed), and README file list updated

### Decisions and reasons
- **Decision:** use the icons' navy (`#172849`) for the interface rather than the logo's (`#11294b`). **Why:** colors sampled from the wireframe (`#182848`) match the icon navy.
- **Decision:** build separate pin versions of the icons, recoloring their navy parts to fog. **Why:** the wireframe's pins are navy circles. In the four hand-tool icons (carpenters, masons, painters, seamstress), the tool itself is drawn in navy and would disappear on a navy pin. The delivered files are kept unchanged in `images/icons/source/`.
- **Decision:** add a small stop-number badge to each pin (not in the wireframe). **Why:** the sheet says "Stop 3 of 5", and Previous / Next follow the order, so visitors need to see the numbers on the map. The badge can be removed if the team prefers the plain wireframe pins.
- **Decision:** assign icons by kind of place: memorial for the Unsung Founders Memorial, buildings for Steele Building and Lenoir Hall, people for the Pit, and cemetery for Old Chapel Hill Cemetery. **Why:** assigning the trade icons (carpenters, masons, painters, seamstress) to particular sites would be a historical claim about who built or worked there. **The team should make that choice** from its research.
- **Decision:** stop links and QR codes skip the intro and splash, and open the full story. **Why:** someone scanning a sign at a site wants that site's story straight away. Tapping a pin on the map still opens the wireframe's short preview first.
- **Decision:** replace the "Start exploring" button with the wireframe's hint card. **Why:** it matches the wireframe, and the intro's **Explore the map** button now serves as the starting point.
- **Decision:** keep All stops and About in the header, as icons on phones and text links on desktop, alongside the wireframe's Home icon. **Why:** the wireframe header shows only Home. Without these, visitors would have to go back to the intro to reach the list or the credits.
- **Decision:** remove the light/dark theme switch. **Why:** the wireframe's design is navy throughout, so a separate dark theme no longer adds anything. The interface looks the same whatever the device setting.
- **Decision:** hide the zoom buttons at 640px and below. **Why:** the wireframe's map has none, and phones zoom by pinching. They still show on wider screens for mouse and keyboard users.
- **Decision:** keep the coral call to action despite its 3.2:1 contrast with fog text. **Why:** it's the wireframe's color, and it passes WCAG AA for large text. The labels are always large and bold (Oswald 700, 20–26px).
- **Accessibility fixes found while building:**
  - Carolina Blue on the raised navy surface measured 4.0:1 (below AA), so the All stops cards use the main navy (4.9:1).
  - The amber focus ring measured 1.1:1 against the map's light blue, so on the map it gets a navy surround.

### Verified
At 375px (phone) and 1280px (desktop):
- **Opening screens:** the splash shows and then the intro. **Explore the map** opens the map with 5 icon pins (all images loaded), the hint card, and the compass and scale, with no overlaps measured between them and the credit line.
- **Stop sheet:**
  - Tapping Stop 2's pin opens the preview ("STOP 2 OF 5 / STEELE BUILDING"), with the pin's coral ring centered above it.
  - Tapping the preview expands it to show the gallery, history, a Key People card with the placeholder portrait, sources, and navigation.
- **Links and navigation:**
  - A `#stop=old-chapel-hill-cemetery` link skips the intro and opens the full story, with "Back to Stop 1".
  - Previous works. Closing brings back the hint card.
- **Other screens:** All stops shows 5 cards with icons, About shows 13 names, and Home returns to the intro.
- **Desktop:** text links in the header, and a side panel.
- **Keyboard:** Tab moves between pins, with the amber and navy focus ring visible on the map.

---

## 2026-10-14 — Route line and stop numbering removed

**Directed by:** project team. After reviewing the wireframe build in the browser, the team noted that the project is no longer a walking tour, so there shouldn't be a dotted route line, and the stops shouldn't be numbered. Implemented by Claude Code.

### What changed
- **Map:**
  - removed the dotted route line
  - removed the number badges on pins
  - pins are labeled by site name only (for example, "Steele Building")
- **Stop sheet:**
  - shows only the site name: "STOP 2 OF 5" is gone
  - **"Next stop ›" became "Next ›"**, and Previous / Next now **wrap around** (Next from the last site goes to the first), so they browse between sites rather than following a sequence. "Back to Stop 1" was removed.
  - the directions link now reads **"Get walking directions here"** and goes to the site being viewed, not to "the next stop"
- **All stops:** cards have no number badge, and the link reads "Open on the map ›".
- **QR sign sheet:** each site's sign shows just the site name. The large number circle and the "Stop N:" prefix are gone, and the call to action reads "Scan with your phone camera to learn about this site". The QR codes themselves are unchanged.
- **Deleted** `data/route.geojson` and `scripts/build-route.js`, and the `npm run route` command. They can be recovered from git history if a route is ever wanted again.
- **Kept:** each stop's `order` field. It still sets the order of the All stops list and of Previous / Next, but it's never shown.
- **Docs:** route and numbering references removed from the README, site overview, design doc, editing guide (the "Replace the route" section was removed), and software and credits doc.

### Verified
At 375px:
- the map shows 5 pins, no number badges, and no route line
- the stop preview shows only "STEELE BUILDING" and its era
- Next from Old Chapel Hill Cemetery goes to the Unsung Founders Memorial, and Previous goes back
- All stops cards have no badges
- the regenerated QR codes still decode to the same addresses

---

## 2026-10-14 — The Pit's icon; Unsung Founders Memorial name

**Directed by:** project team. Implemented by Claude Code.

### What changed
- **The Pit** now uses the **memorial** icon (previously people). This is the first icon chosen by the team rather than assigned as a placeholder.
- **"The Unsung Founders Memorial" was renamed "Unsung Founders Memorial"**, dropping "The". Its id (`unsung-founders-memorial`) is unchanged, so its address and QR code still work.
- **Leftover numbering removed from placeholder images:**
  - the image alt text no longer says "(stop 1)" and so on
  - the gray placeholder images (`images/stop-*-?.svg`, regenerated by `npm run placeholders`) now show the site's name ("Unsung Founders Memorial · Image 1") instead of "Stop 1 · Image 1 (a)"
- **`qr/sheet.html`:** regenerated with the new name. The QR codes are unchanged.
- **`docs/editing-guide.md`:** updated the current icon assignments.

---

## 2026-10-14 — Teardrop pins, compass fix, zoom-button fix, building names only, team order

**Directed by:** project team. Implemented by Claude Code.

### What changed
1. **Building tooltips** show only the building's name. "Built 19…" was removed, along with the `yearField` setting and the code that requested and displayed it. Only the name field is now downloaded from UNC.
2. **Pins are upside-down teardrops** instead of circles:
   - navy with a fog outline, with the icon in the round head
   - built as a square with three rounded corners, turned 45°
   - the pin's anchor is at the tip (head center plus 21·√2 ≈ 30px), so **the point marks the site's exact coordinates**
   - the selected pin gets a coral outline and grows from its tip, so the point stays put
   - the keyboard focus ring follows the teardrop's shape
3. **Team members are listed alphabetically by last name** on the About page and in the README: Talia Berler, Anderson Day, Trinity Gill, Jori Husted, Victor Morgan, Leticia Oteng, Andrea Perez, Cayla Quintero, Gwyneth Shoemaker. The **community advisors** are sorted the same way (Nicholas Graham, Samuel Scarborough), and the coaches already were (Adonis Durado, Randy Stano). The About page sorts all three lists in code, so names added later in any order still appear alphabetically.
4. **Compass:** the "N" overlapped the ring. The compass now uses a 48-unit face (ring radius 22.5), with the "N" (8.5px) inside the ring and the needle centered below it, displayed at a fixed 48px. It looks the same at every screen width.
5. **Zoom buttons:** hovering + or − made the hovered button jump from 30px to 44px, which squeezed the other one so part of its fill was clipped. **Cause:** Leaflet's own `.leaflet-touch .leaflet-bar a` rule (30px) outranked the site's sizing, except while hovering. The site's rule now covers every state (`.leaflet-container .leaflet-bar a`, `:hover`, `:focus`, and `.leaflet-touch`), so both buttons stay 44×44px.

6. **Fix: the `#about` link opened the map instead of the About page.** The wireframe update (commit `1985ee7`) introduced this. On startup the app switched to the map view before handling the link, and that switch cleared `#about` from the address. Startup now opens About directly for `#about`, and still opens the map for stop links and the intro for the home page.

### Verified
- `…/index.html#about` opens the About page and keeps `#about` in the address. Going from there to a stop link and back with the browser's Back button returns to About. The home page still opens the intro, and `#stop=lenoir-hall` still opens that stop's full story.
- At 375px, the pins render as teardrops with the icons in their heads, and all icon images load. In a close-up, the compass's "N" sits clear of the ring.
- At 1280px:
  - With the real mouse hovering +, both zoom buttons measure 44×44px, and neither is clipped.
  - Hovering Davis Library shows "Davis Library" only.
  - About lists the team in last-name order.
  - The selected pin (the Pit) has the coral outline and a 1.15× scale.

---

## 2026-10-14 — Map key for the pin icons

**Directed by:** project team (asked for a legend for the icons in the white info card at the bottom of the screen). Implemented by Claude Code.

### What changed
- **The hint card now contains a map key:** below the "Explore the map…" text and a thin divider, each icon in use appears as a small navy circle with the icon, followed by its name in bold. Right now that's **Memorial, Building, Cemetery**.
- **New `tour.iconLabels`** in `data/stops.json` gives each of the eight icons its display name: Memorial, Building, Cemetery, People, Carpenters, Masons, Painters, Seamstresses. It also sets the order of the key.
- **`index.html`:** the hint card became a container with the text and a `<ul aria-label="Map key">`.
- **`js/app.js`:**
  - new `renderLegend()`
  - the card's height is re-measured whenever it changes size and after fonts load, so the compass and scale always stay above it
- **`css/styles.css`:** key styles; the card's maximum width grew from 420px to 460px.
- **Docs:** the design doc, site overview, and editing guide (`iconLabels`, and the steps for adding an icon).

### Decisions and reasons
- **Decision:** show only the icons actually used by a stop, not all eight. **Why:** a map key should explain what's on the map. Unused entries would describe pins nobody can find. When the team assigns the trade icons, they'll appear in the key automatically.
- **Decision:** keep the icon names in `data/stops.json`. **Why:** the wording (for example "Building" or "Buildings", "Seamstresses" or "Seamstress") is a content choice the team can change without editing code.

### Verified
- At 375px, the key shows Memorial, Building, and Cemetery on one row, with all icon images loaded, and no overlap with the compass, scale, or credit line.
- **Longer key:** the five stops were temporarily given five different icons, and the page was reloaded. The key wrapped to two rows (a 147px card), and the compass and scale moved up above it, with no overlaps. The real icon assignments were then restored.
- At 1280px, the key fits on one line in the centered card.

---

## 2026-10-14 — First real photos added to the stops

**Directed by:** project team (supplied ten images and asked for them to be placed at their sites and in the right sections, using their file titles). Implemented by Claude Code.

### How the images were matched
The pasted images arrived without file names, so the originals were found in the team's Downloads folder and matched by pixel dimensions and content. The leading number in each title matches the team's site numbering: 2 = Lenoir Hall, 3 = the Pit, 5 = Steele Building.

| Original file title | Placed at | Section |
|---|---|---|
| `unsung-founders.jpeg` | Unsung Founders Memorial | Gallery |
| `5_SteeleBuilding_HeroImage.jpg` | Steele Building | Gallery (first: hero image) |
| `2_Strike leaders Mary Smith (L) and Elizabeth Brooks (middle) stand with a young man during the 1969 UNC food workers' strike.webp` | Lenoir Hall | Gallery |
| `2_Lenoir Hall_StudentsSupportFoodWorkers_Source_VirtualMuseum.jpeg` | Lenoir Hall | Gallery |
| `3_ThePit_HeroImage.jpg` | The Pit | Gallery (first: hero image) |
| `3_James-Cates-memorial,-at-the-Pit-on-UNC-Chapel-Hill’s-campus_Theassembly.jpg` | The Pit | Gallery |
| `3_modern-day tribute to James Cates in the Pit_photo courtesy_JamesCates_Remembrance Coalition.jpg` | The Pit | Gallery |
| `3_MemorialJamesCates.jpg` | The Pit | Gallery |
| `3_JamesCates_YearbookPhoto_Photo via the Town of Chapel Hill.jpg` | The Pit | **Key People:** James Cates |
| `Folder_0498_Caldwell_Wilson_18411898_Scan_3.jpg` | Old Chapel Hill Cemetery | **Key People:** Wilson Swain Caldwell |

### What changed
- **New image folders:**
  - `images/unsung-founders-memorial/`, `images/steele-building/`, `images/lenoir-hall/`, and `images/the-pit/`
  - `images/people/`, for portraits
- **Image processing:** each image was resized to at most 1200px on its long edge, saved as JPEG at quality 80, and turned upright using its orientation data. **All metadata was removed** (for example camera details and any GPS location). The files are 14–332 KB each.
- **`data/stops.json`:**
  - the galleries for the Unsung Founders Memorial, Steele Building, Lenoir Hall, and the Pit now use these photos
  - **Captions come only from the file titles**, and alt text describes what's visible in each image
  - **Credits** use the source named in the file title (The Assembly, Virtual Museum, the James Cates Remembrance Coalition, the Town of Chapel Hill); where none is named, the credit reads **"needs confirmation"**
  - the Pit's and Old Chapel Hill Cemetery's placeholder people became **James Cates** and **Wilson Swain Caldwell**, with their portraits. Their descriptions are still placeholders, so no historical claims were added.
  - Old Chapel Hill Cemetery keeps its placeholder gallery images (no photo of the site was supplied)
- **Removed** the placeholder images `images/stop-1…4-a/b.svg`, which are no longer used. `npm run placeholders` now only regenerates placeholders that a stop still references.
- **`js/app.js`:** Key People cards show a new optional **`imageCredit`** ("Credit: …").
- **`css/styles.css`:**
  - Gallery images are shown **whole** (`object-fit: contain` on dark navy) instead of cropped to fill the 4:3 frame.
  - Key People photos crop toward the top, so faces stay in frame.
  - The person credit text measures 5.0:1 against the sky-blue card.
- **Docs:** the editing guide (image folders, sizes, `imageCredit`) and the design doc (gallery behavior, the person credit).

### Decisions and reasons
- **Decision:** put the two portraits on Key People cards rather than in galleries. **Why:** they're portraits of individuals, and the team's draft copy (`docs/drafts/stop-copy-draft.md`, from the language session) lists James Cates under the Pit and Wilson Swain Caldwell under Old Chapel Hill Cemetery.
- **Decision:** never crop gallery images. **Why:** cropping can remove context from an archival photo or change its meaning. For example, the 1969 strike photo is tall and narrow, and a 4:3 crop would have cut off the people.
- **Decision:** use the file titles as captions, and say "needs confirmation" where a title gives no source. **Why:** the guidelines require a credit for every image and allow no invented details.
- **Decision:** order the Pit's gallery as hero image, the newspaper photo, the tribute, then the memorial plaque. **Why:** the present-day photo introduces the site, followed by the historical image and the later remembrances.

### Still needed (team)
- **Permission to publish (tracked in `docs/image-permissions.md`; every photo is marked `"permission": "pending"` in `data/stops.json`)** each image from its holder: The Assembly, Virtual Museum, the James Cates Remembrance Coalition, the Town of Chapel Hill, the archive holding the Caldwell scan (Folder 0498), and whoever took the hero photos. The site is public.
- **Full citations** for every credit marked "needs confirmation" or "from the file name".
- **A photo of Old Chapel Hill Cemetery**, and Key People for the other three sites.

### Verified
- All 12 image paths referenced in `stops.json` exist and are served with HTTP 200.
- At 375px:
  - Lenoir Hall's gallery shows the 1969 strike photo whole, with its title as the caption.
  - The Pit's gallery has 4 images with no broken-image fallbacks.
  - The James Cates card shows the yearbook photo and its credit.


## 2026-10-14 — People page

**Directed by:** Talia Berler ("add a People tab on the site that lists all the significant people highlighted in the map tabs, with some form of link to the site that mentions them")

### What changed
- New **People** page (header button with a two-figure icon, "People" on desktop; also linked from the home screen; address `#people`).
- It lists everyone in any stop's `people`, alphabetical by last name, using the same cards as a stop's Key people, each with **Featured at:** links to the sites that mention them.
- The person card code is now shared by the stop panel and the People page; the last-name sort is shared with the About page.
- Person cards no longer get wider than the screen when a credit contains a long unbroken word (such as a file name).

### Decisions and reasons
- **Decision:** build the page automatically from the stops' `people` lists. **Why:** one place to edit; the page can't fall out of step with the sites.
- **Decision:** the site links are ordinary `#stop=` links. **Why:** they open the full story the same way QR codes do, and the phone's Back button returns to the People page.
- **Decision:** placeholder people are listed like everyone else. **Why:** they'll be replaced by the team's verified people; hiding them would make the mockup look emptier than the stop panels.

### Verified
- Phone (375px) and desktop (1280px): no horizontal overflow; one column on phones, two on wide screens; no console errors.
- "The Pit ›" link opens the Pit's story; Back returns to `#people`; header, home-screen, and About navigation still work.

## 2026-10-14 — Campus place names, site labels on pins, "site" instead of "stop"

**Directed by:** Talia Berler (asked for an invisible layer of campus space and feature names "so we can add the names later", names on hover for the map's locations, and replacing "stop" now that this is a map and not a tour; chose "site")

### What changed
- **Campus place names:** new `data/places.geojson` (53 places: McCorkle Place, Polk Place, the Pit, the Old Well, Unsung Founders Memorial, Caldwell Monument, memorial gardens, Coker Arboretum, Old Chapel Hill Cemetery, and more). Invisible on the map; hover or tap shows the name, like buildings. Built by the new `scripts/build-places.js` (`npm run places`) from UNC's Features/MapServer layers 11, 14, and 15 and, for the cemetery, OpenStreetMap. Turned on with `tour.placesLayer` in `data/stops.json`.
- **Site names on pins:** hovering over a pin, or tabbing to it, shows the site's name in a navy label. This replaces the browser's own slow hover tip.
- **"Stop" → "site"** everywhere visitors see it: the All sites button, page heading, and home-screen link; "Close site details"; error and offline messages; "Every site has a story." (home screen, About tagline, README heading); the placeholder intro. The docs use "site" too.
- **Leftover wording:** three location messages still said "follow the numbered stops" from before numbering was removed. They now say visitors can still explore every site on the map.
- About page credit: "Building and campus place names from UNC Chapel Hill's public GIS data and OpenStreetMap."

### Decisions and reasons
- **Decision:** save the place names as a file in the repository instead of loading UNC's server on every visit. **Why:** the team can rename, remove, and add places by editing one file; UNC's raw names need tidying; and it's faster and doesn't depend on UNC's server. The script refuses to overwrite the file (unless `--force`) so hand edits aren't lost.
- **Decision:** leave out UNC entries with generic or planning names ("gargoyle", "fountain", "Remnant Forest"…); keep UNC's spelling otherwise. **Why:** labels should be names people use; correcting names we can't verify (for example "Newborn" vs. "Mewborn" Aycock) is for the team.
- **Decision:** stacking order: lawns and gardens under buildings, monuments above them, smaller areas over larger ones. **Why:** every spot shows its most specific name.
- **Decision:** "site", not "location", "place", or "landmark". **Why:** fits memorials, buildings, and the cemetery; short for buttons; "location" clashes with "Show where I am", "place" with McCorkle and Polk Place.
- **Decision:** keep `stops.json`, `#stop=`, and other internal names. **Why:** visitors never see them, and changing `#stop=` would break printed QR codes.

### Verified
- Map loads 35 areas and 18 points; hovering the McCorkle lawn shows "McCorkle Place"; hovering a pin shows its site name; clicking a pin opens the site and closes the label; no console errors.
- Pins have no browser `title` tip and are still announced by name.

## 2026-10-15 — Opening animation on the splash screen

**Directed by:** Talia Berler (provided the animation as an MP4 and a MOV, asked which to use, and asked to let visitors tap to skip)

### What changed
- The home page's splash plays the team's animation, `media/splash.mp4`. Tapping or clicking anywhere, or pressing Escape, Enter, or Space, skips it. (A Skip button was tried first and removed at Talia's request.) The home screen opens when it ends (15 s) or is skipped.
- `scripts/encode-video.swift` makes the web copy: 720×1280 H.264 at 1.4 Mbps, 2.0 MB (the team's MP4 is 1080×1920 and 8.2 MB).

### Decisions and reasons
- **Decision:** use the MP4, not the MOV. **Why:** the MOV is 347 MB in Apple's Animation format, which most browsers can't play. It has no transparency (24-bit color), so it offers nothing the MP4 doesn't. Keep it as the master copy.
- **Decision:** 720×1280 at 1.4 Mbps. **Why:** side-by-side frames at the busiest moment (10 s) were indistinguishable from the original, even on the thin outlined names, at a quarter of the size.
- **Decision:** show the whole frame (never cropped), centered. **Why:** cropping to fill a phone screen cut letters off the names along the edges.
- **Decision:** while it plays, the splash background is `#122e54`, and the video's edges fade very slightly. **Why:** browsers display the video's navy a shade bluer than the site's navy, and the file has a 1px darker border; without this, a visible band and line showed around the video.
- **Decision:** home page only, and not for reduce motion, data saver, or blocked autoplay (the still logo shows instead). **Why:** visitors arriving by QR code at a site shouldn't wait or download 2 MB; motion and data preferences are respected; and the splash never gets stuck.

### Verified
- Phone (375px) and desktop (1280px): plays with no visible edges; tapping, a key press, and the end of the video each open the home screen, with focus on "Explore the map".
- A site link (`#stop=the-pit`) never creates or downloads the video. No console errors.

## 2026-10-15 — Splash: matching navy beside the video on computers

**Directed by:** Talia Berler (on a computer browser, the navy to the left and right of the animation didn't match it)

### What changed
- The space around the animation is now filled with `media/splash-backdrop.mp4`: the video's first frame (plain navy), cut out without re-encoding (1 KB) by the new `scripts/make-splash-backdrop.swift`, and stretched to fill the screen behind the video.

### Decisions and reasons
- **Decision:** fill the background with video, not a CSS color. **Why:** browsers display video colors differently from page colors, and differently from each other. The earlier fix (`#122e54`) matched in Chrome but not in Talia's browser. A frame of the same video goes through the same color handling as the animation, so it matches in any browser. `#122e54` stays underneath as a fallback.
- **Decision:** only the first frame. **Why:** it's the only completely plain frame; faint names start appearing by 0.04 s, and stretched, they'd show as smudges.

### Verified
- With the fallback background temporarily set to red, no red showed anywhere on desktop (1280px) or phone (375px). Colors inside and outside the video's edge matched within screenshot-compression noise.
- Tapping still skips; both videos stop downloading when the splash closes; no console errors.

## 2026-10-15 — Splash backdrop: making it play in Safari

**Directed by:** Talia Berler (sent a screenshot: on a computer browser the navy beside the animation still didn't match)

### What changed
- The backdrop is now a normal 1-second clip of the video's first frame, looped, instead of a one-frame clip. The frame's color data is copied as-is, with the same BT.709 color tags, at a bitrate high enough that every frame decodes to the source color.
- Both splash videos are now muted before they're given their file and only started once they're on the page. The backdrop tries again as soon as the animation starts.

### Decisions and reasons
- **Finding:** in Talia's screenshot, the area beside the video was exactly the CSS fallback color, `#122e54`, so the backdrop wasn't showing. Her browser displayed the video's navy as rgb(19, 41, 75), close to the site's navy, whereas Chrome shows it bluer; a single CSS color can't match both.
- **Why it didn't show (most likely):** Safari decides whether a video may autoplay when its file is set. The backdrop was given its file before being muted and was told to play before it was on the page. A one-frame clip is also an unusual file that some browsers won't display. The page might also have been a cached copy of the version from before the backdrop existed (GitHub Pages lets browsers keep pages for up to 10 minutes).
- **Testing limit:** Playwright's WebKit (Safari's engine) blocks all autoplay, even a plain muted test page, so it can't reproduce Safari's behavior. Needs checking in Talia's browser after publishing.

### Verified
- Chrome (preview): both videos play; with the fallback background temporarily red, no red showed; tapping skips; no console errors.
- Every frame of the new backdrop decodes to the same color as the animation's first frame.

## 2026-10-15 — Splash: one canvas, so the navy matches in every browser

**Directed by:** Talia Berler (Firefox, after a hard refresh: the navy beside the animation still didn't match; screenshot)

### What changed
- The splash paints each frame of the animation onto one full-screen canvas and fills the space around it with a color read from that same canvas. The backdrop video (`media/splash-backdrop.mp4`) and `scripts/make-splash-backdrop.swift` are removed.

### Decisions and reasons
- **Finding:** Talia's screenshot showed the backdrop playing but in a different shade, rgb(21, 47, 83) beside the video vs. rgb(19, 41, 75) inside. Firefox on macOS can hand a large video to the system to draw while drawing other content itself, and the two paths handle color differently. So any approach with two separately drawn surfaces (CSS color or second video) can mismatch.
- **Decision:** one canvas. **Why:** everything visible during the animation comes from one surface, so the colors can't diverge, whatever the browser does.
- **Decision:** the fill is re-read a few times a second from a plain strip at the top of the frame (most common color). **Why:** measuring the canvas showed the video's own navy changes slightly after the first half-second (20,40,70 → 19,41,72), so a color read once drifted off.
- **Fallback:** if the canvas can't be used (or animation frames are paused, as in a hidden tab), the plain video shows underneath as before.

### Verified
- Firefox (Playwright) and Google Chrome, 1280×800 and 375×812: canvas pixels and on-screen pixels beside and inside the frame identical (Firefox 19,41,72; Chrome 19,41,74) at 3 s and 5.6 s. Tapping skips; no errors.

## 2026-10-15 — Home screen, menu, focus ring, draggable site sheet, selected pins

**Directed by:** Talia Berler (a list of eight edits; plus three things to preview before deciding)

### What changed
1. **Home screen:** removed the "See all sites", "People", and "About" links.
2. **"EXPLORE THE MAP"** now sits low on the screen (within thumb reach) and is in capitals.
3. **Focus ring:** no longer yellow. It's fog with a thin navy surround, and it only appears for keyboard use. When the page moves focus itself (e.g. to "Explore the map" after the splash, or back to a pin after closing a site) for a mouse or touch user, no ring and no pin label appear.
4. **Header:** on phones, the List, People, and About icons are now in a ☰ menu (with Map). On desktop the text links stay in the header. The Home icon is gone; the logo does the same thing.
5. **Site sheet (phones):** slides up when a site opens; follows the finger when dragged (from its top, or from the story when it's scrolled to the top) and snaps to preview, full story, or closed, with flicks too. A blinking arrow above the handle invites a swipe up, until the visitor first opens a full story.
6. **Closing a site** zooms the map back out to the default view of every site.
7. **Selected pin:** coral fill (the brand's red) with the icon turned white, done in CSS. No white icon files were needed: the three icons in use are single-color shapes, and the four two-tone icons stay readable in all white.
8. **Pin drop shadows:** two layers (a tight outline shadow and a soft lift).
- New `tools/design-options.html` shows the options to decide on: three ways to end the opening animation (Continue button, slow-blinking "Tap to continue", "Tap to explore" with an arrow) and four layouts for the team names on the About page.

### Decisions and reasons
- **Decision:** keep a keyboard focus ring (recolored, keyboard-only) instead of removing it entirely. **Why:** without it, keyboard users can't see where they are (WCAG 2.4.7); the yellow ring Talia saw came from the page moving focus for mouse and touch users, which no longer shows a ring.
- **Decision:** the hamburger is phones only. **Why:** desktop has room for the four text links, which are quicker to use than a menu.
- **Decision:** "red" = the brand coral, `#d85c54`. **Why:** it's the palette's red, already used for the main button and "you are here".
- **Decision:** the sheet is always full height and moved with a transform. **Why:** so it can follow the finger smoothly between preview and full story; the story is made `inert` while in preview so it's skipped by keyboard and screen readers.

### Verified
- Phone (375px): home screen layout; menu opens, lists four links, closes on choosing, tapping outside, or Escape; opening a pin shows the coral pin, the slide-up sheet, and the arrow; real mouse drags in the preview: preview → full story, full story → preview, preview → closed; closing zooms out with no stray label or ring.
- Desktop (1280px): header links, no menu button; side panel opens; closing zooms out. No console errors.
- Note: the browser tool's synthetic touch events don't reach the page, so dragging was tested with real mouse drags; swipes on a physical phone still need checking.

## 2026-10-15 — Splash ends on "Tap to continue"; About page name cards

**Directed by:** Talia Berler (chose option B for the splash ending, shown over the logo and names; chose option D, name cards, for the About page, with her role and LinkedIn as the first link)

### What changed
- The opening animation now pauses at 12.2 s, on the logo with every name behind it, and shows a slow-blinking **TAP TO CONTINUE**. Tapping anywhere (or Escape, Enter, or Space) opens the home screen, as it already did during the animation. The home screen no longer opens on its own.
- About page: team, coaches, and advisors are sky-blue name cards (option D). A card with a `link` is itself the link, labeled "LinkedIn ↗" or "Portfolio ↗", and opens in a new tab.
- Talia Berler: role "Web Developer & Digital Producer", link https://www.linkedin.com/in/talia-berler/.

### Decisions and reasons
- **Decision:** pause at 12.2 s. **Why:** measured frames showed every name present through 12.5 s and fading from about 13 s; the logo disappears by 14.5 s.
- **Decision:** the 20-second safety timer is cancelled once the animation pauses. **Why:** the visitor chooses when to continue; the timer only guards against a video that stalls before reaching the pause.
- **Decision:** cards for coaches and advisors too. **Why:** consistent, and ready for their links.

### Verified
- Phone (375px): the animation pauses on the logo and names with "TAP TO CONTINUE"; a tap opens the home screen. About page: 13 cards; Talia's card shows the role and "LinkedIn ↗", links to the profile in a new tab, and has a screen-reader label naming the role and destination.

## 2026-10-15 — Splash fallback, credits, arrow every time, white bar collapses the sheet

**Directed by:** Talia Berler (testing on her phone; credit corrections; keep the options page for the process docs)

### What changed
- **Splash:** if the video stalls before its pause point, the 20-second safety timer now shows "Tap to continue" instead of opening the home screen, so the splash always waits for a tap.
- **Credits:** map illustration by **Trinity Gill** ("Illustrated map: Trinity Gill" in the map's credit line); opening animation and icons by **Victor Morgan**. The logo stays credited to the team. Updated on the About page, the README, and docs/software-and-credits.md.
- **Arrow on the site sheet:** shows every time a site is in the peek view (before, only until the first full story was opened, so it seemed to stop after the first site).
- **White bar:** tapping it in the full story drops the sheet back to the peek view (and opens the full story from the peek view).
- `tools/design-options.html` is kept for the process record, marked with the decisions; listed in the README with the basemap comparison page.

### Decisions and reasons
- **Finding (white bar):** the drag code "captured" the finger on touch-down, which sends a plain tap's click to the sheet's top instead of the bar's button, so the tap was ignored when the sheet was fully open. Now the finger is captured only once it's actually dragging.
- **Finding (splash):** Talia's phone didn't open the home screen on its own after the animation. In a phone-sized Chrome the live version did (at about 15 s), so it's specific to her phone's browser and couldn't be reproduced here. The new ending waits for a tap by design, and no longer depends on the video reporting that it ended.

### Verified
- Phone-sized Chrome (iPhone 13 emulation, real taps and touch drags): the arrow shows for each of three sites opened in turn; tapping the bar toggles full story ↔ peek; swipe up opens, drag down returns to peek, flick down closes and zooms the map out. No page errors.

## 2026-10-15 — Motion polish, smoother glides, pin shadows, Unsung Founders pin

**Directed by:** Talia Berler (six adjustments after testing)

### What changed
- **"Tap to continue"** fades in over 1 s, then blinks slowly. (With reduce motion: fades in, no blinking.)
- **"Explore the map"** lifts the landing page up and away over the map (0.65 s) instead of switching instantly.
- **Pin shadows** are darker, with a blurred contact shadow on the ground beneath each point.
- **Unsung Founders Memorial pin** moved to the center of the grey circle beneath it in the illustration: from 35.9133601, -79.0517912 to 35.9133438, -79.0517248 (about 6 m east and 2 m south), measured from a zoom-20 render of the map.
- **Smoother glides:** the faded street tiles are now turned gray once as each loads, instead of with a live CSS filter; the glides take 1 s instead of 0.6 s; and tile layers no longer load intermediate zoom levels mid-glide.
- **Default view** is half a zoom step further out than "just fits every site". + and − from there go to the next whole level.

### Decisions and reasons
- **Finding (stutter):** frame timing in Firefox (Talia's browser), with each visual effect switched off in turn, showed the street layer's CSS `grayscale` filter was the cause: about 17 frames a second during a glide with it, about 45 without. Firefox recomputes the filter on every frame of a zoom. Graying each tile once in a canvas looks the same (checked side by side) with no per-frame cost. Chrome was already smooth (60 fps).
- **Decision:** in-between zoom levels only for the default view. **Why:** at in-between zooms beyond the illustration's sharpest level (18), faint tile seams appeared (seen at 19.5); none appeared at the default views (16.5 desktop, 15.75 phone), checked in Chrome and Firefox.

### Verified
- Chrome (desktop and iPhone 13 emulation): "Tap to continue" opacity rises 0.5 → 1.0 over the first second, then blinks; the landing page is mid-slide 300 ms after the tap and gone by 650 ms, with the map and header showing; default zoom 16.5 / 15.75; closing a site glides back to exactly that view; + goes to 17 / 16.
- The pin's point sits on the circle's center at zoom 18 and 19.5.

## 2026-10-16 — Opening screen to the mockup, desktop splash, contact links, all site photos

**Directed by:** Talia Berler (mockup image for the opening screen; new welcome text; desktop splash video; team contact links; the "VDC Site Photos" folder)

### What changed
- **Opening screen:** the tagline now reads **Every Site Has a Story** and sits right under the logo in coral, in the heading font, as in the team's mockup; the logo is larger, with more space before the welcome text and below the button. The welcome text was already the new wording.
- **Desktop splash:** wide screens play the team's new 16:9 animation (`media/splash-wide.mp4`, 1920×1080, 2.5 MB, from "Splash Screen 1920x1080.mp4"); tall screens keep the portrait one. The wide one pauses at 13.2 s (it's still from 12 to 13.5 s, then fades).
- **Contact links:** name cards now show "LinkedIn ↗" and "Portfolio ↗" links (fields `linkedin` and `portfolio`). Added: Victor Morgan (both), Talia Berler (portfolio added), Jori Husted, Gwyneth Shoemaker, Andrea Perez (both).
- **Site photos:** all 26 photos from "VDC Site Photos" replace every gallery image, in the order given by their file names (first = hero): Unsung Founders 3, Lenoir Hall 6, the Pit 7, Old Chapel Hill Cemetery 5 (replacing its placeholders), Steele Building 5. New `scripts/import-site-photos.js` (`npm run photos`) and `scripts/site-photos.json` make the web copies (≤1400px, metadata removed) and the `stops.json` entries. `docs/image-permissions.md` lists all 28 images.

### Decisions and reasons
- **Captions and credits come only from the file names** (e.g. "Nellie Crocker on the serving line in the dining hall, 2 April 1963"); where a file name gives no source, the credit says it needs confirmation. One credit comes from the image itself: the "Mid-Day Magic" clipping prints "Photo by Beatrice Taylor". Files marked "OurPhoto" are credited to the team with permission "team"; everything else is "pending".
- **Alt text** was written by looking at each photo, describing what's visible (and reusing earlier alt text for photos that were already on the site).
- **Decision:** wide video at full 1920×1080. **Why:** at 1280×720 its thin outlined names looked soft; 2.5 MB is acceptable on desktop connections.
- **Decision:** separate LinkedIn and portfolio links inside each card, instead of the whole card being one link. **Why:** some people have both.
- Gwyneth Shoemaker's LinkedIn address was given with `?isSelfProfile=true` (a setting from viewing her own profile); it's stored without it. Andrea Perez's portfolio was given without `https://`; it's added.
- `5_5_Steele_Lee_Beech_and_other_litigants.png` is actually an Apple HEIF image despite its name; it converted normally.
- Key People portraits (James Cates, Wilson Swain Caldwell) are unchanged; the James Cates yearbook photo now also appears in the Pit's gallery.

### Verified
- Phone (375px): opening screen matches the mockup's layout; About cards show 8 links with the right addresses and labels; the Pit's gallery shows 7 photos with the team's hero first.
- Chrome, desktop 1440×900: plays `splash-wide.mp4`, fills the screen, pauses at 13.21 s with "Tap to continue"; phone: plays `splash.mp4`, pauses at 12.22 s. Canvas fill matches the video's navy in both.

## 2026-10-16 — The team's content: text, dates, Key People, credits; hero sliver

**Directed by:** Talia Berler (the team's five "copy and credit" PDFs and "people card images" folder; a sliver of the hero image in the peek view)

### What changed
- **Every site's text, date line, Key People, and photo captions and credits** now come from the team's PDFs (Unsung_Founders, Lenoir, pit, OCHCemetery, and steele `_copyandcredit.pdf`). All placeholders are gone: no "PLACEHOLDER CONTENT" badges, placeholder summaries, placeholder people, or placeholder sources.
- **Key People:** The Unsung Founders (with a link to UNC's list of names); Mary Smith & Elizabeth Brooks; Marsha Tinnen & Barbara Prear; James Lewis Cates; Wilson Swain Caldwell; Harvey Beech, James Lassiter, J. Kenneth Lee, Floyd McKissick & James Robert Walker Jr.; Oscar Diggs & James Slade. Images are the team's duotones (480px squares in `images/people/`); two entries have no image and show as text-only cards.
- **Cards** now support a subtitle (`role`), several paragraphs, a named link (`linkLabel`), a sort name (`sortName`, for cards naming several people), and no image.
- **Sources:** the Unsung Founders Memorial lists its two sources (Berghahn Books essay; UNC's "Names of the Enslaved People…" post), both checked to load. The other PDFs list no written sources, so those sites' Sources sections are hidden.
- **Peek view (phones):** a 76px strip of the site's hero photo under the name and date. Hidden once the full story is open (the gallery shows it) and on desktop.
- Photo credits now name the team photographers (Jori Husted, Leticia Oteng, Andrea Perez); 8 photos are the team's own.

### Decisions and reasons
- **The team's wording is used as written.** Only text-extraction glitches were fixed against the PDFs' rendered pages (dropped apostrophes, hyphens, and dashes). The lead paragraph's date line became each site's date (e.g. "Opened in 1940 as UNC-Chapel Hill's central dining hall").
- **Matched by content where the PDFs' file names were off:** Unsung #3 lists the close-up's file name but is titled "Decorated with Flowers"; Lenoir #6 lists the 1969 demonstrators' file name but is "Students Support the Food Workers"; Steele #2 lists the hero's file name but is the archival photo; Steele #3 and #5 have their titles swapped relative to the images (the doorway photo is Beech and Lee's first day; the seated group of four is "From left: McKissick, Lee, Beech, and Lassiter"). The people image `4_3_OCHCementery_CaldwellWilson_DuoTone.jpg` actually shows the strike leaders, and `…DuoTone(1).jpg` shows Wilson Caldwell.
- **One title corrected:** "James Cates Louis' Yearbook Photo" became "James Lewis Cates' yearbook photo", matching the name used everywhere else. **For the team to check:** the Pit's date line is "1969"; Steele's Diggs photo says "Diggs enrolled in 1951, Slade in 1953", while the Key People text says both in 1953 and calls him Oscar (the caption says Edward O.); the Steele hero's photographer and date are still "to be added"; the Pit's date line and "Cates's" possessive are as written.
- People image file names for James Cates and Wilson Caldwell were changed (`…-duotone.jpg`) so browsers that cached the old portraits load the new duotones.

### Verified
- Phone (375px): Lenoir Hall's peek shows the hero strip; the full story shows 3 history paragraphs, no badge or summary, both Key People with the right images; the People page lists 7 entries sorted by last name, with 2 text-only cards and the Unsung Founders link. No console errors.

## 2026-10-16 — Placeholder person icon on cards without an image

**Directed by:** Talia Berler ("keep the placeholder person icon for the people cards without images")

- The Unsung Founders and Oscar Diggs & James Slade cards show `images/person-placeholder.svg` again instead of being text-only. It's decorative there (empty alt text), since it isn't a portrait of them.

## 2026-10-16 — Team roles, more contact links, cemetery text, All sites intro

**Directed by:** Talia Berler (the team slide with each member's role; contact links; shorter Old Chapel Hill Cemetery text; All sites intro)

- **Roles** from the team slide: Gwyneth Shoemaker (Project Manager, Brand Guidelines), Jori Husted (Brand Design, Socials, Mockups), Anderson Day (Brand Design, Mockups), Leticia Oteng (UI/UX), Victor Morgan (Brand Design, Motion Graphics, Icons), Andrea Perez (UI/UX, Research), Talia Berler (GIS, Web Dev, UI/UX, Research; replaces "Web Developer & Digital Producer"), Trinity Gill and Cayla Quintero (Print Assets). The coaches are listed on the slide as "Project Coaches"; they're already under the Coaches heading, so no role was added.
- **Links:** Trinity Gill and Leticia Oteng (LinkedIn), Cayla Quintero (Authory, shown as "Portfolio").
- **Old Chapel Hill Cemetery:** history replaced with the team's shorter two-paragraph text.
- **All sites page:** the placeholder introduction replaced with the team's text. No placeholder text remains in the site's data.
- **Name:** the team member listed as "Andie" is now "Anderson Day" everywhere (site, README, options page, and this log), as on the team slide.

## 2026-10-16 — "Tap to continue" one second after the animation pauses

**Directed by:** Talia Berler

- "Tap to continue" now appears 1 s after the opening animation pauses on the logo and names (`SPLASH_CONTINUE_DELAY_MS` in `js/app.js`), then fades in and blinks as before. Tapping or a key press continues at any time, including during that second.

## 2026-10-16 — Sources right after the text; PREVIOUS / NEXT in capitals

**Directed by:** Talia Berler (asked why sources weren't on the site cards; asked for them right after the information)

- **Sources** now come right after each site's text, before Key People.
- **Why most sites showed no Sources (until the next entry):** the team's copy-and-credit PDFs list sources for the photos (shown as each photo's credit), but only the Unsung Founders PDF lists sources for the written text ("Other Sources"). The other four sites need their text sources from the team; the section appears automatically once a site's `sources` list in `data/stops.json` has entries.
- The ‹ PREVIOUS and NEXT › buttons are in capitals.

## 2026-10-16 — "Tap to continue" right after the names finish sliding in

**Directed by:** Talia Berler (the message took too long to appear on both phone and desktop)

- The animation now pauses just after the last names finish sliding in: 8.6 s on phones (was 12.2 s) and 6.8 s on wide screens (was 13.2 s). "Tap to continue" follows 0.4 s later (was 1 s).
- **How the times were found:** each frame was compared with the one before and with the final settled frame. The names stop changing at about 8.5 s (portrait) and 6.75 s (wide); after that the frames differ only by compression noise until the fade-out. The earlier pause points had been chosen as "the last moment before the fade", which left 4–6 seconds of an unchanging screen before the message.

## 2026-10-16 — Main source: The Black and Carolina Blue Tour

**Directed by:** Talia Berler ("the main source for the content on the site is the Black and Carolina Blue Tour by UNC Chapel Hill")

- "The Black and Carolina Blue Tour: An Introduction to Black Life at the University of North Carolina at Chapel Hill" (UNC-Chapel Hill, ArcGIS StoryMaps; title from the page itself; link checked) is now the first source on all five sites, so every site has a Sources section. The Unsung Founders Memorial keeps its two other sources after it.
- Also credited on the About page (credits and links) and in the README.

