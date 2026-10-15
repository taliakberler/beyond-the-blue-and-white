/* Beyond the Blue and White — multimedia digital map.
 * Plain JavaScript + Leaflet. All content comes from data/stops.json and data/route.geojson.
 * Screens: splash (while loading) → intro/home → map, plus All stops and About.
 * Deep links: index.html#stop=<id> skips the intro, zooms to that stop, and opens it; #about opens About.
 */
(function () {
  'use strict';

  var DATA_URL = 'data/stops.json';
  var DESKTOP_QUERY = window.matchMedia('(min-width: 900px)');
  var STOP_ZOOM = 18;
  var SPLASH_MIN_MS = 900;          // splash shows at least this long on the home page (not for deep links)
  var DEFAULT_ICON = 'buildings';   // pin icon when a stop has no "icon"
  var ICON_DIR = 'images/icons/pins/';
  var BUILDING_PAGE_LIMIT = 10;     // max pages fetched from the ArcGIS layer
  var BUILDING_TIMEOUT_MS = 15000;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    header: document.querySelector('.app-header'), splash: $('splash'),
    intro: $('tour-intro'),
    introView: $('intro-view'), introEyebrow: $('intro-eyebrow'), introText: $('intro-text'),
    introCta: $('intro-cta'), introList: $('intro-list'), introAbout: $('intro-about'), introPeople: $('intro-people'),
    homeBtn: $('go-home'), brandHome: $('brand-home'),
    viewMapBtn: $('view-map'), viewListBtn: $('view-list'),
    mapView: $('map-view'), listView: $('list-view'), stopList: $('stop-list'),
    locateBtn: $('locate-btn'), mapHint: $('map-hint'), mapHintText: $('map-hint-text'), mapLegend: $('map-legend'),
    peopleBtn: $('view-people'), peopleView: $('people-view'), peopleList: $('people-list'),
    aboutBtn: $('view-about'), aboutView: $('about-view'), aboutBody: $('about-body'),
    panel: $('panel'), panelBody: $('panel-body'), panelExpand: $('panel-expand'),
    panelExpandLabel: $('panel-expand-label'), panelClose: $('panel-close'), panelTop: document.querySelector('.panel-top'),
    pName: $('panel-name'), pEra: $('panel-era'),
    gallery: $('gallery'), pSummary: $('panel-summary'), pHistory: $('panel-history'),
    peopleSection: $('people-section'), pPeople: $('panel-people'),
    sourcesSection: $('sources-section'), pSources: $('panel-sources'),
    directions: $('directions-link'), prevBtn: $('prev-btn'), nextBtn: $('next-btn'),
    toast: $('toast')
  };

  var state = {
    tour: null,
    stops: [],          // sorted by order
    markers: {},        // id -> L.marker
    current: -1,        // index into stops, -1 = none open
    map: null,
    buildingLayer: null,
    youMarker: null,
    youCircle: null,
    lastFocus: null
  };

  /* ---------------- Utilities ---------------- */

  var toastTimer = null;
  function toast(message, opts) {
    opts = opts || {};
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    if (opts.action) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = opts.action.label;
      b.addEventListener('click', function () { hideToast(); opts.action.run(); });
      els.toast.appendChild(b);
    }
    els.toast.hidden = false;
    toastTimer = setTimeout(hideToast, opts.duration || 6000);
  }
  function hideToast() { els.toast.hidden = true; }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  function paragraphs(history) {
    if (Array.isArray(history)) return history;
    if (typeof history === 'string') return history.split(/\n\s*\n/);
    return [];
  }

  // A stop shows the "PLACEHOLDER CONTENT" badge until its content is verified:
  // set "placeholder": false (or remove it) in stops.json once the stop is ready.
  // Sorts people alphabetically by last name (the last word of their name).
  function byLastName(x, y) {
    var lx = String(x.name || '').trim().split(/\s+/).pop().toLowerCase();
    var ly = String(y.name || '').trim().split(/\s+/).pop().toLowerCase();
    return lx < ly ? -1 : lx > ly ? 1 : String(x.name).localeCompare(String(y.name));
  }

  function isPlaceholder(stop) { return stop.placeholder === true || /placeholder/i.test(stop.title || ''); }

  function setHeaderHeight() {
    var h = els.header.hidden ? 0 : els.header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-h', Math.round(h) + 'px');
  }

  function iconFor(stop) {
    var name = String(stop.icon || DEFAULT_ICON).replace(/[^a-z0-9-]/gi, '');
    return ICON_DIR + name + '.svg';
  }

  /* ---------------- Map ---------------- */

  function initMap() {
    var center = state.tour.center || [state.stops[0].lat, state.stops[0].lng];
    var map = L.map('map', { zoomControl: true }).setView(center, state.tour.zoom || 17);
    state.map = map;

    map.createPane('art');
    map.getPane('art').style.zIndex = 250;       // illustrated map: above the faded streets (200)
    map.createPane('buildings');
    map.getPane('buildings').style.zIndex = 350; // invisible hover targets: below routes (400) and markers (600)
    // Named campus places (data/places.geojson), also invisible: lawns and gardens sit under the
    // buildings, so a building inside McCorkle Place still shows its own name; monuments sit above.
    map.createPane('placeAreas');
    map.getPane('placeAreas').style.zIndex = 340;
    map.createPane('placePoints');
    map.getPane('placePoints').style.zIndex = 360;

    var OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    var bm = state.tour.basemap || {};

    // Surrounding streets: OpenStreetMap, grayed and faded into the illustration's blue (see CSS .faded-streets).
    var streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'faded-streets', opacity: bm.streetsOpacity || 0.38,
      maxNativeZoom: 19, maxZoom: 20, attribution: OSM_CREDIT
    }).addTo(map);

    // The team's illustrated campus map, as pre-built tiles (scripts/build-team-map-tiles.js).
    var art = null;
    if (bm.tiles && bm.bounds) {
      art = L.tileLayer(bm.tiles, {
        pane: 'art', bounds: bm.bounds,
        minZoom: 0, minNativeZoom: bm.minNativeZoom || 14, maxNativeZoom: bm.maxNativeZoom || 18, maxZoom: 20,
        attribution: bm.attribution || ''
      }).addTo(map);
    }
    map.setMaxZoom(20);

    // Bottom-left: scale bar (metres and feet), with a north-pointing compass above it.
    // (Leaflet stacks bottom-corner controls upward, so the scale is added first.)
    L.control.scale({ position: 'bottomleft', maxWidth: 110, metric: true, imperial: true }).addTo(map);
    var Compass = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd: function () {
        var c = L.DomUtil.create('div', 'map-compass');
        c.setAttribute('role', 'img');
        c.setAttribute('aria-label', 'Compass: north is at the top of the map');
        // 48-unit face: the "N" sits inside the ring, above a needle centered on the face.
        c.innerHTML = '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">' +
          '<circle cx="24" cy="24" r="22.5" class="compass-face"/>' +
          '<text x="24" y="14.5" text-anchor="middle" class="compass-n">N</text>' +
          '<path d="M24 17 28 27.5h-8Z" class="compass-north"/>' +
          '<path d="M24 38 20 27.5h8Z" class="compass-south"/>' +
          '<circle cx="24" cy="27.5" r="1.8" class="compass-pin"/>' +
          '</svg>';
        L.DomEvent.disableClickPropagation(c);
        return c;
      }
    });
    new Compass().addTo(map);

    var tileErrors = 0, warned = false;
    function onTileError() {
      tileErrors++;
      if (!warned && tileErrors >= 3) {
        warned = true;
        toast('Map tiles couldn’t load — you may be offline. The list of sites and their stories still work.', {
          duration: 9000,
          action: { label: 'Show list', run: function () { setView('list'); } }
        });
      }
    }
    function onTileLoad() { tileErrors = 0; warned = false; }
    [streets, art].forEach(function (layer) {
      if (layer) layer.on('tileerror', onTileError).on('load', onTileLoad);
    });

    window.addEventListener('offline', function () { toast('You’re offline. Site stories already loaded still work; map tiles and images may not load.'); });
    window.addEventListener('online', function () { toast('Back online.', { duration: 2500 }); });

    // Keep the map sized correctly when the viewport or panel changes.
    window.addEventListener('resize', function () {
      setHeaderHeight();
      map.invalidateSize();
      // Re-fit the overview (e.g. after rotating a phone) unless the visitor has moved the map.
      if (state.current === -1 && !state.viewTouched && state.bounds) fitAllStops();
    });
    map.on('dragstart zoomstart', function () { if (!state.fitting) state.viewTouched = true; });
  }

  function addMarkers() {
    var bounds = [];
    state.stops.forEach(function (stop, i) {
      var icon = L.divIcon({
        className: 'stop-pin-wrap',
        // Upside-down teardrop: the icon sits in the round head; the point marks the exact spot.
        html: '<div class="stop-pin"><span class="pin" aria-hidden="true"></span>' +
              '<img class="pin-icon" src="' + iconFor(stop) + '" alt=""></div>',
        iconSize: [48, 56],
        iconAnchor: [24, 54],     // the tip of the teardrop: head centre (24,24) + 21·√2 ≈ 30px
        tooltipAnchor: [0, -50]
      });
      var m = L.marker([stop.lat, stop.lng], {
        icon: icon,
        siteName: stop.title,   // read by labelMarker (not Leaflet's "title", which adds a slow browser tooltip)
        keyboard: true,
        riseOnHover: true
      }).addTo(state.map);
      // The site's name, shown on hover and on keyboard focus. On phones, tapping opens the preview
      // (which shows the name), so the label is closed straight away there.
      m.bindTooltip(stop.title, { direction: 'top', offset: [0, -2], className: 'site-label' });
      m.on('click', function () { m.closeTooltip(); goToStop(i, { fromMap: true }); });
      m.on('add', labelMarker);
      labelMarker.call(m);
      // Enter / Space opens the stop (don't rely on Leaflet's keypress handling).
      m.getElement().addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); m.closeTooltip(); goToStop(i, { fromMap: true }); }
      });
      m.getElement().addEventListener('focus', function () { m.openTooltip(); });
      m.getElement().addEventListener('blur', function () { m.closeTooltip(); });
      state.markers[stop.id] = m;
      bounds.push([stop.lat, stop.lng]);
    });
    state.bounds = L.latLngBounds(bounds);
  }

  // Fit every stop on screen, leaving room for the map buttons and the Start button.
  function fitAllStops() {
    state.fitting = true;
    state.viewTouched = false;
    state.map.fitBounds(state.bounds, {
      paddingTopLeft: [24, 24], paddingBottomRight: [24, 90],
      maxZoom: state.tour.zoom || 17, animate: false
    });
    state.fitting = false;
  }

  function labelMarker() {
    var node = this.getElement && this.getElement();
    if (!node) return;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', this.options.siteName);
  }

  function getCss(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#2b5c8a';
  }

  /* ---------------- Optional ArcGIS building layer (invisible; info on hover or tap) ---------------- */

  // UNC's building footprints don't line up exactly with the illustrated map, so they are never drawn.
  // They are kept as invisible targets: hovering (desktop) or tapping (phones) a building shows its name.
  function loadBuildings() {
    var cfg = state.tour.buildingLayer;
    var base = cfg && (typeof cfg === 'string' ? cfg : cfg.url);
    if (!base) return;
    base = base.replace(/\/+$/, '').replace(/\/query$/, '');
    var nameField = (cfg && cfg.nameField) || 'name';
    var fields = nameField;

    var features = [];
    function page(offset, n) {
      var url = base + '/query?where=1%3D1&outFields=' + encodeURIComponent(fields) + '&outSR=4326&f=geojson' +
        (offset ? '&resultOffset=' + offset : '');
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = ctrl && setTimeout(function () { ctrl.abort(); }, BUILDING_TIMEOUT_MS);
      return fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (geo) {
        if (geo.error) throw new Error(geo.error.message || 'ArcGIS error');
        var batch = geo.features || [];
        features = features.concat(batch);
        var more = geo.exceededTransferLimit || (geo.properties && geo.properties.exceededTransferLimit);
        if (more && batch.length && n + 1 < BUILDING_PAGE_LIMIT) return page(offset + batch.length, n + 1);
      });
    }

    page(0, 0).then(function () {
      if (!features.length) throw new Error('no features');
      state.buildingLayer = L.geoJSON({ type: 'FeatureCollection', features: features }, {
        pane: 'buildings',
        style: function () { return { stroke: false, fill: true, fillColor: '#000', fillOpacity: 0 }; },
        onEachFeature: function (f, layer) {
          var p = f.properties || {};
          if (!p[nameField]) return;
          var box = el('div', { 'class': 'building-tip' });
          box.appendChild(el('strong', null, String(p[nameField])));
          layer.bindTooltip(box, { sticky: true, direction: 'top', offset: [0, -6] });
          layer.on('click', function (e) { layer.openTooltip(e.latlng); });
        }
      }).addTo(state.map);
    }).catch(function (err) {
      console.warn('Building layer not loaded:', err);  // the map works fine without it
    });
  }

  /* ---------------- Named campus places (invisible; name on hover or tap) ---------------- */

  // data/places.geojson: lawns, plazas, monuments, memorial gardens, the cemetery. Built once by
  // scripts/build-places.js from UNC's and OpenStreetMap's data, then edited by hand.
  function loadPlaces() {
    var url = state.tour.placesLayer;
    if (!url) return;
    fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (geo) {
      var invisible = { stroke: false, fill: true, fillColor: '#000', fillOpacity: 0 };
      function bind(f, layer) {
        var name = f.properties && f.properties.name;
        if (!name) return;
        var box = el('div', { 'class': 'building-tip' });
        box.appendChild(el('strong', null, String(name)));
        layer.bindTooltip(box, { sticky: true, direction: 'top', offset: [0, -6] });
        layer.on('click', function (e) { layer.openTooltip(e.latlng); });
      }
      var isPoint = function (f) { return f.geometry && /Point$/.test(f.geometry.type); };
      var feats = geo.features || [];
      // Areas, largest first, so a small garden inside a big lawn is on top and gets the hover.
      var areas = feats.filter(function (f) { return !isPoint(f); });
      areas.sort(function (a, b) { return roughArea(b) - roughArea(a); });
      L.geoJSON({ type: 'FeatureCollection', features: areas }, {
        pane: 'placeAreas', style: function () { return invisible; }, onEachFeature: bind
      }).addTo(state.map);
      // Monuments and other points: an invisible circle about a fingertip wide.
      L.geoJSON({ type: 'FeatureCollection', features: feats.filter(isPoint) }, {
        pane: 'placePoints',
        pointToLayer: function (f, latlng) { return L.circleMarker(latlng, L.extend({ radius: 12, pane: 'placePoints' }, invisible)); },
        onEachFeature: bind
      }).addTo(state.map);
    }).catch(function (err) {
      console.warn('Places layer not loaded:', err);  // the map works fine without it
    });
  }

  // Size of a polygon's bounding box, for stacking order only.
  function roughArea(f) {
    var b = L.geoJSON(f).getBounds();
    return (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest());
  }

  /* ---------------- Geolocation ---------------- */

  function initLocate() {
    els.locateBtn.addEventListener('click', function () {
      if (!('geolocation' in navigator)) {
        toast('Your browser can’t share your location. You can still explore every site on the map.');
        return;
      }
      if (!window.isSecureContext) {
        toast('Location only works when the map is opened over https.');
        return;
      }
      els.locateBtn.setAttribute('aria-busy', 'true');
      toast('Finding your location…', { duration: 10000 });
      navigator.geolocation.getCurrentPosition(function (pos) {
        els.locateBtn.removeAttribute('aria-busy');
        hideToast();
        var ll = [pos.coords.latitude, pos.coords.longitude];
        var acc = Math.min(pos.coords.accuracy || 30, 500);
        if (!state.youMarker) {
          state.youMarker = L.marker(ll, {
            icon: L.divIcon({ className: '', html: '<div class="you-are-here"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
            keyboard: false, interactive: false, zIndexOffset: 1000
          }).addTo(state.map);
          state.youCircle = L.circle(ll, { radius: acc, color: getCss('--color-map-active'), weight: 1, fillOpacity: 0.1, interactive: false }).addTo(state.map);
        } else {
          state.youMarker.setLatLng(ll);
          state.youCircle.setLatLng(ll).setRadius(acc);
        }
        if (state.bounds && !state.bounds.pad(2).contains(ll)) {
          toast('You appear to be away from campus. Showing your location anyway.');
        }
        setView('map');
        state.map.flyTo(ll, Math.max(state.map.getZoom(), 17), { duration: 0.6 });
      }, function (err) {
        els.locateBtn.removeAttribute('aria-busy');
        var msg = err.code === 1
          ? 'Location permission was denied. That’s OK — you can still explore every site on the map, or allow location in your browser settings to see where you are.'
          : err.code === 3
            ? 'Finding your location took too long. Try again in an open area.'
            : 'Your location isn’t available right now. You can still explore every site on the map.';
        toast(msg, { duration: 9000 });
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
    });
  }

  /* ---------------- List view ---------------- */

  function renderList() {
    if (state.tour.intro) els.intro.textContent = state.tour.intro;
    els.stopList.textContent = '';
    state.stops.forEach(function (stop, i) {
      var li = el('li');
      var btn = el('button', { type: 'button', 'class': 'stop-card' });
      var thumb = el('span', { 'class': 'thumb', 'aria-hidden': 'true' });
      thumb.appendChild(el('img', { src: iconFor(stop), alt: '' }));
      btn.appendChild(thumb);
      var body = el('span');
      body.appendChild(el('span', { 'class': 't' }, stop.title));
      if (stop.era) body.appendChild(el('span', { 'class': 'e' }, stop.era));
      if (stop.summary) body.appendChild(el('span', { 'class': 's' }, stop.summary));
      body.appendChild(el('span', { 'class': 'go' }, 'Open on the map ›'));
      btn.appendChild(body);
      btn.setAttribute('aria-label', stop.title + '. Open on the map.');
      btn.addEventListener('click', function () { setView('map'); goToStop(i); });
      li.appendChild(btn);
      els.stopList.appendChild(li);
    });
  }

  // Views: 'intro' (home), 'map', 'list' (All stops), 'people', 'about'.
  // People and About have their own addresses (#people, #about) so they can be linked to.
  var PAGE_HASHES = { people: '#people', about: '#about' };
  function pageFromHash() {
    for (var k in PAGE_HASHES) if (location.hash === PAGE_HASHES[k]) return k;
    return null;
  }

  function setView(which) {
    var intro = which === 'intro', list = which === 'list', about = which === 'about', people = which === 'people';
    var map = !intro && !list && !about && !people;
    els.introView.hidden = !intro;
    els.listView.hidden = !list;
    els.peopleView.hidden = !people;
    els.aboutView.hidden = !about;
    els.mapView.hidden = !map;
    els.header.hidden = intro;           // the intro screen is full-screen, like the wireframe
    setHeaderHeight();
    els.viewListBtn.setAttribute('aria-pressed', String(list));
    els.viewMapBtn.setAttribute('aria-pressed', String(map));
    els.peopleBtn.setAttribute('aria-pressed', String(people));
    els.aboutBtn.setAttribute('aria-pressed', String(about));
    if (!map) closePanel({ keepHash: false, silent: true });
    if (list) els.listView.scrollTop = 0;
    if (people) els.peopleView.scrollTop = 0;
    if (about) els.aboutView.scrollTop = 0;
    var want = PAGE_HASHES[which];
    if (want) {
      if (location.hash !== want) history.pushState(null, '', want);
    } else if (pageFromHash()) {
      history.pushState(null, '', location.pathname + location.search);
    }
    if (map) setTimeout(function () { state.map.invalidateSize(); if (state.current === -1 && !state.viewTouched) fitAllStops(); }, 0);
    if (intro) els.introCta.focus({ preventScroll: true });
    updateHint();
  }

  // The hint card ("Tap a location…") shows on the map whenever no stop is open.
  function updateHint() {
    var show = !els.mapView.hidden && state.current === -1 && !!els.mapHint.textContent.trim();
    els.mapHint.hidden = !show;
    document.body.classList.toggle('hint-visible', show);
    if (show) document.documentElement.style.setProperty('--hint-h', els.mapHint.offsetHeight + 'px');
  }

  /* ---------------- Intro / home ---------------- */

  function renderIntro() {
    var w = state.tour.welcome || {};
    var a = state.tour.about || {};
    els.introEyebrow.textContent = w.eyebrow || a.tagline || '';
    els.introEyebrow.hidden = !els.introEyebrow.textContent;
    els.introText.textContent = w.text || a.description || '';
    if (w.cta) els.introCta.textContent = w.cta;
    els.mapHintText.textContent = state.tour.mapHint || 'Tap a location on the map to get more details.';
    renderLegend();
  }

  // Map key in the hint card: one entry per icon that's actually used by a stop, in the order of
  // tour.iconLabels (which also gives each icon its display name).
  function renderLegend() {
    var labels = state.tour.iconLabels || {};
    var used = {};
    state.stops.forEach(function (s) { used[String(s.icon || DEFAULT_ICON)] = true; });
    var order = Object.keys(labels).filter(function (k) { return used[k]; })
      .concat(Object.keys(used).filter(function (k) { return !(k in labels); }));
    els.mapLegend.textContent = '';
    order.forEach(function (key) {
      var li = el('li', { 'class': 'legend-item' });
      var swatch = el('span', { 'class': 'legend-pin', 'aria-hidden': 'true' });
      swatch.appendChild(el('img', { src: iconFor({ icon: key }), alt: '' }));
      li.appendChild(swatch);
      li.appendChild(el('span', { 'class': 'legend-label' }, labels[key] || key.charAt(0).toUpperCase() + key.slice(1)));
      els.mapLegend.appendChild(li);
    });
    els.mapLegend.hidden = !order.length;
  }

  /* ---------------- People ---------------- */

  // One person card, used in a stop's "Key people" and on the People page.
  // `sites` (People page only) lists the stops that feature this person, as links that open them.
  function personCard(p, sites) {
    var li = el('li', { 'class': 'person' });
    var photo = el('img', { 'class': 'person-photo', src: p.image || 'images/person-placeholder.svg', alt: p.imageAlt || (p.image ? 'Portrait of ' + p.name : ''), loading: 'lazy' });
    photo.addEventListener('error', function () {
      photo.replaceWith(el('div', { 'class': 'img-fallback', role: 'img', 'aria-label': (p.imageAlt || 'Portrait') + ' (unavailable)' }, 'Image unavailable'));
    });
    li.appendChild(photo);
    var body = el('div');
    body.appendChild(el('p', { 'class': 'person-name' }, p.name));
    if (p.description) body.appendChild(el('p', { 'class': 'person-desc' }, p.description));
    if (p.imageCredit) body.appendChild(el('p', { 'class': 'person-credit' }, 'Credit: ' + p.imageCredit));
    if (p.link) {
      var more = el('a', { 'class': 'person-more', href: p.link, target: '_blank', rel: 'noopener' }, 'Learn more ›');
      more.setAttribute('aria-label', 'Learn more about ' + p.name + ' (opens in a new tab)');
      body.appendChild(more);
    }
    if (sites && sites.length) {
      var at = el('p', { 'class': 'person-sites' });
      at.appendChild(el('span', { 'class': 'person-sites-label' }, 'Featured at: '));
      sites.forEach(function (stop, k) {
        if (k) at.appendChild(document.createTextNode(', '));
        var a = el('a', { href: '#stop=' + encodeURIComponent(stop.id) }, stop.title + ' ›');
        a.setAttribute('aria-label', 'Open ' + stop.title + ' on the map');
        at.appendChild(a);
      });
      body.appendChild(at);
    }
    li.appendChild(body);
    return li;
  }

  // People page: everyone listed under any stop's "people", once each (matched by name),
  // alphabetical by last name, each linked to the site(s) that mention them.
  function renderPeople() {
    var byName = {}, list = [];
    state.stops.forEach(function (stop) {
      (stop.people || []).forEach(function (p) {
        if (!p || !p.name) return;
        var key = p.name.trim().toLowerCase();
        if (!byName[key]) { byName[key] = { person: p, sites: [] }; list.push(byName[key]); }
        if (byName[key].sites.indexOf(stop) === -1) byName[key].sites.push(stop);
      });
    });
    list.sort(function (x, y) { return byLastName(x.person, y.person); });
    els.peopleList.textContent = '';
    list.forEach(function (entry) { els.peopleList.appendChild(personCard(entry.person, entry.sites)); });
    if (!list.length) els.peopleList.appendChild(el('li', { 'class': 'page-intro' }, 'No people have been added to the sites yet.'));
  }

  /* ---------------- About ---------------- */

  function renderAbout() {
    var a = state.tour.about || {};
    var box = els.aboutBody;
    box.textContent = '';
    if (a.tagline) box.appendChild(el('p', { 'class': 'about-tagline' }, a.tagline));
    if (a.description) box.appendChild(el('p', { 'class': 'intro' }, a.description));
    if (a.context || a.prompt) {
      var ctx = el('section', { 'class': 'about-card', 'aria-labelledby': 'about-context' });
      ctx.appendChild(el('h3', { id: 'about-context' }, 'The project'));
      if (a.context) ctx.appendChild(el('p', null, a.context));
      if (a.prompt) {
        var p = el('p');
        p.appendChild(el('strong', null, 'Our team’s prompt: '));
        p.appendChild(document.createTextNode(a.prompt));
        ctx.appendChild(p);
      }
      box.appendChild(ctx);
    }
    function group(id, title, people, note) {
      if (!people || !people.length) return;
      var sec = el('section', { 'class': 'about-group', 'aria-labelledby': id });
      sec.appendChild(el('h3', { id: id }, title));
      if (note) sec.appendChild(el('p', { 'class': 'about-note' }, note));
      var ul = el('ul', { 'class': 'credit-list' });
      people.forEach(function (person) {
        var li = el('li');
        li.appendChild(el('span', { 'class': 'credit-name' }, person.name || String(person)));
        if (person.role) li.appendChild(el('span', { 'class': 'credit-role' }, person.role));
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      box.appendChild(sec);
    }
    // Everyone is listed alphabetically by last name, whatever order they're entered in.
    group('about-team', 'Team', (a.team || []).slice().sort(byLastName));
    group('about-coaches', 'Coaches', (a.coaches || []).slice().sort(byLastName));
    if (a.advisors) group('about-advisors', 'Community advisors', (a.advisors.people || []).slice().sort(byLastName), a.advisors.description);
    if ((a.credits && a.credits.length) || (a.links && a.links.length)) {
      var cr = el('section', { 'class': 'about-group', 'aria-labelledby': 'about-credits' });
      cr.appendChild(el('h3', { id: 'about-credits' }, 'Credits'));
      var ul = el('ul', { 'class': 'about-credits' });
      (a.credits || []).forEach(function (c) { ul.appendChild(el('li', null, c)); });
      (a.links || []).forEach(function (l) {
        var li = el('li');
        li.appendChild(el('a', { href: l.url, target: '_blank', rel: 'noopener' }, l.title || l.url));
        ul.appendChild(li);
      });
      cr.appendChild(ul);
      box.appendChild(cr);
    }
  }

  /* ---------------- Stop panel ---------------- */

  function renderGallery(stop) {
    var g = els.gallery;
    g.textContent = '';
    var imgs = stop.images || [];
    if (!imgs.length) { g.hidden = true; return; }
    g.hidden = false;

    var track = el('div', {
      'class': 'gallery-track', tabindex: '0', role: 'region',
      'aria-roledescription': 'carousel', 'aria-label': 'Images for ' + stop.title + '. Swipe or use arrow keys.'
    });
    imgs.forEach(function (im, i) {
      var fig = el('figure', { 'aria-label': 'Image ' + (i + 1) + ' of ' + imgs.length });
      var img = el('img', { 'class': 'gallery-img', src: im.src, alt: im.alt || '', loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' });
      img.addEventListener('error', function () {
        var fb = el('div', { 'class': 'img-fallback', role: 'img', 'aria-label': (im.alt || 'Image') + ' (unavailable)' },
          'Image couldn’t load — you may be offline.');
        img.replaceWith(fb);
      });
      fig.appendChild(img);
      if (im.caption || im.credit) {
        var cap = el('figcaption', null, im.caption || '');
        if (im.credit) cap.appendChild(el('span', { 'class': 'credit' }, 'Credit: ' + im.credit));
        fig.appendChild(cap);
      }
      track.appendChild(fig);
    });
    g.appendChild(track);

    if (imgs.length < 2) return;
    var controls = el('div', { 'class': 'gallery-controls' });
    var prev = el('button', { type: 'button', 'aria-label': 'Previous image' }, '‹');
    var count = el('span', { 'class': 'gallery-count', 'aria-live': 'polite' });
    var next = el('button', { type: 'button', 'aria-label': 'Next image' }, '›');
    controls.appendChild(prev); controls.appendChild(count); controls.appendChild(next);
    g.appendChild(controls);

    function idx() { return Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)); }
    function update() {
      var i = idx();
      count.textContent = (i + 1) + ' / ' + imgs.length;
      prev.disabled = i <= 0;
      next.disabled = i >= imgs.length - 1;
    }
    function go(d) { track.scrollTo({ left: (idx() + d) * track.clientWidth }); }
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    });
    var t; track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    update();
  }

  function directionsUrl(stop) {
    var dest = stop.lat + ',' + stop.lng;
    var ua = navigator.userAgent || '';
    var apple = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    return apple
      ? 'https://maps.apple.com/?daddr=' + dest + '&dirflg=w'
      : 'https://www.google.com/maps/dir/?api=1&destination=' + dest + '&travelmode=walking';
  }

  function renderStop(i) {
    var stop = state.stops[i];
    var total = state.stops.length;

    els.pName.textContent = stop.title;
    els.pEra.textContent = stop.era || '';
    els.pEra.hidden = !stop.era;

    renderGallery(stop);

    els.pSummary.textContent = stop.summary || '';
    els.pHistory.textContent = '';
    if (isPlaceholder(stop)) els.pHistory.appendChild(el('span', { 'class': 'placeholder-flag' }, 'PLACEHOLDER CONTENT'));
    paragraphs(stop.history).forEach(function (p) {
      if (p && p.trim()) els.pHistory.appendChild(el('p', null, p.trim()));
    });

    els.pPeople.textContent = '';
    (stop.people || []).forEach(function (p) { els.pPeople.appendChild(personCard(p)); });
    els.peopleSection.hidden = !(stop.people && stop.people.length);

    els.pSources.textContent = '';
    (stop.sources || []).forEach(function (s) {
      var li = el('li');
      if (typeof s === 'string') s = { title: s };
      if (s.url) {
        var a = el('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title || s.url);
        li.appendChild(a);
      } else {
        li.textContent = s.title || '';
      }
      if (s.note) li.appendChild(document.createTextNode(' — ' + s.note));
      els.pSources.appendChild(li);
    });
    els.sourcesSection.hidden = !(stop.sources && stop.sources.length);

    // Previous / Next browse between sites (wrapping around); the sites aren't a set sequence.
    var prev = state.stops[(i - 1 + total) % total], next = state.stops[(i + 1) % total];
    var single = total < 2;
    els.prevBtn.disabled = els.nextBtn.disabled = single;
    els.prevBtn.setAttribute('aria-label', 'Previous site: ' + prev.title);
    els.nextBtn.setAttribute('aria-label', 'Next site: ' + next.title);
    els.directions.textContent = 'Get walking directions here';
    els.directions.href = directionsUrl(stop);
    els.directions.setAttribute('aria-label', 'Get walking directions to ' + stop.title + ' (opens your map app)');

    els.panelBody.scrollTop = 0;

    Object.keys(state.markers).forEach(function (id) {
      var node = state.markers[id].getElement();
      if (node) node.classList.toggle('is-active', id === stop.id);
    });
  }

  // Center a stop in the visible part of the map (above the sheet / left of the side panel).
  function flyToStop(stop) {
    var map = state.map;
    var zoom = Math.max(map.getZoom(), STOP_ZOOM);
    var size = map.getSize();
    var offset;
    if (DESKTOP_QUERY.matches) {
      offset = L.point(els.panel.offsetWidth / 2, 0);
    } else {
      var sheet = els.panel.classList.contains('is-expanded') ? 0 : els.panel.offsetHeight;
      offset = L.point(0, Math.min(sheet, size.y * 0.7) / 2);
    }
    var pt = map.project([stop.lat, stop.lng], zoom).add(offset);
    map.flyTo(map.unproject(pt, zoom), zoom, { duration: 0.6 });
  }

  function goToStop(i, opts) {
    opts = opts || {};
    if (i < 0 || i >= state.stops.length) return;
    var stop = state.stops[i];
    var hash = '#stop=' + encodeURIComponent(stop.id);
    if (location.hash !== hash && !opts.fromHash) {
      history.pushState(null, '', hash);
    }
    openPanel(i, { expand: !!opts.expand });
    flyToStop(stop);
  }

  // On phones a stop opens as a short preview (title and era); tap it or swipe up for the full story.
  function setExpanded(exp) {
    els.panel.classList.toggle('is-expanded', exp);
    document.body.classList.toggle('panel-expanded', exp && !els.panel.hidden);
    els.panelExpand.setAttribute('aria-expanded', String(exp));
    els.panelExpandLabel.textContent = exp ? 'Show less' : 'Show the full story';
    syncPanelHeight();
  }

  function syncPanelHeight() {
    var h = els.panel.hidden || DESKTOP_QUERY.matches ? 0 : els.panel.offsetHeight;
    document.documentElement.style.setProperty('--panel-h', h + 'px');
  }

  function openPanel(i, opts) {
    opts = opts || {};
    var wasOpen = !els.panel.hidden;
    if (!wasOpen) state.lastFocus = document.activeElement;
    state.current = i;
    renderStop(i);
    els.panel.hidden = false;
    if (!wasOpen) setExpanded(!!opts.expand);
    document.body.classList.add('panel-open');
    syncPanelHeight();
    updateHint();
    state.map.invalidateSize();
    if (!wasOpen) (DESKTOP_QUERY.matches ? els.panelBody : els.panelExpand).focus({ preventScroll: true });
  }

  function closePanel(opts) {
    opts = opts || {};
    if (els.panel.hidden) return;
    els.panel.hidden = true;
    setExpanded(false);
    document.body.classList.remove('panel-open');
    Object.keys(state.markers).forEach(function (id) {
      var node = state.markers[id].getElement();
      if (node) node.classList.remove('is-active');
    });
    var closedStop = state.stops[state.current];
    state.current = -1;
    updateHint();
    if (!opts.keepHash && location.hash) {
      history.pushState(null, '', location.pathname + location.search);
    }
    state.map.invalidateSize();
    if (!opts.silent) {
      var m = closedStop && state.markers[closedStop.id];
      var target = (m && m.getElement()) || state.lastFocus;
      if (target && target.focus) target.focus();
    }
  }

  function initPanel() {
    els.panelClose.addEventListener('click', function () { closePanel(); });
    els.prevBtn.addEventListener('click', function () { goToStop((state.current - 1 + state.stops.length) % state.stops.length); });
    els.nextBtn.addEventListener('click', function () { goToStop((state.current + 1) % state.stops.length); });
    els.panelExpand.addEventListener('click', function (e) {
      e.stopPropagation();
      setExpanded(!els.panel.classList.contains('is-expanded'));
      if (state.current >= 0) setTimeout(function () { flyToStop(state.stops[state.current]); }, 60);
    });
    // Tapping anywhere on the preview (not the close button) opens the full story.
    els.panelTop.addEventListener('click', function (e) {
      if (DESKTOP_QUERY.matches || els.panel.classList.contains('is-expanded')) return;
      if (e.target.closest('#panel-close')) return;
      setExpanded(true);
    });
    if ('ResizeObserver' in window) new ResizeObserver(syncPanelHeight).observe(els.panel);
    // Keep the compass and scale clear of the hint card if its height changes (fonts loading, text wrapping).
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      if (!els.mapHint.hidden) document.documentElement.style.setProperty('--hint-h', els.mapHint.offsetHeight + 'px');
    }).observe(els.mapHint);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateHint);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.panel.hidden) closePanel();
    });
    // Swipe up/down on the handle area to expand/collapse the sheet.
    var startY = null;
    els.panel.querySelector('.panel-top').addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; }, { passive: true });
    els.panel.querySelector('.panel-top').addEventListener('touchend', function (e) {
      if (startY == null) return;
      var dy = e.changedTouches[0].clientY - startY;
      startY = null;
      var exp = els.panel.classList.contains('is-expanded');
      if (dy < -40 && !exp) setExpanded(true);
      else if (dy > 40 && exp) setExpanded(false);
      else if (dy > 40 && !exp) closePanel();
    });
  }

  /* ---------------- Deep links ---------------- */

  function stopIdFromHash() {
    var m = /(?:^#|&)stop=([^&]+)/.exec(location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function handleHash() {
    var page = pageFromHash();
    if (page) { if (els[page + 'View'].hidden) setView(page); return; }
    if (!els.aboutView.hidden || !els.peopleView.hidden || !els.introView.hidden) setView('map');
    var id = stopIdFromHash();
    if (!id) { closePanel({ keepHash: true, silent: true }); return; }
    var i = state.stops.findIndex(function (s) { return s.id === id; });
    if (i === -1) {
      toast('That site wasn’t found. Here are all the sites instead.');
      setView('list');
      return;
    }
    if (els.mapView.hidden) setView('map');
    // Arriving from a link or QR code: open the full story straight away.
    goToStop(i, { fromHash: true, expand: true });
  }

  /* ---------------- Boot ---------------- */

  // Fade the splash out, then remove it entirely (even if the browser never finishes the fade).
  function hideSplash() {
    document.body.classList.remove('is-loading');
    setTimeout(function () { els.splash.hidden = true; }, 600);
  }

  function fail(msg, opts) {
    hideSplash();
    els.header.hidden = false;
    var main = document.getElementById('main');
    main.textContent = '';
    var box = el('div', { 'class': 'list-inner', role: 'alert' });
    box.appendChild(el('h2', null, 'The map couldn’t load'));
    box.appendChild(el('p', null, msg));
    if (opts && opts.reload) {
      var btn = el('button', { type: 'button', 'class': 'nav-btn primary' }, 'Reload');
      btn.addEventListener('click', function () { location.reload(); });
      box.appendChild(btn);
    }
    main.appendChild(box);
  }

  function boot() {
    var started = Date.now();
    var deepLink = /stop=|#about|#people/.test(location.hash);

    if (typeof L === 'undefined') { fail('The map library didn’t load. Please check your connection and reload.'); return; }

    var dataLoaded = false;
    fetch(DATA_URL, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      state.tour = data.tour || {};
      state.stops = (data.stops || []).slice().sort(function (a, b) { return a.order - b.order; });
      if (!state.stops.length) throw new Error('No stops in data/stops.json');
      dataLoaded = true;

      if (state.tour.title) document.title = state.tour.title + ' — A Digital Map';
      renderIntro();

      initMap();
      addMarkers();
      optional(loadBuildings, 'Building layer');
      optional(loadPlaces, 'Places layer');
      initLocate();
      initPanel();
      renderList();
      optional(renderPeople, 'People page');
      optional(renderAbout, 'About page');

      els.viewMapBtn.addEventListener('click', function () { setView('map'); });
      els.viewListBtn.addEventListener('click', function () { setView(els.listView.hidden ? 'list' : 'map'); });
      els.peopleBtn.addEventListener('click', function () { setView(els.peopleView.hidden ? 'people' : 'map'); });
      els.aboutBtn.addEventListener('click', function () { setView(els.aboutView.hidden ? 'about' : 'map'); });
      els.homeBtn.addEventListener('click', function () { setView('intro'); });
      els.brandHome.addEventListener('click', function () { setView('intro'); });
      els.introCta.addEventListener('click', function () { setView('map'); });
      els.introList.addEventListener('click', function () { setView('list'); });
      els.introPeople.addEventListener('click', function () { setView('people'); });
      els.introAbout.addEventListener('click', function () { setView('about'); });
      window.addEventListener('hashchange', handleHash);

      // Deep links (QR codes, shared links) go straight to their stop; the home page starts at the intro.
      if (pageFromHash()) setView(pageFromHash());
      else if (stopIdFromHash()) { setView('map'); handleHash(); }
      else setView('intro');

      // Fade out the splash once everything is ready (briefly held on the home page so it reads as a splash).
      setTimeout(hideSplash, deepLink ? 0 : Math.max(0, SPLASH_MIN_MS - (Date.now() - started)));
    }).catch(function (err) {
      console.error(err);
      if (dataLoaded) {
        // The data arrived but starting the map failed — most often a page and a script from
        // different versions of the site cached together. A fresh reload fixes it.
        fail('Something went wrong starting the map. Please reload the page.', { reload: true });
      } else {
        fail('We couldn’t load the map’s data (data/stops.json). Check your connection and reload. If you opened this file directly from your computer, run it from a local web server instead — see the README.', { reload: true });
      }
    });
  }

  // Runs an optional feature so that, if it breaks, the rest of the map still works.
  function optional(fn, name) {
    try { fn(); } catch (e) { console.warn(name + ' failed:', e); }
  }

  boot();
})();
