# Site overview

How *Beyond the Blue and White* works: what visitors see, how the pieces fit together, and the site's known limits. For editing instructions, see [editing-guide.md](editing-guide.md).

---

## What the site is

A single web page (`index.html`) that runs entirely in the visitor's browser. There is **no server-side code, database, login, or build step**. GitHub Pages simply serves the files as they are in the repository. This keeps the site free to host, easy to maintain, and easy to move to another host later (for example, a University web server).

All of the map's content comes from two data files:

| File | Contents |
|---|---|
| `data/stops.json` | Site settings (title, map center, basemap, building layer, About page) and every stop's text, images, people, and sources |

Changing those files changes the map, with no code edits needed.

---

## What visitors see

The screens follow the team's wireframe (see [design-and-styles.md](design-and-styles.md#screens-and-layout)).

### Splash and intro (home)

- A navy **splash screen** with the logo appears while the map's data loads.
- On the home address, the **intro screen** follows. It shows the tagline, the stacked logo, the project description, a coral **Explore the map** button, and links to **See all stops** and **About this project**. The wording is `tour.welcome` in `data/stops.json`.
- **Stop links and QR codes skip the intro** and open their stop directly. The splash is skipped for them too, so visitors standing at a site get there as fast as possible.
- The **Home** button (⌂) or the logo in the header returns to the intro.

### Map

- **The team's illustrated campus map** as the basemap, with nearby streets shown faintly around it.
- **Icon pins** for each stop, using the team's icons (memorial, buildings, people, cemetery, and so on), on navy circles. There's no route line and no numbering: the sites can be explored in any order.
- A **hint card** at the bottom ("Explore the map. Tap a location to get more details.") whenever no stop is open.
- **Building names on hover or tap:** UNC's building footprints are invisible. Hovering (desktop) or tapping (phones) a building shows its name and year built.
- A round **"Show where I am"** button (top-right), which shows the visitor's position as a coral dot with an accuracy circle.
- A **compass** and a **scale bar** (meters and feet) in the bottom-left corner. On phones they move up above the hint card or the stop preview, so nothing overlaps.
- **Zooming:** pinch on phones; zoom buttons appear on wider screens.

### Stop preview and full story

- **Tapping a pin on a phone** opens a short navy **preview** at the bottom: the site's name (for example "STEELE BUILDING") and its era. The map stays visible, with the stop centered above it.
- **Tap the preview, swipe it up, or press its handle** to open the **full story**, which fills the screen below the header. Swiping down returns to the preview, and swiping down again (or ⊗) closes it.
- **Arriving from a stop link or QR code** opens the full story straight away.
- **On desktop**, stops open as a 420px side panel with the full story.
- The full story contains, in order:
  1. a swipeable **image gallery** with captions and credits
  2. the summary and history
  3. **Key people** cards (photo, name, one-line description, optional "Learn more" link)
  4. **Sources**
  5. **Get walking directions here** (opens Apple Maps or Google Maps to this site), then **‹ Previous** and **Next ›** to browse the other sites

  Previous and Next wrap around, so every site is reachable from every other.

### All stops

The **All stops** button (⋮≡ on phones) shows every stop in order as a card (pin icon and number, name, era, summary). Tapping a card opens that stop on the map.

### About page

The **ⓘ** button (or "About" on desktop, or the address `…/#about`) opens the About page:
- the project's tagline and description
- where it was made (the Visual Discovery Conference 2026 at UNC Chapel Hill) and the team's prompt (highlight Black history at UNC Chapel Hill)
- credits for the team, coaches, and community advisors, then the map and software credits and a link to the project's code and documentation

Everything on it comes from `tour.about` in `data/stops.json`.

---

## Deep links and QR codes

The About page has its own address, `…/index.html#about`, and every stop has one too:

```
https://taliakberler.github.io/beyond-the-blue-and-white/index.html#stop=<stop-id>
```

Each stop's QR code encodes this address. When the page opens with `#stop=…`, it zooms to that stop and opens its panel.

- The part after `#` never reaches the server, so this works on any static host.
- Moving between stops updates the address, so the phone's **Back** button returns to the previous stop, and any stop's address can be copied and shared.
- Closing the panel removes the `#stop=` part.
- An unknown or mistyped stop id shows the List view with the message "That stop wasn't found."

---

## How the page loads

