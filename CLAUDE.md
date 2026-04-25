# Requation — Claude Code Rules

These rules are the result of real mistakes made in previous sessions.
**Every rule here exists because something broke without it.**
Read this fully before touching any file.

---

## Pre-Change Protocol (MANDATORY)

Before making ANY edit, state out loud:
1. Which file(s) will be changed
2. Which single thing is being changed
3. What will NOT be touched
4. Confirm it cannot break map, markers, panels, or console

If a change touches the map constructor, `initMap()`, or `map.addListener('load',...)` — **stop and read the full map init block first.**

---

## Page Purpose Rules (Design Law)

| Page | What It Shows |
|------|--------------|
| `requation.com` (landing) | 2 property markers only. No console, no panels, no POIs |
| `/dtla` and `/laveen` | Console (radio+YT) + property photos/videos + tabs (Property, Neighborhood, Directory, Waymo) |
| `/lalife` and `/desertlife` | Yelp, POIs, RPOIs in larger detail. Console top-left. No property panel |

## Monument / Billboard / YT Marker Rule — Populated Maps Only

**Never place Monument signs, Billboard markers, or YT overlay cards on a map unless that map is already populated with real data (POIs, property pins, or listings from Supabase).**

- A sparse map with a YT card floating in empty space looks broken, not impressive
- Monument markers are contextual anchors — they need surrounding data to have meaning
- The landing page (`gm-landing.html`) has 2 state markers only; do NOT add Monuments until it has real POI/property density
- `/dtla` and `/lalife` qualify: they have Supabase POIs, Redfin RPOIs, and property pins loaded
- `/laveen` and `/desertlife` qualify once Supabase AZ data is loaded
- When adding a new map page, confirm `allData.length > 0` (or equivalent) before enabling Monuments

**Checklist before adding any YT/Billboard/Monument to a page:**
1. Does the page load Supabase or equivalent live data? ✓
2. Are there at least property pins visible on load? ✓
3. Is the YT content from the official channel for that venue/location? ✓

---

## Console (Radio + YT Billboard) Positions

- `/lalife` and `/desertlife`: `position:fixed; top:calc(var(--h) + env(safe-area-inset-top,0px) + 8px); left:16px`
- `/dtla` and `/laveen`: `position:fixed; bottom:20px; top:auto; left:16px`

**Why different?** `/dtla` and `/laveen` open on the AZ+CA overview (identical to landing page). Bottom-left places the console visually next to the property tab panel. Top-left makes it look like the landing page. Do NOT change these positions without explicit user approval.

**Console must always be visible on page load.** It disappears ONLY when:
- Map is touched (`map.on('click')`)
- Property marker is clicked (`openPanel()` calls `hideMedia()`)
- Home button or logo is clicked (`goHome()`)
- Nav-back links clicked

**Never add auto-open panel on load** — `openPanel()` calls `hideMedia()`, which hides the console without user interaction.

---

## Console HTML/DOM Rules

- `<div id="media-col">` must come **immediately after** `<div id="map"></div>` in the DOM
- It must be **BEFORE** `<header>` and all panels
- `#media-col` z-index: 90. Property panel z-index: 95
- `/dtla` + `/lalife` radio: KLOS 99.5 FM → `https://playerservices.streamtheworld.com/api/livestream-redirect/KLOSFMAAC.aac`
- `/laveen` + `/desertlife` radio: 99.5 The Mountain → `https://live.amperwave.net/direct/audacy-kqmtfmaac-imc` (Audacy AmperWave, NOT StreamTheWorld)
- YT billboard: clicking thumbnail calls `playInline(0)` — plays video inline inside the billboard (same size, no popup). Do NOT use `openYT(0)` on the thumbnail — that opens a full-screen overlay which is NOT the desired behaviour.
- YT fallback: hardcoded Pink Floyd `HrxX9TBj2zY` when API quota is exceeded

---

## Map Initialization Rules — Google Maps (HIGH RISK)

**NEVER call `map.moveCamera()` or add markers before `initMap()` resolves.**
- Google Maps JS API calls `initMap` via the `callback=initMap` loader param — everything must live inside that function
- Markers must be added after the map constructor; they don't require a separate load event
- `AdvancedMarkerElement` requires `mapId` to be set or it silently fails

**NEVER change `center`, `zoom`, `tilt`, or `heading` in the constructor without understanding `moveCamera` timing.**
- The cinematic reveal uses `setTimeout → map.moveCamera(...)` chains at 900ms, 2400ms, 4000ms
- Changing constructor values shifts the starting frame of the cinematic — check all three stages

**Safe pattern for the cinematic reveal:**
```javascript
function initMap() {
  const map = new google.maps.Map(el, { center, zoom, mapId, ... });
  // Cinematic — runs after constructor
  setTimeout(() => map.moveCamera({ center, zoom: 4.4, tilt: 20, heading: 352 }), 900);
  setTimeout(() => map.moveCamera({ center, zoom: 5.4, tilt: 44, heading: 346 }), 2400);
  setTimeout(() => map.moveCamera({ center, zoom: 5.9, tilt: 54, heading: 342 }), 4000);
  // Markers after weather/data loads
  Promise.all([...]).then(() => { /* add AdvancedMarkerElements */ });
}
```

