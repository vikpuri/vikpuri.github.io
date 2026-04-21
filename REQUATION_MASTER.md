# REQUATION Platform — Master Reference Document

---

## 0. System Architecture Schematic

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    REQUATION PLATFORM ARCHITECTURE                       ║
║                         requation.com                                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ┌──────────────────────────────────────────────┐                       ║
║  │              BROWSER / CLIENT                 │                       ║
║  │   requation.com · HTTPS · TLS 1.3             │                       ║
║  └─────────────────────┬────────────────────────┘                       ║
║                         │ HTTPS request                                  ║
║  ┌──────────────────────▼─────────────────────────────────────────────┐ ║
║  │                  NETLIFY CDN · Global Edge                          │ ║
║  │  /index  /dtla  /lalife  /laveen  /desertlife  /dashboard           │ ║
║  │  netlify.toml redirects · Let's Encrypt HTTPS · Auto-deploy         │ ║
║  │  ┌───────────────────────┐                                          │ ║
║  │  │  NETLIFY FUNCTIONS     │  /.netlify/functions/youtube             │ ║
║  │  │  (Node.js · esbuild)  │  /.netlify/functions/yelp                │ ║
║  │  └───────────────────────┘                                          │ ║
║  └──────┬───────────────────┬──────────────────────────┬──────────────┘ ║
║         │ REST API           │ REST API (PostgREST)      │ JS SDK        ║
║  ┌──────▼───────┐   ┌────────▼──────────────────┐  ┌───▼────────────┐  ║
║  │   YOUTUBE    │   │   SUPABASE POSTGRESQL      │  │  MAPBOX GL JS  │  ║
║  │  Data API v3 │   │   mpmprnjhunjfeacikgml     │  │  v3.3.0        │  ║
║  │  Video search│   │  ┌──────────┐ ┌──────────┐ │  │  Standard style│  ║
║  │  Markers     │   │  │restaurants│ │properties│ │  │  3D buildings  │  ║
║  │  Billboard   │   │  │  table   │ │  table   │ │  │  Fog · Cinematic│ ║
║  └──────────────┘   │  └──────────┘ └──────────┘ │  │  HTML markers  │  ║
║                     │  Row-level security          │  └────────────────┘  ║
║                     └────────────────────────────┘                       ║
║                                                                          ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ ║
║  │  YELP FUSION │  │    RESEND    │  │    STRIPE    │  │STREAMTHEWORLD│ ║
║  │ Business POI │  │    Email     │  │   Payments   │  │ KLOS 99.5FM │ ║
║  │ Netlify proxy│  │ Notifications│  │  (test mode) │  │ 99.5 Mountain│ ║
║  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  DATA FLOW                                                               ║
║  Browser → Netlify CDN (HTML pages)                                     ║
║  Browser → Netlify Function → YouTube API (video markers + billboard)   ║
║  Browser → Netlify Function → Yelp API (business POI data)              ║
║  Browser → Supabase PostgREST (restaurants + properties queries)        ║
║  Browser → Mapbox CDN (vector tiles, 3D buildings, fog layers)          ║
║  Browser → StreamTheWorld CDN (KLOS / The Mountain live AAC audio)      ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PAGES                                                                   ║
║  /              index.html       Home · market selector                 ║
║  /dtla          dtla.html        DTLA property map · 1116 lines         ║
║  /lalife        lalife.html      DTLA life map · 541 lines              ║
║  /laveen        laveen.html      Laveen AZ property map · 1133 lines    ║
║  /desertlife    desertlife.html  Laveen life map · 668 lines            ║
║  /dashboard     dashboard.html  Management dashboard · investor view    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 1. Platform Overview

Requation (requation.com) is a living maps real estate intelligence platform built on Mapbox GL JS v3.3.0 with Standard style. It uses 3D buildings, dusk/day presets, clustered GeoJSON sources, and cinematic camera animations. Deployed on Netlify (static HTML) with serverless functions for API proxies.

**Tech Stack**
- Frontend: Vanilla HTML/CSS/JS, Mapbox GL JS v3.3.0
- Hosting: Netlify (drag-and-drop or git deploy)
- Database: Supabase (PostgreSQL via REST/PostgREST)
- Functions: Netlify Functions (Node.js, esbuild bundler)
- Fonts: Playfair Display, Source Serif 4, DM Mono (Google Fonts)

---

## 2. Pages & Navigation Structure

