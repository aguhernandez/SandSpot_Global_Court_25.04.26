#!/usr/bin/env python3
# ============================================================
# SandSpot — corpus importer
#
# Reads the user's beach-volleyball census corpus
# (~/Downloads/sandspot: CSV / XLSX / GeoJSON / ZIP "lote" files
# with divergent schemas), normalizes every record, merges
# duplicates and writes:
#
#   data/courts-all.json      — the merged registry
#   data/import-report.json   — provenance / counts / issues
#
# Ground rules (project honesty policy):
#   * candidate files ("candidatos/candidates") become tier="candidate"
#     and are never presented as verified
#   * NO_IMPORTAR / historicos / pendientes / referencias /
#     temporales / aggregate-summary files are skipped outright
#   * coordinates only when the source provides them; validated,
#     comma-normalized, transposition-checked, meters-scale junk dropped
#   * empty stays empty: unknown ≠ 0 courts, no invented ratings/photos
#   * "sin iluminación" style negations never become has_lights
#
# stdlib only — python3 scripts/import-courts.py
# ============================================================
import csv, difflib, hashlib, io, json, math, os, re, shutil, tempfile, unicodedata, zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

TODAY = "2026-11-05"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
DATA = os.path.join(REPO, "data")
SRC_DIRS = [os.path.expanduser("~/Downloads/sandspot")]

SKIP_RE = re.compile(
    r"NO_IMPORTAR|NO_PUBLICAR|historico|histórico|pendiente|referencias|"
    r"temporales|coverage|cobertura|audit|auditoria|auditoría|resumen|"
    r"LEEME|README|fuentes|actualizaciones|contactos_reservas|_legacy\b",
    re.I)
CAND_RE = re.compile(r"candidat", re.I)  # candidatos / candidates

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}

ALIASES = {
    "name":   ["nombre", "nombre_instalacion", "recinto", "venue",
               "venue_or_lead", "name", "instalacion"],
    "city":   ["ciudad", "ciudad_localidad", "city", "municipio"],
    "country":["pais", "country"],
    "code":   ["codigo_pais", "codigo_pais_iso", "country_code", "iso2", "codigo"],
    "region": ["division", "region_provincia", "provincia_estado",
               "provincia_departamento", "administrative_division", "region", "estado"],
    "address":["direccion", "address"],
    "lat":    ["latitud", "latitude", "lat", "latitud_gps"],
    "lng":    ["longitud", "longitude", "long", "lng", "longitud_gps"],
    "num":    ["numero_pistas", "numero_canchas_confirmado", "court_count",
               "numero_canchas", "num_courts"],
    "ext":    ["canchas_exteriores"],
    "cov":    ["canchas_cubiertas"],
    "total":  ["canchas_reportadas_total", "canchas_reportadas"],
    "type":   ["tipo_instalacion", "venue_type", "tipo"],
    "access": ["acceso", "categoria_acceso", "access"],
    "book":   ["metodo_reserva", "modalidad_reserva", "booking_method",
               "reserva_modalidad", "modalidad"],
    "booklink":["enlace_reservas", "enlace_reserva", "booking_link", "booking_url"],
    "phone":  ["telefono", "phone", "whatsapp"],
    "email":  ["email", "correo", "correo_electronico"],
    "web":    ["web", "web_oficial", "website", "sitio_web"],
    "surface":["superficie", "surface"],
    "hours":  ["horario", "horarios", "opening_hours", "hours"],
    "price":  ["precio", "precio_hora", "price"],
    "obs":    ["observaciones", "observacion", "notes", "notes_en",
               "comentarios", "detalle_acceso", "motivo_revision"],
    "oper":   ["estado_operativo", "operational_status", "oper_status"],
    "season": ["temporada", "season", "seasonal"],
    "pub":    ["publicacion_automatica", "publicación_autorizada", "publish"],
    "verif":  ["estado_verificacion", "nivel_verificacion", "estado_censo_20261028"],
    "gps":    ["gps_clase", "gps_accuracy", "precision_gps", "gps_precision",
               "gps_utilizable_en_mapa"],
    "src":    ["fuente", "fuente_primaria", "fuente_principal", "source_url", "fuente_gps"],
    "note_ok":["motivo_no_importar", "reason_not_imported"],
}

