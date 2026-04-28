/**
 * fetch-redfin-az.js
 * DOM scraper → Nominatim geocoder → Supabase pipeline for AZ RPOI listings.
 *
 * Usage:  SUPABASE_SERVICE_KEY=eyJ... node fetch-redfin-az.js
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

// ── Load .env ─────────────────────────────────────────────────────────────────
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

const SUPABASE_URL = 'https://mpmprnjhunjfeacikgml.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_KEY'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Search targets — one entry per ZIP for reliability ────────────────────────
const FILTER = 'min-price=800000,min-baths=2,min-sqft=2000,min-lot-size=5000-sqft,property-type=house+townhouse';
function zipUrl(zip) { return `https://www.redfin.com/zipcode/${zip}/filter/${FILTER}`; }

const SEARCHES = [
  { label: 'Laveen 85339',        url: zipUrl('85339'), targetZips: ['85339'] },
  { label: 'South Phoenix 85040', url: zipUrl('85040'), targetZips: ['85040'] },
  { label: 'South Phoenix 85041', url: zipUrl('85041'), targetZips: ['85041'] },
  { label: 'South Phoenix 85042', url: zipUrl('85042'), targetZips: ['85042'] },
  { label: 'South Phoenix 85043', url: zipUrl('85043'), targetZips: ['85043'] },
  { label: 'Arcadia 85018',       url: zipUrl('85018'), targetZips: ['85018'] },
  { label: 'Scottsdale 85251',    url: zipUrl('85251'), targetZips: ['85251'] },
];

// ── Address parsing from Redfin URL path ──────────────────────────────────────
// Format: /AZ/Laveen/5213-W-Dobbins-Rd-85339/home/27846715
//    or:  /AZ/Phoenix/8511-S-9th-Dr-85041/unit-15/home/181810952
function parseFromUrl(href) {
  const m = href.match(/\/([A-Z]{2})\/([^/]+)\/([^/]+)\/(unit-[^/]+\/)?home\//);
  if (!m) return null;
  const state = m[1];
  const citySlug = m[2];
  const addrSlug = m[3];

  // ZIP is the trailing 5-digit group in the address slug
  const zipMatch = addrSlug.match(/-(\d{5})(?:-|$)/);
  const zip = zipMatch ? zipMatch[1] : '';

  // Strip zip (and anything after) from address slug
  const streetSlug = zip ? addrSlug.replace(new RegExp('-' + zip + '.*'), '') : addrSlug;
  const street = streetSlug.replace(/-/g, ' ');
  const city   = citySlug.replace(/-/g, ' ');

  return { street, city, state, zip, address: `${street}, ${city}, ${state} ${zip}` };
}

// ── Nominatim geocoding (1 req/sec — OpenStreetMap acceptable-use policy) ─────
function geocodeAddress(address) {
  return new Promise((resolve) => {
    const q = encodeURIComponent(address);
    const opts = {
      hostname: 'nominatim.openstreetmap.org',
      path: `/search?q=${q}&format=json&limit=1`,
      headers: { 'User-Agent': 'Requation/1.0 (vikpuri@live.com)' },
    };
    https.get(opts, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try {
          const arr = JSON.parse(data);
          if (arr && arr[0]) {
            resolve({ lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) });
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Scrape one search URL ─────────────────────────────────────────────────────
async function scrapeSearch(browser, search) {
  console.log(`\n⬇  ${search.label}`);
  const ctx  = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  await page.route('**/*.{png,jpg,jpeg,gif,webp,woff,woff2,mp4}', r => r.abort());

  try {
    await page.goto(search.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
  } catch (e) {
    console.log(`   ⚠  Page load: ${e.message.slice(0, 60)}`);
  }

  // Extract all listing cards from DOM
  const cards = await page.evaluate(function() {
    return Array.from(document.querySelectorAll('.HomeCardContainer')).map(function(el) {
      var a = el.querySelector('a[href*="/home/"]');
      if (!a) return null;

      var text  = el.innerText || '';
      var label = el.querySelector('[aria-label]');
      var ariaLabel = label ? (label.getAttribute('aria-label') || '') : '';

      // Price: look for $XXX,XXX in text
      var priceM = text.match(/\$([\d,]+)/);
      var price  = priceM ? parseInt(priceM[1].replace(/,/g, ''), 10) : null;

      // Beds: from text or aria-label
      var bedsM = text.match(/(\d+)\s*beds?/i) || ariaLabel.match(/(\d+)\s*beds?/i);
      var beds  = bedsM ? parseInt(bedsM[1], 10) : null;

      // Baths: from text or aria-label
      var bathsM = text.match(/([\d.]+)\s*baths?/i) || ariaLabel.match(/([\d.]+)\s*baths?/i);
      var baths  = bathsM ? parseFloat(bathsM[1]) : null;

      // Sqft: from text
      var sqftM = text.match(/([\d,]+)\s*sq\s*ft/i);
      var sqft  = sqftM ? parseInt(sqftM[1].replace(/,/g, ''), 10) : null;

      return {
        href:  a.href,
        price: price,
        beds:  beds,
        baths: baths,
        sqft:  sqft,
      };
    }).filter(Boolean);
  });

  await ctx.close();

  // Parse address from each href, filter to target ZIPs
  const listings = [];
  const seen = new Set();
  for (const c of cards) {
    const parsed = parseFromUrl(c.href);
    if (!parsed) continue;
    if (search.targetZips.length && !search.targetZips.includes(parsed.zip)) continue;
    if (seen.has(c.href)) continue;
    seen.add(c.href);
    listings.push({
      ...parsed,
      price:      c.price  || null,
      beds:       c.beds   || null,
      baths:      c.baths  || null,
      sqft:       c.sqft   || null,
      redfin_url: c.href,
    });
  }

  console.log(`   Cards found: ${cards.length}  →  in target ZIPs: ${listings.length}`);
  return listings;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const browser = await chromium.launch({ headless: true });

  // ── 1. Collect raw listings from all searches ────────────────────────────
  const rawAll = [];
  const seenUrls = new Set();

  for (const search of SEARCHES) {
    const rows = await scrapeSearch(browser, search);
    for (const r of rows) {
      if (seenUrls.has(r.redfin_url)) continue;
      seenUrls.add(r.redfin_url);
      rawAll.push(r);
    }
  }
  await browser.close();

  console.log(`\nTotal unique AZ listings before geocoding: ${rawAll.length}`);
  if (!rawAll.length) {
    console.log('Nothing found — DOM structure may have changed.');
    process.exit(0);
  }

  // ── 2. Geocode via Nominatim (1 req/sec) ─────────────────────────────────
  console.log('\nGeocoding…');
  const geocoded = [];
  for (const r of rawAll) {
    const coords = await geocodeAddress(r.address);
    if (coords) {
      geocoded.push({ ...r, lat: coords.lat, lng: coords.lng });
      console.log(`  ✓ ${r.address}`);
    } else {
      console.log(`  ✗ no coords: ${r.address}`);
    }
    await sleep(1100); // Nominatim rate limit
  }
  console.log(`\nGeocoded: ${geocoded.length} / ${rawAll.length}`);

  const freshUrls = new Set(geocoded.map(r => r.redfin_url));

  // ── 3. Fetch existing AZ RPOI rows ───────────────────────────────────────
  const AZ_ZIPS = ['85339','85040','85041','85042','85043','85018','85251'];

  const { data: existing, error: fetchErr } = await supabase
    .from('properties')
    .select('id, redfin_url, mls_status, address')
    .in('zip', AZ_ZIPS)
    .eq('class', 'RPOI');

  if (fetchErr) { console.error('Supabase fetch error:', fetchErr.message); }

  const existingByUrl = {};
  (existing || []).forEach(r => { if (r.redfin_url) existingByUrl[r.redfin_url] = r; });
  const existingUrls = new Set(Object.keys(existingByUrl));

  // ── 4. Expire stale listings ──────────────────────────────────────────────
  const toExpire = (existing || []).filter(r =>
    r.redfin_url && !freshUrls.has(r.redfin_url) && r.mls_status === 'active'
  );

  if (toExpire.length) {
    console.log(`\nExpiring ${toExpire.length} stale listing(s)…`);
    for (const r of toExpire) {
      const { error } = await supabase
        .from('properties').update({ mls_status: 'expired' }).eq('id', r.id);
      if (error) console.error(`  ✗ ${r.address}: ${error.message}`);
      else        console.log(`  ✓ expired: ${r.address}`);
    }
  } else {
    console.log('\nNo stale listings to expire.');
  }

  // ── 5. Insert new listings ────────────────────────────────────────────────
  const toInsert = geocoded.filter(r => !existingUrls.has(r.redfin_url));
  console.log(`\nInserting ${toInsert.length} new listing(s)…`);

  let inserted = 0, errors = 0;
  for (const row of toInsert) {
    const insertRow = {
      name:         row.address,
      address:      row.address,
      city:         row.city,
      zip:          row.zip,
      neighborhood: '',
      price:        row.price  || null,
      beds:         row.beds   || null,
      baths:        row.baths  || null,
      sqft:         row.sqft   || null,
      lat:          row.lat,
      lng:          row.lng,
      redfin_url:   row.redfin_url,
      class:        'RPOI',
      mls_status:   'active',
    };
    const { error } = await supabase.from('properties').insert(insertRow);
    if (error) {
      console.error(`  ✗ ${row.address}: ${error.message}`);
      errors++;
    } else {
      console.log(`  ✓ ${row.address}  $${(row.price||0).toLocaleString()}`);
      inserted++;
    }
  }

  console.log(`\n✅  Done: ${inserted} inserted · ${toExpire.length} expired · ${errors} errors`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
