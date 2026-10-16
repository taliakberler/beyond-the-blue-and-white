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
  var GLIDE_S = 1.0;                // seconds for the map's automatic zooms (opening and closing a site)
  var DEFAULT_ZOOM_OUT = 0.5;       // the starting view is this much further out than "just fits every site"
  var SPLASH_MIN_MS = 900;          // splash shows at least this long on the home page (not for deep links)
  // The team's opening animation: a portrait version for phones and a 16:9 version for wider
  // screens. Each pauses at holdAt (seconds), with the logo and every name still on screen, and
  // waits for "Tap to continue". (Measured: the names start fading at about 12.5 s in the portrait
  // version and 13.5 s in the wide one.)
  var SPLASH_VIDEOS = {
    tall: { src: 'media/splash.mp4', holdAt: 12.2 },
    wide: { src: 'media/splash-wide.mp4', holdAt: 13.2 }
  };
  var SPLASH_VIDEO_START_MS = 2500;  // if the video hasn't started by then (autoplay blocked), show the still logo
  var SPLASH_VIDEO_MAX_MS = 20000;   // if the video stalls before the hold point, show "Tap to continue" anyway
  var DEFAULT_ICON = 'buildings';   // pin icon when a stop has no "icon"
  var ICON_DIR = 'images/icons/pins/';
  var BUILDING_PAGE_LIMIT = 10;     // max pages fetched from the ArcGIS layer
  var BUILDING_TIMEOUT_MS = 15000;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    header: document.querySelector('.app-header'), splash: $('splash'),
    intro: $('tour-intro'),
    introView: $('intro-view'), introEyebrow: $('intro-eyebrow'), introText: $('intro-text'),
    introCta: $('intro-cta'),
    menuBtn: $('menu-btn'), navMenu: $('nav-menu'), brandHome: $('brand-home'),
    viewMapBtn: $('view-map'), viewListBtn: $('view-list'),
    mapView: $('map-view'), listView: $('list-view'), stopList: $('stop-list'),
    locateBtn: $('locate-btn'), mapHint: $('map-hint'), mapHintText: $('map-hint-text'), mapLegend: $('map-legend'),
    peopleBtn: $('view-people'), peopleView: $('people-view'), peopleList: $('people-list'),
    aboutBtn: $('view-about'), aboutView: $('about-view'), aboutBody: $('about-body'),
    panel: $('panel'), panelBody: $('panel-body'), panelExpand: $('panel-expand'),
    panelExpandLabel: $('panel-expand-label'), panelClose: $('panel-close'), panelTop: document.querySelector('.panel-top'),
    pName: $('panel-name'), pEra: $('panel-era'), peekHero: $('peek-hero'),
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
  // A person's optional "sortName" overrides this (e.g. for a card naming several people).
  function byLastName(x, y) {
    var key = function (p) { return String(p.sortName || String(p.name || '').trim().split(/\s+/).pop()).toLowerCase(); };
    var lx = key(x), ly = key(y);
    return lx < ly ? -1 : lx > ly ? 1 : String(x.name).localeCompare(String(y.name));
  }

  // Moves focus where it's needed (for keyboard and screen-reader users) without showing a focus
  // ring to someone using a mouse or touch; browsers would otherwise show one for script-moved focus.
  var usingKeyboard = false;
  document.addEventListener('keydown', function (e) { if (!e.metaKey && !e.ctrlKey) usingKeyboard = true; }, true);
  document.addEventListener('pointerdown', function () { usingKeyboard = false; }, true);
  function moveFocus(node) {
    if (!node || !node.focus) return;
    if (!usingKeyboard) {
      node.classList.add('quiet-focus');
      node.addEventListener('blur', function () { node.classList.remove('quiet-focus'); }, { once: true });
    }
    node.focus({ preventScroll: true, focusVisible: usingKeyboard });
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

  // OpenStreetMap tiles turned gray once, as each one loads. (A CSS filter on the layer looked the
  // same, but Firefox recomputes it on every frame of a zoom, which made the map's glides stutter:
  // about 17 frames a second instead of 45 in testing.) The numbers match the old filter:
  // grayscale(1) contrast(0.85) brightness(1.08).
  var GrayTileLayer = L.TileLayer.extend({
    createTile: function (coords, done) {
      var size = this.getTileSize();
      var canvas = document.createElement('canvas');
      canvas.width = size.x; canvas.height = size.y;
      var img = new Image();
      img.crossOrigin = 'anonymous';           // OpenStreetMap allows this, so the pixels can be read
      img.onload = function () {
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size.x, size.y);
        try {
          var data = ctx.getImageData(0, 0, size.x, size.y), p = data.data;
          for (var i = 0; i < p.length; i += 4) {
            var v = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];   // grayscale
            v = ((v - 127.5) * 0.85 + 127.5) * 1.08;                          // contrast, brightness
            p[i] = p[i + 1] = p[i + 2] = v < 0 ? 0 : v > 255 ? 255 : v;
          }
          ctx.putImageData(data, 0, 0);
        } catch (e) { /* pixels unreadable: the tile stays in color */ }
        done(null, canvas);
      };
      img.onerror = function (e) { done(e, canvas); };
      img.src = this.getTileUrl(coords);
      return canvas;
    }
  });

  function initMap() {
    var center = state.tour.center || [state.stops[0].lat, state.stops[0].lng];
    var map = L.map('map', { zoomControl: true }).setView(center, state.tour.zoom || 17);
    state.map = map;
    // From the in-between default zoom (see defaultView), + and − go to the next whole level.
    var zoomIn = map.zoomIn, zoomOut = map.zoomOut;
    map.zoomIn = function (d, o) { var z = this.getZoom(); return z % 1 ? this.setZoom(Math.ceil(z), o) : zoomIn.call(this, d, o); };
    map.zoomOut = function (d, o) { var z = this.getZoom(); return z % 1 ? this.setZoom(Math.floor(z), o) : zoomOut.call(this, d, o); };

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

    // Surrounding streets: OpenStreetMap, grayed and faded into the illustration's blue.
    var streets = new GrayTileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'faded-streets', opacity: bm.streetsOpacity || 0.38,
      maxNativeZoom: 19, maxZoom: 20, attribution: OSM_CREDIT,
      updateWhenZooming: false   // during a glide, scale the tiles already shown; load sharp ones on arrival
    }).addTo(map);

    // The team's illustrated campus map, as pre-built tiles (scripts/build-team-map-tiles.js).
    var art = null;
    if (bm.tiles && bm.bounds) {
      art = L.tileLayer(bm.tiles, {
        pane: 'art', bounds: bm.bounds,
        minZoom: 0, minNativeZoom: bm.minNativeZoom || 14, maxNativeZoom: bm.maxNativeZoom || 18, maxZoom: 20,
        updateWhenZooming: false,
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
      m.getElement().addEventListener('focus', function () { if (m.getElement().classList.contains('quiet-focus')) setTimeout(function () { m.closeTooltip(); }, 0); else m.openTooltip(); });
      m.getElement().addEventListener('blur', function () { m.closeTooltip(); });
      state.markers[stop.id] = m;
      bounds.push([stop.lat, stop.lng]);
    });
    state.bounds = L.latLngBounds(bounds);
  }

  // The default view: every site on screen (clear of the map buttons and hint card), then zoomed
  // out a little further so there's some campus around them.
  function defaultView() {
    var map = state.map;
    var tl = L.point(24, 24), br = L.point(24, 90);
    var zoom = Math.min(map.getBoundsZoom(state.bounds, false, tl.add(br)), state.tour.zoom || 17) - DEFAULT_ZOOM_OUT;
    zoom = Math.round(zoom / 0.25) * 0.25;
    // Centre the sites in the space left by the uneven padding.
    var a = map.project(state.bounds.getNorthWest(), zoom), b = map.project(state.bounds.getSouthEast(), zoom);
    var mid = a.add(b).divideBy(2).add(br.subtract(tl).divideBy(2));
    return { center: map.unproject(mid, zoom), zoom: zoom };
  }

  // The default view uses an in-between zoom (e.g. 16.5). Leaflet only allows those while zoomSnap
  // is fine, so it's lowered just for this; zooming by hand afterwards snaps to whole levels again,
  // because the illustration shows faint tile seams at in-between zooms past its sharpest level.
  function withFineZoom(fn) {
    state.map.options.zoomSnap = 0.25;
    try { fn(); } finally { state.map.options.zoomSnap = 1; }
  }

  function fitAllStops() {
    state.fitting = true;
    state.viewTouched = false;
    withFineZoom(function () { var v = defaultView(); state.map.setView(v.center, v.zoom, { animate: false }); });
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

  // Phones: the header's links live in a drop-down opened by the menu button (on desktop they're
  // always shown and the button is hidden by CSS). Choosing a link, tapping outside, or Escape closes it.
  function setMenu(open) {
    els.navMenu.classList.toggle('is-open', open);
    els.menuBtn.setAttribute('aria-expanded', String(open));
    els.menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  }
  function initMenu() {
    els.menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !els.navMenu.classList.contains('is-open');
      setMenu(open);
      if (open) moveFocus(els.navMenu.querySelector('[aria-pressed="true"]') || els.navMenu.querySelector('button'));
    });
    els.navMenu.addEventListener('click', function (e) { if (e.target.closest('button')) setMenu(false); });
    document.addEventListener('click', function (e) {
      if (els.navMenu.classList.contains('is-open') && !e.target.closest('.header-nav')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.navMenu.classList.contains('is-open')) { setMenu(false); moveFocus(els.menuBtn); }
    });
  }

  // "Explore the map": the landing page swipes up and away, revealing the map underneath.
  var INTRO_LEAVE_MS = 650;
  function leaveIntro() {
    var intro = els.introView;
    intro.classList.add('is-leaving');        // fixed over everything, still in place…
    setView('map', { keepIntro: true });
    void intro.offsetHeight;                   // (apply that before animating)
    intro.classList.add('is-gone');           // …then slide up off the screen
    setTimeout(function () {
      if (!intro.classList.contains('is-leaving')) return;   // came back to it meanwhile
      intro.classList.remove('is-leaving', 'is-gone');
      intro.hidden = true;
    }, INTRO_LEAVE_MS);
  }

  // Views: 'intro' (home), 'map', 'list' (All stops), 'people', 'about'.
  // People and About have their own addresses (#people, #about) so they can be linked to.
  var PAGE_HASHES = { people: '#people', about: '#about' };
  function pageFromHash() {
    for (var k in PAGE_HASHES) if (location.hash === PAGE_HASHES[k]) return k;
    return null;
  }

  function setView(which, opts) {
    opts = opts || {};
    var intro = which === 'intro', list = which === 'list', about = which === 'about', people = which === 'people';
    var map = !intro && !list && !about && !people;
    setMenu(false);
    els.introView.hidden = !intro && !opts.keepIntro;
    if (intro) els.introView.classList.remove('is-leaving', 'is-gone');
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
    if (!map) closePanel({ keepHash: false, silent: true, noZoom: true });
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
    if (intro) moveFocus(els.introCta);
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
    // Without an "image", the card shows the placeholder person icon (decorative, so no alt text).
    var li = el('li', { 'class': 'person' });
    var photo = el('img', { 'class': 'person-photo', src: p.image || 'images/person-placeholder.svg', alt: p.image ? (p.imageAlt || 'Portrait of ' + p.name) : '', loading: 'lazy' });
    photo.addEventListener('error', function () {
      photo.replaceWith(el('div', { 'class': 'img-fallback', role: 'img', 'aria-label': (p.imageAlt || 'Portrait') + ' (unavailable)' }, 'Image unavailable'));
    });
    li.appendChild(photo);
    var body = el('div');
    body.appendChild(el('p', { 'class': 'person-name' }, p.name));
    if (p.role) body.appendChild(el('p', { 'class': 'person-role' }, p.role));
    // "description" is one paragraph, or a list of paragraphs.
    [].concat(p.description || []).forEach(function (para) {
      if (para && String(para).trim()) body.appendChild(el('p', { 'class': 'person-desc' }, String(para).trim()));
    });
    if (p.imageCredit && p.image) body.appendChild(el('p', { 'class': 'person-credit' }, 'Credit: ' + p.imageCredit));
    if (p.link) {
      var more = el('a', { 'class': 'person-more', href: p.link, target: '_blank', rel: 'noopener' }, (p.linkLabel || 'Learn more') + ' ›');
      more.setAttribute('aria-label', (p.linkLabel || 'Learn more about ' + p.name) + ' (opens in a new tab)');
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
      // Sky-blue name cards: name, role (once set), and any LinkedIn / portfolio links.
      var ul = el('ul', { 'class': 'credit-list' });
      people.forEach(function (person) {
        var name = person.name || String(person);
        var li = el('li');
        var card = el('div', { 'class': 'credit-card' });
        card.appendChild(el('span', { 'class': 'credit-name' }, name));
        if (person.role) card.appendChild(el('span', { 'class': 'credit-role' }, person.role));
        var links = [['LinkedIn', person.linkedin], ['Portfolio', person.portfolio]].filter(function (l) { return l[1]; });
        if (links.length) {
          var row = el('span', { 'class': 'credit-links' });
          links.forEach(function (l) {
            var a = el('a', { 'class': 'credit-link', href: l[1], target: '_blank', rel: 'noopener' }, l[0] + ' ↗');
            a.setAttribute('aria-label', name + ' — ' + l[0] + ' (opens in a new tab)');
            row.appendChild(a);
          });
          card.appendChild(row);
        }
        li.appendChild(card);
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
    var hero = (stop.images || [])[0];
    els.peekHero.hidden = !hero;
    if (hero) els.peekHero.querySelector('img').src = hero.src;

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
      var visible = els.panel.classList.contains('is-expanded') ? 0 : previewHeight();
      offset = L.point(0, Math.min(visible, size.y * 0.7) / 2);
    }
    var pt = map.project([stop.lat, stop.lng], zoom).add(offset);
    map.flyTo(map.unproject(pt, zoom), zoom, { duration: GLIDE_S });
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

  /* The site sheet. On phones it's a bottom sheet the full height of the screen below the header,
     moved up and down with a transform: "preview" shows just the top (name and era), "expanded"
     shows the whole story. It slides up when a site opens, follows the finger when dragged, and
     snaps to preview, expanded, or closed on release. On desktop it's a fixed side panel. */
  var SHEET_ANIM_MS = 320;
  var sheet = { y: null, hideTimer: null };

  function isPhoneSheet() { return !DESKTOP_QUERY.matches; }
  function sheetHeight() { return els.panel.offsetHeight; }
  function previewHeight() { return els.panelTop.offsetHeight; }
  // Where the sheet's top edge rests (in px from the top of the sheet's full-height position).
  function restingY() { return els.panel.classList.contains('is-expanded') ? 0 : Math.max(0, sheetHeight() - previewHeight()); }

  function setSheetY(y, animate) {
    sheet.y = y;
    els.panel.classList.toggle('is-dragging', !animate);
    els.panel.style.transform = isPhoneSheet() ? 'translateY(' + Math.round(y) + 'px)' : '';
    syncPanelHeight();
  }

  function setExpanded(exp) {
    els.panel.classList.toggle('is-expanded', exp);
    document.body.classList.toggle('panel-expanded', exp && !els.panel.hidden);
    els.panelExpand.setAttribute('aria-expanded', String(exp));
    els.panelExpandLabel.textContent = exp ? 'Show less' : 'Show the full story';
    // In preview the story is below the screen edge: keep it out of the tab order and screen readers.
    els.panelBody.inert = !exp && isPhoneSheet();
    // The blinking arrow shows whenever a site is in the peek view, inviting a swipe up.
    els.panel.classList.toggle('show-swipe-hint', !exp);
    if (!els.panel.hidden) setSheetY(restingY(), true);
  }

  // --panel-h: how much of the sheet is on screen (keeps the compass and scale above it).
  function syncPanelHeight() {
    var h = 0;
    if (!els.panel.hidden && isPhoneSheet()) h = Math.max(0, sheetHeight() - (sheet.y == null ? restingY() : sheet.y));
    document.documentElement.style.setProperty('--panel-h', h + 'px');
  }

  function openPanel(i, opts) {
    opts = opts || {};
    var wasOpen = !els.panel.hidden && !els.panel.classList.contains('is-closing');
    if (!wasOpen && els.panel.hidden) state.lastFocus = document.activeElement;
    clearTimeout(sheet.hideTimer);
    els.panel.classList.remove('is-closing');
    state.current = i;
    renderStop(i);
    if (els.panel.hidden) {
      els.panel.hidden = false;
      setSheetY(sheetHeight(), false);   // start just below the screen…
      void els.panel.offsetHeight;        // (apply that before animating)
    }
    document.body.classList.add('panel-open');
    if (!wasOpen) setExpanded(!!opts.expand);   // …then slide up into place
    else syncPanelHeight();
    updateHint();
    state.map.invalidateSize();
    if (!wasOpen) moveFocus(DESKTOP_QUERY.matches ? els.panelBody : els.panelExpand);
  }

  // opts.keepHash: leave the address alone; opts.silent: don't move focus;
  // opts.noZoom: don't zoom the map back out (used when switching to another page).
  function closePanel(opts) {
    opts = opts || {};
    if (els.panel.hidden || els.panel.classList.contains('is-closing')) return;
    var finish = function () {
      els.panel.hidden = true;
      els.panel.classList.remove('is-closing');
      setExpanded(false);
      syncPanelHeight();
    };
    document.body.classList.remove('panel-open', 'panel-expanded');
    if (isPhoneSheet() && !opts.noZoom) {
      els.panel.classList.add('is-closing');
      setSheetY(sheetHeight(), true);       // slide down, then hide
      sheet.hideTimer = setTimeout(finish, SHEET_ANIM_MS);
    } else {
      finish();
    }
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
    if (!opts.noZoom) zoomToAllSites();
    if (!opts.silent) {
      var m = closedStop && state.markers[closedStop.id];
      moveFocus((m && m.getElement()) || state.lastFocus);
      // Leaflet shows a pin's name when it gets focus; only keyboard users need that here.
      if (m && !usingKeyboard) m.closeTooltip();
    }
  }

  // Back to the default view of every site, with the same glide as opening one.
  function zoomToAllSites() {
    if (!state.bounds || els.mapView.hidden) return;
    state.fitting = true;
    state.viewTouched = false;
    withFineZoom(function () { var v = defaultView(); state.map.flyTo(v.center, v.zoom, { duration: GLIDE_S }); });
    state.fitting = false;
  }

  // Dragging the sheet: from its top (handle, name) at any time, and from the story itself when
  // it's scrolled to the top and pulled down (like a phone's own sheets).
  function initSheetDrag() {
    var drag = null, suppressClick = false;

    function start(y0) {
      drag = { startY: y0, sheetY0: sheet.y == null ? restingY() : sheet.y, lastY: y0, lastT: Date.now(), v: 0, moved: false };
    }
    function move(y) {
      if (!drag) return;
      var dy = y - drag.startY;
      if (!drag.moved && Math.abs(dy) < 6) return;
      drag.moved = true;
      var now = Date.now(), dt = Math.max(1, now - drag.lastT);
      drag.v = 0.8 * ((y - drag.lastY) / dt) + 0.2 * drag.v;   // px per ms, smoothed; positive = down
      drag.lastY = y; drag.lastT = now;
      setSheetY(Math.min(sheetHeight(), Math.max(0, drag.sheetY0 + dy)), false);
    }
    function end() {
      if (!drag) return;
      var d = drag; drag = null;
      if (!d.moved) return;                 // a tap: the click handlers deal with it
      suppressClick = true; setTimeout(function () { suppressClick = false; }, 0);
      var H = sheetHeight(), previewY = Math.max(0, H - previewHeight()), y = sheet.y;
      var target;
      if (d.v > 0.6) target = y < previewY - 40 ? 'preview' : 'close';        // flick down
      else if (d.v < -0.6) target = 'expanded';                                 // flick up
      else if (y > previewY + previewHeight() * 0.5) target = 'close';
      else target = y < previewY / 2 ? 'expanded' : 'preview';
      if (target === 'close') { closePanel(); return; }
      var exp = target === 'expanded', changed = exp !== els.panel.classList.contains('is-expanded');
      setExpanded(exp);                     // animates to the resting position
      if (changed && state.current >= 0) setTimeout(function () { flyToStop(state.stops[state.current]); }, SHEET_ANIM_MS);
    }

    // The top of the sheet: pointer events (touch, pen, or mouse).
    els.panelTop.addEventListener('pointerdown', function (e) {
      if (!isPhoneSheet() || e.target.closest('#panel-close') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      start(e.clientY);
    });
    els.panelTop.addEventListener('pointermove', function (e) {
      move(e.clientY);
      // Capture the pointer only once it's really dragging. Capturing on touch-down would send a
      // plain tap's click to the sheet's top instead of the handle button, so tapping the bar
      // wouldn't toggle the sheet.
      if (drag && drag.moved && !drag.captured && els.panelTop.setPointerCapture) {
        drag.captured = true;
        try { els.panelTop.setPointerCapture(e.pointerId); } catch (err) { /* not capturable; fine */ }
      }
    });
    els.panelTop.addEventListener('pointerup', end);
    els.panelTop.addEventListener('pointercancel', end);
    els.panelTop.addEventListener('click', function (e) { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

    // The story: only a downward pull that starts at the top of its scroll becomes a drag.
    var touch = null;
    els.panelBody.addEventListener('touchstart', function (e) {
      touch = isPhoneSheet() && els.panelBody.scrollTop <= 0 ? e.touches[0].clientY : null;
    }, { passive: true });
    els.panelBody.addEventListener('touchmove', function (e) {
      if (touch == null) return;
      var y = e.touches[0].clientY;
      if (!drag) {
        if (y - touch > 6 && els.panelBody.scrollTop <= 0) start(touch);
        else if (touch - y > 6) { touch = null; return; }      // scrolling up through the story
        else return;
      }
      e.preventDefault();
      move(y);
    }, { passive: false });
    els.panelBody.addEventListener('touchend', function () { touch = null; end(); });
    els.panelBody.addEventListener('touchcancel', function () { touch = null; end(); });
  }

  function initPanel() {
    els.panelClose.addEventListener('click', function () { closePanel(); });
    els.prevBtn.addEventListener('click', function () { goToStop((state.current - 1 + state.stops.length) % state.stops.length); });
    els.nextBtn.addEventListener('click', function () { goToStop((state.current + 1) % state.stops.length); });
    els.panelExpand.addEventListener('click', function (e) {
      e.stopPropagation();
      setExpanded(!els.panel.classList.contains('is-expanded'));
      if (state.current >= 0) setTimeout(function () { flyToStop(state.stops[state.current]); }, SHEET_ANIM_MS);
    });
    // Tapping anywhere on the preview (not the close button) opens the full story.
    els.panelTop.addEventListener('click', function (e) {
      if (DESKTOP_QUERY.matches || els.panel.classList.contains('is-expanded')) return;
      if (e.target.closest('#panel-close')) return;
      setExpanded(true);
      if (state.current >= 0) setTimeout(function () { flyToStop(state.stops[state.current]); }, SHEET_ANIM_MS);
    });
    // If the sheet's size changes (fonts loading, rotating the phone), keep it resting in place.
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      if (!els.panel.hidden && !els.panel.classList.contains('is-dragging') && !els.panel.classList.contains('is-closing')) setSheetY(restingY(), false);
    }).observe(els.panel);
    var onLayoutChange = function () {
      els.panelBody.inert = isPhoneSheet() && !els.panel.classList.contains('is-expanded');
      if (!els.panel.hidden) setSheetY(restingY(), false);
    };
    if (DESKTOP_QUERY.addEventListener) DESKTOP_QUERY.addEventListener('change', onLayoutChange);
    // Keep the compass and scale clear of the hint card if its height changes (fonts loading, text wrapping).
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      if (!els.mapHint.hidden) document.documentElement.style.setProperty('--hint-h', els.mapHint.offsetHeight + 'px');
    }).observe(els.mapHint);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateHint);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.panel.hidden && !els.navMenu.classList.contains('is-open')) closePanel();
    });
    initSheetDrag();
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
    var videos = els.splash.querySelectorAll('video');
    var hadFocus = els.splash.contains(document.activeElement);
    setTimeout(function () {
      els.splash.hidden = true;
      Array.prototype.forEach.call(videos, function (v) { v.pause(); v.removeAttribute('src'); v.load(); });  // stop downloading
    }, 600);
    if (hadFocus && !els.introView.hidden) moveFocus(els.introCta);
  }

  // The team's splash animation, on the home page only. Visitors arriving from a site link or
  // QR code never see it (or download it), and neither do visitors who've asked their device for
  // reduced motion or to save data. Tapping or clicking anywhere, or pressing Escape, Enter, or Space, ends it.
  // If nobody does, it pauses on the logo and names with a slow-blinking "Tap to continue".
  // Calls done() when it has ended or been skipped, or right away if it doesn't play.
  function playSplashVideo(done) {
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      document.removeEventListener('keydown', onKey);
      done();
    }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    var spec = window.innerWidth > window.innerHeight ? SPLASH_VIDEOS.wide : SPLASH_VIDEOS.tall;
    if (reduce || saveData || !spec || !spec.src) { finish(); return; }
    var SPLASH_HOLD_AT = spec.holdAt;

    // Safari decides whether a video may autoplay when its file is set, so it's muted (the
    // property and the attribute) BEFORE it gets its src, and only played once it's on the page.
    function silentVideo(cls, src, loop) {
      var v = el('video', { 'class': cls, playsinline: '', 'webkit-playsinline': '', preload: 'auto', 'aria-hidden': 'true' });
      v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
      v.autoplay = true;
      if (loop) v.loop = true;
      v.src = src;
      return v;
    }
    var video = silentVideo('splash-video', spec.src);
    els.splash.classList.add('has-video');
    els.splash.insertBefore(video, els.splash.firstChild);

    // Browsers display video colors differently from page colors, and some (Firefox on Macs) even
    // draw two videos in different shades, so nothing placed beside the video reliably matches its
    // navy. Instead, each frame is painted onto one full-screen canvas, and the space around it is
    // filled with a color sampled from that same canvas, so it's one surface and always matches.
    // If the canvas can't be used, the video itself still shows underneath.
    var canvas = el('canvas', { 'class': 'splash-canvas', 'aria-hidden': 'true' });
    var ctx = canvas.getContext && canvas.getContext('2d');
    var fill = null, frames = 0;
    var CROP = 2;   // the video file has a 1px darker border; leave it out
    // The fill is the most common color in a thin strip along the top of the frame (plain navy,
    // above the names), as drawn on this canvas. It's re-sampled a few times a second because the
    // video's navy drifts very slightly as it plays.
    function sampleFill(dx, dy, dw, dh) {
      var y0 = Math.round(dy + dh * 0.003), rows = Math.max(1, Math.round(dh * 0.012));
      var d = ctx.getImageData(Math.round(dx), y0, Math.round(dw), rows).data;
      var counts = {}, best = null;
      for (var i = 0; i < d.length; i += 4 * 3) {
        var key = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
        counts[key] = (counts[key] || 0) + 1;
        if (!best || counts[key] > counts[best]) best = key;
      }
      return 'rgb(' + best + ')';
    }
    function paint() {
      if (finished || !canvas.isConnected) return;
      var vw = video.videoWidth, vh = video.videoHeight;
      if (vw && video.readyState >= 2) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
        if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
        var sw = vw - 2 * CROP, sh = vh - 2 * CROP;
        var k = Math.min(W / sw, H / sh), dw = sw * k, dh = sh * k, dx = (W - dw) / 2, dy = (H - dh) / 2;
        ctx.drawImage(video, CROP, CROP, sw, sh, dx, dy, dw, dh);
        if (!held && video.currentTime >= SPLASH_HOLD_AT) hold();
        if (!fill || (!held && frames++ % 10 === 0)) {
          try { fill = sampleFill(dx, dy, dw, dh); }
          catch (e) { canvas.remove(); return; }   // can't read pixels: show the plain video instead
        }
        // Paint only the space around the frame, so the frame itself isn't covered.
        ctx.fillStyle = fill;
        if (dx > 0) { ctx.fillRect(0, 0, Math.ceil(dx), H); ctx.fillRect(Math.floor(dx + dw), 0, W, H); }
        if (dy > 0) { ctx.fillRect(0, 0, W, Math.ceil(dy)); ctx.fillRect(0, Math.floor(dy + dh), W, H); }
      }
      window.requestAnimationFrame(paint);
    }
    if (ctx) {
      els.splash.insertBefore(canvas, video.nextSibling);
      window.requestAnimationFrame(paint);
    }

    // If it can't play (autoplay blocked, e.g. iPhone Low Power Mode, or the file fails),
    // fall back to the still logo and carry on as if there were no video.
    function fallBack() {
      if (finished) return;
      video.remove(); canvas.remove();
      els.splash.classList.remove('has-video');
      finish();
    }
    var startTimer = setTimeout(fallBack, SPLASH_VIDEO_START_MS);
    video.addEventListener('playing', function () { clearTimeout(startTimer); }, { once: true });
    video.addEventListener('error', fallBack);
    // Hold on the logo and names, and invite the visitor to continue. (The paint loop above catches
    // the hold point to the frame; timeupdate and ended are backups if the canvas isn't in use.)
    var held = false;
    function hold() {
      if (finished || held) return;
      held = true;
      video.pause();
      clearTimeout(capTimer);
      var cont = el('button', { type: 'button', 'class': 'splash-continue' }, 'Tap to continue');
      els.splash.appendChild(cont);
      moveFocus(cont);
    }
    video.addEventListener('timeupdate', function () { if (video.currentTime >= SPLASH_HOLD_AT) hold(); });
    video.addEventListener('ended', function () { video.currentTime = SPLASH_HOLD_AT; hold(); });
    var capTimer = setTimeout(hold, SPLASH_VIDEO_MAX_MS);   // if it stalls, still wait for the tap
    var p = video.play();
    if (p && p.catch) p.catch(fallBack);

    els.splash.addEventListener('click', finish);
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } }
    document.addEventListener('keydown', onKey);
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

    // The splash closes once the data is ready AND (on the home page) the animation has ended or been skipped.
    var waiting = 2;
    function splashStepDone() { if (--waiting === 0) hideSplash(); }
    if (deepLink) splashStepDone();
    else playSplashVideo(function () { setTimeout(splashStepDone, Math.max(0, SPLASH_MIN_MS - (Date.now() - started))); });

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
      initMenu();
      els.brandHome.addEventListener('click', function () { setView('intro'); });
      els.introCta.addEventListener('click', leaveIntro);
      window.addEventListener('hashchange', handleHash);

      // Deep links (QR codes, shared links) go straight to their stop; the home page starts at the intro.
      if (pageFromHash()) setView(pageFromHash());
      else if (stopIdFromHash()) { setView('map'); handleHash(); }
      else setView('intro');

      // Fade out the splash once everything is ready (see splashStepDone above).
      splashStepDone();
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