def strip_acc(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

def norm_hdr(h):
    s = strip_acc(str(h)).strip().lower()
    return re.sub(r"[\s\-\.\(\)]+", "_", s).strip("_")

ALIAS_INDEX = {}
for canon, lst in ALIASES.items():
    for a in lst:
        ALIAS_INDEX[norm_hdr(a)] = canon

# ---------- readers ----------

def read_csv(path):
    raw = open(path, "rb").read()
    if raw[:3] == b"\xef\xbb\xbf":
        enc = "utf-8-sig"
    else:
        try:
            raw.decode("utf-8"); enc = "utf-8"
        except UnicodeDecodeError:
            enc = "latin-1"
    txt = raw.decode(enc)
    head = txt[:4096]
    if head.count(";") > head.count(","):
        delim = ";"
    elif head.count(",") > 0:
        delim = ","
    else:
        delim = "\t"
    return list(csv.reader(io.StringIO(txt), delimiter=delim))

def xlsx_sheets(path):
    """All worksheets as (name, {colLetter: value}) row lists."""
    out = []
    try:
        z = zipfile.ZipFile(path)
    except Exception:
        return out
    with z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter() if t.tag.endswith("}t")))
        try:
            wb = ET.fromstring(z.read("xl/workbook.xml"))
            rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        except Exception:
            return out
        relmap = {r.get("Id"): r.get("Target") for r in rels}
        for sh in wb.findall(".//m:sheet", NS):
            rid = sh.get("{%s}id" % NS["r"])
            target = relmap.get(rid, "")
            if not target:
                continue
            target = target.lstrip("/")
            if not target.startswith("xl/"):
                target = "xl/" + target
            if target not in z.namelist():
                continue
            try:
                sheet = ET.fromstring(z.read(target))
            except ET.ParseError:
                continue
            rows = []
            for row in sheet.findall(".//m:sheetData/m:row", NS):
                vals = {}
                for c in row.findall("m:c", NS):
                    ref = c.get("r") or ""
                    mcol = re.match(r"[A-Z]+", ref)
                    if not mcol:
                        continue
                    col = mcol.group(0)
                    ve = c.find("m:v", NS)
                    s = ve.text if ve is not None else ""
                    t = c.get("t")
                    if t == "s" and s != "":
                        try:
                            s = shared[int(s)]
                        except Exception:
                            pass
                    if s not in (None, ""):
                        vals[col] = s
                if vals:
                    rows.append(vals)
            if rows:
                out.append((sh.get("name") or target, rows))
    return out

