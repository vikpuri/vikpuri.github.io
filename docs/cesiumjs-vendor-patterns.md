# CesiumJS — Vendor Instructions + Requation Implementation Model

**Source:** Google/CesiumJS documentation, provided by Vik 2026-04-28.
**Rule:** Stay 100% faithful to vendor instructions. These patterns replace all improvised approaches.

---

## Part 1 — Vendor Instructions (Verbatim)

### 1. Node.js Backend — Dynamic Icon Mapping

Prompt for Claude Code:
> "Create a Node.js Express endpoint /api/places that calls the Google Places nearbysearch API. Based on the types array in Google's response, map 'restaurant' to /icons/food.png, 'store' to /icons/shop.png, and use /icons/default.png as a fallback."

**Expected backend pattern:**

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.get('/api/places', async (req, res) => {
  const { lat, lon, radius = 2000 } = req.query;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const url = `https://googleapis.com{lat},${lon}&radius=${radius}&key=${apiKey}`;

  try {
    const response = await axios.get(url);

    const mappedBusinesses = response.data.results.map(place => {
      let pinImage = '/assets/pins/default.png';

      if (place.types.includes('restaurant') || place.types.includes('cafe')) {
        pinImage = '/assets/pins/restaurant-pin.png';
      } else if (place.types.includes('store') || place.types.includes('shopping_mall')) {
        pinImage = '/assets/pins/shopping-pin.png';
      } else if (place.types.includes('lodging') || place.types.includes('hotel')) {
        pinImage = '/assets/pins/hotel-pin.png';
      }

      return {
        name: place.name,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        icon: pinImage,       // ← icon path returned from server, not baked into frontend
        address: place.vicinity
      };
    });

    res.json(mappedBusinesses);
  } catch (error) {
    res.status(500).json({ error: "API fetch failed" });
  }
});
```

**Key principle:** Icon selection lives in the backend, not the frontend. Server reads `types[]` and attaches the right local asset path. Frontend just renders `business.icon`.

---

### 2. CesiumJS Frontend — Billboard Entities + Camera Fly-In

Prompt for Claude Code:
> "Write a frontend JS function that fetches /api/places. Map them as Cesium Billboards using the icon field returned by the backend. After adding the entities, use viewer.camera.flyTo to smoothly zoom into the geographic center of the businesses."

**Expected frontend pattern:**

```javascript
async function loadMapAndFlyIn() {
  const response = await fetch('/api/places?lat=37.422&lon=-122.084');
  const businesses = await response.json();

  const entities = [];

  businesses.forEach((business) => {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(business.lng, business.lat),
      billboard: {
        image: business.icon,                              // server-supplied icon path
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e6, 0.3),
      },
      label: {
        text: business.name,
        font: 'bold 12px sans-serif',
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }
    });
    entities.push(entity);
  });

  // CAMERA FLY-IN after entities load
  if (entities.length > 0) {
    // Option A: Fly to specific coords + altitude
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-122.084, 37.422, 1500),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch:   Cesium.Math.toRadians(-45.0),
        roll: 0.0
      },
      duration: 3.0
    });

    // Option B: Auto-frame all loaded markers perfectly (preferred when count unknown)
    // viewer.flyTo(entities, { duration: 3.0 });
  }
}
```

**Key principles from vendor docs:**
- Use `viewer.entities.add({ billboard: {...} })` — NOT DOM overlay + postRender hack
- `heightReference: CLAMP_TO_GROUND` — pins stick to terrain surface, no floating
- `scaleByDistance` — pins scale naturally with zoom (big when close, small when far)
- Labels use `pixelOffset` to sit above the billboard
- Camera fly-in triggers AFTER all entities are added
- `viewer.flyTo(entities)` is the preferred Option B — automatically frames all markers

### 3. Claude Code Guardrails (from vendor)

- **Environment keys:** Read from `.env` — never bake strings into Node.js source
- **CLAUDE.md:** Run `/init` before assigning heavy tasks to generate project memory
- Labels: only appear on hover (not always visible) — reduces visual noise
- No CSS frameworks (Tailwind/Bootstrap) — plain CSS per project spec

---

## Part 2 — Requation Implementation Model

*How to apply the vendor patterns to our specific stack (Vercel + CesiumJS + Google Places New API v1).*

### Backend: Update `api/places.js`

Current `api/places.js` uses the Google Places (New) v1 API and returns raw place data.
Must be updated to:
1. Map `types[]` to local icon paths
2. Return `icon` field in each result

**Requation icon mapping (to match our categories):**

```javascript
function getIcon(types) {
  if (types.some(t => ['restaurant','cafe','food','meal_delivery','meal_takeaway'].includes(t)))
    return '/assets/pins/restaurant-pin.png';
  if (types.some(t => ['grocery_or_supermarket','supermarket'].includes(t)))
    return '/assets/pins/grocery-pin.png';
  if (types.some(t => ['gym','fitness_center'].includes(t)))
    return '/assets/pins/gym-pin.png';
  if (types.some(t => ['shopping_mall','store','clothing_store'].includes(t)))
    return '/assets/pins/shopping-pin.png';
  if (types.some(t => ['museum','art_gallery'].includes(t)))
    return '/assets/pins/culture-pin.png';
  if (types.some(t => ['park','campground'].includes(t)))
    return '/assets/pins/park-pin.png';
  if (types.some(t => ['movie_theater','entertainment'].includes(t)))
    return '/assets/pins/entertainment-pin.png';
  if (types.some(t => ['lodging','hotel'].includes(t)))
    return '/assets/pins/hotel-pin.png';
  if (types.some(t => ['library','local_government_office'].includes(t)))
    return '/assets/pins/civic-pin.png';
  return '/assets/pins/default-pin.png';
}
```

**Assets needed** (create in `public/assets/pins/`):
- `restaurant-pin.png` — food/fork icon, warm red
- `grocery-pin.png` — shopping cart, green
- `gym-pin.png` — dumbbell, blue
- `shopping-pin.png` — bag, purple
- `culture-pin.png` — frame/building, gold
- `park-pin.png` — tree, forest green
- `entertainment-pin.png` — film reel, orange
- `hotel-pin.png` — bed/door, teal
- `civic-pin.png` — building columns, grey
- `default-pin.png` — circle dot, neutral

### Frontend: Replace DOM Overlay with Billboard Entities

**In `dtla.html` and `laveen.html`, replace:**
```javascript
// ❌ Current approach — DOM overlay (breaks on mobile)
const dot = document.createElement('div');
dot.style.cssText = `...colored dot...`;
viewer.scene.postRender.addEventListener(() => {
  const sc = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos);
  dot.style.left = sc.x + 'px'; dot.style.top = sc.y + 'px';
});
```

**With:**
```javascript
// ✅ Vendor pattern — billboard entity (works on all devices)
const entity = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(place.lng, place.lat),
  billboard: {
    image: place.icon,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    scaleByDistance: new Cesium.NearFarScalar(150, 1.0, 1500000, 0.3),
    show: false    // controlled by toggle button
  },
  label: {
    text: place.name,
    font: '11px DM Mono, monospace',
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -36),
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    show: false,   // hidden by default, show on hover/zoom
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  }
});
```

### Property Pin — Keep DOM Overlay (Exception)

The main property pin (red circle with pulse ring) stays as a DOM overlay because:
- It uses custom CSS animation (pulse ring)
- It needs click → openPanel behavior
- `pinActive` timing delay is tied to DOM event model

This is the ONE exception to the billboard entity rule. All Google Places POI markers must use the billboard pattern.

### Camera Fly-In After Places Load

Following vendor Option B (auto-frame):

```javascript
async function loadPlaces(viewer) {
  const r = await fetch(`/api/places?lat=${CENTER.lat}&lng=${CENTER.lng}&radius=900`);
  const places = await r.json();

  const entities = places.map(p => viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat),
    billboard: {
      image: p.icon,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      scaleByDistance: new Cesium.NearFarScalar(150, 1.0, 1500000, 0.3),
      show: placesVisible
    }
  }));

  // Option B — auto-frame all markers (vendor recommended)
  // viewer.flyTo(entities, { duration: 3.0 });
  // Note: we skip flyTo here to preserve property-centered view on load
}
```

---

## What This Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Places dots not on mobile | DOM overlay + SceneTransforms breaks on high-DPI | Billboard entities — native CesiumJS, renders everywhere |
| Pins float above terrain | No `heightReference` | `CLAMP_TO_GROUND` — pins stick to terrain mesh |
| Pins same size at all zoom levels | No scale factor | `scaleByDistance` — natural zoom behavior |
| Labels always visible = noise | No visibility control | `show: false` → reveal on hover or zoom threshold |

---

## Build Order for This Migration

1. Create `public/assets/pins/` directory with 10 PNG icon files
2. Update `api/places.js` to map types → icon path, return `icon` field
3. Update `dtla.html` `loadPlaces()` to use billboard entities
4. Update `laveen.html` same pattern
5. Test on mobile (Asus + iPhone) — this is the acceptance criteria
6. Then proceed to Supabase persistence (Phase 4)
