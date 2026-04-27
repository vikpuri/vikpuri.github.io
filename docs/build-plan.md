# Requation — Build Plan

---

## Google Maps — 3 Structural Rules (Vendor, 2026-04-28)

All map pages must follow these at all times.

| Rule | Law | CesiumJS equivalent |
|------|-----|-------------------|
| **1 · Fixed Container** | Map div must have defined CSS height; never init if display:none or 0px | `#cesiumContainer` needs explicit dimensions before `new Cesium.Viewer()` |
| **2 · Marker Sync** | All coordinates in DB/JSON — never hardcoded in UI components | Supabase `properties` + `places` tables; `CENTER` const = camera start only |
| **3 · Center & Pan** | On listing click use `map.panTo()` — never re-create the map | `viewer.camera.flyTo()` — viewer is a singleton |

---

## Geocoding Utility (Phase 3.5 — Do First)

**Problem:** Google Places API cannot geocode residential addresses. Laveen property at 11403 S 27th Dr has been wrong from the start — all geocoding services return the water works plant because they're optimized for commercial entities.

**Vendor-confirmed fix:** Enable **Geocoding API** in GCP Console → build `/api/geocode` endpoint → call once per address → store lat/lng in Supabase.

### Step 1 — Enable Geocoding API
In Google Cloud Console → APIs & Services → Enable APIs → search "Geocoding API" → Enable.
Same project as the existing Maps/Places key. No new credentials needed.

### Step 2 — Build `/api/geocode.js`

```javascript
// api/geocode.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'address required' });
  const key = process.env.YOUTUBE_API_KEY; // same GCP key
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.status !== 'OK') return res.status(404).json({ error: data.status, data });
  const { lat, lng } = data.results[0].geometry.location;
  res.status(200).json({ lat, lng, formatted: data.results[0].formatted_address });
}
```

### Step 3 — Geocode Laveen property

```bash
curl "https://requation.com/api/geocode?address=11403+S+27th+Dr+Laveen+AZ+85339"
# → { lat: XX.XXXXX, lng: -XXX.XXXXX, formatted: "11403 S 27th Dr, Laveen Village, AZ 85339, USA" }
```

Store result in Supabase `properties` table → update `laveen.html` CENTER → done.

### Scale Vision
This same endpoint geocodes every future listing. Input: address. Output: lat/lng in DB. The rendering code never changes — only the data does (Rule 2).

---

## Phase 4 · Google Places → Supabase + Yelp Deduplication

**Goal:** Replace ephemeral Google Places dot markers (desktop-only bug) with persistent, deduplicated POI data stored in Supabase. One unified source for all map markers.

### Why This Matters
- Google Places dot markers currently render only on desktop — invisible on Asus/iPhone
- Every page load re-fetches from Google Places API (quota burn + latency)
- Yelp Fusion and Google Places return overlapping businesses with no dedup logic
- No persistence = no ability to sort, filter, or search POIs across sessions

---

### Target Architecture

```
Google Places /api/places  ─┐
                             ├──▶  Supabase `places` table  ──▶  Map markers
Yelp Fusion   /api/yelp    ─┘        (deduplicated)
```

### Supabase `places` Table Schema

```sql
CREATE TABLE places (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  address       TEXT,
  lat           FLOAT NOT NULL,
  lng           FLOAT NOT NULL,
  category      TEXT,                   -- grocery, cafe, restaurant, gym, etc.
  zip           TEXT,
  state         TEXT,                   -- 'CA' or 'AZ' — never mixed
  city          TEXT,
  phone         TEXT,
  url           TEXT,
  google_place_id TEXT,                 -- from Places API
  yelp_id       TEXT,                   -- from Yelp Fusion
  yelp_rating   FLOAT,
  yelp_review_count INT,
  source        TEXT DEFAULT 'google',  -- 'google' | 'yelp' | 'merged'
  dedup_checked BOOLEAN DEFAULT FALSE,
  neon_tier     TEXT,                   -- 'MONUMENT' | 'BILLBOARD' | 'SOAPBOX' | null
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### Deduplication Logic

When ingesting a new POI (from either source):

1. **Coordinate check:** Find existing rows within 50m of the incoming lat/lng
2. **Name check:** Fuzzy match name similarity ≥ 80% (Levenshtein or token overlap)
3. **If match found:** Merge — update existing row with both `google_place_id` and `yelp_id`, set `source = 'merged'`, set `dedup_checked = TRUE`
4. **If no match:** Insert as new row with source `'google'` or `'yelp'`

```javascript
// Haversine distance in meters between two lat/lng points
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