**3D buildings require:** zoom ≥ 17, tilt ≥ 45, and the Requation vector Map ID. Below zoom 17 the buildings disappear — this is a Maps API rule, not a bug.

---

## Data Rules

- **AZ and CA data never share.** Laveen → AZ ZIPs (85339, 85041, 85042, 85044). DTLA → CA ZIPs (90017, 90015, 90013, 90014)

## Territory — Requation ZIP Codes

| Market | Purpose | ZIPs |
|--------|---------|------|
| **DTLA core** | Directory, Supabase | `90017, 90015, 90013, 90014` |
| **DTLA territory** | RPOI (Redfin listings), Yelp, Google Places propagation | `90017, 90015, 90013, 90014, 90021, 90012, 90007, 90005, 90006, 90019, 90036, 90025, 90024, 90049, 90069, 90402` |
| **Laveen core** | Directory, Supabase | `85339, 85041, 85042, 85044` |

**RPOI note:** Redfin listing markers (330+ active listings in DTLA territory) will link to `/lalife` once that page is on Google Maps + CesiumJS. Implement after CesiumJS is live.

**Google Places auto-populate:** The Google Maps basemap always shows its own POI labels (cafes, gyms, etc.) on the tiles — no code needed. Custom colored dot markers require explicit `nearbySearch()` calls — not currently active on dtla/laveen (property pin only, per design). Yelp data requires Yelp API explicitly.
- Supabase key is embedded directly in source HTML — never use `__SB_KEY__` placeholder
- **Never delete or modify the properties array, images arrays, or videos arrays without explicit instruction**
- Backup files before any risky change: `cp dtla.html dtla.html.bak`

---

## Map Type Rule — Vector Map ID on All Pages

Every map page uses Map ID `96844e6a7bb74a7d5514d3a5` (Requation map ID — vector type).
- **NEVER set `mapTypeId: 'hybrid'` when using a vector Map ID** — hybrid is a raster type and silently breaks the map (blank tiles, nothing renders)
- The Map ID's cloud style controls visual appearance — photorealistic 3D tiles on tilt
- No dark themes. No dusk preset. Light/daytime appearance only.
- `mapId` is required for AdvancedMarkerElement and for 3D photorealistic tile rendering

---

## Hyperlink Rule — Every Map Object Gets a URL

Every named object added to any Requation map must have a corresponding URL slug.

**Format:** `/{page}-{object-slug}` — e.g.:
- Neighborhood Box in /dtla → `/dtla-neighborhood-box`
- Whole Foods billboard in /lalife → `/lalife-whole-foods`
- South Mountain Park in /laveen → `/laveen-south-mountain`
- Grand Performances in /dtla → `/dtla-grand-performances`

**Implementation:**
1. When creating a marker/card for any object, add `data-slug` attribute: `el.dataset.slug = 'dtla-neighborhood-box'`
2. Clicking the object navigates to `/{slug}` — use `window.location.href = '/' + el.dataset.slug`
3. Create a stub `/{page}-index` page that lists all objects on that page with links
4. Object URL pages can start as stubs (`<meta http-equiv="refresh">` redirect back to parent + panel open)

**Why this matters:** SEO, shareable links, AR/spatial anchoring (each object needs a canonical URL), and the open-source directory vision depends on every object being addressable.

---

## Things That Must Never Come Back

- `#cat-bar` / `.cat-pill` CSS and HTML on lalife/desertlife — **removed by design**, do not re-add
- `@media(max-width:640px) and (orientation:portrait){ #yt-billboard{display:none!important} }` — removed by design
- `window.addEventListener('load', setTimeout(openPanel, 1500))` — never add this

---

## Build Pipeline — Vercel

**Stack:** GitHub → Vercel (build + functions + CDN). Netlify replaced 2026-04-25.

**Why Netlify was replaced:**
- Static site (GitHub Pages) and serverless functions (Netlify) were on two different systems — `/.netlify/functions/` calls failed because requation.com served from GitHub Pages, not Netlify
- Vercel unifies both: static files + `/api/*` functions on one domain, one deploy

**How it works:**
- Push to `master` on GitHub → Vercel auto-builds in ~10s
- `node build.js` → copies HTML to `dist/`
- `api/*.js` → served at `/api/functionname` on same domain (no cold-start issues)
- `vercel.json` controls build command, output directory, and clean URL rewrites

**Serverless functions in `api/`:**

| File | Route | Purpose |
|------|-------|---------|
| `aerialview.js` | `/api/aerialview` | Google Aerial View lookupVideo |
| `contact.js` | `/api/contact` | Resend email + Twilio SMS |
| `espn.js` | `/api/espn` | ESPN public API — sports events, no key |
| `places.js` | `/api/places` | Google Places nearbySearch proxy |
| `yelp.js` | `/api/yelp` | Yelp Fusion business search |
| `twilio.js` | `/api/twilio` | Voice/SMS verification |

**Environment variables** (set in Vercel dashboard → Settings → Environment Variables):

