# Beyond the White and Blue

### Every stop has a story.

An interactive campus storytelling experience that connects people to the Black histories, contributions, and communities that have shaped UNC Chapel Hill through location-based discovery, layered digital storytelling, and thoughtfully designed campaign materials.

🔗 Live site: **https://taliakberler.github.io/beyond-the-white-and-blue/**

> *Project framing is a work in progress.*

---

## Purpose

### The problem

Black history is embedded throughout UNC’s campus, but its significance is not always visible or accessible to the people who walk through it.

### The insight

People are more likely to connect with history when they can discover it in the places where it happened, explore it at their own pace, and understand how it relates to the present.

### The solution

A connected physical and digital campus experience using QR-coded signage, a mobile-first story map, printed materials, and motion-led promotion.

### The desired impact

Help students and visitors see familiar spaces differently, recognize Black contributions, and engage more thoughtfully with Carolina’s history.

---

## Storytelling structure ideas

So the experience feels cohesive, even when the histories vary.

| Layer | Focus | What it does |
|---|---|---|
| **01. Discover** | The surface story | A concise introduction identifies the location and explains why it matters. A compelling question, image, or fact invites the user to keep exploring. |
| **02. Dig deeper** | The historical context | Users uncover the people, events, archival evidence, and related histories behind the place. Additional material remains optional, so the experience does not overwhelm people who want a quick introduction. |
| **03. Reflect** | The present-day connection | A thoughtful question, contemporary connection, or link to further resources encourages users to consider how this history shapes their understanding of Carolina today. |

---

## Design principles for the story map

- **Place-based.** Each stop is tied to a real location, so visitors stand where the history happened.
- **Easy to reach.** It's free, works on any smartphone with no app to install, and is reached by scanning a QR code at each site.
- **Well sourced.** Every stop lists its sources and image credits so visitors can keep learning and check the record themselves.
- **Inclusive.** It's built to be readable outdoors and usable with screen readers, keyboards, and larger text.

## How the tour works

1. A visitor scans the **QR code** on a sign at a tour stop.
2. The tour opens on their phone, **zoomed to that site**, with its history, images, key people, and sources.
3. They can follow the numbered **walking route** to the next stop, get walking directions in their phone's map app, or browse **all stops** in a list.

Visitors don't have to start at Stop 1. Every sign is a way in.

## Current status

> **This is a working mockup.** The tour's five sites are in place: the Unsung Founders Memorial, Steele Building, Lenoir Hall, the Pit, and Old Chapel Hill Cemetery. Their **text and images are still placeholders**, with no historical content yet, and the walking order is **provisional** until the route is decided. Each stop shows a "PLACEHOLDER CONTENT" badge until its content has been researched, verified, and reviewed.

The placeholder text deliberately makes no historical claims. See [PROCESS_LOG.md](PROCESS_LOG.md) for why, and [docs/content-guidelines.md](docs/content-guidelines.md) for how real content should be prepared.

## Documentation

| Document | What it covers |
|---|---|
| [docs/site-overview.md](docs/site-overview.md) | How the site works: pages, features, data flow, deep links, accessibility, offline behavior, known limits |
| [docs/editing-guide.md](docs/editing-guide.md) | Step-by-step guide to editing stops, adding images, changing the route, generating QR codes, and deploying |
| [docs/content-guidelines.md](docs/content-guidelines.md) | Standards for researching, writing, sourcing, and crediting tour content |
| [docs/design-and-styles.md](docs/design-and-styles.md) | Color tokens, typography, layout, dark mode, contrast measurements, and how to apply brand colors |
| [docs/software-and-credits.md](docs/software-and-credits.md) | Every library, map service, and data source used, with licenses and required credits |
| [PROCESS_LOG.md](PROCESS_LOG.md) | Dated record of every decision and code change, kept for publication |

## Quick start

To preview the site on your computer, run a local web server from the project folder:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080/>.

- **Edit tour content:** change `data/stops.json` (see the [editing guide](docs/editing-guide.md)).
- **Generate QR codes:** run `npm install` once, then `npm run qr`.
- **Publish:** push to `main`. GitHub Pages redeploys automatically.

## Project structure

```
index.html             The app (a single page)
css/styles.css         All styles; colors are CSS variables
fonts/                 Brand typefaces (self-hosted, with licenses)
js/app.js              App logic
js/vendor/leaflet/     Leaflet map library (bundled copy)
data/stops.json        All tour content and settings
data/route.geojson     The walking route
tiles/team-map/        The team's illustrated campus map, as web-map tiles (the site's basemap)
images/                Stop images
qr/                    Generated QR codes and printable sign sheet
scripts/               QR generator and helper scripts
docs/                  Project documentation
PROCESS_LOG.md         Record of decisions and changes
```

## Credits

The campus map is the project team's own illustration. Surrounding streets are © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, and building names come from UNC Chapel Hill's public GIS service. Mapping is by [Leaflet](https://leafletjs.com). The full list of software and licenses is in [docs/software-and-credits.md](docs/software-and-credits.md).

The site's code was developed with help from Claude Code, an AI coding assistant. No historical content was generated by AI: the placeholder stops intentionally make no historical claims, and real content is to be researched and verified by people (see [PROCESS_LOG.md](PROCESS_LOG.md)).