### Ingest Flow (serverless)

`POST /api/ingest-places` — new Vercel function:
1. Call Google Places nearbySearch for market center + 800m radius
2. Call Yelp Fusion for same radius
3. For each result: check Supabase for duplicates within 50m
4. Merge or insert
5. Return count of new vs merged

### Display on Map (after migration)

```javascript
// Fetch from Supabase — single source of truth
const res = await fetch(`${SB_URL}/rest/v1/places?state=eq.CA&active=eq.true&select=*`, { headers: SB_HDRS });
const pois = await res.json();

// Render — works on all devices (Supabase data → standard markers)
pois.forEach(p => renderPoiMarker(p));
```

This fixes the mobile visibility bug because the DOM overlay approach is replaced with standard Supabase → Cesium marker rendering, same pattern as the property pin.

### Sorted/Filtered Display

Add to the Directory tab panel:
- Sort by: Distance | Rating | Category
- Filter chips: Food · Coffee · Gym · Shopping · Culture
- Source badge on each card: Google · Yelp · (both = merged)

---

## Phase 5 · Population Count Layer

**Goal:** Show US Census population data for each market area on the dashboard and (optionally) on map pages.

### Data Source
US Census Bureau — American Community Survey (ACS) 5-Year Estimates
- API endpoint: `https://api.census.gov/data/2022/acs/acs5`
- Free, no key required for low volume (registration optional for higher limits)
- Returns population by ZIP code tabulation area (ZCTA)

### Queries

```javascript
// DTLA population (ZIPs 90017, 90015, 90013, 90014)
const DTLA_ZIPS = ['90017','90015','90013','90014'];
const r = await fetch(
  `https://api.census.gov/data/2022/acs/acs5?get=B01003_001E,NAME&for=zip+code+tabulation+area:${DTLA_ZIPS.join(',')}`
);

// Laveen population (ZIP 85339)
const r2 = await fetch(
  `https://api.census.gov/data/2022/acs/acs5?get=B01003_001E,NAME&for=zip+code+tabulation+area:85339`
);
```

`B01003_001E` = total population estimate.

### Dashboard Widget
Add to the Architecture stat row:

| Stat | Value |
|------|-------|
| DTLA core (4 ZIPs) | ~35,000 |
| Laveen (85339) | ~65,000 |
| LA territory (16 ZIPs) | ~850,000+ |

These numbers come from ACS and update with each Census release.

### Map Page Display
- Small population badge on panel header: `South Park · DTLA · pop. 35,000`
- Can be fetched once on page load, cached in sessionStorage

---

## Phase 3 Fixes (In Progress)

| Item | Status | Notes |
|------|--------|-------|
| Google Places dots on mobile | 🔴 Open | DOM overlay breaks on mobile viewports |
| Laveen property marker GPS | 🔴 Open | Google geocodes to water works plant — awaiting user satellite right-click |
| Laveen pin altitude consistency | 🟡 Minor | propPos altitude 30m in laveen vs 0m in dtla — should be 0 |
| Cloudflare DNS migration | 🟡 Pending | Netlify DNS → Cloudflare NS |
| Twilio CORS OPTIONS | 🟡 Pending | fix preflight handler |
| Stripe Payment Link | 🟡 Pending | needs bank account + link URL |

---

## Navigation Philosophy — "A Show in Maps" (Discussion Pending)

User question: *"How do you get people interested to stay and not leave after feeding directions to GPS? Content is important but how do you direct traffic or its chaos."*

Key insight: The GPS handoff is the death of engagement. Once a user copies an address to Apple/Google Maps, they're gone. The platform must make the map itself more valuable than leaving it.

Concepts to explore:
- **Curated paths** — "Walk this neighborhood" route with POI stops, each with a YT video
- **Time-based reveals** — content unlocks as user walks/drives closer (geofencing)
- **The Show** — a cinematic intro sequence that plays before any interaction, like a movie trailer for the neighborhood
- **Story anchors** — every POI has a 30-second video story, not just an address
- Full discussion to be scheduled with Vik.
