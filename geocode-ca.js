// geocode-ca.js — Populate CA DTLA properties into Supabase properties table
// Usage: SUPABASE_SERVICE_KEY=your_service_key node geocode-ca.js
//
// Add your DTLA listings to the array below, then run this script.
// Format: { address, price, beds, baths, sqft, zip, redfin_url }
// Supported zips: 90017 (South Park), 90015 (Financial District), 90013 (Arts District), 90014

const properties = [
  // South Park Brutalist — the featured DTLA listing
  { address:'801 S Grand Ave #1604, Los Angeles CA 90017', price:885000, beds:2, baths:2, sqft:1280, zip:'90017', redfin_url:'https://www.redfin.com/CA/Los-Angeles/801-S-Grand-Ave-90017/unit-1604/home/' },

  // Add your ~330 DTLA listings here:
  // { address:'...', price:..., beds:..., baths:..., sqft:..., zip:'90017', redfin_url:'...' },
];

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const r = await fetch(url, { headers: { 'User-Agent': 'requation-geocoder/1.0' } });
  const d = await r.json();
  if (!d.length) throw new Error('No result for: ' + address);
  return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
}

const NEIGHBORHOOD = {
  '90017': 'South Park',
  '90015': 'Financial District',
  '90013': 'Arts District',
  '90014': 'Fashion District',
};

async function main() {
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('ERROR: Set SUPABASE_SERVICE_KEY environment variable before running');
    process.exit(1);
  }

  const rows = [];
  for (const p of properties) {
    try {
      const { lat, lng } = await geocode(p.address);
      console.log(`✓ ${p.address} => ${lat}, ${lng}`);
      rows.push({
        name: p.address.split(',')[0],
        class: 'RPOI',
        address: p.address,
        neighborhood: NEIGHBORHOOD[p.zip] || 'DTLA',
        city: 'Los Angeles',
        zip: p.zip,
        lat, lng,
        price: p.price,
        beds: p.beds,
        baths: p.baths,
        sqft: p.sqft,
        mls_status: 'active',
        redfin_url: p.redfin_url
      });
      // Nominatim rate limit — 1 request per second
      await new Promise(r => setTimeout(r, 1100));
    } catch (e) {
      console.warn(`✗ Skipped ${p.address}: ${e.message}`);
    }
  }

  console.log(`\nGeocoded ${rows.length}/${properties.length} addresses. Inserting into Supabase...`);

  const ins = await fetch('https://mpmprnjhunjfeacikgml.supabase.co/rest/v1/properties', {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(rows)
  });

  if (ins.ok) {
    console.log(`✓ Inserted ${rows.length} CA listings (status ${ins.status})`);
  } else {
    const err = await ins.text();
    console.error(`✗ Insert failed (${ins.status}): ${err}`);
  }
}

main().catch(console.error);