| URL | File | Description |
|-----|------|-------------|
| / | index.html | Home — hero + market selector |
| /dtla | dtla.html | DTLA property page (South Park Brutalist condo) |
| /laveen | laveen.html | Laveen property page (Urban Farmhouse SFR) |
| /lalife | lalife.html | DTLA neighbourhood life map |
| /desertlife | desertlife.html | Laveen/South Phoenix life map |
| /dashboard | dashboard.html | Management dashboard — live DB, architecture, API status |

**Navigation Flow**
```
/ → /dtla ──→ /lalife ──→ /dtla (back)
  → /laveen → /desertlife → /laveen (back)
```

**Navigation Rules**
- Any POI/RPOI click on /dtla → navigates to /lalife
- Any POI/RPOI click on /laveen → navigates to /desertlife
- Header title, "Home", nav-back on life pages → returns to property page
- map.on('load') auto-opens the property panel after 1500ms on property pages

---

## 3. API Keys & Services

> ⚠️  Keep this document private. Never commit to a public repository.

### Supabase
| Key | Value |
|-----|-------|
| Project URL | https://mpmprnjhunjfeacikgml.supabase.co |
| Publishable Key | sb_publishable_T6XISHd9O2Ol0raPaEASqQ_klUXnyY3 |
| Dashboard | https://supabase.com/dashboard/project/mpmprnjhunjfeacikgml |

### Mapbox
| Key | Value |
|-----|-------|
| Access Token | pk.eyJ1IjoidmlranB1cmkiLCJhIjoiY21uYnF0ZWNuMHhnaTJ3bzR5MG5xOTEzbSJ9.vqmEhPHMBQOn4GX3yrbiGw |
| Dashboard | https://account.mapbox.com |
| Notes | Restrict to requation.com domain in Mapbox dashboard |

### YouTube Data API v3
| Key | Value |
|-----|-------|
| API Key | AIzaSyCEQGh-rbZeXKH1pWKIfvLkFRkwyqvAkr0 |
| Netlify Function | /.netlify/functions/youtube |
| Function File | netlify/functions/youtube.js |
| Netlify Env Var | YOUTUBE_API_KEY |
| Dashboard | https://console.cloud.google.com |
| Quota | 10,000 units/day free; search costs 100 units each |
| Notes | Restrict to requation.com HTTP referrer in Google Cloud Console |

### Yelp Fusion API
| Key | Value |
|-----|-------|
| API Key | TyuvxIB1yJfI_QSnqv7AYY1zcsAexxpqShxEI9Pn_tluIUZT8mBey_xmWXeWZr4ruWD1w3JgF_gmzNsjvrz0fk8mNHJd3hYZfe6kawT2aLpYl7nZvUuSa5WIdvDRaXYx |
| Netlify Function | /.netlify/functions/yelp |
| Netlify Env Var | YELP_API_KEY |
| Notes | Used by fetch-yelp-by-zip.js to populate restaurants table |

### Resend (Email)
| Key | Value |
|-----|-------|
| API Key | Re_Pvrj1guK_54ZAFg6pZdsD1xVSs58WNYms |
| Dashboard | https://resend.com/dashboard |

### Stripe (Payments)
| Key | Value |
|-----|-------|
| Publishable Key (test) | pk_test_51TIjDuCZNJtvPYlenegvKgoJuIna5ZqNWu258WRCME0DiIJvQvhus2Qakurzb0T2z1OhRVyAMhKi517AFxPH6lDf00vaSyomU0 |
| Dashboard | https://dashboard.stripe.com |
| Notes | Switch to live key before production launch |

---

## 4. Database — Supabase Tables

### `restaurants` table (POI / business data)
Used for neighbourhood businesses on all life pages.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Business name |
| category | text | Grocery, Coffee, FastFood, Cinema, Dental, MedSpa, Gym, Fashion, Shoes, Cosmetics, Hardware |
| address | text | Street address |
| zip | text | Used to filter by market (CA: 90017/90015/90013/90014, AZ: 85339/85041/85042/85044) |
| lat | numeric | Latitude |
| lng | numeric | Longitude |
| rating | numeric | Yelp rating |
| yelp_url | text | Yelp business link |
| waymo_url | text | Waymo ride link |
| phone | text | |
| is_key | boolean | Shows label on map when true |

**Current data**: ~1,760 records (4 CA zips × 11 categories × 20 + 4 AZ zips × 11 × 20)

