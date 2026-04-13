const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const restaurants = [
  {name:'Bottega Louie',category:'Restaurant',lat:34.0489,lng:-118.2549,zip:'90013',rating:4.5,address:'700 S Grand Ave, Los Angeles CA 90017',yelp_url:'https://www.yelp.com/biz/bottega-louie-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=700+S+Grand+Ave+Los+Angeles',phone:'213-802-1470'},
  {name:'Joyce',category:'Restaurant',lat:34.0462690,lng:-118.2571646,zip:'90017',rating:4.7,address:'770 S Grand Ave A, Los Angeles CA 90017',yelp_url:'https://www.yelp.com/biz/joyce-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=637+S+Spring+St+Los+Angeles',phone:''},
  {name:'Pine & Crane',category:'Restaurant',lat:34.0408828,lng:-118.2623985,zip:'90015',rating:4.6,address:'1120 S Grand Ave Unit 101, Los Angeles CA 90015',yelp_url:'https://www.yelp.com/biz/pine-and-crane-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=Pine+and+Crane+Los+Angeles',phone:''},
  {name:'Inka Wasi',category:'Restaurant',lat:34.0445,lng:-118.2601,zip:'90015',rating:4.5,address:'900 W Olympic Blvd, Los Angeles CA 90015',yelp_url:'https://www.yelp.com/biz/inka-wasi-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=900+W+Olympic+Blvd+Los+Angeles',phone:''},
  {name:'Pez Cantina',category:'Restaurant',lat:34.0455,lng:-118.2589,zip:'90017',rating:4.4,address:'401 S Figueroa St, Los Angeles CA 90071',yelp_url:'https://www.yelp.com/biz/pez-cantina-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=401+S+Figueroa+St+Los+Angeles',phone:''},
  {name:'Paris Baguette',category:'Cafe',lat:34.0446167,lng:-118.2562333,zip:'90015',rating:4.3,address:'404 W 8th St, Los Angeles CA 90015',yelp_url:'https://www.yelp.com/biz/paris-baguette-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=800+W+6th+St+Los+Angeles',phone:''},
  {name:'85 Degrees Bakery',category:'Cafe',lat:34.048639,lng:-118.2573405,zip:'90017',rating:4.4,address:'700 Wilshire Blvd A, Los Angeles CA 90017',yelp_url:'https://www.yelp.com/biz/85-c-bakery-cafe-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=888+S+Figueroa+St+Los+Angeles',phone:''},
  {name:'Tocaya',category:'Restaurant',lat:34.0449961,lng:-118.2573295,zip:'90014',rating:4.2,address:'801 S Olive St B, Los Angeles CA 90014',yelp_url:'https://www.yelp.com/biz/tocaya-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=800+W+Olympic+Blvd+Los+Angeles',phone:''},
  {name:'Chick-fil-A',category:'Restaurant',lat:34.0493889,lng:-118.2594226,zip:'90017',rating:4.5,address:'660 S Figueroa St, Los Angeles CA 90017',yelp_url:'https://www.yelp.com/biz/chick-fil-a-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=1000+W+Olympic+Blvd+Los+Angeles',phone:''},
  {name:'Shake Shack',category:'Restaurant',lat:34.0444873,lng:-118.2561395,zip:'90014',rating:4.3,address:'400 W 8th St, Los Angeles CA 90014',yelp_url:'https://www.yelp.com/biz/shake-shack-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=Shake+Shack+LA+Live',phone:''},
  {name:"Guisado's",category:'Restaurant',lat:34.0465944,lng:-118.2506528,zip:'90013',rating:4.7,address:'541 S Spring St Unit 101, Los Angeles CA 90013',yelp_url:'https://www.yelp.com/biz/guisados-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=Guisados+Los+Angeles',phone:''},
  {name:"LALA's Argentine Grill",category:'Restaurant',lat:34.0418713,lng:-118.2550550,zip:'90015',rating:4.4,address:'105 W 9th St, Los Angeles CA 90015',yelp_url:'https://www.yelp.com/biz/lalas-argentine-grill-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=105+W+9th+St+Los+Angeles',phone:'+1 213-623-1810'},
  {name:'BlueJam Cafe',category:'Cafe',lat:34.0468646,lng:-118.2512020,zip:'90013',rating:4.5,address:'541 S Spring St Unit 110, Los Angeles CA 90013',yelp_url:'https://www.yelp.com/biz/bluejam-cafe-los-angeles',waymo_url:'https://waymo.com/waymo-one/?destination=7371+Melrose+Ave+Los+Angeles',phone:''},
];

async function run() {
  let updated = 0, inserted = 0, errors = 0;

  for (const row of restaurants) {
    // Try update first
    const { data, error: updateErr } = await supabase
      .from('restaurants')
      .update({ lat: row.lat, lng: row.lng, address: row.address, zip: row.zip,
                category: row.category, rating: row.rating, yelp_url: row.yelp_url,
                waymo_url: row.waymo_url, phone: row.phone })
      .eq('name', row.name)
      .select('id');

    if (updateErr) {
      console.error(`✗ ${row.name} (update): ${updateErr.message}`);
      errors++;
      continue;
    }

    if (data && data.length > 0) {
      console.log(`↻ ${row.name} (${row.rating}★) — ${row.address}`);
      updated++;
      continue;
    }

    // No existing row — insert
    const { error: insertErr } = await supabase.from('restaurants').insert(row);
    if (insertErr) {
      console.error(`✗ ${row.name} (insert): ${insertErr.message}`);
      errors++;
    } else {
      console.log(`✓ ${row.name} (${row.rating}★) — ${row.address}`);
      inserted++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${inserted} inserted, ${errors} errors.`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
