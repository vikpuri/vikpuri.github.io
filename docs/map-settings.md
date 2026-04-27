# Requation — Map Settings Reference

All camera, zoom, grid, and data settings for every page. Single source of truth.

---

## Landing Page — `gm-landing.html` → `/`

**Engine:** CesiumJS 1.140 + Google Photorealistic 3D Tiles

| Setting | Value |
|---------|-------|
| Camera method | `setView` (instant, no animation) |
| Center | `-115.2° lng, 34.5° lat` (SW USA midpoint) |
| Altitude | 14,000,000 m (14,000 km) |
| Heading | 0° (north up) |
| Pitch | -90° (straight down) |
| Min zoom | 3,000,000 m (3,000 km) |
| Max zoom | 20,000,000 m (20,000 km) |
| Markers | 2 DOM overlay pins (DTLA red + Laveen gold) |
| Pin activation delay | 2000 ms (prevents drift on init) |
| Pin altitude | 0m (ground level) |
| Data loaded | None — pins only |
| Entries | 2 |

**Thomas Bros Grid:**
- DTLA pin: ~D3 (right-center, pins cluster at center of US West Coast)
- Laveen pin: ~C3 (center, slightly right of DTLA)

---

## DTLA — `dtla.html` → `/dtla`

**Engine:** CesiumJS 1.140 + Google Photorealistic 3D Tiles

| Setting | Value |
|---------|-------|
| CENTER | `{ lat: 34.0457095, lng: -118.2585553 }` |
| Camera method | `flyTo` (animated approach) |
| Altitude | 420 m |
| Heading | 200° (SSW — faces northwest over 801 S Grand Ave) |
| Pitch | -35° |
| Roll | 0 |
| Duration | 2 s |
| Pin activation delay | 2500 ms |
| Pin size | 38px circle, 3px white border |
| Pin altitude (propPos) | 0 m |
| Places radius | 900 m |

**Data Loaded:**
| Source | Max Entries | Type |
|--------|-------------|------|
| SEED_DIR (static) | 38 | Directory fallback |
| Supabase `restaurants` (CA ZIPs) | ∞ | Live directory |
| Google Places `/api/places` | 20 | Nearby POI dots (desktop only ⚠) |

**Thomas Bros Grid:**
- Property pin: B3 (center-left)
- Places dots: scattered B2–D4
- media-col: A5 (bottom-left)
- Panel: E1–E5 (right drawer, full height)

**ZIPs:** 90017, 90015, 90013, 90014 (core) + 16 territory ZIPs for Yelp/RPOI

---

## Laveen — `laveen.html` → `/laveen`

**Engine:** CesiumJS 1.140 + Google Photorealistic 3D Tiles

| Setting | Value |
|---------|-------|
| CENTER | `{ lat: 33.34284751970459, lng: -112.11814600203087 }` ⚠ WRONG — see note |
| Camera method | `flyTo` |
| Altitude | 1200 m |
| Heading | 190° (SSW — faces roughly south over compound) |
| Pitch | -40° |
| Roll | 0 |
| Duration | 2 s |
| Pin altitude (propPos) | 30 m ⚠ should be 0 to match dtla |

**⚠ Marker GPS Issue:**
Google Places text search geocodes `11403 S 27th Dr, Laveen AZ 85339` to `33.3427905, -112.1180767` — which lands at a water works plant on S 27th Dr, NOT the actual farmhouse compound. The real property is reported to be ~1/4 mile SW and uphill.

Mathematical estimate (1/4 mile SW of current):
- Estimated: `lat 33.3392, lng -112.1225`
- Status: **awaiting user satellite right-click confirmation**

**Data Loaded:**
| Source | Entries | Type |
|--------|---------|------|
| Videos | 13 | Property videos (restored from backup) |
| Images | 13 | Carousel photos |
| STRIP_MONUMENTS | 7 | South Mountain / Chase Field / Sky Harbor etc |
| Supabase (AZ ZIPs) | TBD | Directory |

**Thomas Bros Grid:**
- Property pin: B3 (center-left, facing slightly SW)
- media-col: A5 (bottom-left)
- Panel: E1–E5 (right drawer)