### `properties` table (RPOI / listings)
Used for for-sale properties shown on life pages.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Property label |
| class | text | 'RPOI' for investment properties |
| address | text | |
| neighborhood | text | |
| city | text | |
| zip | text | |
| lat | numeric | |
| lng | numeric | |
| price | numeric | Listing price in USD |
| beds | integer | |
| baths | numeric | |
| sqft | integer | |
| mls_status | text | 'active' for live listings |
| redfin_url | text | Redfin listing link |

**Current AZ listings** (Laveen/South Phoenix, zip: 85339/85041/85042/85044, price ≥ $750K, status: active):
- 4730 W Piedmont Rd — $850K, 3bd/2ba
- 1013 W Ardmore Rd — $875K, 4bd/3ba
- 6832 S 38th Pl — $879K, 3bd/3ba
- 5116 W La Mirada Dr — $895K, 4bd/3ba
- 3812 W Lodge Dr — $935K, 4bd/4ba
- 11810 S 43rd Ave — $950K, 4bd/3ba
- 1353 E Paseo Way — $1.2M, 4bd/4ba
- 9539 S 13th Way — $2.19M, 4bd/4ba

---

## 5. Netlify Functions

Location: `netlify/functions/`

### youtube.js
Proxies YouTube Data API v3 search to keep API key server-side.

```
GET /.netlify/functions/youtube?q=QUERY&maxResults=7
Response: { videos: [{id, title, channel, thumb, published}], nextPageToken }
```

### yelp.js
Proxies Yelp Fusion API business search.

```
GET /.netlify/functions/yelp?term=coffee&location=90017&limit=20
Response: Yelp businesses array
```

**Client-side fallback**: If the Netlify function is unavailable, `fetchYT()` falls back to calling the YouTube Data API directly from the browser using the embedded key.

---

## 6. YouTube Integration — Per Page

| Page | Query | Billboard position | Trigger | Offsets |
|------|-------|-------------------|---------|---------|
| /lalife | "South Park DTLA luxury condo for sale Los Angeles" | top:60px right:16px z-index:115 | map.on('load') | 6 coords around [-118.2637, 34.0422] |
| /desertlife | "Laveen Arizona acreage home for sale South Phoenix" | top:60px right:16px z-index:115 | map.on('load') | 7 coords around [-112.118, 33.343] |
| /dtla | "South Park DTLA luxury condo for sale Los Angeles" | top:76px right:16px z-index:115 | map.on('load') | 6 coords around [-118.2637, 34.0422] |
| /laveen | "Laveen Arizona acreage farmhouse home for sale South Phoenix" | top:76px right:16px z-index:115 | map.on('load') | 7 coords around [-112.118, 33.343] |

**result[0]** → Billboard (top-right, 210×118px thumbnail, pulsing red glow)
**results[1–6]** → Small map markers (90×51px, pulsing ring, blinking red dot)

---

## 7. Radio Players

Two radio stations integrated as live streaming widgets. Auto-plays on first user interaction. Positioned in the **media corner** (top-right, directly below the YT billboard) on all 4 pages.

### DTLA Pages (/dtla + /lalife) — KLOS 99.5 FM

| Property | Value |
|----------|-------|
| Station | **KLOS 99.5 FM** |
| Format | Classic Rock / Los Angeles |
| Stream URL | `https://playerservices.streamtheworld.com/api/livestream-redirect/KLOSAACIHR.aac` |
| CDN | StreamTheWorld (iHeartMedia) |
| Widget ID | `#radio-player` |
| Position | `top:calc(var(--header-h)+200px);right:16px` (property) / `top:calc(var(--h)+200px);right:16px` (life) |

### Laveen Pages (/laveen + /desertlife) — 99.5 The Mountain

| Property | Value |
|----------|-------|
| Station | **99.5 The Mountain** (KQMT) |
| Format | Classic Rock / Phoenix Metro |
| Stream URL | `https://playerservices.streamtheworld.com/api/livestream-redirect/KQMTFMAAC.aac` |
| CDN | StreamTheWorld |
| Widget ID | `#radio-player` |
| Position | Same as above, right-side media corner |

### Behavior
- Auto-attempts `audio.play()` on page load
- If browser blocks autoplay: arms a one-shot `click` listener — first tap anywhere starts radio
- Green wave animation + `■` button while playing; red `▶` when paused
- Width: 210px (matches YT billboard width — forms unified media column)

