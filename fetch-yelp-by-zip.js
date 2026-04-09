const SUPABASE_URL = 'https://mpmprnjhunjfeacikgml.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const NETLIFY_YELP = 'https://phenomenal-fenglisu-7217d6.netlify.app/.netlify/functions/yelp';

// Market zip codes
const MARKETS = {
  CA: ['90017','90015','90013','90014'],
  AZ: ['85339','85041','85042','85044']
};

// Yelp category groups to fetch per market
const CATEGORY_GROUPS = [
  { key:'Grocery',   yelp:'grocery,traderjoes,wholefoods,costco,walmart,aldi' },
  { key:'Hardware',  yelp:'hardware,homedepot,lowes' },
  { key:'Coffee',    yelp:'coffee,cafes,starbucks' },
  { key:'FastFood',  yelp:'hotdogs,burgers,chickenwings,sandwiches' },
  { key:'Cinema',    yelp:'movietheaters' },
  { key:'Dental',    yelp:'dentists,orthodontists' },
  { key:'MedSpa',    yelp:'medicalspa,botox,aesthetics' },
  { key:'Gym',       yelp:'gyms,fitnessinstructions' },
  { key:'Shoes',     yelp:'shoes' },
  { key:'Fashion',   yelp:'womenscloth,boutiques,menscloth' },
  { key:'Cosmetics', yelp:'cosmetics,makeup,beautysvc' },
];

async function fetchYelpByZip(zip, yelpCategory) {
  const res = await fetch(`${NETLIFY_YELP}?zip=${zip}&categories=${encodeURIComponent(yelpCategory)}&rating=4`);
  if (!res.ok) throw new Error(`Yelp fetch failed for ZIP ${zip}: ${res.status}`);
  const data = await res.json();
  return data.businesses || [];
}

async function upsertLiving(businesses, zip, market, categoryKey) {
  const rows = businesses
    .filter(b => b.rating >= 4)
    .map(b => ({
      name:       b.name,
      category:   categoryKey,
      lat:        b.coordinates.latitude,
      lng:        b.coordinates.longitude,
      zip:        zip,
      rating:     b.rating,
      yelp_url:   b.url,
      waymo_url:  `https://waymo.com/waymo-one/?destination=${encodeURIComponent((b.location.address1||'')+' '+(b.location.city||''))}`,
      phone:      b.phone || '',
      address:    [b.location.address1, b.location.city, b.location.state].filter(Boolean).join(', ')
    }));

  if (!rows.length) return 0;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurants`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=ignore-duplicates,return=minimal'
    },
    body: JSON.stringify(rows)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error for ZIP ${zip} / ${categoryKey}: ${err}`);
  }
  return rows.length;
}

const CHAINS = [
  'Whole Foods','Trader Joe\'s','Home Depot','Lowe\'s','Costco','Walmart','Aldi',
  'Starbucks','In-N-Out','Raising Cane\'s','AMC','Regal','Cinemark','Equinox',
  'LA Fitness','Planet Fitness','SoulCycle','Target','CVS','Walgreens'
];
function inferChain(name) {
  return CHAINS.find(c => name.toLowerCase().includes(c.toLowerCase())) || null;
}

async function main() {
  if (!SUPABASE_KEY) { console.error('Set SUPABASE_SERVICE_KEY env var'); process.exit(1); }
  let total = 0;
  for (const [market, zips] of Object.entries(MARKETS)) {
    for (const zip of zips) {
      for (const group of CATEGORY_GROUPS) {
        try {
          const businesses = await fetchYelpByZip(zip, group.yelp);
          const count = await upsertLiving(businesses, zip, market, group.key);
          console.log(`[${market}] ZIP ${zip} / ${group.key}: ${count} upserted`);
          total += count;
          await new Promise(r => setTimeout(r, 300)); // rate limit
        } catch (e) {
          console.error(`[${market}] ZIP ${zip} / ${group.key}: FAILED — ${e.message}`);
        }
      }
    }
  }
  console.log(`\nTotal upserted: ${total}`);
}

main();
