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

