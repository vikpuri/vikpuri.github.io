// Mapbox Tiling Service pipeline
// Fetches Yelp/restaurant data from Supabase, uploads to Mapbox as vector tilesets.
// Run: node scripts/mts-pipeline.js

const TOKEN    = process.env.MAPBOX_TOKEN; // export MAPBOX_TOKEN=sk.eyJ... before running
const USERNAME = 'vikjpuri';
const SB_URL   = 'https://mpmprnjhunjfeacikgml.supabase.co';
const SB_KEY   = 'sb_publishable_T6XISHd9O2Ol0raPaEASqQ_klUXnyY3';
const MTS      = 'https://api.mapbox.com/tilesets/v1';

const TILESETS = [
  { id: 'la-yelp',  zips: '90017,90015,90013,90014', label: 'LA'  },
  { id: 'az-yelp',  zips: '85339,85041,85042,85044', label: 'AZ'  },
];

const SB_HEADERS = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

// ── 1. Fetch from Supabase ────────────────────────────────────────────────────
async function fetchRestaurants(zips) {
  const url = `${SB_URL}/rest/v1/restaurants?select=*&zip=in.(${zips})&limit=2000`;
  const resp = await fetch(url, { headers: SB_HEADERS });
  if (!resp.ok) throw new Error(`Supabase fetch failed: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

// ── 2. Convert to NDJSON (line-delimited GeoJSON features) ───────────────────
function toNDJSON(rows) {
  return rows
    .filter(b => b.lat && b.lng)
    .map(b => JSON.stringify({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [parseFloat(b.lng), parseFloat(b.lat)] },
      properties: {
        id:        b.id,
        name:      b.name       || '',
        category:  b.category   || 'Other',
        chain:     b.chain      || '',
        rating:    b.rating     || null,
        address:   b.address    || '',
        yelp_url:  b.yelp_url   || '',
        waymo_url: b.waymo_url  || '',
        zip:       b.zip        || '',
      }
    }))
    .join('\n');
}

// ── 3. Upload source to Mapbox ────────────────────────────────────────────────
async function uploadSource(sourceId, ndjson) {
  const form = new FormData();
  form.append('file', new Blob([ndjson], { type: 'application/octet-stream' }), 'data.ndjson');

  const url = `${MTS}/sources/${USERNAME}/${sourceId}?access_token=${TOKEN}`;
  const resp = await fetch(url, { method: 'PUT', body: form });
  const body = await resp.json();
  if (!resp.ok) throw new Error(`Source upload failed: ${JSON.stringify(body)}`);
  console.log(`  Source uploaded: mapbox://tileset-source/${USERNAME}/${sourceId}`);
  return body;
}

// ── 4. Create tileset with recipe ─────────────────────────────────────────────
async function createTileset(tilesetId, sourceId) {
  const recipe = {
    version: 1,
    layers: {
      yelp: {
        source: `mapbox://tileset-source/${USERNAME}/${sourceId}`,
        minzoom: 10,
        maxzoom: 16,
      }
    }
  };

  const url = `${MTS}/${tilesetId}?access_token=${TOKEN}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe, name: tilesetId })
  });

  // 409 = already exists — update recipe instead
  if (resp.status === 409) {
    console.log(`  Tileset exists — updating recipe…`);
    const patch = await fetch(`${MTS}/${tilesetId}/recipe?access_token=${TOKEN}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe)
    });
    if (!patch.ok) throw new Error(`Recipe update failed: ${await patch.text()}`);
    return;
  }

  const body = await resp.json();
  if (!resp.ok) throw new Error(`Create tileset failed: ${JSON.stringify(body)}`);
  console.log(`  Tileset created: ${tilesetId}`);
}

// ── 5. Publish ────────────────────────────────────────────────────────────────
async function publishTileset(tilesetId) {
  const url = `${MTS}/${tilesetId}/publish?access_token=${TOKEN}`;
  const resp = await fetch(url, { method: 'POST' });
  const body = await resp.json();
  if (!resp.ok) throw new Error(`Publish failed: ${JSON.stringify(body)}`);
  console.log(`  Published — job id: ${body.jobId}`);
  return body.jobId;
}

// ── 6. Poll job status ────────────────────────────────────────────────────────
async function waitForJob(tilesetId, jobId) {
  const url = `${MTS}/${tilesetId}/jobs/${jobId}?access_token=${TOKEN}`;
  process.stdout.write('  Building tiles');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const resp = await fetch(url);
    const body = await resp.json();
    const stage = body.stage || body.status || '…';
    process.stdout.write('.');
    if (stage === 'success') { console.log(' done!'); return; }
    if (stage === 'failed')  { console.log(''); throw new Error(`Job failed: ${JSON.stringify(body)}`); }
  }
  console.log('\n  Timed out — check Mapbox Studio for job status');
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  for (const { id, zips, label } of TILESETS) {
    const tilesetId = `${USERNAME}.${id}`;
    console.log(`\n── ${label} (${id}) ──────────────────────`);

    console.log('  Fetching from Supabase…');
    const rows = await fetchRestaurants(zips);
    console.log(`  ${rows.length} rows fetched`);

    const ndjson = toNDJSON(rows);
    const count  = ndjson.split('\n').length;
    console.log(`  ${count} valid features → NDJSON`);

    console.log('  Uploading source…');
    await uploadSource(id, ndjson);

    console.log('  Creating tileset…');
    await createTileset(tilesetId, id);

    console.log('  Publishing…');
    const jobId = await publishTileset(tilesetId);

    await waitForJob(tilesetId, jobId);
    console.log(`  ✓ mapbox://${tilesetId} ready`);
  }

  console.log('\nAll tilesets published. Update map code to use vector sources.');
  console.log('  lalife.html    → mapbox://vikjpuri.la-yelp  (source-layer: "yelp")');
  console.log('  desertlife.html → mapbox://vikjpuri.az-yelp  (source-layer: "yelp")');
})();