---

## 8. How to Add Hyperlinks

### In popup HTML (map click events)
```js
const popup = new mapboxgl.Popup()
  .setHTML(`
    <div>
      <a href="https://example.com" target="_blank" 
         style="color:#00CED1;text-decoration:none">Link Text</a>
    </div>
  `);
```

### In property panel tabs (neighbourhood section)
In `showItems(items)` function in dtla.html / laveen.html:
```js
function showItems(items){
  document.getElementById('nbhd-grid').innerHTML = items.map(item => `
    <a class="nbhd-card" href="${item.link}" target="_blank" 
       onclick="event.stopPropagation()">
      <div class="nbhd-card-icon">${item.icon}</div>
      <div class="nbhd-card-name">${item.name}</div>
    </a>
  `).join('');
}
```

### Navigation between pages
```js
// Simple navigation
window.location.href = '/lalife';

// Open in new tab
window.open('/lalife', '_blank');

// History-aware (no page reload, changes URL bar)
window.history.replaceState(null, '', '/dtla');
```

### In cat-pill filter bar HTML
```html
<button class="cat-pill" data-cat="Coffee">☕ Coffee</button>
```

### In static HTML body
```html
<a href="/dtla" class="nav-back">← South Park</a>
```

### External links (Redfin, Yelp, Waymo)
```html
<a href="${property.redfin_url}" target="_blank" class="pop-link redfin">
  View on Redfin
</a>
<a href="${business.yelp_url}" target="_blank" class="pop-link yelp">
  Yelp
</a>
<a href="${business.waymo_url}" target="_blank" class="pop-link waymo">
  🚗 Waymo
</a>
```

---

## 9. Deployment

### Netlify (primary)
1. Go to Netlify dashboard → your site
2. Drag-and-drop the `requation` folder, OR connect to Git
3. Build settings: none (static HTML)
4. Functions directory: `netlify/functions`
5. Set environment variables in Netlify UI → Site Settings → Environment Variables:
   - `YOUTUBE_API_KEY`
   - `YELP_API_KEY`
   - `RESEND_API_KEY`
   - `STRIPE_PK`

### Redirects (netlify.toml)
```toml
[[redirects]]
  from = "/dtla"
  to = "/dtla.html"
  status = 200
  force = true
# Repeat for /laveen, /lalife, /desertlife
```

### GitHub Pages fallback
Each clean URL has a `SLUG/index.html` with:
```html
<meta http-equiv="refresh" content="0;url=/dtla.html">
<script>window.location.replace('/dtla.html')</script>
```

---

## 10. Features Built — Complete Log

### /dtla (dtla.html)
- [x] Mapbox Standard style, day preset, 3D buildings, pitch:30, bearing:45
- [x] Property markers (gold pulse ring) for all properties
- [x] Condo marker (aqua dot) for active DTLA listing
- [x] Auto-opens DTLA property panel after 1500ms
- [x] Property panel: carousel, stats, description, tabs (Property/Neighbourhood/Video/Comps/Index)
- [x] Neighbourhood tab: category buttons → nbhd-card grid with POI links
- [x] Comps tab: comparable sales analysis
- [x] Video tab: documentary videos
- [x] Yelp POI markers load via Supabase restaurants table (CA zips)
- [x] POI click → navigates to /lalife
- [x] Mapbox POI label click → shows Yelp popup with Waymo + Yelp links
- [x] DB listings layer: circle markers for nearby sold/active properties
- [x] DB listing panel: slide-up with price/beds/baths/sqft + Redfin link
- [x] "Explore the Neighbourhood →" card in neighbourhood tab → /lalife
- [x] YouTube billboard (top-right, 210×118px) with pulsing red glow
- [x] YouTube map markers (6×, 90×51px, blinking red dot, pulse ring)
- [x] YouTube popup: iframe embed, prev/next nav, close
- [x] Mapbox atmospheric haze (fog)
- [x] KLOS 99.5 FM radio player widget (media corner, auto-play)

### /laveen (laveen.html)
- [x] All features matching /dtla
- [x] Terrain marker for Laveen (circle layer, gold)
- [x] fetchLaveenRestaurants() loads AZ zip restaurants → lav-restaurants-layer
- [x] POI click → navigates to /desertlife
- [x] Neighbourhood link dynamically set to /desertlife when Laveen is active
- [x] YouTube uses Laveen-specific search query and AZ coordinates
- [x] 99.5 The Mountain radio player widget (media corner, auto-play)

