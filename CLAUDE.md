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
- `/dtla` radio: KLOS 99.5 FM (`KLOSAACIHR.aac`)
- `/laveen` radio: 99.5 The Mountain (`KQMTFMAAC.aac`)
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

## Things That Must Never Come Back

- `#cat-bar` / `.cat-pill` CSS and HTML on lalife/desertlife — **removed by design**, do not re-add
- `@media(max-width:640px) and (orientation:portrait){ #yt-billboard{display:none!important} }` — removed by design
- `window.addEventListener('load', setTimeout(openPanel, 1500))` — never add this

---

## Build Pipeline

- Source: `dtla.html`, `laveen.html`, `lalife.html`, `desertlife.html`, `index.html`
- Build: `node build.js` → outputs to `dist/`
- Deploy: Netlify runs `node build.js` automatically on push to `master`
- The build is a pass-through (key already embedded) — it just copies files

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
