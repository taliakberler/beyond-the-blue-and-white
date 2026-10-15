/* Beyond the Blue and White — multimedia digital map.
 * Plain JavaScript + Leaflet. All content comes from data/stops.json and data/route.geojson.
 * Deep links: index.html#stop=<id> zooms to that stop and opens its panel.
 */
(function () {
  'use strict';

  var DATA_URL = 'data/stops.json';
  var ROUTE_URL = 'data/route.geojson';
  var DESKTOP_QUERY = window.matchMedia('(min-width: 900px)');
  var STOP_ZOOM = 18;
  var BUILDING_PAGE_LIMIT = 10;     // max pages fetched from the ArcGIS layer
  var BUILDING_TIMEOUT_MS = 15000;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    title: $('tour-title'), subtitle: $('tour-subtitle'), intro: $('tour-intro'),
    viewMapBtn: $('view-map'), viewListBtn: $('view-list'),
    mapView: $('map-view'), listView: $('list-view'), stopList: $('stop-list'),
    locateBtn: $('locate-btn'),
    aboutBtn: $('view-about'), aboutView: $('about-view'), aboutBody: $('about-body'),
    startBtn: $('start-btn'), themeBtn: $('theme-toggle'),
    panel: $('panel'), panelBody: $('panel-body'), panelExpand: $('panel-expand'),
    panelExpandLabel: $('panel-expand-label'), panelClose: $('panel-close'),
    count: $('stop-count'), pTitle: $('panel-title'), pEra: $('panel-era'),
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
  function isPlaceholder(stop) { return stop.placeholder === true || /placeholder/i.test(stop.title || ''); }

  function setHeaderHeight() {
    var h = document.querySelector('.app-header').getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-h', Math.round(h) + 'px');
  }

  /* ---------------- Theme ---------------- */

  var THEMES = ['auto', 'light', 'dark'];
  function applyTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    els.themeBtn.setAttribute('aria-label', 'Color theme: ' + (t === 'auto' ? 'automatic' : t) + '. Activate to change.');
    els.themeBtn.title = 'Theme: ' + t;
  }
  function initTheme() {
    var saved = 'auto';
    try { saved = localStorage.getItem('tour-theme') || 'auto'; } catch (e) { /* storage blocked */ }
    applyTheme(saved);
    els.themeBtn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'auto';
      var next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      applyTheme(next);
      try { localStorage.setItem('tour-theme', next); } catch (e) { /* ignore */ }
    });
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
        c.innerHTML = '<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true" focusable="false">' +
          '<circle cx="22" cy="22" r="20" class="compass-face"/>' +
          '<path d="M22 9 27 24h-10Z" class="compass-north"/>' +
          '<path d="M22 37 17 24h10Z" class="compass-south"/>' +
          '<circle cx="22" cy="24" r="2" class="compass-pin"/>' +
          '<text x="22" y="8.2" text-anchor="middle" class="compass-n">N</text>' +
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
        toast('Map tiles couldn’t load — you may be offline. The stop list and stop details still work.', {
          duration: 9000,
          action: { label: 'Show list', run: function () { setView('list'); } }
        });
      }
    }
    function onTileLoad() { tileErrors = 0; warned = false; }
    [streets, art].forEach(function (layer) {
      if (layer) layer.on('tileerror', onTileError).on('load', onTileLoad);
    });

    window.addEventListener('offline', function () { toast('You’re offline. Saved stop text still works; map tiles and images may not load.'); });
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
        className: 'stop-marker-wrap',
        html: '<div class="stop-marker"><span>' + stop.order + '</span></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
      var m = L.marker([stop.lat, stop.lng], {
        icon: icon,
        title: 'Stop ' + stop.order + ': ' + stop.title,
        keyboard: true,
        riseOnHover: true
      }).addTo(state.map);
      m.on('click', function () { goToStop(i, { fromMap: true }); });
      m.on('add', labelMarker);
      labelMarker.call(m);
      // Enter / Space opens the stop (don't rely on Leaflet's keypress handling).
      m.getElement().addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToStop(i, { fromMap: true }); }
      });
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
    node.setAttribute('aria-label', this.options.title);
  }

  function loadRoute() {
    return fetch(ROUTE_URL, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('route ' + r.status);
      return r.json();
    }).then(function (geo) {
      L.geoJSON(geo, {
        interactive: false,
        style: function () {
          return { color: getCss('--color-map-marker'), weight: 5, opacity: 0.85, dashArray: '2 10', lineCap: 'round' };
        }
      }).addTo(state.map);
    }).catch(function (err) {
      console.warn('Route not loaded:', err);
    });
  }

  function getCss(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#2b5c8a';
  }

  /* ---------------- Optional ArcGIS building layer (invisible; info on hover or tap) ---------------- */

  // UNC's building footprints don't line up exactly with the illustrated map, so they are never drawn.
  // They are kept as invisible targets: hovering (desktop) or tapping (phones) a building shows its
  // name and, when available, the year it was built.
  function loadBuildings() {
    var cfg = state.tour.buildingLayer;
    var base = cfg && (typeof cfg === 'string' ? cfg : cfg.url);
    if (!base) return;
    base = base.replace(/\/+$/, '').replace(/\/query$/, '');
    var nameField = (cfg && cfg.nameField) || 'name';
    var yearField = (cfg && cfg.yearField) || null;
    var fields = [nameField].concat(yearField ? [yearField] : []).join(',');

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
          if (yearField && p[yearField]) box.appendChild(el('span', null, 'Built ' + p[yearField]));
          layer.bindTooltip(box, { sticky: true, direction: 'top', offset: [0, -6] });
          layer.on('click', function (e) { layer.openTooltip(e.latlng); });
        }
      }).addTo(state.map);
    }).catch(function (err) {
      console.warn('Building layer not loaded:', err);  // the map works fine without it
    });
  }

  /* ---------------- Geolocation ---------------- */

  function initLocate() {
    els.locateBtn.addEventListener('click', function () {
      if (!('geolocation' in navigator)) {
        toast('Your browser can’t share your location. You can still follow the numbered stops.');
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
          ? 'Location permission was denied. That’s OK — follow the numbered stops, or allow location in your browser settings to see where you are.'
          : err.code === 3
            ? 'Finding your location took too long. Try again in an open area.'
            : 'Your location isn’t available right now. You can still follow the numbered stops.';
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
      btn.appendChild(el('span', { 'class': 'num', 'aria-hidden': 'true' }, String(stop.order)));
      var body = el('span');
      body.appendChild(el('span', { 'class': 't' }, stop.title));
      if (stop.era) body.appendChild(el('span', { 'class': 'e' }, stop.era));
      if (stop.summary) body.appendChild(el('span', { 'class': 's' }, stop.summary));
      body.appendChild(el('span', { 'class': 'go' }, 'Open stop ' + stop.order + ' on the map ›'));
      btn.appendChild(body);
      btn.setAttribute('aria-label', 'Stop ' + stop.order + ': ' + stop.title + '. Open on the map.');
      btn.addEventListener('click', function () { setView('map'); goToStop(i); });
      li.appendChild(btn);
      els.stopList.appendChild(li);
    });
  }

  function setView(which) {
    var list = which === 'list', about = which === 'about', map = !list && !about;
    els.listView.hidden = !list;
    els.aboutView.hidden = !about;
    els.mapView.hidden = !map;
    els.viewListBtn.setAttribute('aria-pressed', String(list));
    els.viewMapBtn.setAttribute('aria-pressed', String(map));
    els.aboutBtn.setAttribute('aria-pressed', String(about));
    if (!map) closePanel({ keepHash: false, silent: true });
    if (list) els.listView.scrollTop = 0;
    if (about) {
      els.aboutView.scrollTop = 0;
      if (location.hash !== '#about') history.pushState(null, '', '#about');
    } else if (location.hash === '#about') {
      history.pushState(null, '', location.pathname + location.search);
    }
    if (map) setTimeout(function () { state.map.invalidateSize(); }, 0);
    updateStartBtn();
  }

  function updateStartBtn() {
    var show = !els.mapView.hidden && state.current === -1;
    els.startBtn.hidden = !show;
    document.body.classList.toggle('start-visible', show);
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
    group('about-team', 'Team', a.team);
    group('about-coaches', 'Coaches', a.coaches);
    if (a.advisors) group('about-advisors', 'Community advisors', a.advisors.people, a.advisors.description);
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

    els.count.textContent = 'Stop ' + stop.order + ' of ' + total;
    els.pTitle.textContent = stop.title;
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
    (stop.people || []).forEach(function (p) {
      var li = el('li');
      li.appendChild(el('strong', null, p.name));
      if (p.description) li.appendChild(el('span', null, p.description));
      els.pPeople.appendChild(li);
    });
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

    var hasPrev = i > 0, hasNext = i < total - 1;
    els.prevBtn.disabled = !hasPrev;
    els.prevBtn.setAttribute('aria-label', hasPrev ? 'Previous: stop ' + state.stops[i - 1].order : 'No previous stop');
    if (hasNext) {
      var nxt = state.stops[i + 1];
      els.nextBtn.textContent = 'Next stop ›';
      els.nextBtn.setAttribute('aria-label', 'Next: stop ' + nxt.order + ', ' + nxt.title);
      els.directions.textContent = 'Get walking directions to Stop ' + nxt.order;
      els.directions.href = directionsUrl(nxt);
      els.directions.setAttribute('aria-label', 'Get walking directions to stop ' + nxt.order + ' (opens your map app)');
    } else {
      els.nextBtn.textContent = 'Back to Stop 1';
      els.nextBtn.setAttribute('aria-label', 'You’ve reached the last stop. Go back to stop 1.');
      els.directions.textContent = 'Last stop — directions to this site';
      els.directions.href = directionsUrl(stop);
      els.directions.setAttribute('aria-label', 'Get walking directions to this stop (opens your map app)');
    }
    els.nextBtn.disabled = false;

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
    openPanel(i);
    flyToStop(stop);
  }

  function openPanel(i) {
    var wasOpen = !els.panel.hidden;
    if (!wasOpen) state.lastFocus = document.activeElement;
    state.current = i;
    renderStop(i);
    els.panel.hidden = false;
    document.body.classList.add('panel-open');
    updateStartBtn();
    state.map.invalidateSize();
    if (!wasOpen) els.panelBody.focus({ preventScroll: true });
  }

  function closePanel(opts) {
    opts = opts || {};
    if (els.panel.hidden) return;
    els.panel.hidden = true;
    els.panel.classList.remove('is-expanded');
    els.panelExpand.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('panel-open');
    Object.keys(state.markers).forEach(function (id) {
      var node = state.markers[id].getElement();
      if (node) node.classList.remove('is-active');
    });
    var closedStop = state.stops[state.current];
    state.current = -1;
    updateStartBtn();
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
    els.prevBtn.addEventListener('click', function () { goToStop(state.current - 1); });
    els.nextBtn.addEventListener('click', function () {
      goToStop(state.current < state.stops.length - 1 ? state.current + 1 : 0);
    });
    els.panelExpand.addEventListener('click', function () {
      var exp = els.panel.classList.toggle('is-expanded');
      els.panelExpand.setAttribute('aria-expanded', String(exp));
      els.panelExpandLabel.textContent = exp ? 'Collapse panel' : 'Expand panel';
      if (state.current >= 0) setTimeout(function () { flyToStop(state.stops[state.current]); }, 260);
    });
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
      if (dy < -40 && !exp) els.panelExpand.click();
      else if (dy > 40 && exp) els.panelExpand.click();
      else if (dy > 60 && !exp) closePanel();
    });
  }

  /* ---------------- Deep links ---------------- */

  function stopIdFromHash() {
    var m = /(?:^#|&)stop=([^&]+)/.exec(location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function handleHash() {
    if (location.hash === '#about') { if (els.aboutView.hidden) setView('about'); return; }
    if (!els.aboutView.hidden) setView('map');
    var id = stopIdFromHash();
    if (!id) { closePanel({ keepHash: true, silent: true }); return; }
    var i = state.stops.findIndex(function (s) { return s.id === id; });
    if (i === -1) {
      toast('That stop wasn’t found. Here are all the stops instead.');
      setView('list');
      return;
    }
    if (els.mapView.hidden) setView('map');
    goToStop(i, { fromHash: true });
  }

  /* ---------------- Boot ---------------- */

  function fail(msg, opts) {
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
    setHeaderHeight();
    initTheme();

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

      if (state.tour.title) { els.title.textContent = state.tour.title; document.title = state.tour.title + ' — A Digital Map'; }
      if (state.tour.subtitle) els.subtitle.textContent = state.tour.subtitle;
      els.startBtn.setAttribute('aria-label', 'Start exploring at stop ' + state.stops[0].order + ', ' + state.stops[0].title);

      initMap();
      addMarkers();
      loadRoute();
      optional(loadBuildings, 'Building layer');
      initLocate();
      initPanel();
      renderList();
      optional(renderAbout, 'About page');

      els.viewMapBtn.addEventListener('click', function () { setView('map'); });
      els.viewListBtn.addEventListener('click', function () { setView('list'); });
      els.aboutBtn.addEventListener('click', function () { setView(els.aboutView.hidden ? 'about' : 'map'); });
      els.startBtn.addEventListener('click', function () { goToStop(0); });
      window.addEventListener('hashchange', handleHash);

      if (stopIdFromHash() || location.hash === '#about') handleHash();
      else { fitAllStops(); updateStartBtn(); }
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