### /lalife (lalife.html)
- [x] Mapbox Standard style, dusk preset, 3D buildings, pitch:62, bearing:-17.6
- [x] Cinematic reveal animation on load (zoom 13→14.2, pitch 38→62)
- [x] Atmospheric fog (deep violet, space colour)
- [x] South Park Brutalist RPOI pin (gold, always-large, 54px, pulsing ring)
- [x] Supabase restaurants layer: clustered GeoJSON, 11 category colours
- [x] Category filter pills: All, Grocery, Hardware, Coffee, Food, Cinema, Dental, Spa, Gym, Boutique, Shoes, Cosmetics
- [x] Count badge (top-left): live business count
- [x] Popup on POI click: name, rating, address, Yelp + Waymo links
- [x] Header nav-back → /dtla; header title → /dtla
- [x] YouTube billboard (top-right) with live badge, breathing glow
- [x] YouTube map markers (6×) with pulse + blink animation
- [x] YouTube popup: fullscreen iframe, prev/next
- [x] KLOS 99.5 FM radio player widget (media corner, auto-play)

### /desertlife (desertlife.html)
- [x] All features matching /lalife but for Laveen/AZ market
- [x] Center [-112.11, 33.365], zoom 11.5, pitch 45, bearing 10
- [x] Cinematic reveal: zoom 10.5→11.5, pitch 22→45
- [x] Urban Farmhouse RPOI pin at [-112.118, 33.343] → navigates to /laveen
- [x] AZ properties RPOI markers (8 listings from Supabase properties table)
- [x] RPOI panel: slide-up with address, price, beds/baths/sqft, Redfin link
- [x] Homes button (floating): opens homes list panel
- [x] Homes list panel: all 8 AZ listings, click → RPOI detail panel + fly-to
- [x] AZ restaurants layer (zips 85339, 85041, 85042, 85044)
- [x] YouTube billboard + markers using Laveen search query
- [x] 99.5 The Mountain radio player widget (media corner, auto-play)

---

## 11. Scripts & Utilities

### fetch-yelp-by-zip.js
Populates Supabase `restaurants` table with Yelp data.
```bash
node fetch-yelp-by-zip.js
```
- 4 CA zips × 11 categories × 20 results = 880 CA records
- 4 AZ zips × 11 categories × 20 results = 880 AZ records
- Total: ~1,760 records

### geocode-az.js
Geocodes AZ property addresses via Nominatim (OpenStreetMap) and inserts into Supabase `properties` table.
```bash
node geocode-az.js
```

---

## 12. Work Log

### Session 2026-04-13 — iPhone Safe Area + Logo Redesign

**Committed & Live**

- iPhone notch fix: `viewport-fit=cover` on all 4 pages; header height and padding use `env(safe-area-inset-top, 0px)` so content never disappears behind the iPhone status bar
- Radio z-index lowered (115→90) so it doesn't overlap header on iPhone
- Billboard and radio `top` values use `calc(var(--header-h) + env(safe-area-inset-top,0px) + Npx)` for proper positioning under safe-area-aware header
- Logo left-aligned on property pages (dtla, laveen): `header .logo-svg { order:0; flex:1 }` + `header nav { order:1 }`
- Life pages (lalife, desertlife): removed `position:absolute; left:50%; transform:translateX(-50%)` from `.header-title` so it sits extreme left

**Logo Redesign — inline SVG (all 3 pages: index, dtla, laveen)**

Root cause of old blurriness: logo was `<img src="data:image/svg+xml...">` — sandboxed SVG can't load Google Fonts → Raleway falls back to Arial → dull/blurry.  
Fix: replaced with inline SVG so page-loaded fonts render correctly.

Current logo design (work in progress — slash angle being refined):
```html
<svg viewBox="0 0 440 100" height="60" width="100%" preserveAspectRatio="xMinYMid meet" overflow="visible">
  <defs><filter id="gb"><!-- soft glow on quation --></filter></defs>
  <text x="6" y="42" font-family="EB Garamond,Georgia,serif"
        font-size="46" font-weight="700" font-style="italic" fill="#B22234">r</text>
  <line x1="31" y1="76" x2="50" y2="41"
        stroke="#7A7A7A" stroke-width="5" stroke-linecap="round"/>
  <text x="56" y="88" font-family="Raleway,Arial,sans-serif"
        font-size="92" font-weight="600" fill="#4F6FB8">Σ</text>
  <text x="122" y="88" font-family="Raleway,Arial,sans-serif"
        font-size="24" font-weight="600" font-style="italic"
        fill="#D4A843" opacity="0.8" filter="url(#gb)" letter-spacing="2">quation</text>
</svg>
```