**ZIPs:** 85339, 85041, 85042, 85044

---

## LA Life — `lalife.html` → `/lalife`

**Engine:** Mapbox GL JS v3.3.0 (Standard style) — NOT yet migrated to CesiumJS

| Setting | Value |
|---------|-------|
| Center | `[-118.2587, 34.0480]` |
| Initial zoom | 13 (jumpTo for cinematic start) |
| Final zoom | 14.2 |
| Initial pitch | 38° |
| Final pitch | 62° |
| Bearing | -17.6° |
| Cinematic duration | 3200 ms (ease-in cubic) |
| RPOI flyTo zoom | 15 |
| Circle radius at zoom 10 | 4 px |
| Circle radius at zoom 14 | 8 px |
| Circle radius at zoom 16 | 11 px |
| Chain labels visible at | zoom ≥ 14 |

**Data Loaded:**
| Source | Entries | Type |
|--------|---------|------|
| Supabase `restaurants` (CA ZIPs) | ~300+ | POI dots |
| Redfin RPOIs | ~330+ | Gold disc markers |
| Yelp Fusion | per click | POI card enrichment |

**Thomas Bros Grid:**
- Property pin (DTLA): ~B3
- RPOI gold discs: scattered B2–D4
- media-col: A1 (top-left, below header)

**ZIPs:** 90017, 90015, 90013, 90014, 90021, 90012, 90007, 90005, 90006, 90019, 90036, 90025, 90024, 90049, 90069, 90402

---

## Desert Life — `desertlife.html` → `/desertlife`

**Engine:** Mapbox GL JS v3.3.0 (Standard style) — NOT yet migrated to CesiumJS

| Setting | Value |
|---------|-------|
| Center | `[-112.1100, 33.3650]` |
| Initial zoom | 10.5 (jumpTo) |
| Final zoom | 11.5 |
| Initial pitch | 22° |
| Final pitch | 45° |
| Bearing | 10° |
| Cinematic duration | 3200 ms (ease-in cubic) |
| RPOI flyTo zoom | 15 |
| Chain labels visible at | zoom ≥ 14 |

**Data Loaded:**
| Source | Entries | Type |
|--------|---------|------|
| Supabase `restaurants` (AZ ZIPs) | TBD | POI dots |
| Redfin RPOIs | 8+ | Gold disc markers |
| Yelp Fusion | per click | POI card enrichment |

**Thomas Bros Grid:**
- media-col: A1 (top-left)
- RPOI discs: scattered B3–D4

**ZIPs:** 85339, 85041, 85042, 85044

---

## Population Data (Ready to Add — Phase 5)

Census ACS 5-Year Estimates, ZCTA level.

| Market | ZIPs | Est. Population | Source |
|--------|------|----------------|--------|
| DTLA core | 90017, 90015, 90013, 90014 | ~35,000 | ACS 2022 |
| DTLA territory | 16 ZIPs | ~850,000+ | ACS 2022 |
| Laveen | 85339 | ~65,000 | ACS 2022 |
| Phoenix Metro | 85339, 85041, 85042, 85044 | ~120,000 | ACS 2022 |

**API:** `https://api.census.gov/data/2022/acs/acs5?get=B01003_001E,NAME&for=zip+code+tabulation+area:90017,90015,...`
- Free, no API key required for low-volume use
- Field `B01003_001E` = total population estimate

When ready to implement: add a `loadPopulation()` call to each page's init, store in `sessionStorage`, display in panel header below the property/market name.

---

## Summary Table

| Page | Engine | Altitude/Zoom | Pitch | Heading | Max Entries |
|------|--------|--------------|-------|---------|-------------|
| `/` landing | CesiumJS | 14,000 km | -90° | 0° | 2 pins |
| `/dtla` | CesiumJS | 420 m | -35° | 200° | 38+ dir + 20 places |
| `/laveen` | CesiumJS | 1,200 m | -40° | 190° | 13 videos, dir TBD |
| `/lalife` | Mapbox | zoom 14.2 | 62° | -17.6° | 300+ POIs + 330 RPOI |
| `/desertlife` | Mapbox | zoom 11.5 | 45° | 10° | TBD + 8 RPOI |
