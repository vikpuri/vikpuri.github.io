const TOKEN = 'pk.eyJ1IjoidmlranB1cmkiLCJhIjoiY21uYnF0ZWNuMHhnaTJ3bzR5MG5xOTEzbSJ9.vqmEhPHMBQOn4GX3yrbiGw';

const properties = [
  { address:'11810 S 43rd Ave, Laveen AZ 85339', price:950000, beds:4, baths:3, sqft:2661, zip:'85339', redfin_url:'https://www.redfin.com/AZ/Laveen/11810-S-43rd-Ave-85339' },
  { address:'4730 W Piedmont Rd, Laveen AZ 85339', price:850000, beds:3, baths:2, sqft:1842, zip:'85339', redfin_url:'https://www.redfin.com/AZ/Laveen/4730-W-Piedmont-Rd-85339' },
  { address:'3812 W Lodge Dr, Laveen AZ 85339', price:935000, beds:4, baths:4, sqft:3512, zip:'85339', redfin_url:'https://www.redfin.com/AZ/Laveen/3812-W-Lodge-Dr-85339' },
  { address:'5116 W La Mirada Dr, Laveen AZ 85339', price:895000, beds:4, baths:3, sqft:2591, zip:'85339', redfin_url:'https://www.redfin.com/AZ/Laveen/5116-W-La-Mirada-Dr-85339' },
  { address:'6832 S 38th Pl, Phoenix AZ 85042', price:879000, beds:3, baths:3, sqft:3458, zip:'85042', redfin_url:'https://www.redfin.com/AZ/Phoenix/6832-S-38th-Pl-85042' },
  { address:'9539 S 13th Way, Phoenix AZ 85042', price:2190000, beds:4, baths:4, sqft:4620, zip:'85042', redfin_url:'https://www.redfin.com/AZ/Phoenix/9539-S-13th-Way-85042' },
  { address:'1353 E Paseo Way, Phoenix AZ 85042', price:1199900, beds:4, baths:4, sqft:3317, zip:'85042', redfin_url:'https://www.redfin.com/AZ/Phoenix/1353-E-Paseo-Way-85042' },
  { address:'1013 W Ardmore Rd, Phoenix AZ 85041', price:875000, beds:4, baths:3, sqft:3061, zip:'85041', redfin_url:'https://www.redfin.com/AZ/Phoenix/1013-W-Ardmore-Rd-85041' },
];

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const r = await fetch(url, { headers: { 'User-Agent': 'requation-geocoder/1.0' } });
  const d = await r.json();
  if (!d.length) throw new Error('No result for: ' + address);
  return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
}

async function main() {
  const rows = [];
  for (const p of properties) {
    const { lat, lng } = await geocode(p.address);
    console.log(`✓ ${p.address} => ${lat}, ${lng}`);
    rows.push({
      name: p.address.split(',')[0],
      class: 'RPOI',
      address: p.address,
      neighborhood: p.zip === '85339' ? 'Laveen Village' : 'South Mountain',
      city: p.zip === '85339' ? 'Laveen' : 'Phoenix',
      zip: p.zip,
      lat, lng,
      price: p.price,
      beds: p.beds,
      baths: p.baths,
      sqft: p.sqft,
      mls_status: 'active',
      redfin_url: p.redfin_url
    });
  }

  // Delete old placeholder AZ properties first
  const del = await fetch('https://mpmprnjhunjfeacikgml.supabase.co/rest/v1/properties?zip=in.(85339,85041,85042,85044)', {
    method: 'DELETE',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
    }
  });
  console.log(`Deleted old AZ properties: ${del.status}`);

  // Insert real listings
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
  console.log(`Inserted ${rows.length} real AZ listings: ${ins.status}`);
}

main().catch(console.error);
