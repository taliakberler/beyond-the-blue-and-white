# Design and styles

All styling lives in one file, [`css/styles.css`](../css/styles.css), with no CSS framework or build step. Colors, type sizes, and key dimensions are **CSS custom properties (variables)** declared at the top of the file, so the look can change without touching layout code.

> **Status:** the interface follows the team's **wireframe** (2026-10-14): a navy interface with fog text, Carolina Blue and sky-blue accents, a coral call to action, and the team's logo and icons. The typefaces are Gasoek One (logo), Oswald Bold (headers), and Lato (body copy).

---

## Design goals

| Goal | How it's met |
|---|---|
| Faithful to the team's wireframe | Splash, intro, map, preview sheet, full story, and Key People screens built from the wireframe, using the team's own logo and icon files |
| Readable outdoors in sunlight | Fog text on navy (12.5:1), large type (17px base), solid surfaces (no translucency behind text) |
| Easy to use one-handed while walking | All tap targets at least 44×44px. A site opens as a short preview at the bottom, within thumb reach. |
| Phone-first | Designed at 375px wide first; the desktop layout is an enhancement at 900px and up |
| Accessible | WCAG 2.1 AA contrast, visible amber focus rings, screen-reader labels, reduced-motion support (see [site-overview.md](site-overview.md#accessibility)) |

---

## Color tokens

The palette comes from the team's files: the logo (Carolina Blue `#4b9cd3`, fog `#eceded`), the icons (navy `#172849`, sky `#87aed0`), and colors sampled from the wireframe (navy `#182848`, coral `#d85c54`).

| Token | Value | Used for |
|---|---|---|
| `--navy` | `#172849` | The interface background: header, intro, pages, site sheet, pins |
| `--navy-2` | `#1f3560` | Raised surfaces on navy (list cards, About cards) |
| `--navy-3` | `#2a4373` | Borders and hover states on navy |
| `--fog` | `#eceded` | Text and outlines on navy, the hint card, pin rings |
| `--fog-muted` | `#c3cad6` | Secondary text on navy (captions, credits, sources) |
| `--carolina` | `#4b9cd3` | Era and date lines, links on navy |
| `--sky` | `#87aed0` | Key People cards |
| `--coral` | `#d85c54` | Call to action ("Explore the map"), "Next ›", the active pin ring, the "You are here" dot |
| `--logo-navy` | `#11294b` | The logo files' navy (links in the map credit line) |
| `--color-focus` | `#f6c34a` | Keyboard focus ring (amber, visible on navy, fog, and the map) |
| `--color-placeholder-badge` | `#f6c34a` | "PLACEHOLDER CONTENT" badge |
| `--color-map-bg` | `#9fc6e0` | The illustrated map's own background blue |

The interface uses this navy palette in both light and dark device settings. (The earlier light/dark theme switch was removed, since the wireframe's design is navy throughout.) The illustrated map is light, so the symbols drawn on it (pins, compass, scale) are navy and fog.

### Note on the two navies
The logo files use `#11294b`; the icons and wireframe use `#172849`/`#182848`. The interface uses the icons' navy, which matches the wireframe. The logo files appear as delivered.

### Measured contrast

Ratios were calculated with the WCAG 2.1 relative-luminance formula. AA requires 4.5:1 for normal text and 3:1 for large text (24px, or 18.7px bold) and interface parts.

| Pair | Ratio | Result |
|---|---|---|
| Fog text on navy | 12.5:1 | AAA |
| Muted fog on navy | 8.9:1 | AAA |
| Carolina Blue (era, links) on navy | 4.9:1 | AA |
| Navy text on sky (Key People cards) | 6.3:1 | AA |
| Navy text on fog (hint card, toasts) | 12.5:1 | AAA |
| Fog text on coral (CTA, "Next ›") | 3.2:1 | **AA for large text only.** These labels are always large and bold (Oswald 700, 20–26px). Don't use coral behind small text. |
| Navy pin against the map blue | 8.1:1 | Interface part: passes |
| Coral active ring against navy | 3.9:1 | Interface part: passes |
| Carolina Blue on the raised surface (`--navy-2`) | 4.0:1 | **Fails AA for normal text**, so Carolina Blue text is only placed on `--navy` (the All sites cards use `--navy` for this reason) |
| Amber focus ring on navy | 8.9:1 | Passes |
| Amber focus ring on the map blue | 1.1:1 | Too faint alone, so on the map the ring gets a navy surround (`box-shadow`) |

---

## Typography

### Typefaces

| Role | Typeface | Weight | Where it's used |
|---|---|---|---|
| **Logo** | [Gasoek One](https://fonts.google.com/specimen/Gasoek+One) | Regular (400) | The logo *files* use it. On the site, the logo appears as the team's SVG logo files, plus the site name on printed QR signs. |
| **Headers** | [Oswald](https://fonts.google.com/specimen/Oswald) | Bold (700) | Page headings ("ALL STOPS", "ABOUT THIS PROJECT"), the call-to-action and navigation buttons, and the About tagline |
| **Body copy** | [Lato](https://fonts.google.com/specimen/Lato) | Regular (400) | All running text |
| *Body emphasis* | Lato | Bold (700) | Site names in the sheet ("STEELE BUILDING", uppercase, as in the wireframe), "KEY PEOPLE" and "SOURCES" headings, people's names, the summary line, and button labels |

### Tokens

| Token | Value |
|---|---|
| `--font-logo` | `"Gasoek One", "Arial Black", Impact, <system stack>` |
| `--font-heading` | `"Oswald", "Arial Narrow", "Roboto Condensed", <system stack>` |
| `--font-body` | `"Lato", <system stack>` |
| `--font-system` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |

### How the fonts are loaded

- **Self-hosted** in [`fonts/`](../fonts/) and declared with `@font-face` at the top of `css/styles.css`. Visitors' browsers never contact a font service.
- **Latin subset only**, about 54 KB for all four files. Characters outside basic and Western European Latin fall back to a system font.
- **`font-display: swap`**: text appears immediately in the fallback font and switches when the brand font arrives.
- **Preloaded**: Gasoek One and both Lato weights are preloaded in `index.html`, since they're visible on first paint.

### Sizes

| Token | Value | Notes |
|---|---|---|
| `--fs-base` | 17px | Body text, slightly larger than usual for outdoor reading |
| `--fs-small` | 15px | Secondary text |
| `--fs-xs` | 13px | Captions, credits, sources, person descriptions (the smallest size used) |
| `--fs-h2` | 24px | Page headings |
| `--fs-h3` | 17px | Section headings ("KEY PEOPLE", "SOURCES") |

All sizes use `rem`, so they scale with the visitor's browser text-size setting.

---

## Screens and layout

| Screen | Phone (under 900px) | Desktop (900px and up) |
|---|---|---|
| **Splash** | On the home page: the team's 15-second opening animation (`media/splash.mp4`), shown whole and centered; tapping or clicking anywhere, or pressing Escape, Enter, or Space, skips it. Otherwise (reduce motion or data saver turned on, or autoplay blocked): full-screen navy with the stacked Carolina Blue logo, held at least 0.9 s. Skipped entirely for site links. | Same; the portrait video sits in a centered column on its own navy |
| **Intro (home)** | Full-screen navy: tagline, stacked logo, the project description, a coral **Explore the map** button, and links to "See all sites" and "About this project" | Same, centered in a 560px column |
| **Map** | Navy header (horizontal navy logo, with All sites ⋮≡, About ⓘ, and Home ⌂ icons), the illustrated map with icon pins (no route line or numbers), a fog **hint card** at the bottom, the compass and scale bottom-left, and "Show where I am" top-right. Zoom by pinching (the zoom buttons are hidden at 640px and below). | Header shows text links (Map, All sites, About) and Home. Zoom buttons are shown. |
| **Site preview** | Tapping a pin opens a short navy sheet: drag handle, ⊗ close, the site name, and the era | (Desktop always shows the full panel) |
| **Full story** | Tap the preview, swipe up, or open a site link: the sheet fills the screen below the header, with the gallery, caption and credit, summary, history, KEY PEOPLE, SOURCES, walking directions to the site, and Previous / Next to browse other sites | A 420px navy side panel on the right with the same content |
| **All sites** | Navy page of site cards (pin icon, uppercase name, era in Carolina Blue, summary) | Same, in a 760px column |
| **About** | Navy page: tagline, description, project card, and credits | Same |

Key dimensions:

| Token | Value | Purpose |
|---|---|---|
| `--tap` | 44px | Minimum size of every button and control |
| `--radius` | 14px | Cards on the All sites and About pages. The sheet uses 20px top corners; the CTA, buttons, and people cards use 4px, as in the wireframe. |
| `--panel-w` | 420px | Desktop side panel |
| `--header-h`, `--panel-h`, `--hint-h` | Measured by JavaScript | Keep the map's corner controls clear of the header, the sheet, and the hint card |

---

## Components

| Component | Notes |
|---|---|
| **Pins** | Upside-down **teardrops**: navy with a 3px fog outline, holding the site's icon in the round head. The point marks the site's exact location. (The shape is a square with three rounded corners, turned 45°.) No numbers, since the sites aren't a set sequence. The active site gets a coral outline and enlarges slightly from its tip, so the point stays on the spot. Icons come from `images/icons/pins/` (see below). |
| **Hint card and map key** | Fog card with navy text at the bottom of the map ("Explore the map. Tap a location to get more details."), shown whenever no site is open. Below a thin divider, a **map key** lists each icon in use on the map: a small navy circle with the icon, then its name in bold (for example, Memorial, Building, Cemetery). Entries wrap onto more rows as needed. The text is `tour.mapHint`, and the icon names are `tour.iconLabels`, both in `data/stops.json`. |
| **Site sheet** | Navy, with 20px top corners and a 96px fog drag handle. In preview it shows only the title and era; expanded, it scrolls. The close button is a circled ⊗. |
| **Gallery** | A full-width 4:3 frame that swipes sideways. Images are shown **whole, never cropped** (`object-fit: contain` on a dark navy background), because cropping an archival photo can change what it shows. The caption and credit appear in small muted fog text below, with round previous/next image buttons. |
| **Key People cards** | Sky-blue cards with a photo on the left (92px square, 104px on desktop), the name in uppercase bold navy with a short fog underline, a one-line description, the photo credit, and an optional **Learn more ›** link. Placeholder people use `images/person-placeholder.svg`, a coral duotone portrait marked "PLACEHOLDER", in the style of the wireframe. |
| **Buttons** | **Call to action:** coral with a 2px fog outline and large Oswald text. **Next ›:** coral. **Previous:** outlined in fog. **Round map buttons:** navy with a fog outline. |
| **Compass and scale** | Bottom-left of the map: a 48px fog compass (the "N" sits inside the ring, above a navy north needle), above a scale bar in meters and feet. Both are fixed sizes, so they look the same at every screen width. On phones they move up above the hint card, or above the preview sheet, so nothing overlaps. They're hidden while the full story covers the map. |
| **Building info** | Invisible UNC footprints. Hovering or tapping a building shows a navy tooltip with its name. |
| **Placeholder badge** | Amber pill reading "PLACEHOLDER CONTENT", on any site marked `"placeholder": true` |

---

## Icons and logos

**Logos** (`images/logo/`): the team's SVG logo files, copied unchanged from the design handoff.

| File | Used for |
|---|---|
| `btbb-stacked-carolinablue.svg` | Splash screen and intro |
| `btbb-horizontal-navy.svg` | Header (navy bars with fog lettering, which blend into the navy header) |
| The other four (`…-franklinfog`, `…-carolinablue`, `…-navy`) | Available for future use |

**Icons:**
- `images/icons/source/` holds the team's eight icon SVGs, unchanged: buildings, carpenters, cemetery, masons, memorial, painters, people, seamstress.
- `images/icons/pins/` holds the **map-pin versions** built from them by `npm run pins` (`scripts/build-pin-icons.js`). In these, the icons' navy (`#172849`) becomes fog, so the tools in the four hand icons stay visible on the navy pins, and the light blue (`#87aed0`) is kept. Each icon is also cropped to a square around its drawing, so all of them fill their pins evenly.
- Each site chooses its icon with `"icon"` in `data/stops.json` (for example `"icon": "memorial"`).

---

## Motion

- The splash fades out over 0.45 s, the map glides (0.6 s) to each site, and the active pin enlarges.
- With **reduce motion** turned on in the device settings, all transitions are switched off and the opening animation is replaced by the still logo.
- Browsers display video colors differently from page colors, and differently from each other, so the opening animation's navy never exactly matches any CSS color (in Chrome it shows a shade bluer than `--navy`; other browsers differ again). Firefox on Macs even draws two videos in different shades. So each frame of the animation is painted onto one full-screen canvas, and the space around it is filled with a color read from that same canvas (the most common color in a thin plain strip along the top of the frame, re-read a few times a second because the video's navy drifts very slightly as it plays). It's all one surface, so it matches in every browser. The file's 1px darker border is trimmed off. If the canvas can't be used, the plain video shows instead, on `#122e54` with slightly faded edges.

---

## Changing colors

Edit the tokens at the top of `css/styles.css`, then check every text/background pair in the [contrast table](#measured-contrast) at <https://webaim.org/resources/contrastchecker/>. After changing any CSS, run `npm run stamp` (see the [editing guide](editing-guide.md#after-changing-css-or-javascript)).
