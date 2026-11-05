#!/usr/bin/env python3
# ============================================================
# SandSpot — Berlin verification wave (fase 1 pilot)
#
# Cross-checks the 52 Berlin census records against two sources:
#   1) the three operator websites (beachmitte.de / beach61.de /
#      east61.de, checked 2026-11-05) — status "verified"
#   2) OpenStreetMap sport=beachvolleyball geometry (Overpass
#      dump passed as argv[1]) — status "osm"
#
# Writes data/verifications.json, an id-keyed verification
# records file that the app loader merges ON TOP of the census
# (assets/main.js loadCourts). Registry truth is preserved:
# verifications annotate, they never erase.
#
# stdlib only — python3 scripts/verify-berlin.py <overpass.json>
# ============================================================
import difflib, json, math, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

CHECKED = "2026-11-05"

def na(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s or "")) if unicodedata.category(c) != "Mn").lower()

def hav_m(a, b):
    """great-circle distance in meters between two (lat, lon) points"""
    R = 6371000.0
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = p2 - p1
    dl = math.radians(b[1] - a[1])
    x = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

# ---- operator-confirmed entries (sources fetched by hand on CHECKED) ----
MANUAL = {
    "BeachMitte": {
        "status": "verified",
        "source": "https://beachmitte.de/",
        "note": ("Operator site live. Historic 52 courts confirmed by the "
                 "census operator: site today shows 35+ outdoor courts "
                 "(summer season) + 17 indoor courts (winter season), with "
                 "padel courts added to the grounds. Outdoor booking online "
                 "up to 14 days ahead. Address: Caroline-Michaelis-Str. 8, "
                 "10115 Berlin."),
    },
    "Beach 61": {
        "status": "verified",
        "source": "https://beach61.de/",
        "note": ("Operator site live ('die grüne Sportoase between "
                 "Potsdamer Platz and Kreuzberg'). Access via Yorckstr. 38, "
                 "10965 Berlin; site maps pin 52.49594/13.37100 matches the "
                 "census coordinates within ~10 m. Seasonal venue: beach "
                 "courts in summer, Winterjurte in winter. Census court "
                 "count 43 still unconfirmed."),
    },
    "East 61": {
        "status": "verified",
        "source": "https://east61.de/",
        "note": ("Operator site live. Access via Wilhelm-Kabus-Str. 42, "
                 "10829 Berlin. Same operator as Beach 61 ('Wirf mal den "
                 "Ball rüber! GmbH') — its socials are 'Beachpark 61'. "
                 "Winter season active. Census court count 19 still "
                 "unconfirmed."),
    },
}

def main():
    overpass_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/berlin_bv.json"
    courts = json.load(open(os.path.join(REPO, "data", "courts-all.json")))
    osm = json.load(open(overpass_path)).get("elements", [])

    pitches = []
    for e in osm:
        t = e.get("tags") or {}
        if "center" in e:
            lat, lon = e["center"]["lat"], e["center"]["lon"]
        elif "lat" in e:
            lat, lon = e["lat"], e["lon"]
        else:
            continue
        pitches.append({
            "id": e["type"][0] + str(e["id"]), "lat": lat, "lon": lon,
            "name": t.get("name") or "", "access": t.get("access") or "",
            "courts": t.get("courts") or t.get("beachvolleyball:count") or "",
        })

    ber = [c for c in courts if na(c.get("city")).startswith("berlin")]
    out, log = {}, []
    for c in ber:
        rid = c["id"]
        if c["name"] in MANUAL:
            m = MANUAL[c["name"]]
            out[rid] = {"status": m["status"], "source": m["source"],
                        "date": CHECKED, "note": m["note"]}
            log.append((c["name"], "verified [operator site]"))
            continue
        if c["latitude"] is None:
            # no coordinates: try a name hit among named OSM pitches
            cand = None
            for p in pitches:
                if p["name"] and difflib.SequenceMatcher(
                        None, na(p["name"]), na(c["name"])).ratio() > 0.7:
                    cand = p
                    break
            if cand:
                out[rid] = {"status": "osm", "source": f"https://www.openstreetmap.org/way/{cand['id'][1:]}",
                            "date": CHECKED,
                            "note": f"Name-matched OSM pitch '{cand['name']}' (census has no coordinates)."}
                log.append((c["name"], f"osm by name [{cand['name']}]"))
            else:
                out[rid] = {"status": "unfound", "source": "", "date": CHECKED,
                            "note": "Census row has no coordinates and no OSM name match — needs a field/source check."}
                log.append((c["name"], "unfound (no coords, no name match)"))
            continue
        # nearest OSM pitch within 120 m
        best, best_d = None, None
        for p in pitches:
            d = hav_m((c["latitude"], c["longitude"]), (p["lat"], p["lon"]))
            if best_d is None or d < best_d:
                best, best_d = p, d
        if best and best_d <= 120:
            labels = [k for k in ("name", "courts", "access") if best[k]]
            det = "; ".join(f"{k}: {best[k]}" for k in labels)
            out[rid] = {"status": "osm",
                        "source": f"https://www.openstreetmap.org/way/{best['id'][1:]}",
                        "date": CHECKED,
                        "note": f"OSM beachvolleyball pitch {best_d:.0f} m away"
                                + (f" ({det})" if det else "")}
            log.append((c["name"], f"osm {best_d:.0f}m"))
        else:
            out[rid] = {"status": "unfound", "source": "", "date": CHECKED,
                        "note": "No sport=beachvolleyball pitch within 120 m in OSM — needs a field/source check."}
            log.append((c["name"], f"unfound (nearest OSM {best_d:.0f}m)" if best else "unfound (no OSM pitches)"))

    with open(os.path.join(REPO, "data", "verifications.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    from collections import Counter
    st = Counter(v["status"] for v in out.values())
    print(f"Berlin wave: {len(out)} records checked -> {dict(st)}")
    for name, res in log:
        print(f"  {name[:56]:56s} {res}")

if __name__ == "__main__":
    main()
