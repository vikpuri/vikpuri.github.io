# Requation — HyperlocalGPS

> *"You're here when you click Requation — come in and see where I live."*

A map operating system for neighborhoods. Not a listing site. Not a widget. A full GPS experience locked to one block, built on CesiumJS + Google Photorealistic 3D Tiles.

**Live:**
- [requation.com/dtla](https://requation.com/dtla) — South Park, Downtown LA
- [requation.com/laveen](https://requation.com/laveen) — Laveen, AZ (4.4-acre urban farmhouse)
- [requation.com/dtla-mall-map](https://requation.com/dtla-mall-map) — DTLA with Favorites
- [requation.com/laveen-mall-map](https://requation.com/laveen-mall-map) — Laveen with Favorites

---

## What it does differently

| Standard map embed | Requation |
|---|---|
| Shows everything for everyone | GPS-locked to one territory |
| Static appearance | Live Yelp data across every ZIP |
| No commerce layer | Every pin is a product (SKU + billing) |
| 2D tiles | CesiumJS + Google Photorealistic 3D Tiles |
| One category at a time | Claude's Cube: 25 categories, parallel ZIP calls |

---

## Claude's Cube

The core navigation tool. A 5×5 grid of category cells. Tap one cell → fires parallel Yelp API calls across all ZIPs in the territory simultaneously → deduplicated, sorted by popularity, rendered in the panel.

```
DTLA:   16 ZIPs × 50 results = up to 800 businesses per tap
Laveen:  4 ZIPs × 50 results = up to 200 businesses per tap
```

25 categories: Food & Drink · Wellness · Grocery · Fitness · Medical · Pharmacy · Shopping · Arts · Hotels · Parks · Film · Library · Pets · Finance · Parking · Taco Trucks · Events · Education · Services · Corner Store · Cannabis · Transit · Real Estate · Pro Services · More

No rating floor. Sorted by `review_count` (most popular first). Results cached per cell.

---

## Stack

| Layer | Technology |
|---|---|
| 3D Map | CesiumJS + Google Photorealistic 3D Tiles |
| Hosting | Vercel (static + serverless functions) |
| Database | Supabase (PostgreSQL) — AZ and CA data isolated |
| Directory | Yelp Fusion API via `/api/yelp.js` |
| POI | Google Places API via `/api/places.js` |
| Property video | Google Aerial View API |
| Events | YouTube Data API v3 + ESPN public API |
| Radio | KLOS 99.5 FM (LA) / 99.5 The Mountain (AZ) |
| Email | Resend |
| Voice/SMS | Twilio |
| Build | `node build.js` → `dist/` → Vercel auto-deploy |

---

## Architecture

```
Browser
  └── Vercel CDN (dist/)
        ├── /api/yelp.js      → Yelp Fusion
        ├── /api/places.js    → Google Places
        ├── /api/aerialview.js → Google Aerial View
        ├── /api/espn.js      → ESPN (no key)
        └── /api/contact.js   → Resend + Twilio

CesiumJS Viewer
  ├── Google Photorealistic 3D Tiles (terrain + buildings)
  ├── Property pin (DOM overlay, terrain-clamped via sampleHeightMostDetailed)
  ├── YT billboard markers (Cesium entities)
  └── flyTo → camera.flyTo() — viewer is a singleton, never re-init

Supabase
  ├── properties table (CA + AZ, never mixed)
  └── places table (POI seed data)
```

---

## Pages

| URL | Purpose |
|---|---|
| `/dtla` | DTLA South Park property — Cesium 3D, panel, Claude's Cube |
| `/laveen` | Laveen AZ property — same architecture, AZ data |
| `/dtla-mall-map` | DTLA + ♥ Favorites header shortcut |
| `/laveen-mall-map` | Laveen + ♥ Favorites header shortcut |
| `/mylocal` | CA local listings (16 ZIPs) |
| `/laveenlocal` | AZ local listings (4 ZIPs) |
| `/lalife` | DTLA neighborhood life map |
| `/lalife/broadway` `/lalife/venice` `/lalife/weho` | Sub-neighborhood maps |
| `/desertlife` | AZ life map |
| `/desertlife/phoenix` `/desertlife/scottsdale` | Sub-market maps |
| `/dashboard` | Admin / newsmap publishing console |

---

## Three product lines

**1. Map Functions** — Claude's Cube navigation, parallel ZIP calls, territory-aware search  
**2. Map Appearance** — Goldman Sachs glam aesthetic, Cesium 3D, the panel system  
**3. Adding Commerce to Maps** — every pin is a product, every business is a listing, Contact → Stripe

---

## Vision

Requation is a publishing platform, not a template store.

The goal: a hyperlocal GPS for every neighborhood — open-source infrastructure that any community can deploy. Phase 2 targets 33 million US business listings geocoded via the Google Geocoding API, one address at a time, stored in Supabase, rendered from the same code that runs today on two properties.

Built by one person + [Claude Code](https://claude.ai/code). Engineering is AI-native by design.

The long-term mission: use this platform to train and employ women in Laos, Nepal, and underserved communities globally — teaching map publishing as a trade, the way earlier generations learned printing.

---

## Feedback & collaboration

This project is actively seeking:
- **Map engineers** — especially anyone working with CesiumJS, Google Maps 3D, or Photorealistic Tiles
- **Neighborhood publishers** — who want to deploy this for their block
- **Real estate + media crossover** — the GPS is the publication

Open an issue, or reach out directly at [requation.com](https://requation.com).

---

## Tag

Current stable: `requation-v1A-2026-05-03`

```bash
git checkout requation-v1A-2026-05-03
```

Built with [Claude Code](https://claude.ai/code) · Powered by [CesiumJS](https://cesium.com) · Data by [Yelp Fusion](https://docs.developer.yelp.com) · Maps by [Google](https://developers.google.com/maps)
