# Requation — Google APIs Configuration
*For Google Cloud support. Generated 2026-04-24.*

---

## Project Credentials

| Item | Value |
|------|-------|
| API Key (client-side, in HTML) | `AIzaSyD7UMA5ILPXv9QK2_gvxPVth30MavRd2WQ` |
| API Key (server-side, env var) | `YOUTUBE_API_KEY` (same GCP project) |
| Map ID | `96844e6a7bb74a7d5514d3a5` (vector type, photorealistic 3D tiles) |
| Platform | Vercel (serverless + static). Domain: `requation.com` |
| GitHub Repo | `vikpuri/requation` (private) |

---

## APIs Requested — Status

### 1. Maps JavaScript API
- **Status:** WORKING
- **Usage:** `<script src="https://maps.googleapis.com/maps/api/js?key=...&libraries=marker,places&v=weekly&map_ids=...">`
- **Features used:** `google.maps.Map`, `AdvancedMarkerElement`, `PlacesService.nearbySearch`, `moveCamera`
- **Auth:** API key in script src — correct per documentation

---

### 2. Street View Static API
- **Status:** ATTEMPTING — photos not rendering on device
- **Usage in code (dtla.html):**
```
https://maps.googleapis.com/maps/api/streetview
  ?size=260x138
  &location=34.0422,-118.2637
  &fov=80
  &pitch=10
  &heading=0
  &key=AIzaSyD7UMA5ILPXv9QK2_gvxPVth30MavRd2WQ
```
- **Auth method used:** API key in URL query param — correct per documentation
- **Expected:** Static 260×138 JPEG of the street-level view at 801 S Grand Ave, DTLA
- **Actual:** Image does not load on iOS Safari (iPhone). No visible error in HTML.
- **Question for Google:** Is "Street View Static API" enabled on this API key? Is there Street View coverage at `34.0422,-118.2637`? Does the referrer restriction (requation.com) need to allow this API separately?

---

### 3. Aerial View API
- **Status:** IMPLEMENTED — pending live test
- **Endpoint:**
```
GET https://aerialview.googleapis.com/v1/videos:lookupVideo
  ?X-Goog-Api-Key={server-side key}
  &address=801%20S%20Grand%20Ave%2C%20Los%20Angeles%2C%20CA%2090017
```
- **Auth method:** `X-Goog-Api-Key` query param — per discovery doc at `https://aerialview.googleapis.com/$discovery/rest?version=v1`
- **Expected response:** `{ state: "ACTIVE", uris: { LANDSCAPE_VIDEO: { landscapeVideoUri: "..." } } }`
- **Actual:** Returns `{ state: "NOT_FOUND" }` for 801 S Grand Ave (no aerial footage exists for this address yet)
- **Second address (Laveen AZ):** `11403 S 27th Dr, Laveen, AZ 85339` — also returns NOT_FOUND
- **Question for Google:** Is aerial footage available for these addresses? Can we submit a render request?

---

### 4. Street View Publish API
- **Status:** NOT IMPLEMENTED — blocked on OAuth 2.0 requirement
- **Discovery doc reviewed:** `https://streetviewpublish.googleapis.com/$discovery/rest?version=v1`
- **Intended use:** Upload 360° interior/exterior photos of our two FSBO properties so they appear in Google Maps Street View

**Critical compliance finding:**
The Street View Publish API requires OAuth 2.0 with scope:
```
https://www.googleapis.com/auth/streetviewpublish
```
An API key alone returns HTTP 401. We cannot use our server-side `YOUTUBE_API_KEY` for this API.

**Correct upload flow per discovery doc:**
```
Step 1: POST https://streetviewpublish.googleapis.com/v1/photo:startUpload
        Authorization: Bearer {oauth_token}
        → Returns: { uploadUrl: "https://streetviewpublish.googleapis.com/media/user/..." }

Step 2: PUT {uploadUrl}
        Content-Type: image/jpeg
        X-Goog-Upload-Protocol: raw
        [binary 360° JPEG body]

Step 3: POST https://streetviewpublish.googleapis.com/v1/photo
        Authorization: Bearer {oauth_token}
        Body: {
          "uploadReference": { "uploadUrl": "{uploadUrl}" },
          "pose": {
            "latLngPair": { "latitude": 34.0455, "longitude": -118.2587 },
            "heading": 200.0,
            "altitude": 0.0,
            "level": { "number": 16, "name": "16" }
          },
          "captureTime": "2025-01-01T00:00:00Z",
          "connections": []
        }
```

**What we need to implement this:**
- OAuth 2.0 client credentials (client_id + client_secret) — not just an API key
- One-time OAuth consent from the property owner (Vik Puri) to authorize `streetviewpublish` scope
- Store the refresh token securely as an environment variable
- Server-side Vercel function (`api/svpublish.js`) to manage token refresh + upload flow

