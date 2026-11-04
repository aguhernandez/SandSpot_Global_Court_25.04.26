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
  const UID = Math.random().toString(36).slice(2);
  const courtKey = (c) =>
    `c${String(c.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || UID}`;

  const COURT_INDEX = new window.Map();

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

  async function loadCourts() {
    try {
      const r = await Promise.race([
        fetch(`${SUPA.url}/rest/v1/courts?select=${encodeURIComponent(
          "id,name,city,country,court_type,num_courts,latitude,longitude,has_lights,price_per_hour"
        )}&status=eq.approved`, {
          headers: { apikey: SUPA.key, Authorization: `Bearer ${SUPA.key}` },
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), 4000)),
      ]);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d) && d.length) return d; }
    } catch (_) { /* fall through */ }
    try {
      const r = await fetch("data/courts-live.json");
      if (r.ok) { const d = await r.json(); if (Array.isArray(d)) return d; }
    } catch (_) { /* file:// */ }
    return [];
  }

  /* ============================================================
     MAP ENGINE — pan / zoom / fly
     ============================================================ */
  const World = (() => {
    const svg = document.getElementById("worldMap");
    const cam = { k: 1, tx: 0, ty: 0 };
    const K_MAX = 7, K_MIN = 1;
    let flight = null;

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
      const minTx = -VW * (k - 1) / k, minTy = -VH * (k - 1) / k;
      return { k, tx: Math.min(0, Math.max(minTx, tx)), ty: Math.min(0, Math.max(minTy, ty)) };
    };

    let root = null, pinsRoot = null;

    function apply() {
      root.setAttribute("transform", `translate(${cam.tx} ${cam.ty}) scale(${cam.k})`);
      const inv = 1 / cam.k;
      pinsRoot.querySelectorAll(".mk").forEach((mk) => {
        mk.querySelector(".mk-in").setAttribute("transform", `scale(${inv})`);
      });
    }

    function build(geoDots, courtList, accents) {
      svg.innerHTML = "";
      root = el("g", { class: "root" });

      const geo = el("g", { class: "geo" });
      for (const d of geoDots) geo.appendChild(el("circle", { cx: X(d[0]).toFixed(1), cy: YW(d[1]).toFixed(1), r: 2 }));
      root.appendChild(geo);

      pinsRoot = el("g", { class: "pins" });
      const accentSet = new Set(accents);
      const add = (c, big, label) => {
        const g = el("g", {
          class: "mk" + (big ? " accent" : ""), "data-id": courtKey(c),
          transform: `translate(${X(c.longitude).toFixed(1)} ${YW(c.latitude).toFixed(1)})`,
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
      };
      for (const c of courtList) { if (accentSet.has(c)) continue; add(c, false, false); }
      accents.forEach((c, i) => add(c, true, i < 5));
      root.appendChild(pinsRoot);
      svg.appendChild(root);

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
          flyToPoint({ x: X(c.longitude), y: YW(c.latitude) }, Math.max(cam.k, 2.2), 850, 0.16);
          Panels.openCourt(c);
        }
      });
      apply();
    }

    /* --- grab / drag --- */
    let dragging = null;
    function onGrabStart(e) {
      svg.setPointerCapture(e.pointerId);
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
      const n = clamp(cam.k, cam.tx + dx / s, cam.ty + dy / s);
      cam.tx = n.tx; cam.ty = n.ty;
      apply();
    }

    /* --- wheel zoom --- */
    function onWheel(e) {
      e.preventDefault();
      const p = clientToView(e.clientX, e.clientY);
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
      if (RM) { cam.k = n.k; cam.tx = n.tx; cam.ty = n.ty; apply(); return; }
      const from = { ...cam }, to = n, t0 = performance.now();
      const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / ms), e = ease(p);
        cam.k = from.k + (to.k - from.k) * e;
        cam.tx = from.tx + (to.tx - from.tx) * e;
        cam.ty = from.ty + (to.ty - from.ty) * e;
        apply();
        if (p < 1 && flight) flight = requestAnimationFrame(tick);
      };
      flight = requestAnimationFrame(tick);
    }
    function stopFlight() {
      if (flight) { cancelAnimationFrame(flight); flight = null; }
    }

    function zoomButtons() {
      document.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => {
        const mode = b.dataset.zoom;
        const { ox, oy, r } = pxScale();
        const centerView = clientToView(r.left + ox + (VW / 2) * Math.min(r.width / VW, r.height / VH), r.top + oy + (VH / 2) * Math.min(r.width / VW, r.height / VH));
        if (mode === "in") zoomTo(cam.k * 1.45, centerView);
        if (mode === "out") zoomTo(cam.k / 1.45, centerView);
        if (mode === "fit") flyToPoint({ x: VW / 2, y: VH / 2 }, 1, 700);
      }));
    }

    function fit() { cam.k = 1; cam.tx = 0; cam.ty = 0; apply(); }

    window.addEventListener("keydown", (e) => {
      if (e.key === "+" || e.key === "=") zoomTo(cam.k * 1.3, { x: VW / 2, y: VH / 2 });
      if (e.key === "-") zoomTo(cam.k / 1.3, { x: VW / 2, y: VH / 2 });
      if (e.key === "0") fit();
    });

    /* idle sway: the world breathes when nobody touches it */
    let swayRAF = null, lastTouch = 0;
    function sway() {
      if (RM || swayRAF) return;
      const t0 = performance.now();
      const tick = (now) => {
        if (performance.now() - lastTouch < 4500) { swayRAF = null; return; }
        const t = (now - t0) / 1000;
        const dx = Math.sin(t * 0.32) * 4, dy = Math.cos(t * 0.21) * 3;
        root.setAttribute("transform",
          `translate(${cam.tx + dx} ${cam.ty + dy}) scale(${cam.k})`);
        const inv = 1 / cam.k;
        pinsRoot.querySelectorAll(".mk .mk-in").forEach((mk) => mk.setAttribute("transform", `scale(${inv})`));
        swayRAF = requestAnimationFrame(tick);
      };
      lastTouch = performance.now();
      swayRAF = requestAnimationFrame(tick);
      window.addEventListener("pointerdown", () => {
        lastTouch = performance.now();
        if (swayRAF) { cancelAnimationFrame(swayRAF); swayRAF = null; setTimeout(sway, 5000); }
      }, { passive: true });
    }

    return { build, zoomButtons, fit, flyToPoint, zoomTo, sway };
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

    function open(name) {
      close();
      const d = drawers[name];
      if (!d) return;
      staticInit(d);
      d.hidden = false;
      void d.offsetWidth; // force reflow — works even when the tab is hidden (rAF-throttled)
      d.classList.add("open");
      backdrop.hidden = false;
      void backdrop.offsetWidth;
      backdrop.classList.add("open");
      current = name;
      const f = d.querySelector("input, button:not([data-close])");
      if (f) setTimeout(() => f.focus({ preventScroll: true }), 260);
    }

    function close() {
      for (const key in drawers) {
        const d = drawers[key];
        if (!d || d.hidden) continue;
        d.classList.remove("open");
        setTimeout(() => { d.hidden = true; }, 480);
      }
      backdrop.classList.remove("open");
      setTimeout(() => { backdrop.hidden = true; }, 320);
      current = null;
    }

    function openCourt(c) {
      const d = drawers.court;
      d.innerHTML = `
        <header class="drawer-head">
          <h2>On file</h2>
          <button class="drawer-close" data-close aria-label="Close">×</button>
        </header>
        <div class="drawer-body">
          <div class="court-name">${c.name}</div>
          <div class="court-place">${c.city}, ${c.country}</div>
          <div class="court-meta">
            <div class="meta-cell"><div class="k">Sand courts</div><div class="v">${c.num_courts ?? "?"}</div></div>
            <div class="meta-cell"><div class="k">Access</div><div class="v">${c.court_type || "public"}</div></div>
            <div class="meta-cell"><div class="k">Night lights</div><div class="v">${c.has_lights ? "Yes" : "—"}</div></div>
            <div class="meta-cell"><div class="k">Price</div><div class="v">${c.price_per_hour != null ? "$" + c.price_per_hour + "/h" : "Free"}</div></div>
          </div>
          <div class="court-actions">
            <a class="btn-ghost" href="mailto:${CONTACT}?subject=${encodeURIComponent("Correction: " + c.name + " (" + c.city + ")")}">
              Spot a mistake? Correct this court
            </a>
            <span class="hint">Hand-checked by the people who play here. Registered <span data-copyright>2026</span>.</span>
          </div>
        </div>`;
      open("court");
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
            msg.textContent = "That email doesn't look right — try again.";
            msg.classList.add("error");
            return;
          }
          msg.classList.remove("error");
          const endpoint = localStorage.getItem("formspree-endpoint");
          if (endpoint) {
            fetch(endpoint, { method: "POST", headers: { Accept: "application/json" },
              body: new URLSearchParams({ email: v }) })
              .then(() => { msg.textContent = "You're in. One email when the map opens."; input.value = ""; })
              .catch(() => { msg.textContent = "Couldn't save that — send us a line: " + CONTACT; });
          } else {
            window.location.href = `mailto:${CONTACT}?subject=${encodeURIComponent("Get the map first")}&body=${encodeURIComponent(v)}`;
            msg.textContent = "Opening your mail app — plug a real endpoint later (see main.js TODO).";
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

    const norm = (s) => (s || "").toLowerCase().replace(/united states/g, "usa");
    const tokens = (q) => q.toLowerCase().split(/[^a-z0-9áéíóúüñç]+/).filter(Boolean);

    const matches = (c) => {
      const hay = norm(`${c.name} ${c.city} ${c.country}`);
      return tokens(state.q).every((t) => hay.includes(t))
        && (state.types.size === 0 || state.types.has(c.court_type))
        && (!state.lights || !!c.has_lights);
    };

    function rows(list) {
      const slice = list.slice(0, 8);
      if (!slice.length) {
        const q = state.q.trim() || "[name] — [city]";
        panel.innerHTML = `<div class="result-empty">No court matches that yet.
          <a href="mailto:${CONTACT}?subject=${encodeURIComponent("Court addition: " + q)}">Send it to us</a>
          — it goes on file within days.</div>`;
        return;
      }
      panel.innerHTML = slice.map((c) => `
        <button class="result-row" type="button" data-id="${courtKey(c)}">
          <div>
            <div class="result-name">${c.name}</div>
            <div class="result-places">${c.city}, ${c.country}</div>
          </div>
          <div class="result-meta">
            ${c.has_lights ? '<span class="result-tag public">lit</span>' : ""}
            <span class="result-tag ${c.court_type}">${c.court_type}</span>
            <span class="result-tag num">${c.num_courts}</span>
          </div>
        </button>`).join("");
      panel.querySelectorAll(".result-row").forEach((row) => {
        row.addEventListener("click", () => {
          const c = COURT_INDEX.get(row.dataset.id);
          if (!c) return;
          panel.hidden = true;
          World.flyToPoint({ x: X(c.longitude), y: YW(c.latitude) }, 2.4, 900, 0.16);
          setTimeout(() => Panels.openCourt(c), RM ? 0 : 780);
        });
      });
    }

    function update() {
      if (!state.q.trim() && state.types.size === 0 && !state.lights) {
        rows([...COURTS].sort((a, b) => (b.num_courts || 0) - (a.num_courts || 0)).slice(0, 6));
        return;
      }
      rows(COURTS.filter(matches));
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
     SPLASH — ball becomes the world, then hands it over
     ============================================================ */
  const SPLASH_SEEN = "sandspot-splash-seen";

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
    const seen = sessionStorage.getItem(SPLASH_SEEN) === "1";
    const stage = document.getElementById("splash");
    if (!stage) { armApp(); return; }
    if (RM || !hasGSAP || seen) { stage.remove(); armApp(); return; }
    sessionStorage.setItem(SPLASH_SEEN, "1");

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
    ACCENTS = pickAccents(COURTS, 9);

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

    document.querySelectorAll("[data-courts-tracked]").forEach((n) => (n.textContent = COURTS.length));

    Search.update();
    splash();
  }

  main();
})();