| Variable | Used By |
|----------|---------|
| `YOUTUBE_API_KEY` | Google Maps JS, Places, Aerial View, YouTube Data v3 — same GCP project key |
| `TWILIO_ACCOUNT_SID` | Twilio voice + SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth |
| `TWILIO_PHONE` | Sending number |
| `ADMIN_PHONE` | Notification recipient |
| `YELP_API_KEY` | Yelp Fusion |
| `RESEND_API_KEY` | Contact form email delivery |
| `SUPABASE_KEY` | Supabase POI data |

**Removed:** `PREDICTHQ_KEY`, `MAPBOX_TOKEN` — no longer used.

---

## DNS & CDN — Cloudflare (target) / Netlify DNS (current)

**Current state (as of 2026-04-25):**
- requation.com → Vercel (A record pointing to Vercel IP, updated in Netlify DNS panel)
- www.requation.com → redirects to requation.com via Vercel
- Nameservers: `dns1-4.p04.nsone.net` (Netlify DNS — manages records only, site no longer hosted there)
- Verified live: `Server: Vercel`, 200 OK

**Target state — Cloudflare migration:**
- Move nameservers from Netlify DNS to Cloudflare (free plan)
- Cloudflare provides: DDoS protection, edge caching, SSL/TLS termination, Web Analytics (no tracking script needed), Image Resizing
- CNAME flatten: `requation.com → cname.vercel-dns.com` (Cloudflare handles root CNAME)
- Enable Cloudflare proxy (orange cloud) on requation.com and www — Vercel origin stays hidden
- Cache rules: bypass `/api/*` (serverless must reach Vercel origin); cache `*.html`, fonts, images at edge

**Migration steps (when ready):**
1. Add requation.com to Cloudflare → copy NS records
2. Update Netlify DNS nameservers to Cloudflare NS
3. In Cloudflare: add A/CNAME records pointing to Vercel, enable proxy
4. Set SSL/TLS → Full (strict); enable HSTS
5. Verify: `curl -I https://requation.com` shows `Server: cloudflare`

---

## Google Cloud Platform — Active APIs

All APIs share one GCP project. Key stored as `YOUTUBE_API_KEY` in Vercel env and hardcoded in HTML: `AIzaSyD7UMA5ILPXv9QK2_gvxPVth30MavRd2WQ`.

| API | Used In | Notes |
|-----|---------|-------|
| **Maps JavaScript API** | All map pages | AdvancedMarkerElement, Map constructor, cinematic `moveCamera` |
| **Places API** | `dtla.html`, `laveen.html` | `nearbySearch` for grocery/transit/restaurant POIs |
| **Aerial View API** | `/api/aerialview` → prop card Aerial tab | `lookupVideo` endpoint; auth via `X-Goog-Api-Key` query param; address-only (no lat/lng) |
| **Street View Static API** | Prop card Street tab | `<img>` tag — `size`, `location`, `fov`, `pitch`, `heading`, `key` params |
| **Map Tiles API** | Implicit via Map ID | Photorealistic 3D tiles; requires `mapId: '96844e6a7bb74a7d5514d3a5'` + zoom 17+, tilt 45+ |
| **Map Management API** | Cloud Console | Manages Requation map style; do not change map type from vector |
| **Street View Publish API** | Planned | Upload interior/exterior 360° photos; not yet wired |
| **YouTube Data API v3** | YT strip rotation | Search videos by channel/keyword for monument strip; fallback to hardcoded IDs on quota |

**Aerial View API — correct call pattern:**
```
GET https://aerialview.googleapis.com/v1/videos:lookupVideo
  ?X-Goog-Api-Key={key}
  &address={encodeURIComponent(postalAddress)}
```
Returns `state: ACTIVE` with `uris.LANDSCAPE_VIDEO.landscapeVideoUri` when footage exists. Returns 404 when address has no footage.

**Street View Static — correct URL pattern:**
```
https://maps.googleapis.com/maps/api/streetview
  ?size=260x138&location={lat},{lng}&fov=80&pitch=10&heading=0&key={key}
```

**Map ID rule (repeated here for emphasis):**
- Map ID `96844e6a7bb74a7d5514d3a5` is a **vector** map — never set `mapTypeId: 'hybrid'`
- 3D photorealistic tiles require: `mapId` set + `zoom ≥ 17` + `tilt ≥ 45`

---

## After Every Push — Verify These

```bash
# Console position correct
grep "#media-col" dtla.html laveen.html

# hideMedia not removed
grep "hideMedia" dtla.html | grep "map.on\|openPanel\|goHome"

# No flyTo before load
grep -n "flyTo" dtla.html laveen.html

# No auto-open panel
grep "openPanel" dtla.html | grep -v "function\|onclick\|marker"
```

---

## Working With the User

- **Always confirm before pushing** — state what changed and what didn't
- **Never make two changes at once** — one thing at a time, push, confirm, then next
- **Read files before editing** — never assume current state from memory
- **Save backups before risky changes** — `cp file.html file.html.bak`
- **When something breaks, revert first, investigate second** — don't stack fixes on broken code
- User works alone — be the second pair of eyes, not a source of new problems
