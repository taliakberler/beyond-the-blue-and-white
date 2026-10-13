# Site overview

How *Beyond the White and Blue* works: what visitors see, how the pieces fit together, and the site's known limits. For editing instructions, see [editing-guide.md](editing-guide.md).

---

## What the site is

A single web page (`index.html`) that runs entirely in the visitor's browser. There is **no server-side code, database, login, or build step**. GitHub Pages simply serves the files as they are in the repository. This keeps the site free to host, easy to maintain, and easy to move to another host later (for example, a University web server).

All tour content comes from two data files:

| File | Contents |
|---|---|
| `data/stops.json` | Tour settings (title, map center, building layer) and every stop's text, images, people, and sources |
| `data/route.geojson` | The walking path, as a GeoJSON LineString |

Changing those files changes the tour, with no code edits needed.

---

## What visitors see

### Map view (default)

- A street map of campus with **numbered markers** for each stop and a **dotted route line** connecting them in walking order.
- **Campus building outlines** (light gray) from UNC's GIS service, with a toggle button.
- A **"You are here"** button that shows the visitor's position as an orange dot with an accuracy circle.
- A **"Start the tour at Stop 1"** button when no stop is open.
- Zoom buttons and map credits.

### Stop panel

Opens when a visitor taps a marker, scans a QR code, or picks a stop from the list.

- On phones it's a **bottom sheet** (the map stays visible above). On wider screens it's a **side panel**.
- Contents, in order:
  1. "Stop 3 of 5"
  2. Title and era
  3. Swipeable **image gallery** with captions and credits
  4. Summary
  5. History
  6. **Key people**
  7. **Sources**
- Pinned at the bottom:
  - **Previous** and **Next stop** buttons
  - **Get walking directions**, which opens Apple Maps or Google Maps to the next stop
- On the last stop, Next becomes **Back to Stop 1**, and the directions link points to the current stop.

### List view

The **Map / List** switch in the header shows every stop in route order as a card (number, title, era, summary). Tapping a card opens that stop on the map.

---

## Deep links and QR codes

Every stop has its own address:

```
https://taliakberler.github.io/beyond-the-white-and-blue/index.html#stop=<stop-id>
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
     ├─ draw map + OpenStreetMap tiles
     ├─ draw numbered markers
     ├─ fetch data/route.geojson         → dotted route line
     ├─ fetch UNC building layer (optional, in background)
     ├─ build List view
     └─ if the address has #stop=…, open that stop; otherwise fit all stops on screen
```

- If `stops.json` can't load, the page shows a clear error message instead of a blank screen.
- If the route or building layer can't load, the tour works without them.
- Data files are fetched with `cache: 'no-cache'`: the browser checks with the server for a newer version on every visit, so content updates appear right away instead of after the browser's cache expires. Leaflet and the images are cached normally.

All paths are **relative** (`data/stops.json`, not `/data/stops.json`), so the site works at the root of a domain or inside any subfolder.

---

## Accessibility

| Area | What's built in |
|---|---|
| **Keyboard** | Every control is reachable with Tab. Map markers can be focused and opened with Enter or Space. Escape closes the stop panel. Arrow keys move through the image gallery. A "Skip to tour content" link is the first focusable item. |
| **Focus** | A thick orange focus ring on every focused element. Opening a stop moves focus into its panel; closing returns focus to that stop's marker. |
| **Screen readers** | Markers are announced as buttons ("Stop 3: …"). The Map/List and building toggles report on/off state (`aria-pressed`). The gallery is labeled as a carousel with "Image 1 of 2". Status messages (location, offline, errors) are read aloud through a live region. |
| **Images** | Every image has alt text from `stops.json`, and images that fail to load are replaced by a labeled text box. |
| **Text** | 17px base size in `rem` units, so it follows browser text-size settings. Zooming the page isn't blocked. |
| **Color** | All text/background pairs meet WCAG 2.1 AA contrast in light and dark mode ([measurements](design-and-styles.md#measured-contrast)). Information is never conveyed by color alone: the active stop is also enlarged and named in the panel. |
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
| Building layer unavailable | The toggle button disappears; nothing else changes |
| Tour data can't load | A full-page message explaining the problem |

---

## Privacy

- No analytics, cookies, trackers, ads, or accounts.
- Location is only requested when the visitor taps "You are here". It stays on the device and is never sent anywhere.
- The only outside requests are for map tiles (OpenStreetMap), building outlines (UNC GIS), and, only when tapped, the directions link (Apple or Google Maps).

Details are in [software-and-credits.md](software-and-credits.md).

---

## Browser support

The site works in current versions of Safari (iOS and macOS), Chrome (Android and desktop), Firefox, and Edge. It uses standard features available in all of them since about 2020: `fetch`, CSS custom properties, CSS scroll-snap, and `dvh` units.

---

## Known limits and future work

- **Placeholder content:** all five stops are placeholders and must be replaced with researched, verified content ([content-guidelines.md](content-guidelines.md)).
- **Straight-line route:** the route line connects stops directly rather than following sidewalks ([how to fix](editing-guide.md#replace-the-route)).
- **Map center:** the configured center (35.904613, −79.046761) is on South Campus near Kenan Stadium, so the placeholder stops cluster there. Real stop coordinates will set the actual tour area.
- **First visit needs a connection:** the site doesn't yet store tiles or content for full offline use. A service worker could add this later.
- **Not yet tested on physical devices:** successful location fixes, Apple Maps handoff on iPhone, swipe gestures, and the tile-failure message were not verified on real phones.
- **Assistive technology:** not yet tested with screen readers on real devices.
- **No "About" or credits page yet** for the project team, researchers, and community partners.
- **No corrections contact yet** (see [content-guidelines.md](content-guidelines.md#corrections)).