**Logo design intent (for future Claude sessions):**
- Brand reads as `r/Σquation` = `r/Equation` = RE/Equation = Requation
- `r` — red (#B22234), EB Garamond bold italic (math/finance serif), top-left, aligned with slash top
- `/` — grey SVG line (not a font glyph), forward slash at ~110° obtuse angle (between r and Σ, not touching either)
- `Σ` — blue (#4F6FB8), Raleway, large (font-size 92), baseline-anchored — Σ IS the E in Equation
- `quation` — gold (#D4A843), Raleway italic small (font-size 24), soft glow filter, sits right of Σ
- Colors: red/blue/gold = real estate + equation symbolism
- Slash must NOT touch r or Σ
- Slash angle: **work in progress** — target ~110° obtuse (more vertical than 61° current, user still confirming)

**Fonts in use:**
- EB Garamond 700 italic — for `r` (classic math/LaTeX heritage font)
- Raleway 600 — for Σ and quation
- Google Fonts `<link>` updated on all 3 pages to include `&family=EB+Garamond:ital,wght@1,700`

**Next session logo tasks:**
- [ ] Finalize slash angle (user wants ~110° obtuse, to be confirmed visually)
- [ ] Ensure slash aligns between top of r and full extent of Σ
- [ ] Replicate finalized logo to panel-close mini buttons (dtla, laveen, index)

---

## 13. Future Features (Planned)

- [ ] User authentication (Supabase Auth)
- [ ] Saved properties / favourites
- [ ] Property inquiry form (Resend email)
- [ ] Stripe payment integration
- [ ] Own listing video integration (separate from advertising YT)
- [x] 99.5 The Mountain — Phoenix rock radio for /laveen + /desertlife (DONE)
- [ ] Management dashboard UI
- [ ] More markets (expand beyond DTLA + Laveen)

---

---

## 14. WhatIsMedigap.com — Separate Product

> ⚠️ Completely separate from Requation. Different GitHub repo, different Netlify site, different domain. No shared code, keys, or infrastructure.

### Product Description
A standalone public-service publication helping American seniors understand Medicare Supplement Insurance (Medigap) and why it may protect them better than Medicare Advantage. Written in a plain-English, folksy voice (Charlie Munger-style) — no insurance company affiliation, nothing sold, free public resource. A MartinsWay.org initiative.

**Tagline:** *"For about 5 bucks a day — less than a cup of coffee — you could avoid going broke because of surgery or getting sick."*

### Infrastructure
| Item | Value |
|------|-------|
| Domain | whatismedigap.com |
| GitHub | github.com/vikpuri/whatismedigap |
| Netlify | whatismedigap.netlify.app |
| Branch | master |
| Build command | *(none — single static HTML file)* |
| Publish directory | *(root)* |
| Sponsor | martinsway.org — "A Good Life for All" |

### Design
- WSJ-style broadsheet layout: Playfair Display masthead, Source Serif 4 body
- Single file: `index.html` (no build pipeline, no secrets, no dependencies)
- Three newspaper columns: In Plain English / What It Costs / What To Do
- Two pull quotes, cost comparison table (9 procedures), MartinsWay footer strip
- Built with Claude Sonnet

### Key Facts in the Page (current data)
- 93% of non-pediatric physicians accept Medicare (any doctor, anywhere)
- ~14 million Americans enrolled in Medigap
- Plan G: $130–$200/month at age 65 in most states
- Medicare Advantage OOP max: up to $9,350/year in-network (2026)
- ~1 in 8 prior authorization requests initially denied (MA plans)
- Open enrollment: 6-month window starting at age 65 + Part B enrollment
- 47 states allow medical underwriting after open enrollment closes
- Protected states (year-round): CT, MA, NY, ME

### Deployment
Push to `master` on GitHub → Netlify auto-deploys → live at whatismedigap.com

---

*Document maintained by Requation development team. Last updated: 2026-04-20 (session — WhatIsMedigap launched as separate product).*
