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

If a change touches the map, Mapbox constructor, or `map.on('load',...)` — **stop and read the full map init block first.**

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

## Map Initialization Rules (HIGH RISK)

**NEVER call `map.flyTo()` before `map.on('load',...)` fires.**
- Calling `flyTo` right after `new mapboxgl.Map({...})` silently kills the entire map
- No tiles, no markers, no POIs — only fixed-position elements remain visible
- This looks like "all data was deleted" but the data is fine

**NEVER change the map constructor center/zoom/fitBounds without reading the full `map.on('load',...)` block first.**
- All markers are added inside `map.on('load',...)` — they load by lat/lng coords regardless of viewport
- But changing the initial view can make markers appear off-screen, looking like they're gone

**Safe pattern for post-load view changes:**
```javascript
map.on('load', () => {
  // ... all existing code ...
  // flyTo is safe HERE, at the end, after markers are placed
  map.flyTo({center:[...], zoom:16, pitch:65, bearing:200, duration:1500});
});
```

**`fitBounds` is safe to call before load.** It is designed for this. Keep it unless you have a specific reason.

---

## Data Rules

- **AZ and CA data never share.** Laveen → AZ ZIPs (85339, 85041, 85042, 85044). DTLA → CA ZIPs (90017, 90015, 90013, 90014)
- Supabase key is embedded directly in source HTML — never use `__SB_KEY__` placeholder
- **Never delete or modify the properties array, images arrays, or videos arrays without explicit instruction**
- Backup files before any risky change: `cp dtla.html dtla.html.bak`

---

## Map Type Rule — HYBRID Light on All Pages

Every map page (landing, parent, child) uses Google Maps `mapTypeId: 'hybrid'` with daytime/light settings.
- **No dark themes, no dusk preset on Google Maps pages** (dusk was Mapbox only — Mapbox is being phased out)
- When a Mapbox page is migrated to Google Maps, the constructor must include `mapTypeId: 'hybrid'`
- Map ID `96844e6a7bb74a7d5514d3a5` is the Requation map ID — use it on every Google Maps page
- Light preset = satellite imagery (inherently bright/daytime), vector labels in cream/white, no dark color schemes

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

## Build Pipeline (Vercel)

- Source: `dtla.html`, `laveen.html`, `lalife.html`, `desertlife.html`, `index.html`, `gm-landing.html`
- Build: `node build.js` → outputs to `dist/`
- API functions: `api/*.js` — served at `/api/functionname` (NOT `/.netlify/functions/`)
- Deploy: Vercel runs `node build.js` on push to `master`, serves `dist/`, routes `/api/*` to functions
- Config: `vercel.json` (replaces `netlify.toml`)
- Environment variables: set in Vercel dashboard → Settings → Environment Variables
  - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE, ADMIN_PHONE
  - YOUTUBE_API_KEY, PREDICTHQ_KEY, YELP_API_KEY, EVENTBRITE_TOKEN, RESEND_API_KEY

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
