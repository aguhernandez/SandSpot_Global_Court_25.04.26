/* =============================================================
   SandSpot — main.js
   The map IS the site. Ball → world → panels over the world.
   Vanilla JS + GSAP for choreo only; the app degrades gracefully.
   ============================================================= */
(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";

  /* ------------------------------------------------------------
     Config — public anon key, read-only, same one the app ships
     ------------------------------------------------------------ */
  const SUPA = {
    url: "https://zulrcnamozmwzifapduq.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bHJjbmFtb3ptd3ppZmFwZHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDA4ODcsImV4cCI6MjA4NzA3Njg4N30.3Ga_1x40MNy31NOJCCZOaqy8NC_8ckfy7wUmxnYltso",
  };
  const CONTACT = "hello@sandspot.app"; // TODO: real inbox

  // i18n — window.SandSpotI18N is built before this file (see index.html order)
  const t = window.SandSpotI18N ? window.SandSpotI18N.t : (k) => k;
  const typeT = (tt) => tt === "public" ? t("type.public")
    : tt === "partner" ? t("type.partner") : tt;

  /* ------------------------------------------------------------
     Projection: lng/lat → viewBox 1000×520
     ------------------------------------------------------------ */
  const VW = 1000, VH = 520;
  const X = (lng) => ((lng + 180) / 360) * VW;
  const YW = (lat) => ((84 - Math.min(Math.max(lat, -58), 84)) / 142) * VH;

  const SVGNS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}) => {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  let COURTS = [];
  let ACCENTS = [];
  // fallback suffix when a record has no id at all — mutable because the
  // COURT_INDEX collision loop bumps it (never happens with the census ids)
  let UID = Math.random().toString(36).slice(2);
  const courtKey = (c) =>
    `c${String(c.id || "").replace(/[^a-zA-Z0-9]/g, "") || UID}`;

  const COURT_INDEX = new window.Map();
  const placeOf = (c) => [c.city, c.country, c.region].filter(Boolean).slice(0, 2).join(", ") || "—";

  function pickAccents(courts, max) {
    const byNum = [...courts].sort((a, b) => (b.num_courts || 0) - (a.num_courts || 0));
    const seen = new Set();
    const out = [];
    for (const c of byNum) {
      if (seen.has(c.country)) continue;
      seen.add(c.country);
      out.push(c);
      if (out.length >= max) break;
    }
    return out;
  }

  const FIELD = "id,name,city,country,court_type,num_courts,latitude,longitude,has_lights,price_per_hour,description,rules,opening_hours,phone,website,amenities,surface_detail,views,booking_url,address,surface";

  async function loadCourts() {
    // Base layer: the gathered census (data/courts-all.json, scripts/import-courts.py).
    let base = [];
    try {
      const r = await fetch("data/courts-all.json");
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) base = d; }
    } catch (_) { /* file:// */ }
    if (!base.length) {
      // older build without the census import
      try {
        const r = await fetch("data/courts-live.json");
        if (r.ok) { const d = await r.json(); if (Array.isArray(d)) return d; }
      } catch (_) {}
      return [];
    }

    // Verified layer: Supabase approved records fill gaps and append new ones.
    let live = [];
    try {
      const r = await Promise.race([
        fetch(`${SUPA.url}/rest/v1/courts?select=${encodeURIComponent(FIELD)}&status=eq.approved`, {
          headers: { apikey: SUPA.key, Authorization: `Bearer ${SUPA.key}` },
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), 4000)),
      ]);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) live = d; }
    } catch (_) { /* sandbox / offline */ }
    if (!live.length) {
      try {
        const r = await fetch("data/courts-live.json"); // mirror of approved records
        if (r.ok) { const d = await r.json(); if (Array.isArray(d)) live = d; }
      } catch (_) {}
    }
    if (!live.length) return base;

    const norm = (s) => (s ?? "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/united states( of america)?|^usa$|e\.?u\.?u\.?/g, " usa ")
      .replace(/[^a-z0-9]+/g, " ").trim();
    const key = (c) => `${norm(c.name)}|${norm(c.city)}|${norm(c.country)}`;
    const map = new Map();
    for (const c of base) map.set(key(c), c);
    for (const s of live) {
      const hit = map.get(key(s));
      if (hit) {
        for (const f of FIELD.split(",")) {
          const v = s[f];
          if (v !== null && v !== undefined && v !== "" &&
              (hit[f] === null || hit[f] === undefined || hit[f] === "")) hit[f] = v;
        }
        hit.verified = true;      // approved beats unverified flags
      } else {
        const c = { ...s, tier: s.tier || "documented", verified: true };
        base.push(c);
        map.set(key(c), c);
      }
    }

    // Verification wave layer (scripts/verify-*.py → data/verifications.json):
    // operator-checked records annotate the census without erasing it.
    try {
      const r = await fetch("data/verifications.json");
      if (r.ok) {
        const v = await r.json();
        for (const c of base) {
          const rec = v[c.id];
          if (!rec) continue;
          c.verify_status = rec.status;   // verified | osm | unfound
          c.verify_source = rec.source || "";
          c.verify_note = rec.note || "";
          c.verify_date = rec.date || "";
          // only operator-checked records are bookable census courts;
          // OSM-mapped/unfound ones stay searchable but slot-proof
          c.verified = rec.status === "verified";
        }
      }
    } catch (_) { /* optional layer */ }
    return base;
  }

  /* ============================================================
     MAP ENGINE — pan / zoom / fly
     ============================================================ */
  const World = (() => {
    const svg = document.getElementById("worldMap");
    const cam = { k: 1, tx: 0, ty: 0 };
    // Dots are the landing identity; MapLibre GL takes the map over at the
    // first real zoom (K_TAKE ≈ one scroll or one zoom-button click) so
    // Berlin and Hamburg separate right away instead of collapsing into one
    // dot. K_MAX is only the fallback ceiling for runs without WebGL, where
    // the dotted map has to carry the whole range on its own.
    const K_MAX = 7, K_MIN = 1;
    const K_TAKE = 1.15;   // SVG zoom that hands control to MapLibre (first wheel notch)
    let flight = null;

    // flights finish by deadline: with rAF throttled (background tab, CPU funk)
    // the ease could freeze mid-air — a token-checked timeout lands the camera
    // exactly where the flight would end, so state stays coherent
    let flightSeq = 0;

    const pxScale = () => {
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width / VW, r.height / VH);
      return { s, ox: (r.width - VW * s) / 2, oy: (r.height - VH * s) / 2, r };
    };
    const clientToView = (cx, cy) => {
      const { s, ox, oy } = pxScale();
      return { x: (cx - ox) / s, y: (cy - oy) / s };
    };
    const clamp = (k, tx, ty) => {
      // pan must be able to reach the far edges of the world, not just half-way
      const minTx = -VW * (k - 1), minTy = -VH * (k - 1);
      return { k, tx: Math.min(0, Math.max(minTx, tx)), ty: Math.min(0, Math.max(minTy, ty)) };
    };

    let root = null, pinsRoot = null;
    let pins = [];              // { el, in, x, y, h, k } sorted by x — culling list
    let lastLo = 0, lastHi = 0, lastInvKey = ""; // shown window / last counter-scale

    /* === MapLibre GL hand-off ============================================
       The dotted map is the identity at the world view. At the first real
       zoom (K_TAKE) a MapLibre canvas crossfades over it on the same centre
       point and equivalent zoom: real OSM/CARTO streets underneath, every
       geolocated court as a clustered GeoJSON feature on top (colour =
       verification state), court names from z12.5. Zooming back under the
       gate dissolves the dots in again. If maplibre-gl or WebGL never
       arrives, the dotted map simply keeps working — no blank canvas. */
    let gl = null, glwrap = null, glmapEl = null;
    let glOn = false, glFading = false, glBroken = false;
    const GL_COURT_ZOOM = 15.4;

    // same palette as the verification chips in the court panel
    const GL_COLORS = {
      verified: "#1c7c44",
      osm: "#3878b8",
      unfound: "#d3743a",
      plain: "#1f4e79",
    };

    function svgZoomToGl(k) {
      const { s } = pxScale();
      // world unit = 1/1000 of 360°; GL world = 256·2^z px
      return Math.log2(Math.max(1e-9, (VW * s * k) / 256));
    }
    function glZoomToSvg(z) {
      const { s } = pxScale();
      return (Math.pow(2, z) * 256) / (VW * s);
    }
    function glCenterOfCam() {
      const wx = (VW / 2 - cam.tx) / cam.k, wy = (VH / 2 - cam.ty) / cam.k;
      return [wx * 360 / VW - 180, 84 - wy * 142 / VH];
    }
    // hysteresis: hand back to the dots a touch below the zoom that entered
    const glExitZ = () => svgZoomToGl(K_TAKE) - 0.3;

    function glFeatures() {
      const feats = [];
      for (const c of COURTS) {
        if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) continue;
        feats.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [c.longitude, c.latitude] },
          properties: {
            key: courtKey(c),
            name: c.name || "",
            v: c.verify_status || "",
          },
        });
      }
      return { type: "FeatureCollection", features: feats };
    }

    function glStyle() {
      return {
        version: 8,
        // MapLibre's own demo font endpoint: free, no key, valid PBF glyphs
        // (fonts.openmaptiles.org now serves an HTML page and breaks the PBF parser)
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          streets: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
          },
          courts: {
            type: "geojson",
            data: glFeatures(),
            cluster: true,
            clusterRadius: 34,
            clusterMaxZoom: 12,
          },
        },
        layers: [
          { id: "paper", type: "background", paint: { "background-color": "#eef1ee" } },
          { id: "streets", type: "raster", source: "streets" },
          {
            id: "court-cluster", type: "circle", source: "courts",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": GL_COLORS.plain,
              "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 9, 20, 13, 100, 17],
              "circle-opacity": 0.92,
              "circle-stroke-width": 2.5,
              "circle-stroke-color": "#ffffff",
            },
          },
          {
            id: "court-cluster-count", type: "symbol", source: "courts",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-font": ["Noto Sans Regular"],
              "text-size": 11,
              "text-allow-overlap": true,
            },
            paint: { "text-color": "#ffffff" },
          },
          {
            id: "court-dot", type: "circle", source: "courts",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": [
                "match", ["get", "v"],
                "verified", GL_COLORS.verified,
                "osm", GL_COLORS.osm,
                "unfound", GL_COLORS.unfound,
                GL_COLORS.plain,
              ],
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4.2, 12, 6, 17, 8],
              "circle-stroke-width": 1.6,
              "circle-stroke-color": "#ffffff",
            },
          },
          {
            id: "court-name", type: "symbol", source: "courts",
            filter: ["!", ["has", "point_count"]],
            minzoom: 12.5,
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Noto Sans Regular"],
              "text-size": 11,
              "text-offset": [0, 1.4],
              "text-anchor": "top",
              "text-max-width": 9,
              "text-allow-overlap": false,
            },
            paint: {
              "text-color": "#1c2f3f",
              "text-halo-color": "rgba(255,255,255,.92)",
              "text-halo-width": 1.4,
            },
          },
          {
            // invisible tap target: a visible 5px court is honest but too
            // small to hit on a phone, so clicks resolve against this disc
            id: "court-hit", type: "circle", source: "courts",
            filter: ["!", ["has", "point_count"]],
            paint: { "circle-color": "#000000", "circle-opacity": 0, "circle-radius": 13 },
          },
        ],
      };
    }

    function ensureGL() {
      if (gl) return true;
      if (glBroken || !window.maplibregl) return false;
      const box = svg.parentElement;   // .mapbox
      glwrap = document.createElement("div");
      glwrap.className = "glwrap";
      glmapEl = document.createElement("div");
      glmapEl.className = "glmap";
      glwrap.appendChild(glmapEl);
      box.appendChild(glwrap);
      try {
        gl = new maplibregl.Map({
          container: glmapEl,
          center: glCenterOfCam(),
          zoom: svgZoomToGl(cam.k),
          style: glStyle(),
          attributionControl: { compact: false },
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          maxZoom: 19,
        });
      } catch (err) {
        glBroken = true;
        window.__ssglError = String((err && err.message) || err);
        glwrap.remove();
        gl = glmapEl = glwrap = null;
        return false;
      }
      gl.on("click", onGLClick);
      gl.on("mousemove", (e) => {
        const hits = gl.queryRenderedFeatures(e.point, { layers: ["court-cluster", "court-hit", "court-dot"] });
        gl.getCanvas().style.cursor = hits.length ? "pointer" : "";
      });
      gl.on("zoom", () => {
        if (glOn && !glFading && gl.getZoom() < glExitZ()) exitToDots();
      });
      gl.on("error", (e) => {
        const msg = String((e && e.error && e.error.message) || "");
        if (/webgl|context/i.test(msg)) {
          glBroken = true;
          if (glOn) exitToDots();
        }
      });
      window.__ssgl = gl;   // test/debug handle
      return true;
    }

    function onGLClick(e) {
      if (!gl) return;
      // A bubble wins over any stray dot it overlaps: at low zoom the cluster
      // is the intended target, and expanding it is how those dots get reached.
      const f = gl.queryRenderedFeatures(e.point, { layers: ["court-cluster"] })[0]
        || gl.queryRenderedFeatures(e.point, { layers: ["court-hit", "court-dot"] })[0];
      if (!f) return;
      if (f.properties.cluster) {
        const src = gl.getSource("courts");
        const go = (z) => gl.easeTo({
          center: f.geometry.coordinates,
          zoom: Math.min(17, Number.isFinite(z) ? z : gl.getZoom() + 2.2),
          duration: 750,
        });
        try {
          const p = src.getClusterExpansionZoom(f.properties.cluster_id);
          if (p && p.then) p.then(go).catch(() => go());
          else go(p);
        } catch (_) { go(); }
      } else {
        const c = COURT_INDEX.get(f.properties.key);
        if (c) Panels.openCourt(c);
      }
    }

    function enterGL() {
      if (glOn || !ensureGL()) return false;
      stopFlight();                 // the hidden dotted camera needs no flight
      gl.resize();                  // viewport may have changed while hidden
      gl.jumpTo({ center: glCenterOfCam(), zoom: svgZoomToGl(cam.k) });
      glOn = true;
      glFading = true;
      svg.parentElement.classList.add("gl-on");
      setTimeout(() => { glFading = false; }, 620);
      return true;
    }

    function exitToDots(target) {
      if (!glOn) return;
      glOn = false;
      glFading = true;
      if (target) {
        cam.k = target.k; cam.tx = target.tx; cam.ty = target.ty;
      } else if (gl) {
        const z = gl.getZoom(), c = gl.getCenter();
        const k = Math.min(K_MAX, Math.max(K_MIN, glZoomToSvg(z)));
        const wx = (c.lng + 180) / 360 * VW, wy = YW(c.lat);
        const n = clamp(k, VW / 2 - wx * k, VH / 2 - wy * k);
        cam.k = n.k; cam.tx = n.tx; cam.ty = n.ty;
      }
      svg.parentElement.classList.remove("gl-on");
      apply();
      setTimeout(() => { glFading = false; }, 620);
    }

    /* court flight: hand the camera to GL when it exists, otherwise fall
       back to the deepest the dotted map can go without inventing detail */
    function diveTo(c) {
      if (ensureGL() && !glBroken) {
        if (!glOn) enterGL();
        gl.flyTo({
          center: [c.longitude, c.latitude],
          zoom: GL_COURT_ZOOM,
          duration: 1500,
          offset: [-Math.round((glmapEl.clientWidth || 0) * 0.14), 0],
        });
        return;
      }
      flyToPoint({ x: X(c.longitude), y: YW(c.latitude) }, Math.max(cam.k, K_MAX), 900, 0.16);
    }

    function syncGLGate() {
      if (glOn || glFading || glBroken) return;
      if (cam.k < K_TAKE || !window.maplibregl) return;
      enterGL();
    }

    function apply() {
      root.setAttribute("transform", `translate(${cam.tx} ${cam.ty}) scale(${cam.k})`);
      cull();
      syncGLGate();
    }

    // deferred maplibre-gl may land after the first scroll: pick the gate
    // back up once the document is fully loaded
    window.addEventListener("load", () => { if (cam.k >= K_TAKE) syncGLGate(); });

    /* Culling: the pin list is kept sorted by x, so the visible slice is a
       contiguous run found by binary search. Only what crosses the window
       edge gets display toggles, and the counter-scale attribute is only
       rewritten when the zoom factor actually changed. Thousands of pins
       pan at 60fps without touching the DOM beyond the edge effects. */
    function cull() {
      if (!pins.length) return;
      const { s, ox, oy, r } = pxScale();
      const M = 40; // px margin so edge pins don't pop hard
      const x0 = ((-ox) / s - cam.tx) / cam.k - M / (s * cam.k);
      const x1 = ((r.width - ox) / s - cam.tx) / cam.k + M / (s * cam.k);
      let lo = 0, hi = pins.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (pins[m].x < x0) lo = m + 1; else hi = m;
      }
      let i = lo;
      while (i < pins.length && pins[i].x <= x1) i++;
      const inv = 1 / cam.k;
      const invKey = inv.toFixed(3);
      for (let j = lo; j < i; j++) {
        const p = pins[j];
        if (p.h) { p.el.style.display = ""; p.h = false; }
        if (p.k !== invKey) { p.in.setAttribute("transform", `scale(${inv})`); p.k = invKey; }
      }
      // hide the part of the previous window that no longer shows
      for (let j = lastLo; j < Math.min(lastHi, lo); j++) {
        const p = pins[j];
        if (!p.h) { p.el.style.display = "none"; p.h = true; }
      }
      for (let j = Math.max(i, lastLo); j < lastHi; j++) {
        const p = pins[j];
        if (!p.h) { p.el.style.display = "none"; p.h = true; }
      }
      lastLo = lo; lastHi = i;
      lastInvKey = invKey;
    }

    function build(geoDots, courtList, accents) {
      svg.innerHTML = "";
      root = el("g", { class: "root" });

      const geo = el("g", { class: "geo" });
      for (const d of geoDots) geo.appendChild(el("circle", { cx: X(d[0]).toFixed(1), cy: YW(d[1]).toFixed(1), r: 2 }));
      root.appendChild(geo);

      pinsRoot = el("g", { class: "pins" });
      pins = [];
      const accentSet = new Set(accents);
      const add = (c, big, label) => {
        const x = X(c.longitude), y = YW(c.latitude);
        const g = el("g", {
          class: "mk" + (big ? " accent" : ""), "data-id": courtKey(c),
          transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`,
        });
        const inner = el("g", { class: "mk-in" });
        const hit = el("circle", { class: "hit", r: big ? 11 : 9, fill: "transparent" });
        inner.appendChild(hit);
        inner.appendChild(el("circle", { class: "mc r", r: big ? 3.3 : 2.5 }));
        if (label) {
          const t = el("text", { class: "map-city", x: 8, y: -7 });
          t.textContent = c.city;
          inner.appendChild(t);
        }
        g.appendChild(inner);
        pinsRoot.appendChild(g);
        pins.push({ el: g, in: inner, x, y, h: false, k: null });
      };
      for (const c of courtList) {
        if (accentSet.has(c)) continue;
        // records without coordinates stay in the registry but off the map
        if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) continue;
        add(c, false, false);
      }
      accents.forEach((c, i) => add(c, true, i < 5));
      pins.sort((a, b) => a.x - b.x);
      lastLo = 0; lastHi = 0; lastInvKey = "";
      root.appendChild(pinsRoot);
      svg.appendChild(root);

      // registry changed under a live GL map: push fresh features
      if (gl) {
        const src = gl.getSource("courts");
        if (src) src.setData(glFeatures());
      }

      svg.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".mk")) return; // pins handle themselves
        onGrabStart(e);
      });
      svg.addEventListener("wheel", onWheel, { passive: false });
      svg.addEventListener("dblclick", (e) => {
        if (e.target.closest(".mk")) return;
        const p = clientToView(e.clientX, e.clientY);
        flyToPoint(p, cam.k * 1.6, 500);
      });
      svg.addEventListener("click", (e) => {
        const mk = e.target.closest(".mk");
        if (!mk) return;
        const c = COURT_INDEX.get(mk.dataset.id);
        if (c) {
          Panels.openCourt(c);
          diveTo(c);
        }
      });
      apply();
    }

    /* --- grab / drag --- */
    let dragging = null;
    function onGrabStart(e) {
      try { svg.setPointerCapture(e.pointerId); } catch (_) { /* pointer already released */ }
      dragging = { x: e.clientX, y: e.clientY, tx: cam.tx, ty: cam.ty, id: e.pointerId };
      stopFlight();
      document.querySelector("#mapbox").classList.add("dragging");
    }
    window.addEventListener("pointermove", (e) => {
      if (!dragging || e.pointerId !== dragging.id) return;
      moveBy(e.clientX - dragging.x, e.clientY - dragging.y);
      dragging.x = e.clientX; dragging.y = e.clientY;
    });
    window.addEventListener("pointerup", () => {
      if (dragging) document.querySelector("#mapbox").classList.remove("dragging");
      dragging = null;
    });
    function moveBy(dx, dy) {
      const { s } = pxScale();
      // pointer-locked panning: the world delta is screen delta / (s·k),
      // otherwise drags move the map k× faster than the pointer (harmless
      // at k=1-7, catastrophic at street zoom)
      const n = clamp(cam.k, cam.tx + dx / (s * cam.k), cam.ty + dy / (s * cam.k));
      cam.tx = n.tx; cam.ty = n.ty;
      apply();
    }

    /* --- wheel zoom --- */
    function onWheel(e) {
      e.preventDefault();
      const p = clientToView(e.clientX, e.clientY);
      // one ordinary scroll is enough to cross K_TAKE and wake the real map
      zoomTo(cam.k * Math.exp(-e.deltaY * 0.0016), p);
    }

    function zoomTo(k, vp) {
      const kk = Math.min(K_MAX, Math.max(K_MIN, k));
      const w = { x: (vp.x - cam.tx) / cam.k, y: (vp.y - cam.ty) / cam.k };
      const n = clamp(kk, vp.x - w.x * kk, vp.y - w.y * kk);
      cam.k = n.k; cam.tx = n.tx; cam.ty = n.ty;
      apply();
    }
    function flyToPoint(vp, k, ms = 850, sx = 0) {
      stopFlight();
      const kk = Math.min(K_MAX, Math.max(K_MIN, k));
      const cx = VW * (0.5 - sx); // sx>0 nudges the point away from the right drawer
      const wantT = { tx: cx - vp.x * kk, ty: VH * 0.5 - vp.y * kk };
      const n = clamp(kk, wantT.tx, wantT.ty);
      if (RM || document.hidden) { cam.k = n.k; cam.tx = n.tx; cam.ty = n.ty; apply(); return; }
      const from = { ...cam }, to = n, t0 = performance.now();
      const token = ++flightSeq;
      const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const tick = (now) => {
        if (token !== flightSeq) return;   // superseded or stopped
        const p = Math.min(1, (now - t0) / ms), e = ease(p);
        cam.k = from.k + (to.k - from.k) * e;
        cam.tx = from.tx + (to.tx - from.tx) * e;
        cam.ty = from.ty + (to.ty - from.ty) * e;
        apply();
        if (p < 1) flight = requestAnimationFrame(tick);
        else flight = null;
      };
      flight = requestAnimationFrame(tick);
      // flights finish by deadline even when rAF stalls (background tab):
      // the token-checked timeout lands exactly where the ease would end
      setTimeout(() => {
        if (token !== flightSeq) return;
        cam.k = to.k; cam.tx = to.tx; cam.ty = to.ty;
        flight = null;
        apply();
      }, ms + 420);
    }
    function stopFlight() {
      flightSeq++;                 // invalidates any pending force-finish
      if (flight) { cancelAnimationFrame(flight); flight = null; }
    }

    function zoomButtons() {
      document.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => {
        const mode = b.dataset.zoom;
        if (glOn && gl) {
          if (mode === "in") { gl.zoomIn({ duration: 420 }); return; }
          if (mode === "out") { gl.zoomOut({ duration: 420 }); return; }
          if (mode === "fit") { exitToDots({ k: 1, tx: 0, ty: 0 }); return; }
        }
        const { ox, oy, r } = pxScale();
        const centerView = clientToView(r.left + ox + (VW / 2) * Math.min(r.width / VW, r.height / VH), r.top + oy + (VH / 2) * Math.min(r.width / VW, r.height / VH));
        if (mode === "in") zoomTo(cam.k * 1.45, centerView);
        if (mode === "out") zoomTo(cam.k / 1.45, centerView);
        if (mode === "fit") flyToPoint({ x: VW / 2, y: VH / 2 }, 1, 700);
      }));
    }

    function fit() {
      if (glOn) { exitToDots({ k: 1, tx: 0, ty: 0 }); return; }
      cam.k = 1; cam.tx = 0; cam.ty = 0; apply();
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "+" || e.key === "=") {
        if (glOn && gl) gl.zoomIn({ duration: 320 }); else zoomTo(cam.k * 1.3, { x: VW / 2, y: VH / 2 });
      }
      if (e.key === "-") {
        if (glOn && gl) gl.zoomOut({ duration: 320 }); else zoomTo(cam.k / 1.3, { x: VW / 2, y: VH / 2 });
      }
      if (e.key === "0") fit();
    });

    /* idle sway: the world breathes when nobody touches it */
    let swayRAF = null, lastTouch = 0, swayBlocked = false;
    function sway() {
      if (RM || !root || swayRAF || swayBlocked) return;
      const t0 = performance.now();
      const tick = (now) => {
        if (performance.now() - lastTouch < 4500 || swayBlocked) { swayRAF = null; return; }
        // the breathe belongs to the dotted view; hidden or street-level, stay still
        if (glOn) { swayRAF = null; return; }
        const t = (now - t0) / 1000;
        const dx = Math.sin(t * 0.32) * 4, dy = Math.cos(t * 0.21) * 3;
        root.setAttribute("transform",
          `translate(${cam.tx + dx} ${cam.ty + dy}) scale(${cam.k})`);
        cull();
        swayRAF = requestAnimationFrame(tick);
      };
      lastTouch = performance.now();
      swayRAF = requestAnimationFrame(tick);
      window.addEventListener("pointerdown", () => {
        lastTouch = performance.now();
        if (swayRAF) { cancelAnimationFrame(swayRAF); swayRAF = null; setTimeout(sway, 5000); }
      }, { passive: true });
    }
    function pauseSway() { swayBlocked = true; if (swayRAF) { cancelAnimationFrame(swayRAF); swayRAF = null; } if (root) apply(); }
    function resumeSway() { swayBlocked = false; lastTouch = 0; sway(); }

    return { build, zoomButtons, fit, flyToPoint, zoomTo, diveTo, sway, pauseSway, resumeSway };
  })();

  /* ============================================================
     DRAWER PANELS
     ============================================================ */
  const Panels = (() => {
    const backdrop = document.getElementById("drawer-backdrop");
    const drawers = {
      court: document.getElementById("panel-court"),
      mission: document.getElementById("panel-mission"),
      roadmap: document.getElementById("panel-roadmap"),
      add: document.getElementById("panel-add"),
      join: document.getElementById("panel-join"),
    };
    let current = null;

    // closing: timers cancelled on re-open so a fast pin → panel → close → panel
    // sequence never gets whacked by a stale hidden=true
    const hideTimers = {};
    let backdropTimer = null;

    function open(name) {
      close();
      const d = drawers[name];
      if (!d) return;
      staticInit(d);
      if (hideTimers[name]) { clearTimeout(hideTimers[name]); hideTimers[name] = null; }
      if (backdropTimer) { clearTimeout(backdropTimer); backdropTimer = null; }
      d.hidden = false;
      void d.offsetWidth; // force reflow — works even when the tab is hidden (rAF-throttled)
      d.classList.add("open");
      backdrop.hidden = false;
      backdrop.classList.add("open");
      current = name;
      document.body.classList.add("map-dimmed");
      if (World.pauseSway) World.pauseSway();
      const f = d.querySelector("input, button:not([data-close])");
      if (f) setTimeout(() => f.focus({ preventScroll: true }), 260);
    }

    function close() {
      for (const key in drawers) {
        const d = drawers[key];
        if (!d || d.hidden) continue;
        d.classList.remove("open");
        if (hideTimers[key]) clearTimeout(hideTimers[key]);
        hideTimers[key] = setTimeout(() => { d.hidden = true; hideTimers[key] = null; }, 480);
      }
      backdrop.classList.remove("open");
      if (backdropTimer) clearTimeout(backdropTimer);
      backdropTimer = setTimeout(() => { backdrop.hidden = true; backdropTimer = null; }, 320);
      current = null;
      document.body.classList.remove("map-dimmed");
      clearPins();
      if (World.resumeSway) World.resumeSway();
    }

    /* selection: exactly one lit pin while a court panel is open */
    function selectPin(c) {
      document.querySelectorAll("#worldMap .mk.sel").forEach((n) => n.classList.remove("sel"));
      const mk = document.querySelector(`#worldMap .mk[data-id="${courtKey(c)}"]`);
      if (mk) mk.classList.add("sel");
    }
    function clearPins() {
      document.querySelectorAll("#worldMap .mk.sel").forEach((n) => n.classList.remove("sel"));
    }

    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

    function courtHTML(c) {
      const name = esc(c.name);
      const place = esc(placeOf(c));
      const mailLink = `mailto:${CONTACT}?subject=${encodeURIComponent("About the record: " + c.name + " (" + c.city + ")")}`;

      // verification wave badge — states the evidence per record, keeps the
      // census honest ("verified": operator sources · "osm": OSM-mapped pitch)
      const vStatus = c.verify_status;
      const vChip = vStatus
        ? `<a class="vchip ${vStatus}" ${c.verify_source ? `href="${esc(c.verify_source)}" target="_blank" rel="noopener"` : "href=\"mailto:" + CONTACT + "?subject=" + encodeURIComponent("Verify record: " + c.name) + "\""}>${t("c.ver_" + vStatus)}</a>`
        : "";
      const vLine = vStatus && c.verify_note
        ? `<div class="court-desc vnote">${esc(c.verify_note)}<span class="vdate"> · ${esc(c.verify_date || "")}</span></div>`
        : "";

      // rating — no rating column yet: honest empty state, five hollow stars
      const stars = `<div class="rate">
        <span class="stars" aria-hidden="true">${"★★★★★".split("").map(() => '<i>★</i>').join("")}</span>
        <span class="rate-note">${t("rate.no")}</span>
      </div>`;

      // photos — none on file: three slots, one actionable
      const photos = `<div class="photo-row">
        ${[0,1,2].map((i) => `<div class="photo-slot"><span>${t("photo.n", { n: i + 1 })}</span></div>`).join("")}
      </div>
      <p class="photo-note">${t("pn.miss")} <a href="mailto:${CONTACT}?subject=${encodeURIComponent("Photos: " + c.name + " (" + c.city + ")")}">${t("pn.link")}</a> ${t("pn.tail")}</p>`;

      const rows = [];
      rows.push(`<div class="meta-cell wide"><div class="k">${t("c.where")}</div><div class="v">${esc(c.address || c.city)}</div></div>`);
      rows.push(`<div class="meta-cell"><div class="k">${t("c.courts")}</div><div class="v">${c.num_courts ?? "?"}</div></div>`);
      rows.push(`<div class="meta-cell"><div class="k">${t("c.access")}</div><div class="v">${typeT(c.court_type || "public")}</div></div>`);
      rows.push(`<div class="meta-cell"><div class="k">${t("c.lights")}</div><div class="v">${c.has_lights ? t("c.yes") : "—"}</div></div>`);
      // price only when the source states a fee/number — never claim "free"
      rows.push(`<div class="meta-cell"><div class="k">${t("c.price")}</div><div class="v">${c.price_per_hour != null ? "$" + c.price_per_hour + "/h" : "—"}</div></div>`);
      if (c.views != null) {
        rows.push(`<div class="meta-cell"><div class="k">${t("c.checked")}</div><div class="v">${c.views}×</div></div>`);
      }

      const lines = [];
      if (c.opening_hours) lines.push([t("d.hours"), esc(c.opening_hours)]);
      if (c.surface_detail || c.surface) lines.push([t("d.surface"), esc(c.surface_detail || c.surface)]);
      if (c.rules) lines.push([t("d.rules"), esc(c.rules)]);

      const amenities = Array.isArray(c.amenities) ? c.amenities.filter(Boolean).slice(0, 8) : [];

      const contact = [];
      if (c.phone) contact.push(`<a class="contact-item" href="tel:${esc(String(c.phone).replace(/\s+/g, ""))}">📞 ${esc(c.phone)}</a>`);
      if (c.website) contact.push(`<a class="contact-item" href="${esc(c.website)}" target="_blank" rel="noopener">🌐 Site</a>`);
      if (c.booking_url) contact.push(`<a class="contact-item" href="${esc(c.booking_url)}" target="_blank" rel="noopener">🎟 Book directly</a>`);

      return `
        <header class="drawer-head">
          <h2>${t("court.head")}</h2>
          <button class="drawer-close" data-close aria-label="${t("close.a")}" data-i18n-attr="aria-label:close.a">×</button>
        </header>
        <div class="drawer-body">
          <div class="court-name">${name}</div>
          <div class="court-place">${place}</div>
          ${c.tier === "candidate" ? `<div class="cand-chip">${t("c.candidate")}</div>` : ""}
          ${vChip}
          ${vLine}
          ${stars}
          ${photos}
          <div class="court-meta">
            ${rows.join("\n")}
          </div>
          ${c.description ? `<p class="court-desc">${esc(c.description)}</p>` : ""}
          ${lines.length ? `<div class="detail-list">${lines.map(([k, v]) => `
            <div class="detail-row"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("")}</div>` : ""}
          ${amenities.length ? `<div class="chips">${amenities.map((a) => `<span class="am">${esc(a)}</span>`).join("")}</div>` : ""}
          ${contact.length ? `<div class="contact-row">${contact.join("")}</div>` : ""}
          <div class="court-actions">
            <a class="btn-ghost" href="${mailLink}">${t("c.correct")}</a>
            <span class="hint">${c.tier === "candidate" ? t("c.candHint") : t("c.hint")}</span>
          </div>
        </div>`;
    }

    function openCourt(c) {
      const d = drawers.court;
      d.innerHTML = courtHTML(c);
      // the × button is brand-new every open — wire it now, not once at boot
      d.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
      open("court");
      selectPin(c); // after open(): open()→close() would otherwise clear it
    }

    function staticInit(d) {
      if (!d || d.dataset.init) return;
      d.dataset.init = "1";
      d.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
      if (d.id === "panel-join") {
        const form = d.querySelector(".join-form");
        const msg = form.querySelector(".form-msg");
        const input = form.querySelector("input");
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const v = input.value.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
            msg.textContent = t("join.bad");
            msg.classList.add("error");
            return;
          }
          msg.classList.remove("error");
          const endpoint = localStorage.getItem("formspree-endpoint");
          if (endpoint) {
            fetch(endpoint, { method: "POST", headers: { Accept: "application/json" },
              body: new URLSearchParams({ email: v }) })
              .then(() => { msg.textContent = t("join.ok"); input.value = ""; })
              .catch(() => { msg.textContent = t("join.err") + " " + CONTACT; });
          } else {
            window.location.href = `mailto:${CONTACT}?subject=${encodeURIComponent("Get the map first")}&body=${encodeURIComponent(v)}`;
            msg.textContent = t("join.mail");
          }
        });
      }
    }

    for (const key in drawers) staticInit(drawers[key]);
    document.querySelectorAll("[data-panel]").forEach((b) =>
      b.addEventListener("click", () => open(b.dataset.panel)));
    backdrop.addEventListener("click", close);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    /* the add-a-court composer: mailto built live */
    const buildMail = () => {
      if (!drawers.add || drawers.add.dataset.mailInit) return;
      drawers.add.dataset.mailInit = "1";
      const name = document.getElementById("add-name");
      const place = document.getElementById("add-place");
      const count = document.getElementById("add-count");
      const note = document.getElementById("add-note");
      const btn = document.getElementById("add-mail");
      const upd = () => {
        const n = name.value.trim() || "[court name]";
        const p = place.value.trim() || "[city, country]";
        const ct = count.value.trim();
        const nt = note.value.trim();
        btn.href = `mailto:${CONTACT}?subject=${encodeURIComponent(`Court addition: ${n} — ${p}`)}&body=${encodeURIComponent(
          `Court: ${n}\nPlace: ${p}\nSand courts: ${ct || "?"}\nNotes: ${nt || "—"}\n\nSent from the SandSpot registry map.`)}`;
      };
      [name, place, count, note].forEach((i) => i.addEventListener("input", upd));
      upd();
    };
    document.querySelectorAll('[data-panel="add"]').forEach((b) =>
      b.addEventListener("click", buildMail));
    buildMail();

    return { open, close, openCourt, current: () => current };
  })();

  /* ============================================================
     SEARCH
     ============================================================ */
  const Search = (() => {
    const input = document.getElementById("search-input");
    const panel = document.getElementById("search-results");
    const chips = Array.from(document.querySelectorAll(".chip"));
    const state = { q: "", types: new Set(), lights: false };

    // accent-fold everything: "berlin" must find "Berlín", "rode" finds "Röde".
    // Cyrillic survives NFD untouched, so "пляж" keeps working.
    const fold = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const norm = (s) => fold(s).replace(/united states/g, "usa");
    const tokens = (q) => fold(q).split(/[^a-z0-9а-яё]+/).filter(Boolean);

    const matches = (c) => {
      const hay = norm(`${c.name} ${c.city} ${c.country} ${c.region}`);
      return tokens(state.q).every((t) => hay.includes(t))
        && (state.types.size === 0 || state.types.has(c.court_type))
        && (!state.lights || !!c.has_lights);
    };

    // relevance: a query for a venue name beats a city-wide flood; inside the
    // same band the bigger complexes surface first (user asks "berlin" — the
    // flagship courts are what they came for, street parks come second).
    const relevance = (c) => {
      const q = norm(state.q.replace(/^[\s,]+|[\s,]+$/g, ""));
      if (!q) return 0;
      const name = norm(c.name);
      const place = norm(`${c.city || ""} ${c.region || ""}`);
      let s = 0;
      if (name === q) s += 4;
      else if (name.startsWith(q)) s += 3;
      else if (name.includes(q)) s += 2;
      if (place.includes(q)) s += 1;
      s += Math.min((c.num_courts || 0), 30) / 100;
      return s;
    };

    function rows(list) {
      const MAX = 12;
      const slice = list.slice(0, MAX);
      const extra = list.length - slice.length;
      if (!slice.length) {
        const q = state.q.trim() || "[name] — [city]";
        panel.innerHTML = `<div class="result-empty">${t("se.miss")}
          <a href="mailto:${CONTACT}?subject=${encodeURIComponent("Court addition: " + q)}">${t("se.link")}</a>
          ${t("se.tail")}</div>`;
        return;
      }
      const more = extra > 0
        ? `<div class="result-more">${t("se.more").replace("{n}", String(extra))}</div>` : "";
      panel.innerHTML = slice.map((c) => `
        <button class="result-row" type="button" data-id="${courtKey(c)}">
          <div>
            <div class="result-name">${c.name}</div>
            <div class="result-places">${placeOf(c)}</div>
          </div>
          <div class="result-meta">
            ${c.tier === "candidate" ? `<span class="result-tag cand">${t("c.candidate")}</span>` : ""}
            ${c.has_lights ? `<span class="result-tag public">${t("s.lit")}</span>` : ""}
            <span class="result-tag ${c.court_type}">${typeT(c.court_type)}</span>
            <span class="result-tag num">${c.num_courts ?? "?"}</span>
          </div>
        </button>`).join("") + more;
      panel.querySelectorAll(".result-row").forEach((row) => {
        row.addEventListener("click", () => {
          const c = COURT_INDEX.get(row.dataset.id);
          if (!c) return;
          panel.hidden = true;
          // records without coordinates open their record without a flight
          if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
            World.diveTo(c);
            setTimeout(() => Panels.openCourt(c), RM ? 0 : 820);
          } else {
            Panels.openCourt(c);
          }
        });
      });
    }

    function update() {
      if (!state.q.trim() && state.types.size === 0 && !state.lights) {
        rows([...COURTS].sort((a, b) => (b.num_courts || 0) - (a.num_courts || 0)).slice(0, 6));
        return;
      }
      const hit = COURTS.filter(matches).sort((a, b) =>
        relevance(b) - relevance(a)
        || (b.num_courts || 0) - (a.num_courts || 0)
        || norm(a.name).localeCompare(norm(b.name)));
      rows(hit);
    }

    input.addEventListener("input", () => { state.q = input.value; update(); panel.hidden = false; });
    input.addEventListener("focus", () => { update(); panel.hidden = false; });
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") { panel.hidden = true; input.blur(); } });
    document.addEventListener("pointerdown", (e) => {
      if (!panel.hidden && !e.target.closest(".search-shell")) panel.hidden = true;
    });
    chips.forEach((chip) => chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      const on = chip.getAttribute("aria-pressed") === "true";
      chip.setAttribute("aria-pressed", String(!on));
      if (f === "lights") state.lights = !on;
      else state.types[on ? "delete" : "add"](f);
      update(); panel.hidden = false;
    }));

    return { update, panel };
  })();

  /* ============================================================
     SPLASH — ball becomes the world, then hands it over.
     Plays on every visit: it is the brand statement, and it is short.
     ============================================================ */

  function drawSplashMap(svg) {
    svg.innerHTML = "";
    for (const d of window.SANDSPOT_WORLD_DOTS || []) {
      svg.appendChild(el("circle", { class: "land", cx: X(d[0]).toFixed(1), cy: YW(d[1]).toFixed(1), r: 2 }));
    }
    for (const a of ACCENTS) {
      svg.appendChild(el("circle", { class: "pin", cx: X(a.longitude).toFixed(1), cy: YW(a.latitude).toFixed(1), r: 4.4 }));
      if (ACCENTS.indexOf(a) < 5) {
        const t = el("text", { class: "city", x: X(a.longitude).toFixed(1) + 8, y: YW(a.latitude).toFixed(1) - 8 });
        t.textContent = a.city;
        svg.appendChild(t);
      }
    }
  }

  function armApp() {
    document.body.classList.add("app-live");
    const s = document.getElementById("splash");
    if (s) { s.classList.add("leave"); s.remove(); }
  }

  function splash() {
    const stage = document.getElementById("splash");
    if (!stage) { armApp(); return; }
    if (RM || !hasGSAP) { stage.remove(); armApp(); return; }

    const svg = document.getElementById("splashMap");
    gsap.set(svg, { opacity: 0 });
    gsap.set(svg.querySelectorAll(".pin"), { scale: 0, transformOrigin: "center" });
    gsap.set(svg.querySelectorAll(".city"), { opacity: 0 });
    gsap.set(".splash-title", { opacity: 0 });

    const guard = setTimeout(() => { gsap.globalTimeline.clear(); stage.remove(); armApp(); }, 8500);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { gsap.globalTimeline.clear(); stage.remove(); armApp(); }
    }, { once: true });

    const ball = document.querySelector(".splash-ball");
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.fromTo(ball,
      { x: "-92vw", rotate: -720 },
      { x: 0, rotate: 0, duration: 1.05, ease: "power2.inOut" }, 0.05)
      .to(ball, { scaleY: 0.8, scaleX: 1.14, duration: 0.16, ease: "power1.in" }, 1.02)
      .to(ball, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "power1.out" }, 1.16)
      .to(ball, { scale: 0.35, opacity: 0, duration: 0.55, ease: "power2.in" }, 1.5)
      .to(svg, { opacity: 1, duration: 0.35 }, 1.62)
      .fromTo(svg, { scale: 0.12 }, { scale: 1, duration: 1.05, ease: "power2.inOut" }, 1.62)
      .to(svg.querySelectorAll(".pin"), { scale: 1, duration: 0.65, stagger: 0.055, ease: "elastic.out(1,.55)" }, 2.6)
      .to(svg.querySelectorAll(".city"), { opacity: 1, duration: 0.4, stagger: 0.06 }, 2.85)
      .fromTo(".splash-title", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 2.9)
      .to(".splash-title", { opacity: 0, y: -18, duration: 0.5 }, 4.15)
      .to(svg, { opacity: 0, scale: 1.08, duration: 0.7, ease: "power1.in" }, 4.5)
      .to(stage, { opacity: 0, duration: 0.5, ease: "power1.in",
        onComplete: () => { clearTimeout(guard); stage.remove(); armApp(); } }, 4.75);
  }

  /* ============================================================
     Boot
     ============================================================ */
  async function main() {
    COURTS = await loadCourts();
    // accents need coordinates — restrict the pool to pin-able records
    ACCENTS = pickAccents(COURTS.filter((c) =>
      Number.isFinite(c.latitude) && Number.isFinite(c.longitude)), 9);

    COURT_INDEX.clear();
    const seen = new Set();
    for (const c of COURTS) {
      let k = courtKey(c);
      while (seen.has(k)) k = k + "_" + (++UID);
      seen.add(k); COURT_INDEX.set(k, c);
    }

    World.build(window.SANDSPOT_WORLD_DOTS || [], COURTS, ACCENTS);
    World.zoomButtons();
    World.sway();

    // the Court Desk (assets/suite.js) reads this — publish the loaded list
    window.SANDSPOT_COURTS_LIST = COURTS;

    document.querySelectorAll("[data-courts-tracked]").forEach((n) => (n.textContent = COURTS.length));

    // hint bar: one line of instruction, gone at the first touch
    const hint = document.getElementById("hintbar");
    if (hint) {
      const off = () => hint.classList.add("off");
      window.addEventListener("pointerdown", off, { once: true });
      window.addEventListener("wheel", off, { once: true, passive: true });
      setTimeout(off, 15000); // safety: dismiss even if nobody ever touches
    }

    // language switch: re-fall dynamic content, then recount interpolation
    document.addEventListener("sandspot:lang", () => {
      Panels.close();
      Search.update();
    });
    window.SandSpotI18N && window.SandSpotI18N.refresh && window.SandSpotI18N.refresh();

    Search.update();
    splash();
  }

  main();
})();