```
index.html
 ├─ css/styles.css                       styles and color tokens
 ├─ js/vendor/leaflet/leaflet.js + .css  map library (bundled)
 └─ js/app.js
     ├─ fetch data/stops.json            → title, stops, settings
     ├─ draw map: faded OpenStreetMap streets + illustrated-map tiles (tiles/team-map)
     ├─ draw icon pins (images/icons/pins)
     ├─ fetch UNC building layer (optional, in background) → invisible hover/tap targets
     ├─ build List view
     └─ if the address has #stop=…, open that stop; otherwise fit all stops on screen
```

- If `stops.json` can't load, the page shows a clear error message instead of a blank screen.
- If the building layer can't load, the map works without it.
- Data files are fetched with `cache: 'no-cache'`: the browser checks with the server for a newer version on every visit, so content updates appear right away instead of after the browser's cache expires. Leaflet and the images are cached normally.

All paths are **relative** (`data/stops.json`, not `/data/stops.json`), so the site works at the root of a domain or inside any subfolder.

---

## Accessibility

| Area | What's built in |
|---|---|
| **Keyboard** | Every control is reachable with Tab. Stop pins can be focused and opened with Enter or Space; on the map, the amber focus ring has a navy surround so it shows against the light illustration. Escape closes the stop panel. Arrow keys move through the image gallery. A "Skip to tour content" link is the first focusable item. |
| **Focus** | A thick orange focus ring on every focused element. Opening a stop moves focus into its panel; closing returns focus to that stop's marker. |
| **Screen readers** | Pins are announced as buttons ("Stop 3: Lenoir Hall"). The splash announces "Loading the map…". The header's Map, All stops, and About buttons report which is active (`aria-pressed`). The stop sheet's handle reports whether the full story is open (`aria-expanded`). The gallery is labeled as a carousel with "Image 1 of 2". Status messages (location, offline, errors) are read aloud through a live region. |
| **Images** | Every image has alt text from `stops.json`, and images that fail to load are replaced by a labeled text box. |
| **Text** | 17px base size in `rem` units, so it follows browser text-size settings. Zooming the page isn't blocked. |
| **Color** | All text/background pairs meet WCAG 2.1 AA contrast ([measurements](design-and-styles.md#measured-contrast)). The coral buttons pass at the large-text level, so their labels are always large and bold. Information is never conveyed by color alone: the active stop is also enlarged and named in the sheet. |
| **Motion** | Animations are switched off when the device's "reduce motion" setting is on. |
| **Touch** | All tap targets are at least 44×44px. |

These were checked by hand and with scripted tests in a browser (see [PROCESS_LOG.md](../PROCESS_LOG.md)). A full audit with real assistive technology (VoiceOver, TalkBack, NVDA) is still to be done.

---

## When things go wrong (offline tolerance)

| Situation | What the visitor sees |
|---|---|
| Map tiles fail to load (weak signal, offline) | "Map tiles couldn't load — you may be offline. The stop list and stop details still work." with a **Show list** button |
| Phone goes offline or comes back | A short notice in each case |
| An image fails to load | A gray box: "Image couldn't load — you may be offline." |
| Location permission denied | "Location permission was denied. That's OK — follow the numbered stops, or allow location in your browser settings…" |
| Location times out or is unavailable | A friendly message suggesting trying again in an open area |
| Visitor is far from campus | Their location is still shown, with a note that they appear to be away from campus |
| Building layer unavailable | Building names don't appear on hover or tap; nothing else changes |
| Map data can't load | A full-page message explaining the problem, with a Reload button |

---

## Privacy

- No analytics, cookies, trackers, ads, or accounts.
- Location is only requested when the visitor taps "You are here". It stays on the device and is never sent anywhere.
- The only outside requests are for street tiles (OpenStreetMap), building names (UNC GIS), and, only when tapped, the directions link (Apple or Google Maps). The illustrated map is served from this site.

Details are in [software-and-credits.md](software-and-credits.md).

---

## Browser support

The site works in current versions of Safari (iOS and macOS), Chrome (Android and desktop), Firefox, and Edge. It uses standard features available in all of them since about 2020: `fetch`, CSS custom properties, CSS scroll-snap, and `dvh` units.

---

## Known limits and future work

- **Placeholder content:** the five sites are set, but their text and images are placeholders that must be replaced with researched, verified content ([content-guidelines.md](content-guidelines.md)).
- **First visit needs a connection:** the site doesn't yet store tiles or content for full offline use. A service worker could add this later.
- **Not yet tested on physical devices:** successful location fixes, Apple Maps handoff on iPhone, swipe gestures, and the tile-failure message were not verified on real phones.
- **Assistive technology:** not yet tested with screen readers on real devices.
- **No "About" or credits page yet** for the project team, researchers, and community partners.
- **No corrections contact yet** (see [content-guidelines.md](content-guidelines.md#corrections)).