def parse_any(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        rows = read_csv(path)
        if len(rows) < 2:
            return []
        canon = [ALIAS_INDEX.get(norm_hdr(h)) for h in rows[0]]
        data = []
        for i, r in enumerate(rows[1:], start=2):
            if not any(isinstance(x, str) and x.strip() for x in r):
                continue
            rec = {}
            for j, c in enumerate(canon):
                if c and j < len(r) and r[j].strip():
                    rec[c] = r[j].strip()
            data.append(rec)
        return [(i, rec) for i, rec in enumerate(data, start=2)]
    if ext == ".xlsx":
        data = []
        for sname, rows in xlsx_sheets(path):
            best = None
            for idx, vals in enumerate(rows[:12]):
                hits = {}
                names = set()
                for v in vals.values():
                    c = ALIAS_INDEX.get(norm_hdr(v))
                    if c:
                        hits[v] = c
                        names.add(c)
                if len(names) >= 3:
                    best = (idx, hits)
                    break
            if not best:
                continue
            idx0, hits = best
            for i, vals in enumerate(rows[idx0 + 1:], start=idx0 + 2):
                rec = {}
                for colv, c in hits.items():
                    for col, v in vals.items():
                        if col == colv and v:
                            rec[c] = str(v).strip()
                if rec:
                    data.append((f"{sname}:{i}", rec))
        return data
    if ext == ".geojson":
        try:
            g = json.load(open(path, encoding="utf-8"))
        except Exception:
            return []
        feats = g.get("features", [])
        data = []
        for i, f in enumerate(feats, start=1):
            props = f.get("properties") or {}
            rec = {}
            for k, v in props.items():
                c = ALIAS_INDEX.get(norm_hdr(k))
                if c and v is not None:
                    s = str(v).strip()
                    if s and s.lower() not in ("none", "null"):
                        rec[c] = s
            geom = f.get("geometry") or {}
            if geom.get("type") == "Point" and len(geom.get("coordinates", [])) >= 2:
                rec["_geom"] = [geom["coordinates"][0], geom["coordinates"][1]]
            data.append((i, rec))
        return data
    return []

# ---------- value normalizers ----------
INT_RE = re.compile(r"^-?\d+$")
NUM_RE = re.compile(r"-?\d+")
URL_RE = re.compile(r"https?://[^\s,;\"']+", re.I)
LIGHTS_RE = re.compile(r"luces|iluminac|iluminad|flutlicht|floodlight|night.?light|éclairage|illuminaz|luz artificial", re.I)
NOLIGHTS_RE = re.compile(r"sin luces|sin ilumina|no incluye ilumina|no cuenta con ilumina|no hay ilumina|no posee ilumina|no tiene ilumina|not illuminated|no floodlight|non illumina", re.I)
PERMCLOSED_RE = re.compile(r"cerrad\w*.{0,30}(permanente|definitiv)|closed permanently|desmantelad", re.I)
NOPUB_RE = re.compile(r"sin gps|no numerical|not published|no numérico", re.I)
APPROX_RE = re.compile(r"aprox|referencial|referenci|approx|not exact|no exacta|contenedora|contenedor", re.I)
EXACT_RE = re.compile(r"exacta|exact|precisa|precise|explícita|explicita|equipamiento", re.I)
PARTNER_RE = re.compile(r"resort|hotel|club|privad|academ|academy|school|university|guest|member", re.I)

def to_float(s):
    if s is None:
        return None
    s = str(s).strip().replace(",", ".")
    if not re.fullmatch(r"[+-]?\d+(\.\d+)?|[+-]?\.\d+", s or ""):
        return None
    try:
        f = float(s)
        return f if math.isfinite(f) else None
    except ValueError:
        return None

def to_int(s):
    if s is None:
        return None
    if INT_RE.fullmatch(str(s).strip()):
        return int(s)
    m = NUM_RE.search(str(s))
    return int(m.group(0)) if m else None

def gps_class(txt):
    t = strip_acc(str(txt or "")).lower()
    if NOPUB_RE.search(t) or "no" == t.strip().lower():
        return "unconfirmed"
    if APPROX_RE.search(t):
        return "approx"
    if EXACT_RE.search(t):
        return "exact"
    return "approx"

def class_type(rec):
    texts = " ".join(x for x in (rec.get("type"), rec.get("access")) if x).lower()
    if PARTNER_RE.search(texts):
        return "partner"
    return "public"

def lights_in(rec):
    joined = strip_acc(" ".join(rec.get(k) or "" for k in
                                ("type", "access", "book", "obs", "hours", "num_txt"))).lower()
    if NOLIGHTS_RE.search(joined):
        return False
    return bool(LIGHTS_RE.search(joined))

def clean_text(s, cap=280):
    s = re.sub(r"\s+", " ", str(s)).strip()
    if len(s) <= cap:
        return s
    return s[:cap].rstrip() + "…"

# ---------- record assembly ----------
# a few candidate files carry no country column; derive it from the filename
FILE_COUNTRY = {
    "rusia": "Russia",
    "estados_unidos": "United States",
    "estados unidos": "United States",
}

def make_record(raw, tier, fname, rowno, report):
    rec = dict(raw)
    lat = to_float(rec.get("lat"))
    lng = to_float(rec.get("lng"))
    if "_geom" in rec:
        if lat is None:
            lat = to_float(rec["_geom"][1])
        if lng is None:
            lng = to_float(rec["_geom"][0])
        rec.pop("_geom", None)

    if lat is not None and lng is not None:
        if abs(lat) > 90 and abs(lng) <= 90:      # transposed pair
            lat, lng = lng, lat
            report["coord_swapped"] += 1
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            report["coord_dropped"] += 1
            lat = lng = None

    num = to_int(rec.get("num"))
    if num is None:
        ext, cov, tot = to_int(rec.get("ext")), to_int(rec.get("cov")), to_int(rec.get("total"))
        if tot is not None:
            num = tot
        elif ext is not None and cov is not None:
            num = ext + cov
        elif ext is not None:
            num = ext

    name = rec.get("name") or ""
    if not name:
        return None

    website, booking_url = "", ""
    for key in ("web", "booklink"):
        val = rec.get(key) or ""
        for m in URL_RE.finditer(val):
            if key == "booklink" or "reserva" in val.lower() or "book" in val.lower():
                booking_url = booking_url or m.group(0)
            else:
                website = website or m.group(0)
    book_txt = rec.get("book") or ""
    m2 = URL_RE.search(book_txt)
    if m2:
        booking_url = booking_url or m2.group(0)

    # operative status — flags only; nothing is published as "open"
    status_bits = []
    for key, prefix in (("oper", ""), ("season", ""), ("verif", "")):
        if rec.get(key):
            status_bits.append(clean_text(rec[key], 120))
    if rec.get("pub"):
        status_bits.append("auto-publish: " + clean_text(rec["pub"], 80))
    if PERMCLOSED_RE.search(strip_acc(" ".join(status_bits)).lower()):
        report["dropped_permanently_closed"] += 1
        return None

    description = " — ".join(x for x in (
        clean_text(rec["type"], 90) if rec.get("type") else "",
        clean_text(rec["access"], 140) if rec.get("access") else "",
    ) if x)
    if book_txt:
        btxt = clean_text(book_txt, 120)
        description += (" · " if description else "") + "Booking: " + btxt

    country = rec.get("country")
    if not country:
        fnl = fname.lower()
        for tok, ctry in FILE_COUNTRY.items():
            if tok in fnl:
                country = ctry
                break

    code = strip_acc(rec.get("code") or "").upper()
    cc = re.match(r"[A-Z]{2}", code)

    return {
        "name": clean_text(name, 120),
        "city": clean_text(rec.get("city") or "", 90) or None,
        "country": clean_text(country or "", 80) or None,
        "country_code": cc.group(0) if cc else None,
        "region": clean_text(rec.get("region") or "", 90) or None,
        "address": clean_text(rec.get("address") or "", 160) or None,
        "latitude": lat, "longitude": lng,
        "num_courts": num,
        "court_type": class_type(rec),
        "has_lights": lights_in(rec),
        "price_per_hour": to_int(rec.get("price")),
        "opening_hours": clean_text(rec.get("hours"), 120) or None,
        "surface": None,
        "surface_detail": clean_text(rec.get("surface"), 90) or None,
        "rules": clean_text(rec.get("obs"), 240) or None,
        "description": description or None,
        "phone": clean_text(rec.get("phone"), 40) or None,
        "email": clean_text(rec.get("email"), 90) or None,
        "website": website or None,
        "booking_url": booking_url or None,
        "amenities": [], "views": None,
        "gps_class": gps_class(rec.get("gps")) if lat is not None else None,
        "status_note": "; ".join(status_bits) or None,
        "tier": tier,
        "verified": tier == "documented",
        "id": None,
        "sources": [{"f": os.path.basename(fname), "r": rowno}],
    }

# ---------- merge / dedupe ----------
def norm_key(s):
    s = strip_acc(str(s or "")).lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

COUNTRY_NORM = {
    "usa": "united states", "u s a": "united states", "ee uu": "united states",
    "estados unidos": "united states",
    "rusia": "russia",
    "méxico": "mexico",
}
def norm_country(c):
    n = norm_key(c)
    return COUNTRY_NORM.get(n, n)

def dedup_key(r):
    return f"{norm_key(r['name'])}|{norm_key(r['city'])}|{norm_country(r['country'])}"

def coord_dist(a, b):
    return math.hypot(a["latitude"] - b["latitude"], a["longitude"] - b["longitude"])

def merge_into(dst, src, report):
    report["duplicates_merged"] += 1
    for k in dst:
        if k in ("sources", "tier", "verified", "id", "_dead"):
            continue
        if (dst[k] is None or dst[k] == "") and src.get(k) not in (None, ""):
            dst[k] = src[k]
    if dst["tier"] == "candidate" and src.get("tier") == "documented":
        dst["tier"] = "documented"
        dst["verified"] = True
        report["candidates_promoted"] += 1
    dst["sources"].extend(src["sources"])

# generic venue names ("Пляж Арена", "Cancha municipal"…) repeat across a
# city: identical name+city keys must NOT fuse distinct venues. Two rows
# only merge when they are agreement-compatible — strongly different
# addresses or coordinates apart keep them separate.
ADDR_CONFLICT = 0.35   # similarity below this means different places
def match_score(a, b):
    score = 1.0
    ai, bi = a.get("_addr_n"), b.get("_addr_n")
    if ai and bi:
        r = difflib.SequenceMatcher(None, ai, bi).ratio()
        if r < ADDR_CONFLICT:
            score -= 3.5
        elif r > 0.62:
            score += 1.5
    else:
        score += 0.5   # one address unknown — can't refute
    if a["latitude"] is not None and b["latitude"] is not None:
        d = coord_dist(a, b)
        if d <= 0.004:
            score += 2.0
        elif d > 0.02:
            score -= 3.5
        else:
            score -= 1.0
    else:
        score += 0.5
    return score

# ============================================================
# walk + import
# ============================================================
def collect_sources():
    paths = []
    tmp_root = tempfile.mkdtemp(prefix="sandspot_zip_")
    for d in SRC_DIRS:
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            p = os.path.join(d, fn)
            if os.path.isfile(p) and fn.lower().endswith(".zip"):
                try:
                    with zipfile.ZipFile(p) as zf:
                        members = [m for m in zf.namelist()
                                   if m.lower().endswith((".csv", ".xlsx", ".geojson"))
                                   and not SKIP_RE.search(os.path.basename(m))]
                        zf.extractall(tmp_root, members=members)
                except Exception as e:
                    print(f"warn: zip {fn}: {e}", file=sys.stderr)
        for root_dir, _dirs, files in os.walk(d):
            for fn in sorted(files):
                if fn.lower().endswith((".csv", ".xlsx", ".geojson")):
                    paths.append(os.path.join(root_dir, fn))
        for root_dir, _dirs, files in os.walk(tmp_root):
            for fn in sorted(files):
                if fn.lower().endswith((".csv", ".xlsx", ".geojson")):
                    paths.append(os.path.join(root_dir, fn))
    return paths, tmp_root

def main():
    report = {
        "generated": TODAY, "corpus": "user census ~/Downloads/sandspot",
        "files_used": [], "files_skipped": [],
        "raw_rows": 0, "records_built": 0, "duplicates_merged": 0,
        "candidates_promoted": 0, "coord_swapped": 0, "coord_dropped": 0,
        "coords_missing": 0, "dropped_permanently_closed": 0,
        "lights_from_text": 0, "warnings": [],
    }

    paths, tmp_root = collect_sources()

    # byte-identical dedupe ((1) copies)
    hm, uniq = {}, []
    for p in paths:
        try:
            h = hashlib.md5(open(p, "rb").read()).hexdigest()
        except OSError:
            continue
        if h in hm:
            report["files_skipped"].append(
                {"file": os.path.basename(p), "why": "byte-duplicate of " + os.path.basename(hm[h])})
            continue
        hm[h] = p
        uniq.append(p)

    recs = []
    for p in uniq:
        fn = os.path.basename(p)
        if SKIP_RE.search(fn):
            report["files_skipped"].append({"file": fn, "why": "excluded by policy"})
            continue
        tier = "candidate" if CAND_RE.search(fn) else "documented"
        rows = parse_any(p)
        if not rows:
            report["files_skipped"].append({"file": fn, "why": "no parsable data rows"})
            continue
        used = 0
        for rowno, raw in rows:
            report["raw_rows"] += 1
            r = make_record(raw, tier, fn, rowno, report)
            if r:
                recs.append(r)
                used += 1
        report["files_used"].append({"file": fn, "tier": tier, "rows": used})

    # ---- dedupe pass 1: normalized key + compatibility split ----
    # generic names repeat inside a city; identical keys merge only when
    # the two rows agree (address similar, or coordinates near, or unknown)
    groups = defaultdict(list)
    for r in recs:
        r["_addr_n"] = norm_key(r["address"])
        groups[dedup_key(r)].append(r)

    survivors = []          # final survivor records in first-seen order
    for key, group in groups.items():
        buckets = []
        for r in group:
            best, best_score = None, 1.9    # need score ≥ 2 to merge
            for cand in buckets:
                s = match_score(r, cand)
                if s > best_score:
                    best, best_score = cand, s
            if best is not None:
                merge_into(best, r, report)
            else:
                buckets.append(r)
        survivors.extend(buckets)

    # ---- dedupe pass 2: coordinate proximity (same country, similar name) ----
    grid = defaultdict(list)
    for sid, r in enumerate(survivors):
        if r["latitude"] is not None:
            grid[(round(r["latitude"] * 250), round(r["longitude"] * 250))].append(sid)
    dead = set()
    done_pairs = set()
    for (gx, gy) in list(grid):
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for ka in grid[(gx, gy)]:
                    ra = survivors[ka]
                    if ra.get("_dead") or ra["latitude"] is None:
                        continue
                    for kb in grid.get((gx + dx, gy + dy), []):
                        if ka == kb or (ka, kb) in done_pairs or (kb, ka) in done_pairs:
                            continue
                        done_pairs.add((ka, kb))
                        rb = survivors[kb]
                        if rb.get("_dead") or rb["latitude"] is None:
                            continue
                        if norm_country(ra["country"]) != norm_country(rb["country"]):
                            continue
                        # alias gate first: identical coordinates plus one
                        # name contained in the other ("Beach 61" vs
                        # "Beachpark 61 / Beach 61") is the same venue — the
                        # official brand keeps the shorter name.
                        na, nb = norm_key(ra["name"]), norm_key(rb["name"])
                        if (coord_dist(ra, rb) <= 1e-4
                                and min(len(na), len(nb)) >= 4
                                and (na in nb or nb in na)):
                            dst, src = ra, rb
                            dst_sid, src_sid = ka, kb
                            if len(na) > len(nb):
                                dst, src = src, dst
                                dst_sid, src_sid = src_sid, dst_sid
                            if src["tier"] == "documented" and dst["tier"] == "candidate":
                                dst, src = src, dst
                                dst_sid, src_sid = src_sid, dst_sid
                            merge_into(dst, src, report)
                            src["_dead"] = True
                            dead.add(src_sid)
                            continue
                        if coord_dist(ra, rb) > 0.004:
                            continue
                        ratio = difflib.SequenceMatcher(
                            None, norm_key(ra["name"]), norm_key(rb["name"])).ratio()
                        if ratio < 0.72:
                            continue
                        if match_score(ra, rb) < 2.0:
                            continue
                        # documented survivor first — sid tracking keeps the
                        # victim's LIST slot aligned with the dict flag
                        dst, src = ra, rb
                        dst_sid, src_sid = ka, kb
                        if src["tier"] == "documented" and dst["tier"] == "candidate":
                            dst, src = src, dst
                            dst_sid, src_sid = src_sid, dst_sid
                        merge_into(dst, src, report)
                        src["_dead"] = True
                        dead.add(src_sid)

    final = [r for sid, r in enumerate(survivors) if sid not in dead]
    tombstones = len(dead)

    # ids, provenance trim, counters — per-index suffix makes ids unique even
    # when two split buckets share key + empty address (deterministic order)
    for i, r in enumerate(final):
        seen, trimmed = set(), []
        for s in r["sources"][:10]:
            kk = (s["f"], s["r"])
            if kk in seen:
                continue
            seen.add(kk)
            trimmed.append(s)
        r["sources"] = trimmed[:6]
        digest = hashlib.sha1((dedup_key(r) + "|" + (r["_addr_n"] or "") + "|" + str(i)).encode()).hexdigest()[:9]
        r["id"] = "ss-" + digest
        r.pop("_addr_n", None)
        if r["has_lights"]:
            report["lights_from_text"] += 1
        if r["latitude"] is None:
            report["coords_missing"] += 1

    final.sort(key=lambda r: (norm_country(r["country"]), norm_key(r["city"] or ""),
                              norm_key(r["name"])))
    by_tier = Counter(r["tier"] for r in final)
    by_country = Counter(norm_country(r["country"]) for r in final if r["country"])
    by_country_geo = Counter(norm_country(r["country"]) for r in final
                             if r["country"] and r["latitude"] is not None)

    report["totals"] = {
        "courts": len(final), "raw_rows": report["raw_rows"],
        "records_built": len(recs), "merged": report["duplicates_merged"],
        "tombstones": tombstones,
        "by_tier": dict(by_tier),
    }
    report["countries"] = dict(by_country.most_common())
    report["countries_with_coords"] = dict(by_country_geo.most_common())
    report["note"] = ("candidates are imported as tier=candidate only; "
                      "they never override documented values; empty stays empty")

    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "courts-all.json"), "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(DATA, "import-report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    print(f"courts-all.json: {len(final)} records "
          f"(documented {by_tier.get('documented', 0)} / candidate {by_tier.get('candidate', 0)})")
    print(f"raw rows {report['raw_rows']} from {len(recs)} built records; "
          f"{report['duplicates_merged']} merges, {tombstones} proximity merges")
    print(f"no-coordinate records: {report['coords_missing']}; swapped: {report['coord_swapped']}; "
          f"dropped: {report['coord_dropped']}; perm-closed dropped: {report['dropped_permanently_closed']}")
    print(f"files used {len(report['files_used'])}, skipped {len(report['files_skipped'])}")
    print("top countries:", ", ".join(f"{c}:{n}" for c, n in list(by_country.items())[:14]))
    shutil.rmtree(tmp_root, ignore_errors=True)

if __name__ == "__main__":
    main()
