# Design and styles

All styling lives in one file, [`css/styles.css`](../css/styles.css), with no CSS framework or build step. Colors, type sizes, and key dimensions are **CSS custom properties (variables)** declared at the top of the file, so the look can change without touching layout code.

> **Status:**
> - **Typefaces are decided** (2026-10-14): Gasoek One for the logo, Oswald Bold for headers, and Lato Regular for body copy.
> - **The color palette is still a neutral placeholder** (slate grays with a muted blue and a burnt-orange accent), chosen to be easy to read outdoors until final colors are decided. It is not a UNC brand palette.

---

## Design goals

| Goal | How it's met |
|---|---|
| Readable outdoors in sunlight | High-contrast text (14:1+), bold markers, 17px base font, solid surfaces (no translucency behind text) |
| Easy to use one-handed while walking | All tap targets at least 44×44px; key navigation (Previous / Next) pinned at the bottom of the panel within thumb reach |
| Phone-first | Designed at 375px wide first; the desktop layout is an enhancement at 900px and up |
| Accessible | WCAG 2.1 AA contrast in both themes, visible focus rings, reduced-motion support (see [site-overview.md](site-overview.md#accessibility)) |
| Easy to rebrand | Every color comes from a variable; changing the variables changes the whole site |

---

## Color tokens

Each token has a light value and a dark value. Dark values apply automatically when the device is in dark mode, or when the visitor picks dark with the theme button.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-bg` | `#f4f6f8` | `#12161b` | Page background, List view |
| `--color-surface` | `#ffffff` | `#1b2129` | Panel, cards, map buttons |
| `--color-surface-2` | `#e9edf1` | `#252d37` | Key-people boxes, image backgrounds |
| `--color-text` | `#141a21` | `#eef2f6` | Body text |
| `--color-text-muted` | `#47525e` | `#b3bdc8` | Era, credits, secondary text |
| `--color-border` | `#c3ccd5` | `#3a4552` | Dividers, card outlines, sheet handle |
| `--color-primary` | `#2b5c8a` | `#8cb8e6` | Markers, buttons, links, list numbers |
| `--color-primary-strong` | `#1f4568` | `#b5d3f2` | Reserved for hover/pressed states |
| `--color-on-primary` | `#ffffff` | `#0d1620` | Text on primary-colored fills |
| `--color-accent` | `#b4541a` | `#f0a46c` | Active stop marker, "you are here" dot |
| `--color-on-accent` | `#ffffff` | `#1a0e05` | Text on accent fills |
| `--color-route` | `#2b5c8a` | `#8cb8e6` | Dotted route line |
| `--color-building-fill` | `#8a97a5` | `#9aa8b8` | Building polygons (at 22% opacity) |
| `--color-building-line` | `#6b7785` | `#b7c3d0` | Building outlines |
| `--color-focus` | `#b4541a` | `#f0a46c` | Keyboard focus ring |
| `--color-header-bg` | `#1f2933` | `#0b0e12` | Top bar |
| `--color-header-text` | `#ffffff` | `#eef2f6` | Top bar text |
| `--color-placeholder-badge` | `#fff3c4` | `#4a3f12` | "PLACEHOLDER CONTENT" badge |

### Measured contrast

Ratios were calculated with the WCAG 2.1 relative-luminance formula. AA requires 4.5:1 for normal text and 3:1 for large text and interface parts.

| Pair | Light | Dark |
|---|---|---|
| Body text on surface | 17.5:1 | 14.4:1 |
| Muted text on surface | 8.0:1 | 8.5:1 |
| Muted text on surface-2 | 6.8:1 | 7.3:1 |
| Primary (links) on surface | 7.0:1 | 7.8:1 |
| Text on primary buttons and markers | 7.0:1 | 8.8:1 |
| Text on accent (active marker) | 5.0:1 | 9.2:1 |
| Header text on header | 14.8:1 | 17.2:1 |

Every pair passes AA, and most pass AAA (7:1).

---

## Typography

### Typefaces

| Role | Typeface | Weight | Where it's used |
|---|---|---|---|
| **Logo** | [Gasoek One](https://fonts.google.com/specimen/Gasoek+One) | Regular (400, the only weight) | Tour name in the header; tour name at the top of each printed QR sign |
| **Headers** | [Oswald](https://fonts.google.com/specimen/Oswald) | Bold (700) | Stop titles, section headings ("Key people", "Sources", "Tour stops"), list-card titles, numbers in map markers and list cards, stop titles and numbers on QR signs |
| **Body copy** | [Lato](https://fonts.google.com/specimen/Lato) | Regular (400) | All running text: summaries, history, captions, credits, people, sources, buttons, and messages |
| *Body emphasis* | Lato | Bold (700) | Bold text within body copy and buttons (the summary line, people's names, button labels). Included so bold text uses Lato's real bold face rather than a browser-generated imitation. |

### Tokens

| Token | Value |
|---|---|
| `--font-logo` | `"Gasoek One", "Arial Black", Impact, <system stack>` |
| `--font-heading` | `"Oswald", "Arial Narrow", "Roboto Condensed", <system stack>` |
| `--font-body` | `"Lato", <system stack>` |
| `--font-system` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |

The fallbacks after each brand font are similar in shape (heavy for the logo, condensed for headers), so the layout holds steady while fonts load, or if a font file can't load.

### How the fonts are loaded

- **Self-hosted:** the font files live in [`fonts/`](../fonts/) and are declared with `@font-face` at the top of `css/styles.css`. Visitors' browsers never contact Google or any other font service. This keeps the privacy promise in [software-and-credits.md](software-and-credits.md), and fonts keep working wherever the site is hosted.
- **Latin subset only:** each file covers the basic and Western European Latin characters (U+0000–00FF plus common punctuation such as curly quotes and dashes). The four files total about **54 KB**. Characters outside that range (for example, some Eastern European letters in a name) are drawn in the fallback font. If content needs them, add the `latin-ext` files from Google Fonts.
- **`font-display: swap`:** text appears immediately in the fallback font and switches to the brand font as soon as it arrives, so slow connections never leave visitors staring at blank text.
- **Preloaded:** the logo and body fonts are preloaded in `index.html`, since they're visible on first paint.
- **Weights:** only 400 and 700 are loaded. Any bold style in the CSS uses `font-weight: 700`.

### Sizes

| Token | Value | Notes |
|---|---|---|
| `--fs-base` | 17px (1.0625rem) | Slightly larger than the usual 16px, for outdoor reading |
| `--fs-small` | 15px | Captions, credits, secondary text (never smaller than 13px anywhere) |
| `--fs-h1` | 18px (20px on desktop) | Logo in the header |
| `--fs-h2` | 24px | Stop title |
| `--fs-h3` | 18px | Section headings ("Key people", "Sources") |

Line height is 1.55 for body text, 1.2 for headings, and 1.3 for the two-line logo. All sizes use `rem`, so they scale with the visitor's browser text-size setting.

### Using the fonts elsewhere

The same three typefaces are free to download from Google Fonts for print and motion materials. They're all under the SIL Open Font License, which allows commercial and print use. The QR sign sheet (`qr/sheet.html`) already uses them.

---

## Layout and breakpoints

| Width | Layout |
|---|---|
| **Under 420px** (small phones) | Header subtitle hidden; Map/List buttons tightened |
| **Under 900px** (phones, small tablets) | Stop details open as a **bottom sheet** covering 58% of the screen, with the map visible above. Tap the handle or swipe up to expand it to nearly full height; swipe down to collapse or close. |
| **900px and up** (tablets, desktop) | Stop details open as a **420px side panel** on the right; map controls shift left to stay visible |

Other dimensions:

| Token | Value | Purpose |
|---|---|---|
| `--tap` | 44px | Minimum size of every button and control |
| `--radius` | 14px | Corner rounding on cards, images, and the sheet |
| `--panel-w` | 420px | Desktop side-panel width |
| `--header-h` | Measured by JavaScript | Lets the panel and messages sit just below the header |

When a stop opens, the map centers it in the **visible** part of the map (above the sheet on phones, left of the panel on desktop), not behind the panel.

The site respects the iPhone notch and home-indicator areas (`env(safe-area-inset-*)`).

---

## Components

| Component | Notes |
|---|---|
| **Header** | Dark bar with the tour title, subtitle, a Map/List switch (pill-shaped toggle), and a theme button |
| **Stop markers** | 36px numbered circles inside a 44px tap area, with a white ring and drop shadow so they stand out against the map. The active stop turns accent orange and enlarges slightly. |
| **Route line** | 5px dotted line in the primary color, drawn beneath the markers |
| **Building layer** | Light gray polygons at 22% fill opacity, drawn beneath the route so it never competes with the tour |
| **Map buttons** | White pill buttons ("You are here", building toggle) in the top-right corner. When the building layer is switched off, its button dims. |
| **"Start the tour" button** | Large pill at the bottom of the map, shown only when no stop is open |
| **Stop panel** | Stop count → title → era → image gallery → summary (bold) → history → key people (shaded boxes) → sources (numbered list) → pinned navigation |
| **Image gallery** | Full-width 4:3 images that swipe sideways and snap into place, with previous/next buttons and an "1 / 2" counter below |
| **Messages (toasts)** | Dark rounded bar just below the header, announced to screen readers. Messages disappear after 6–9 seconds. |
| **Placeholder badge** | Pale yellow pill reading "PLACEHOLDER CONTENT", shown on any stop marked `"placeholder": true` in `stops.json` (or whose title contains "PLACEHOLDER") |

---

## Dark mode

- **Automatic:** follows the device's light/dark setting (`prefers-color-scheme`).
- **Manual override:** the moon button in the header cycles **automatic → light → dark**. The choice is remembered on that device. If browser storage is blocked, the site simply falls back to automatic.
- **Map tiles:** OpenStreetMap only provides light-colored tiles, so in dark mode the tiles are filtered (inverted, hue-rotated, dimmed, and desaturated) to avoid a bright glare. Markers, route, and buildings are not filtered.

---

## Motion

- The map glides (0.6s) to each stop, and the sheet expands with a 0.25s animation.
- If the visitor has turned on **reduce motion** in their device settings, all transitions and smooth scrolling are switched off.

---

## Applying brand colors

1. Open `css/styles.css`.
2. Change the token values in **all three** places they appear:
   - the `:root { … }` block (light),
   - the `@media (prefers-color-scheme: dark)` block (automatic dark),
   - the `:root[data-theme="dark"]` block (manual dark). This must match the automatic dark block.
3. Check every text/background pair from the contrast table above at <https://webaim.org/resources/contrastchecker/>.
4. Update the `theme-color` values in `index.html` so the phone's browser bar matches the header.
5. Record the change in [PROCESS_LOG.md](../PROCESS_LOG.md).

> **A note on light brand blues.** Many university palettes are built around a light blue. Light blues usually have **too little contrast with white** to use for text or for white text on a blue button. For example, `#4B9CD3` on white measures about 3.0:1, which fails AA for normal text. Use such a color for large shapes, the route line, or accents on dark backgrounds, and pair it with a dark navy for text and buttons. Confirm official values with the University's brand guidelines before using them.

To change a typeface, add the new `.woff2` file to `fonts/` with its license, update the matching `@font-face` rule and token in `css/styles.css` (and the `@font-face` rules in `scripts/generate-qr.js` for the signs), and keep a similar-shaped fallback.
