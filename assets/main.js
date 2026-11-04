/* =============================================================
   SandSpot — main.js
   Ball → world → pins → open search. No framework, no build step.
   Graceful: without GSAP/Lenis or with reduced motion the page
   renders complete and static.
   ============================================================= */
(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasST = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------
     Config
     ------------------------------------------------------------ */
  // Public anon key — read-only, same key the registry app ships.
  const SUPA = {
    url: "https://zulrcnamozmwzifapduq.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bHJjbmFtb3ptd3ppZmFwZHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDA4ODcsImV4cCI6MjA4NzA3Njg4N30.3Ga_1x40MNy31NOJCCZOaqy8NC_8ckfy7wUmxnYltso",
  };
  const CONTACT = "hello@sandspot.app"; // TODO: replace with the real inbox

  let COURTS = [];
  let LENIS = null;

  /* ------------------------------------------------------------
     Projection: lng/lat → svg viewBox 1000×520
     ------------------------------------------------------------ */
  const VW = 1000, VH = 520;
  const X = (lng) => ((lng + 180) / 360) * VW;
  const Y = (lat) => ((84 - Math.min(Math.max(lat, -58), 84)) / 142) * VH;

  const SVGNS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}) => {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  /* ------------------------------------------------------------
     Data: live registry first, local snapshot as fallback
     ------------------------------------------------------------ */
  const FIELD = "id,name,city,country,court_type,num_courts,latitude,longitude,has_lights,price_per_hour";

  async function loadCourts() {
    // 1) live
    try {
      const r = await Promise.race([
        fetch(`${SUPA.url}/rest/v1/courts?select=${encodeURIComponent(FIELD)}&status=eq.approved`, {
          headers: { apikey: SUPA.key, Authorization: `Bearer ${SUPA.key}` },
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
      ]);
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length) return data;
      }
    } catch (_) { /* offline or slow — fall through */ }
    // 2) local snapshot
    try {
      const r = await fetch("data/courts-live.json");
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length) return data;
      }
    } catch (_) { /* file:// without server, etc. */ }
    return [];
  }

  /* ------------------------------------------------------------
     World builders
     ------------------------------------------------------------ */
  const UID = Math.random().toString(36).slice(2);

  function courtKey(c) { return `c${String(c.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || UID}`; }

  // picks a visually global set: best courts, one per country
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

  function drawWorld(svg, { dotR = 2.1, dim = false, courtLayer = false, batch = 0 } = {}) {
    svg.innerHTML = "";
    const dots = window.SANDSPOT_WORLD_DOTS || [];
    const base = el("g", { class: "geo" });
    if (batch > 0) {
      let g = null, i = 0, count = 0;
      for (const d of dots) {
        if (i % batch === 0) { g = el("g", { class: "mdg group" }); base.appendChild(g); }
        g.appendChild(el("circle", { cx: X(d[0]).toFixed(1), cy: Y(d[1]).toFixed(1), r: dotR }));
        if (dim) g.setAttribute("opacity", "0.14");
        i++;
      }
    } else {
      for (const d of dots) {
        base.appendChild(el("circle", { cx: X(d[0]).toFixed(1), cy: Y(d[1]).toFixed(1), r: dotR }));
      }
      if (dim) base.setAttribute("opacity", ".5");
    }
    svg.appendChild(base);

    if (courtLayer) {
      const pinned = el("g", { class: "pins" });
      for (const c of COURTS) {
        if (c.latitude == null || c.longitude == null) continue;
        pinned.appendChild(el("circle", {
          class: "mc", "data-id": courtKey(c),
          cx: X(c.longitude).toFixed(1), cy: Y(c.latitude).toFixed(1),
          r: c.num_courts >= 9 ? 3.1 : 2.4,
        }));
      }
      for (const a of ACCENTS) {
        const idx = ACCENTS.indexOf(a);
        pinned.appendChild(el("circle", { class: "pin", cx: X(a.longitude).toFixed(1), cy: Y(a.latitude).toFixed(1), r: 4.6 }));
        if (idx < 5) {
          const t = el("text", { class: "map-city", x: X(a.longitude).toFixed(1) + 8, y: Y(a.latitude).toFixed(1) - 8 });
          t.textContent = a.city;
          pinned.appendChild(t);
        }
      }
      svg.appendChild(pinned);
    }
  }

  let ACCENTS = [];

  /* ------------------------------------------------------------
     Hero choreography — the ball becomes the world
     ------------------------------------------------------------ */
  const SPLASH_SEEN = "sandspot-splash-seen";

  function finishHero() {
    const stage = document.querySelector(".ball-stage");
    if (stage) stage.classList.add("done");
    document.documentElement.classList.add("ready");
    if (hasST) ScrollTrigger.refresh();
  }

  function heroChoreo() {
    const splashDone = sessionStorage.getItem(SPLASH_SEEN) === "1";
    if (RM || !hasGSAP || splashDone) { finishHero(); startScrollFX(RM || !hasGSAP ? "skip" : "full"); return; }
    sessionStorage.setItem(SPLASH_SEEN, "1");

    // fail-safe: if rAF is throttled (background window) or gsap hiccups,
    // force the settled state so the hero never stays hidden
    const guard = setTimeout(() => {
      if (!document.documentElement.classList.contains("ready")) {
        gsap.globalTimeline.clear();
        finishHero();
        startScrollFX("skip");
      }
    }, 6800);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !document.documentElement.classList.contains("ready")) {
        gsap.globalTimeline.clear();
        finishHero();
        startScrollFX("skip");
      }
    }, { once: true });

    const ball = document.querySelector(".splash-ball");
    const world = document.querySelector("#heroMap");
    gsap.set(world, { opacity: 0 });
    gsap.set(".pin", { scale: 0, transformOrigin: "center" });
    gsap.set(".map-city", { opacity: 0 });
    gsap.set([".t-line", ".hero-search", ".hero-metade", ".topbar"], { opacity: 0, y: 34 });

    const tl = gsap.timeline({
      defaults: { ease: "power2.out", duration: 0.9 },
      onComplete: () => { clearTimeout(guard); finishHero(); startScrollFX("full"); },
    });

    tl.fromTo(ball,
      { x: "-92vw", rotate: -720 },
      { x: 0, rotate: 0, duration: 1.1, ease: "power2.inOut" }, 0.05)
      .to(ball, { scaleY: 0.8, scaleX: 1.14, duration: 0.16, ease: "power1.in" }, 1.05)
      .to(ball, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "power1.out" }, 1.2)
      // the morph: ball shrinks away, the dot-world blooms out of it
      .to(ball, { scale: 0.4, opacity: 0, duration: 0.55, ease: "power2.in" }, 1.55)
      .fromTo(world, { opacity: 0, scale: 0.11, transformOrigin: "50% 50%" },
        { opacity: 1, scale: 1, duration: 1.0, ease: "power2.inOut" }, 1.7)
      .to(".pin", { scale: 1, duration: 0.7, stagger: 0.07, ease: "elastic.out(1, 0.55)" }, 2.55)
      .to(".map-city", { opacity: 1, duration: 0.4, stagger: 0.06 }, 2.9)
      .to(".topbar", { opacity: 1, y: 0, duration: 0.6 }, 2.75)
      .to(".t-line", { opacity: 1, y: 0, duration: 0.75, stagger: 0.1 }, 2.9)
      .to(".hero-search", { opacity: 1, y: 0, duration: 0.7 }, 3.15)
      .to(".hero-metade", { opacity: 1, y: 0, duration: 0.6 }, 3.3);
  }

  /* ------------------------------------------------------------
     Scroll effects
     ------------------------------------------------------------ */
  function revealObserver() {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { threshold: 0.18 });
    document.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
  }

  function wipeStatement() {
    const stm = document.querySelector("[data-wipe]");
    if (!stm) return;
    const words = stm.textContent.trim().split(/\s+/);
    stm.innerHTML = words.map((w) => `<span class="wipe-word">${w}</span>`).join(" ");
    const spans = stm.querySelectorAll(".wipe-word");
    if (RM || !hasST) { spans.forEach((s) => s.classList.add("on")); return; }
    let lastOn = -1;
    ScrollTrigger.create({
      trigger: ".why", start: "top 78%", end: "top 22%", scrub: true,
      onUpdate: (self) => {
        const n = Math.floor(self.progress * spans.length);
        for (let i = Math.max(0, lastOn + 1); i <= n && i < spans.length; i++) spans[i].classList.add("on");
        for (let i = n + 1; i <= lastOn && i < spans.length; i++) spans[i].classList.remove("on");
        lastOn = Math.max(n, lastOn < n ? n : lastOn);
      },
    });
  }

  function mapScrub(count) {
    const svg = document.querySelector("#worldMap");
    const counter = document.getElementById("map-count");
    if (RM || !hasST) {
      svg.querySelectorAll(".mdg").forEach((g) => g.setAttribute("opacity", "1"));
      counter.textContent = count;
      return;
    }
    const groups = svg.querySelectorAll(".mdg");
    groups.forEach((g) => gsap.set(g, { opacity: 0.14 }));
    const pins = svg.querySelectorAll(".mc, .pin, .map-city");
    gsap.set(pins, { opacity: 0 });

    const state = { v: 0 };
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".map-section", start: "top 70%", end: "bottom 55%", scrub: 0.6,
        onUpdate: () => { counter.textContent = Math.floor(state.v); },
      },
    });
    tl.to(groups, { opacity: 1, duration: 3, stagger: 2.2 }, 0);
    tl.to(pins, { opacity: 1, scale: 1, transformOrigin: "center", duration: 1.4, stagger: 0.05 }, 0.5);
    tl.to(state, { v: count, duration: 4, ease: "power1.out" }, 0.2);

    // parallax: the hero world drifts up as you leave
    gsap.to("#heroMap", {
      yPercent: -12, scale: 1.05, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  }

  function startScrollFX(mode) {
    revealObserver();
    wipeStatement();
    if (mode === "skip") {
      // everything visible, no scrubbing
      document.querySelectorAll("#worldMap .mdg").forEach((g) => g.setAttribute("opacity", "1"));
      document.querySelectorAll("#worldMap .mc, #worldMap .pin, #worldMap .map-city").forEach((n) => {
        if (hasGSAP) gsap.set(n, { opacity: 1, scale: 1 });
      });
      document.getElementById("map-count").textContent = COURTS.length;
      return;
    }
    mapScrub(COURTS.length);
    // ledger rows enter once
    if (hasST) {
      gsap.from(".ledger-table tbody tr", {
        opacity: 0, y: 24, duration: 0.7, stagger: 0.08, ease: "power2.out",
        scrollTrigger: { trigger: ".ledger", start: "top 78%" },
      });
    }
  }

  /* ------------------------------------------------------------
     The net divider — generated lattice, one quiet brand mark
     ------------------------------------------------------------ */
  function drawNet() {
    const box = document.querySelector(".net-divider");
    if (!box) return;
    const W = 1440, H = 80, sag = 34;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
    const chalk = "rgba(255,255,255,.9)";
    // posts
    svg.appendChild(el("line", { x1: 36, y1: 0, x2: 36, y2: H, stroke: chalk, "stroke-width": 3.4 }));
    svg.appendChild(el("line", { x1: W - 36, y1: 0, x2: W - 36, y2: H, stroke: chalk, "stroke-width": 3.4 }));
    // saged edges
    svg.appendChild(el("path", { d: `M36 4 Q ${W / 2} ${4 + sag} ${W - 36} 4`, fill: "none", stroke: chalk, "stroke-width": 2.6 }));
    svg.appendChild(el("path", { d: `M36 ${H - 4} Q ${W / 2} ${H - 4 - sag * 0.4} ${W - 36} ${H - 4}`, fill: "none", stroke: chalk, "stroke-width": 1.2, opacity: ".6" }));
    // mesh diagonals between the two sagging edges
    const N = 46;
    for (let i = 0; i <= N; i++) {
      const x = 36 + (i / N) * (W - 72);
      const frac = i / N;
      const easeT = 4 * frac * (1 - frac); // 0 at posts, 1 at center
      const yt = 4 + (4 + sag) * easeT * 0.5;
      const yb = H - 4 - (H - 8) * 0.0 + ((H - 4) - (H - 4 - sag * 0.4)) * easeT * 0.5;
      svg.appendChild(el("line", { x1: x.toFixed(1), y1: yt.toFixed(1), x2: x.toFixed(1), y2: yb.toFixed(1), stroke: chalk, "stroke-width": 0.9, opacity: ".5" }));
    }
    box.appendChild(svg);
  }

  /* ------------------------------------------------------------
     Search — independent but real, over the live registry
     ------------------------------------------------------------ */
  const Search = (() => {
    const input = document.getElementById("search-input");
    const btn = document.getElementById("search-btn");
    const panel = document.getElementById("search-results");
    const chips = Array.from(document.querySelectorAll(".chip"));
    const state = { q: "", types: new Set(), lights: false, free: false };

    const norm = (s) => (s || "").toLowerCase().replace(/united states/g, "usa");
    const tokens = (q) => q.toLowerCase().split(/[^a-z0-9áéíóúüñç]+/).filter(Boolean);

    function matches(c) {
      const hay = norm(`${c.name} ${c.city} ${c.country}`);
      const okQ = tokens(state.q).every((t) => hay.includes(t));
      const okT = state.types.size === 0 || state.types.has(c.court_type);
      const okL = !state.lights || !!c.has_lights;
      const okF = !state.free || c.price_per_hour == null;
      return okQ && okT && okL && okF;
    }

    function rows(list) {
      const n = norm(state.q).replace(/^a$/, "");
      const q = state.q.trim();
      const slice = (list.length ? list : []).slice(0, 7);
      if (!slice.length) {
        const mail = `mailto:${CONTACT}?subject=${encodeURIComponent("Court addition: " + (q || "[name] — [city]"))}`;
        panel.innerHTML = `<div class="result-empty">No court matches that yet.
          <a href="${mail}">Send it to us</a> — it goes on file within days.</div>`;
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
            <span class="result-tag partner">${c.num_courts} courts</span>
          </div>
        </button>`).join("");
      panel.querySelectorAll(".result-row").forEach((row) => {
        row.addEventListener("click", () => {
          const c = COURTS.find((x) => courtKey(x) === row.dataset.id);
          close();
          focusOnMap(c);
        });
      });
    }

    function update() {
      const list = COURTS.filter(matches);
      if (!state.q.trim() && state.types.size === 0 && !state.lights && !state.free) {
        // quiet default: the biggest courts we have
        rows([...COURTS].sort((a, b) => (b.num_courts || 0) - (a.num_courts || 0)).slice(0, 5));
        return;
      }
      rows(list);
    }

    function open() { panel.hidden = false; }
    function close() { panel.hidden = true; }

    input.addEventListener("input", () => { state.q = input.value; update(); open(); });
    input.addEventListener("focus", () => { update(); open(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); input.blur(); } });
    btn.addEventListener("click", () => { update(); open(); input.focus(); });
    document.addEventListener("click", (e) => {
      if (!panel.hidden && !e.target.closest(".search-shell")) close();
    });
    chips.forEach((chip) => chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      const on = chip.getAttribute("aria-pressed") === "true";
      chip.setAttribute("aria-pressed", String(!on));
      if (f === "lights") state.lights = !on;
      else if (f === "free") state.free = !on;
      else state.types[on ? "delete" : "add"](f);
      update(); open();
    }));

    return { update };
  })();

  /* ------------------------------------------------------------
     Jump from a result to its dot on the world map
     ------------------------------------------------------------ */
  function smoothTo(sel, offset = "-40%") {
    const target = document.querySelector(sel);
    if (!target) return;
    if (LENIS) LENIS.scrollTo(target, { offset: 80, duration: 1.4 });
    else target.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
  }

  function focusOnMap(c) {
    if (!c) return;
    smoothTo("#map");
    const dot = document.querySelector(`#worldMap .mc[data-id="${courtKey(c)}"]`);
    if (!dot) return;
    if (hasGSAP) {
      gsap.set(dot, { opacity: 1 });
      gsap.fromTo(dot, { r: 2.4 }, {
        r: 9, duration: 0.45, ease: "power2.out", yoyo: true, repeat: 3,
        onComplete: () => gsap.set(dot, { r: c.num_courts >= 9 ? 3.1 : 2.4 }),
      });
    }
  }

  /* ------------------------------------------------------------
     Forms + counters + misc
     ------------------------------------------------------------ */
  function wireUI() {
    // counters
    const c = COURTS.length || 76;
    document.querySelectorAll("[data-courts-tracked]").forEach((n) => (n.textContent = c));
    const more = document.querySelector("[data-courts-pipeline]");
    if (more) more.textContent = `${Math.max(c - 6, 0)} more on file now — and the next few thousand are loading in.`;
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    // join form — honest: uses a real endpoint when provided, otherwise opens mail
    const form = document.getElementById("join-form");
    if (form) {
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
        const ls = localStorage.getItem("formspree-endpoint");
        if (ls) {
          fetch(ls, { method: "POST", headers: { Accept: "application/json" },
            body: new URLSearchParams({ email: v }) })
            .then(() => { msg.textContent = "You're in. One email when the map opens."; input.value = ""; })
            .catch(() => { msg.textContent = "Couldn't save that — send us a line instead: " + CONTACT; });
        } else {
          window.location.href = `mailto:${CONTACT}?subject=${encodeURIComponent("Get the map first")}&body=${encodeURIComponent(v)}`;
          msg.textContent = "Opening your mail app… (todo: plug a real endpoint — see main.js)";
        }
      });
    }
  }

  /* ------------------------------------------------------------
     Boot
     ------------------------------------------------------------ */
  function smoothScrollInit() {
    if (RM || !window.Lenis) return;
    LENIS = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    function raf(t) { LENIS.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (hasST) {
      LENIS.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => LENIS.raf(time * 1000));
    }
  }

  async function main() {
    drawNet();
    COURTS = await loadCourts();
    ACCENTS = pickAccents(COURTS, 9);

    drawWorld(document.getElementById("heroMap"), { dotR: 2.2, dim: false, courtLayer: true });
    drawWorld(document.getElementById("worldMap"), { dotR: 1.9, dim: true, courtLayer: true, batch: 48 });

    wireUI();
    Search.update();

    smoothScrollInit();
    heroChoreo(); // also calls startScrollFX once ready
    if (RM || !hasGSAP) finishHero(); // choreo short-circuited itself, run any leftovers
  }

  main();
})();
