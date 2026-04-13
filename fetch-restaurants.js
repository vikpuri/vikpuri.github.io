const { createClient } = require('@supabase/supabase-js');

const YELP_API_KEY = process.env.YELP_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!YELP_API_KEY) { console.error('Missing YELP_API_KEY'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing SUPABASE_URL or SUPABASE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const url = 'https://api.yelp.com/v3/businesses/search?location=90017&categories=restaurants&rating=4&limit=20&sort_by=rating';
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${YELP_API_KEY}` }
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Yelp API error ${resp.status}:`, text);
    process.exit(1);
  }

  const data = await resp.json();
  const businesses = data.businesses || [];
  console.log(`Fetched ${businesses.length} restaurants from Yelp\n`);

  let inserted = 0, errors = 0;

  for (const b of businesses) {
    const address = [b.location?.address1, b.location?.city, b.location?.state, b.location?.zip_code]
      .filter(Boolean).join(', ');
    const waymo_url = `https://waymo.com/waymo-one/?destination=${encodeURIComponent(address)}`;

    const row = {
      name:      b.name || null,
      category:  b.categories?.[0]?.title || null,
      lat:       b.coordinates?.latitude || null,
      lng:       b.coordinates?.longitude || null,
      zip:       b.location?.zip_code || null,
      rating:    b.rating || null,
      yelp_url:  b.url || null,
      waymo_url,
      phone:     b.display_phone || null,
      address:   b.location?.address1 || null,
    };

    const { error } = await supabase.from('restaurants').insert(row);
    if (error) {
      console.error(`✗ ${row.name}: ${error.message}`);
      errors++;
    } else {
      console.log(`✓ ${row.name} (${row.rating}★) — ${row.address}`);
      inserted++;
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${errors} errors.`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
