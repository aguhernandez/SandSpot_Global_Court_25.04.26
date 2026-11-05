/* =============================================================
   SandSpot — Court Desk (booking layer foundation)
   Roles: player · venue owner · admin
   Runs as SANDBOX today: same state machine as the Supabase
   implementation (see supabase/schema.sql), backed by this
   device — swap lands automatically when /bookings is live.
   Entry is intentionally quiet: URL hash #login, or press "L".
   ============================================================= */
(() => {
  "use strict";
  const t = window.SandSpotI18N ? window.SandSpotI18N.t : (k) => k;

  const LS_STORE = "sandspot-suite";        // {users, owners, bookings, hours}
  const LS_SESS  = "sandspot-suite-session"; // {email, role}
  const DEMO_PASS = "demo1234";

  /* ------------------------------------------------------------ */
  /* tiny persistence                                              */
  /* ------------------------------------------------------------ */
  function loadStore() {
    try {
      const j = JSON.parse(localStorage.getItem(LS_STORE));
      if (j && Array.isArray(j.users)) return j;
    } catch (_) {}
    return { users: [], owners: [], bookings: [], hours: {} };
  }
  let store = loadStore();
  const saveStore = () => { try { localStorage.setItem(LS_STORE, JSON.stringify(store)); } catch (_) {} };
  const loadSession = () => {
    try { return JSON.parse(sessionStorage.getItem(LS_SESS)); } catch (_) {}
    return null;
  };
  let sess = loadSession();
  const saveSession = () => {
    try {
      sess ? sessionStorage.setItem(LS_SESS, JSON.stringify(sess))
           : sessionStorage.removeItem(LS_SESS);
    } catch (_) {}
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  async function sha256(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /* ------------------------------------------------------------ */
  /* courts access (main.js publishes the live list)                */
  /* ------------------------------------------------------------ */
  const courts = () => window.SANDSPOT_COURTS_LIST || [];
  // booking layer: only verified courts are bookable; census candidates
  // stay visible to search but never enter the slot machine
  const bookingCourts = () => courts().filter((c) => c.verified !== false);
  const courtKey = (c) =>
    "c" + String(c.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  const courtById = (id) => courts().find((c) => courtKey(c) === id);
  const courtLabel = (c) => c ? `${c.name} — ${c.city}` : "?";

  /* ------------------------------------------------------------ */
  /* booking engine — the real logic, portable to the API           */
  /* ------------------------------------------------------------ */
  const DEFAULT_H = { start: 9, end: 23 };
  const hoursFor = (cid) => {
    const h = store.hours[cid];
    return (h && h.start < h.end) ? h : DEFAULT_H;
  };
  const isTaken = (cid, date, start) =>
    store.bookings.some((b) =>
      b.courtId === cid && b.date === date && b.start === start &&
      b.status !== "cancelled");

  const slotsFor = (cid, date) => {
    const h = hoursFor(cid);
    const out = [];
    for (let s = h.start; s < h.end; s++) {
      const start = String(s).padStart(2, "0") + ":00";
      const end = String(s + 1).padStart(2, "0") + ":00";
      out.push({ start, end, taken: isTaken(cid, date, start) });
    }
    return out;
  };

  function book(cid, date, start, email) {
    if (isTaken(cid, date, start)) return { ok: false, why: "suite.taken" };
    const s = parseInt(start, 10);
    store.bookings.push({
      id: "b" + Math.random().toString(36).slice(2, 10),
      courtId: cid, date, start,
      end: String(s + 1).padStart(2, "0") + ":00",
      userEmail: email, status: "confirmed",
      createdAt: new Date().toISOString(),
    });
    saveStore();
    return { ok: true };
  }

  const owns = (email, cid) =>
    store.owners.some((o) => o.email === email && o.id === cid);

  const canCancel = (b, email, role) =>
    role === "admin" || b.userEmail === email || owns(email, b.courtId);

  function cancel(id, email, role) {
    const i = store.bookings.findIndex((b) => b.id === id);
    if (i < 0) return false;
    if (!canCancel(store.bookings[i], email, role)) return false;
    store.bookings.splice(i, 1);
    saveStore();
    return true;
  }

  /* ------------------------------------------------------------ */
  /* auth                                                          */
  /* ------------------------------------------------------------ */
  const normEmail = (e) => (e || "").trim().toLowerCase();

  async function makeAccount(email, pass, role) {
    email = normEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { err: "suite.wrong" };
    if (!pass || pass.length < 6) return { err: "suite.short" };
    if (!["player", "venue", "admin"].includes(role)) role = "player";
    if (store.users.some((u) => u.email === email)) return { err: "suite.exists" };
    const salt = Math.random().toString(36).slice(2, 14);
    store.users.push({
      email, salt, role,
      hash: await sha256(salt + pass),
      name: email.split("@")[0],
    });
    saveStore();
    return { ok: email, role };
  }

  async function signIn(email, pass) {
    email = normEmail(email);
    const u = store.users.find((x) => x.email === email);
    if (!u) return { err: "suite.wrong" };
    const h = await sha256(u.salt + pass);
    if (h !== u.hash) return { err: "suite.wrong" };
    return { ok: email, role: u.role };
  }

  async function seedDemo() {
    await ensure("admin@sandspot.app", "admin", "Admin Desk");
    await ensure("sede@sandspot.app", "venue", "Sede Demo");
    await ensure("jugador@sandspot.app", "player", "Player Demo");
    // grant the venue account the top courts so its console has teeth
    if (!store.owners.length) {
      [...bookingCourts()]
        .sort((a, b) => (b.num_courts || 0) - (a.num_courts || 0))
        .slice(0, 4)
        .forEach((c) => store.owners.push({ email: "sede@sandspot.app", id: courtKey(c) }));
    }
    saveStore();
    async function ensure(email, role, name) {
      if (store.users.some((u) => u.email === email)) return;
      const salt = Math.random().toString(36).slice(2, 14);
      store.users.push({ email, salt, role, name, hash: await sha256(salt + DEMO_PASS) });
    }
  }

  /* ------------------------------------------------------------ */
  /* UI                                                            */
  /* ------------------------------------------------------------ */
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const ui = { mode: "in", courtId: "", date: todayISO(), msg: "" };

  let drawer = null, backdrop = null;
  function ensureDom() {
    if (drawer) return;
    drawer = document.createElement("aside");
    drawer.className = "drawer";
    drawer.id = "panel-suite";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "false");
    drawer.hidden = true;
    document.body.appendChild(drawer);
    backdrop = document.createElement("div");
    backdrop.className = "drawer-backdrop";
    backdrop.id = "suite-backdrop";
    backdrop.hidden = true;
    backdrop.addEventListener("click", closeSuite);
    document.body.appendChild(backdrop);
  }

  function openSuite() {
    ensureDom();
    drawer.hidden = false;
    void drawer.offsetWidth;
    drawer.classList.add("open");
    backdrop.hidden = false;
    backdrop.classList.add("open");
    document.body.classList.add("map-dimmed");
    ui.msg = "";
    render();
  }
  function closeSuite() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    document.body.classList.remove("map-dimmed");
    setTimeout(() => { drawer.hidden = true; backdrop.hidden = true; }, 480);
  }
  const isOpen = () => drawer && !drawer.hidden;
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) return closeSuite();
    if (e.key === "l" || e.key === "L") {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.matches("input, textarea, select")) return;
      if (isOpen()) closeSuite(); else openSuite();
    }
  });
  function routeHash() {
    if (location.hash === "#login" && !isOpen()) openSuite();
  }
  window.addEventListener("hashchange", routeHash);
  document.addEventListener("DOMContentLoaded", routeHash);
  if (location.hash === "#login") setTimeout(routeHash, 0);

  document.addEventListener("sandspot:lang", () => { if (isOpen()) render(); });

  /* ---------- render ---------- */
  function wire() {
    drawer.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeSuite));
    drawer.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      ui.mode = b.dataset.tab; ui.msg = ""; render();
    }));
    drawer.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", onAct));
    drawer.querySelectorAll("[data-change]").forEach((n) => n.addEventListener("change", onChange));
  }

  async function onAct(e) {
    const act = e.currentTarget.dataset.act;
    ui.msg = "";
    const emailEl = drawer.querySelector("#suite-mail");
    const passEl = drawer.querySelector("#suite-pass");
    if (act === "signout") {
      sess = null; saveSession(); render(); return;
    }
    if (act === "demo") {
      await seedDemo();
      ui.msg = "demo ready: admin@sandspot.app / sede@sandspot.app / jugador@sandspot.app — " + DEMO_PASS;
      render(); return;
    }
    if (act === "go") {
      const roleSel = drawer.querySelector("#suite-role");
      const res = ui.mode === "new"
        ? await makeAccount(emailEl.value, passEl.value, roleSel ? roleSel.value : "player")
        : await signIn(emailEl.value, passEl.value);
      if (res.err) { ui.msg = t(res.err); ui.err = true; render(); return; }
      sess = { email: res.ok, role: res.role };
      saveSession();
      ui.err = false;
      ui.msg = res.role === "player" && ui.mode === "new" ? t("suite.done") : "";
      render(); return;
    }
    if (act === "book") {
      const cid = ui.courtId, date = ui.date, start = e.currentTarget.dataset.slot;
      if (!cid) return;
      const res = book(cid, date, start, sess.email);
      ui.msg = res.ok ? "" : t(res.why);
      ui.err = !res.ok;
      render(); return;
    }
    if (act === "cancel") {
      cancel(e.currentTarget.dataset.id, sess.email, sess.role);
      ui.msg = "";
      render(); return;
    }
    if (act === "assign") {
      const cid = drawer.querySelector("#adm-court")?.value;
      const owner = normEmail(drawer.querySelector("#adm-owner")?.value);
      if (cid && owner) {
        if (!store.owners.some((o) => o.email === owner && o.id === cid))
          store.owners.push({ email: owner, id: cid });
        saveStore();
        ui.msg = "granted ✓";
      }
      render(); return;
    }
    if (act === "export") {
      const blob = new Blob([JSON.stringify(store, null, 2)],
        { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "sandspot-sandbox.json";
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    if (act === "wipe") {
      store = { users: [], owners: [], bookings: [], hours: {} };
      sess = null; saveSession(); saveStore(); render(); return;
    }
  }

  function onChange(e) {
    const el = e.currentTarget;
    if (el.id === "suite-court") { ui.courtId = el.value; render(); }
    if (el.id === "suite-date") { ui.date = el.value || todayISO(); render(); }
    if (el.id === "suite-venue-court") { ui.vCourtId = el.value; render(); }
    if (el.id === "vn-start") { saveHours("start", parseInt(el.value, 10)); }
    if (el.id === "vn-end") { saveHours("end", parseInt(el.value, 10)); }
  }
  function saveHours(part, v) {
    if (!ui.vCourtId || !Number.isFinite(v)) return;
    const h = { ...hoursFor(ui.vCourtId), [part]: v };
    if (h.start < h.end) store.hours[ui.vCourtId] = h;
    saveStore();
    render();
  }

  const headHTML = () => `
    <header class="drawer-head">
      <h2>${t("suite.title")}</h2>
      <button class="drawer-close" data-close aria-label="${t("close.a")}">×</button>
    </header>`;

  function render() {
    ensureDom();
    const body = !sess ? renderAuth() : renderDesk();
    drawer.innerHTML = headHTML() + `<div class="drawer-body">${body}</div>`;
    wire();
  }

  function msgHTML() {
    if (!ui.msg) return "";
    return `<p class="suite-msg${ui.err ? " error" : ""}">${esc(ui.msg)}</p>`;
  }

  function renderAuth() {
    const note = `<p class="suite-note">${t("suite.note")}</p>`;
    return `
      <div class="suite-tabs">
        <button type="button" data-tab="in" class="${ui.mode === "in" ? "on" : ""}">${t("suite.tabIn")}</button>
        <button type="button" data-tab="new" class="${ui.mode === "new" ? "on" : ""}">${t("suite.tabNew")}</button>
      </div>
      <div class="add-fields">
        <label><span>${t("suite.mail")}</span>
          <input id="suite-mail" type="email" autocomplete="username" />
        </label>
        <label><span>${t("suite.pass")}</span>
          <input id="suite-pass" type="password" autocomplete="current-password" />
        </label>
        ${ui.mode === "new" ? `
        <label><span>${t("suite.role")}</span>
          <select id="suite-role" class="suite-input">
            <option value="player">${t("suite.player")}</option>
            <option value="venue">${t("suite.venue")}</option>
            <option value="admin">${t("suite.admin")}</option>
          </select>
        </label>` : ""}
      </div>
      ${msgHTML()}
      <div class="drawer-cta">
        <button class="btn-solid" data-act="go">${ui.mode === "in" ? t("suite.tabIn") : t("suite.tabNew")}</button>
        <button class="btn-ghost" data-act="demo">${t("suite.demo")}</button>
      </div>
      ${note}`;
  }

  function userBar() {
    return `
      <div class="suite-user">
        <span>${esc(sess.email)}</span>
        <span class="suite-rolechip">${esc(sess.role)}</span>
        <button class="btn-ghost suite-out" data-act="signout">${t("suite.out")}</button>
      </div>`;
  }

  function renderDesk() {
    const note = `<p class="suite-note">${t("suite.note")}</p>`;
    if (sess.role === "admin") return userBar() + adminView() + note;
    if (sess.role === "venue") return userBar() + venueView() + note;
    return userBar() + playerView() + note;
  }

  /* player: pick court, pick day, grab a slot */
  function playerView() {
    const list = bookingCourts();
    if (!list.length) return `<p class="suite-note">Loading sand…</p>`;
    if (!ui.courtId) ui.courtId = courtKey(list[0]);
    const opts = [...list]
      .sort((a, b) => (a.name + a.city).localeCompare(b.name + b.city))
      .map((c) => `<option value="${courtKey(c)}"${courtKey(c) === ui.courtId ? " selected" : ""}>${courtLabel(c)}</option>`)
      .join("");
    const slots = slotsFor(ui.courtId, ui.date).map((s) =>
      `<button type="button" class="slot-btn${s.taken ? " taken" : ""}" data-act="book" data-slot="${s.start}">${s.start}<em>${s.end}</em></button>`
    ).join("");
    const mine = store.bookings
      .filter((b) => b.userEmail === sess.email)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .map((b) => `<div class="suite-item">
        <strong>${esc(courtLabel(courtById(b.courtId)).split(" — ")[0])}</strong>
        <span>${b.date} · ${b.start}</span>
        <button class="btn-ghost mini" data-act="cancel" data-id="${b.id}">${t("suite.cancel")}</button>
      </div>`)
      .join("") || `<p class="suite-note">${t("suite.none")}</p>`;
    return `
      <div class="suite-fields">
        <label><span>${t("suite.pickCourt")}</span>
          <select id="suite-court" class="suite-input" data-change>${opts}</select>
        </label>
        <label><span>${t("suite.pickDate")}</span>
          <input id="suite-date" type="date" value="${ui.date}" min="${todayISO()}" data-change />
        </label>
      </div>
      <p class="suite-kicker">${t("suite.slots")}</p>
      <div class="slots">${slots}</div>
      ${msgHTML()}
      <p class="suite-kicker">${t("suite.mine")}</p>
      <div class="suite-list">${mine}</div>`;
  }

  /* venue owner: hours + the bookings on my sand */
  function venueView() {
    const owned = bookingCourts().filter((c) => owns(sess.email, courtKey(c)));
    if (!owned.length)
      return `<p class="suite-note">No venues granted yet. Ask an admin to grant them, or use the demo login: sede@sandspot.app / ${DEMO_PASS}.</p>`;
    if (!ui.vCourtId) ui.vCourtId = courtKey(owned[0]);
    const cur = owned.find((c) => courtKey(c) === ui.vCourtId) || owned[0];
    const cid = courtKey(cur);
    const h = hoursFor(cid);
    const opts = owned.map((c) =>
      `<option value="${courtKey(c)}"${courtKey(c) === cid ? " selected" : ""}>${courtLabel(c)}</option>`).join("");
    const hours = `<select id="vn-start" class="suite-input slim" data-change>` +
      Array.from({ length: 24 }, (_, i) => `<option value="${i}"${i === h.start ? " selected" : ""}>${String(i).padStart(2, "0")}:00</option>`).join("") + `</select>` +
      `<span class="suite-arrow">→</span>` +
      `<select id="vn-end" class="suite-input slim" data-change>` +
      Array.from({ length: 24 }, (_, i) => `<option value="${i + 1}"${i + 1 === h.end ? " selected" : ""}>${String(i + 1).padStart(2, "0")}:00</option>`).join("") + `</select>`;
    const bs = store.bookings
      .filter((b) => b.courtId === cid)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .map((b) => `<div class="suite-item">
        <strong>${b.date} · ${b.start}</strong>
        <span>${esc(b.userEmail)}</span>
        <button class="btn-ghost mini" data-act="cancel" data-id="${b.id}">${t("suite.cancel")}</button>
      </div>`)
      .join("") || `<p class="suite-note">${t("suite.none")}</p>`;
    return `
      <div class="suite-fields">
        <label><span>${t("suite.pickCourt")}</span>
          <select id="suite-venue-court" class="suite-input" data-change>${opts}</select>
        </label>
      </div>
      <p class="suite-kicker">${t("d.hours")}</p>
      <div class="suite-row">${hours}</div>
      ${msgHTML()}
      <p class="suite-kicker">Bookings on this sand</p>
      <div class="suite-list">${bs}</div>`;
  }

  /* admin: overview, grants, everything */
  function adminView() {
    const opts = [...bookingCourts()]
      .sort((a, b) => (a.name + a.city).localeCompare(b.name + b.city))
      .map((c) => `<option value="${courtKey(c)}">${courtLabel(c)}</option>`).join("");
    const users = store.users.map((u) => `<div class="suite-item">
        <strong>${esc(u.email)}</strong>
        <span class="suite-rolechip">${esc(u.role)}</span>
      </div>`).join("") || `<p class="suite-note">no accounts yet</p>`;
    const grants = store.owners.map((o) => {
      const c = courtById(o.id);
      return `<div class="suite-item"><strong>${esc(c ? c.name : o.id)}</strong><span>→ ${esc(o.email)}</span></div>`;
    }).join("") || `<p class="suite-note">no grants yet</p>`;
    const all = store.bookings
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .map((b) => `<div class="suite-item">
        <strong>${esc(courtLabel(courtById(b.courtId)).split(" — ")[0])}</strong>
        <span>${b.date} · ${b.start} · ${esc(b.userEmail)}</span>
        <button class="btn-ghost mini" data-act="cancel" data-id="${b.id}">${t("suite.cancel")}</button>
      </div>`)
      .join("") || `<p class="suite-note">${t("suite.none")}</p>`;
    return `
      <div class="suite-stats">
        <div class="stat"><div class="n">${bookingCourts().length}</div><div class="k">${t("hud.on")}</div></div>
        <div class="stat"><div class="n">${store.bookings.length}</div><div class="k">bookings</div></div>
        <div class="stat"><div class="n">${store.users.length}</div><div class="k">accounts</div></div>
      </div>
      <p class="suite-kicker">Court grants</p>
      <div class="suite-row">
        <select id="adm-court" class="suite-input slim">${opts}</select>
        <input id="adm-owner" class="suite-input slim grow" type="email" placeholder="owner@sandspot.app" />
        <button class="btn-solid mini" data-act="assign">Grant</button>
      </div>
      ${msgHTML()}
      <p class="suite-kicker">Accounts</p>
      <div class="suite-list">${users}</div>
      <p class="suite-kicker">All bookings</p>
      <div class="suite-list">${all}</div>
      <div class="drawer-cta">
        <button class="btn-ghost" data-act="export">${t("suite.export")}</button>
        <button class="btn-ghost danger" data-act="wipe">${t("suite.wipe")}</button>
      </div>
      <p class="suite-note">Real deployment: run supabase/schema.sql, then this console swops its localStorage brain for REST. Demo: admin@sandspot.app / ${DEMO_PASS}</p>`;
  }

  window.SandSpotSuite = { open: openSuite, close: closeSuite, seedDemo };
})();