**Current blocker:** No OAuth client configured in Google Cloud Console for this project.

---

### 5. Places API (nearbySearch)
- **Status:** WORKING
- **Usage:** `new google.maps.places.PlacesService(map).nearbySearch({...})`
- **Auth:** Via Maps JavaScript API key — correct
- **Active searches:** grocery, department_store, hardware_store, bank (credit union), movie_theater, museum, park, gym

---

### 6. Map Tiles API (implicit)
- **Status:** WORKING (photorealistic 3D tiles render correctly when zoom ≥ 17, tilt ≥ 45)
- **Auth:** Via Map ID + Maps JavaScript API key — correct
- **Map ID:** `96844e6a7bb74a7d5514d3a5` (vector type — must never use `mapTypeId: 'hybrid'`)

---

### 7. YouTube Data API v3
- **Status:** WORKING
- **Usage:** Server-side proxy at `/api/youtube?q=...&maxResults=6`
- **Auth:** `key=process.env.YOUTUBE_API_KEY` — correct
- **Returns:** `{ videos: [{id, title, channel, thumb, published}] }`

---

## Street View Static — Debug Checklist

To verify why the static photo is not rendering, check each of these:

```
Test URL (paste in browser while logged into GCP):
https://maps.googleapis.com/maps/api/streetview
  ?size=640x400
  &location=34.0422,-118.2637
  &fov=80&pitch=10&heading=0
  &key=AIzaSyD7UMA5ILPXv9QK2_gvxPVth30MavRd2WQ
```

**If it returns a gray "no imagery" image:**
- Street View coverage does not exist at these coordinates
- Try `location=801+S+Grand+Ave,+Los+Angeles+CA` (address string) instead of lat/lng

**If it returns HTTP 403:**
- "Street View Static API" is not enabled for this key in Cloud Console
- Go to: APIs & Services → Credentials → edit the key → check API restrictions
- Enable "Street View Static API" if not listed

**If it returns HTTP 400:**
- Parameter format issue — test with `&location=34.0422,-118.2637` (no spaces)

**If it works in browser but not on iPhone:**
- HTTP referrer restriction on the key may be blocking `requation.com`
- Go to: APIs & Services → Credentials → edit key → Application restrictions
- Add `requation.com/*` and `*.requation.com/*` to allowed referrers

---

## Environment Variables (Vercel)

All set in Vercel Dashboard → requation project → Settings → Environment Variables:

| Variable | Purpose | Notes |
|----------|---------|-------|
| `YOUTUBE_API_KEY` | Google Maps, Places, Aerial View, YouTube Data v3 | Same GCP project |
| `TWILIO_ACCOUNT_SID` | Twilio voice/SMS | |
| `TWILIO_AUTH_TOKEN` | Twilio auth | Secret |
| `TWILIO_PHONE` | Sending number | |
| `ADMIN_PHONE` | Notification recipient | |
| `YELP_API_KEY` | Yelp Fusion | |
| `RESEND_API_KEY` | Contact form email | |
| `SUPABASE_KEY` | Supabase POI data | |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | **MISSING** — needed for Street View Publish | Not yet created |

---

## What to Tell Google Support

**Subject:** Street View Static API not rendering + Street View Publish OAuth setup question

**Message:**
> We are building a real estate intelligence platform at requation.com using the Maps JavaScript API (Map ID: 96844e6a7bb74a7d5514d3a5), Street View Static API, Aerial View API, and Places API — all on the same GCP project.
>
> **Issue 1:** Street View Static `<img>` tags are not rendering on iOS Safari. The API key is `AIzaSyD7UMA5ILPXv9QK2_gvxPVth30MavRd2WQ`. Test URL: `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=34.0422,-118.2637&key=AIzaSyD7UMA5ILPXv9QK2_gvxPVth30MavRd2WQ`
>
> **Issue 2:** We want to use the Street View Publish API to publish 360° photos of our two for-sale properties (801 S Grand Ave Unit 1612, Los Angeles CA 90017 and 11403 S 27th Dr, Laveen AZ 85339). We need guidance on setting up OAuth 2.0 credentials for a server-side Node.js app (Vercel serverless functions) where there is no user consent UI — the property owner (single user) will authorize once and we will store the refresh token.
>
> **Issue 3:** Aerial View API returns `state: NOT_FOUND` for both addresses. We reviewed the discovery doc at `https://aerialview.googleapis.com/$discovery/rest?version=v1` and are using the correct `X-Goog-Api-Key` auth and `lookupVideo` endpoint. Can you confirm whether footage exists for these addresses or advise on the `renderVideo` / render request process?
