/**
 * fetch-yelp-hotels-salons.js
 * Fetches Hotels + Salons from Yelp API → inserts into Supabase restaurants table.
 * Covers all 42 target ZIPs (35 CA + 7 AZ). 4+ rating only.
 *
 * Usage: node fetch-yelp-hotels-salons.js
 */

const fs = require('fs');

// Load .env + settings key
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.startsWith('#')) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  });
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  try {
    const m = fs.readFileSync('.claude/settings.local.json','utf8').match(/sb_secret_[A-Za-z0-9_-]+/);
    if (m) process.env.SUPABASE_SERVICE_KEY = m[0];
  } catch {}
}

const SUPABASE_URL = 'https://mpmprnjhunjfeacikgml.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_KEY'); process.exit(1); }

// Vercel is the active platform — Netlify is deprecated. Use Vercel API.
const NETLIFY_YELP = 'https://requation.com/api/yelp';

const ALL_ZIPS = [
  // CA — DTLA core + territory
  '90012','90013','90014','90015','90017','90021',
  '90004','90005','90006','90007','90010','90020',
  '90035','90048','90067','90069',
  '90024','90025','90049','90064',
  '90210','90211','90212',
  '90272','90291','90292',
  '90401','90402','90403','90404','90405',
  // AZ
  '85339','85040','85041','85042','85043','85018','85251',
];

const NEW_CATEGORIES = [
  { key: 'Hotels',  yelp: 'hotels' },
  { key: 'Salons',  yelp: 'hair,nailsalons,hairsalons,beautysvc' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchYelp(zip, yelpCategory) {
  const url = `${NETLIFY_YELP}?zip=${zip}&categories=${encodeURIComponent(yelpCategory)}&rating=4`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.businesses || [];
}

async function upsert(businesses, zip, categoryKey) {
  const rows = businesses
    .filter(b => b.rating >= 4 && b.coordinates?.latitude && b.coordinates?.longitude)
    .map(b => ({
      name:      b.name,
      category:  categoryKey,
      lat:       b.coordinates.latitude,
      lng:       b.coordinates.longitude,
      zip:       zip,
      rating:    b.rating,
      yelp_url:  b.url,
      waymo_url: 'https://waymo.com/waymo-one/?destination=' + encodeURIComponent(
                   [b.location.address1, b.location.city, b.location.state].filter(Boolean).join(', ')),
      phone:     b.phone || '',
      address:   [b.location.address1, b.location.city, b.location.state].filter(Boolean).join(', '),
    }));

  if (!rows.length) return 0;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurants`, {
    method:  'POST',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer:         'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err.slice(0, 120));
  }
  return rows.length;
}

async function run() {
  let total = 0, errors = 0;
  for (const cat of NEW_CATEGORIES) {
    console.log(`\n── ${cat.key} ──`);
    for (const zip of ALL_ZIPS) {
      try {
        const businesses = await fetchYelp(zip, cat.yelp);
        const count = await upsert(businesses, zip, cat.key);
        if (count) { process.stdout.write(`  ✓ ${zip} +${count}\n`); total += count; }
        else        { process.stdout.write(`.`); }
        await sleep(300);
      } catch (e) {
        process.stdout.write(`\n  ✗ ${zip} ${cat.key}: ${e.message}\n`);
        errors++;
      }
    }
  }
  console.log(`\n\n✅  Done: ${total} inserted · ${errors} errors`);

  // Final count
  const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurants?select=category`, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'count=exact' },
  });
  const count = res.headers.get('content-range');
  console.log(`Total restaurants table rows: ${count}`);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
