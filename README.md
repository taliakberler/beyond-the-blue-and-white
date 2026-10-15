# Beyond the Blue and White

### Every stop has a story.

An interactive campus storytelling experience that connects people to the Black histories, contributions, and communities that have shaped UNC Chapel Hill through location-based discovery, layered digital storytelling, and thoughtfully designed campaign materials.

🔗 Live site: **https://taliakberler.github.io/beyond-the-blue-and-white/**

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

## How the map works

1. A visitor scans the **QR code** on a sign at one of the sites, or opens the map from a link.
2. The map opens on their phone, **zoomed to that site**, with its history, images, key people, sources, and links to related resources.
3. They can explore the other sites on the map, get walking directions to any of them in their phone's map app, or browse **all stops** in a list.

Visitors don't have to start at Stop 1. Every sign is a way in.

## Current status

> **This is a working mockup.** The map's five sites are in place: the Unsung Founders Memorial, Steele Building, Lenoir Hall, the Pit, and Old Chapel Hill Cemetery. Their **text is still placeholder**, with no historical content yet. The first real photos are in place, but **permission to publish them hasn't been confirmed yet** (see [docs/image-permissions.md](docs/image-permissions.md)). Each stop shows a "PLACEHOLDER CONTENT" badge until its content has been researched, verified, and reviewed.

The placeholder text deliberately makes no historical claims. See [PROCESS_LOG.md](PROCESS_LOG.md) for why, and [docs/content-guidelines.md](docs/content-guidelines.md) for how real content should be prepared.

## Documentation

| Document | What it covers |
|---|---|
| [docs/site-overview.md](docs/site-overview.md) | How the site works: pages (map, list, About), features, data flow, deep links, accessibility, offline behavior, known limits |
| [docs/editing-guide.md](docs/editing-guide.md) | Step-by-step guide to editing stops, adding images and icons, generating QR codes, and deploying |
| [docs/content-guidelines.md](docs/content-guidelines.md) | Standards for researching, writing, sourcing, and crediting the map's content |
| [docs/design-and-styles.md](docs/design-and-styles.md) | The wireframe-based design: color tokens, typography, screens, components, logos and icons, and contrast measurements |
| [docs/software-and-credits.md](docs/software-and-credits.md) | Every library, map service, and data source used, with licenses and required credits |
| [docs/image-permissions.md](docs/image-permissions.md) | **Permission to publish each photo: not yet confirmed.** Checklist of every image, its holder, and its status |
| [PROCESS_LOG.md](PROCESS_LOG.md) | Dated record of every decision and code change, kept for publication |

## Quick start

To preview the site on your computer, run a local web server from the project folder:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080/>.

- **Edit the map's content:** change `data/stops.json` (see the [editing guide](docs/editing-guide.md)).
- **Generate QR codes:** run `npm install` once, then `npm run qr`.
- **Publish:** push to `main`. GitHub Pages redeploys automatically.

## Project structure

```
index.html             The app (a single page)
css/styles.css         All styles; colors are CSS variables
fonts/                 Brand typefaces (self-hosted, with licenses)
js/app.js              App logic
js/vendor/leaflet/     Leaflet map library (bundled copy)
data/stops.json        All map content and settings
tiles/team-map/        The team's illustrated campus map, as web-map tiles (the site's basemap)
images/                Stop images, placeholder portrait
images/logo/           The team's logo files (SVG)
images/icons/          The team's icons: source/ (as delivered) and pins/ (map-pin versions)
qr/                    Generated QR codes and printable sign sheet
scripts/               QR generator and helper scripts
docs/                  Project documentation
PROCESS_LOG.md         Record of decisions and changes
```

## Project context

*Beyond the Blue and White* was created at the **Visual Discovery Conference 2026** at UNC Chapel Hill. Our team's prompt was to **highlight Black history at UNC Chapel Hill**.

## Team and credits

*Roles to be added.*

**Team** (alphabetical by last name)
- Talia Berler
- Andie Day
- Trinity Gill
- Jori Husted
- Victor Morgan
- Leticia Oteng
- Andrea Perez
- Cayla Quintero
- Gwyneth Shoemaker

**Coaches** (alphabetical by last name)
- Adonis Durado
- Randy Stano

**Community advisors** (alphabetical by last name): from Chapel Hill, they advised us on the history of Black labor and community here.
- Nicholas Graham
- Samuel Scarborough

The same credits appear on the site's About page (the ⓘ button, or [`#about`](https://taliakberler.github.io/beyond-the-blue-and-white/#about)). To add roles or names, edit `tour.about` in `data/stops.json`.

### Map and software

The campus map is the project team's own illustration. Surrounding streets are © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, and building names come from UNC Chapel Hill's public GIS service. Mapping is by [Leaflet](https://leafletjs.com). The full list of software and licenses is in [docs/software-and-credits.md](docs/software-and-credits.md).

The site's code was developed with help from Claude Code, an AI coding assistant. No historical content was generated by AI: the placeholder stops intentionally make no historical claims, and real content is to be researched and verified by people (see [PROCESS_LOG.md](PROCESS_LOG.md)).
