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
