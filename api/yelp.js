const SB_URL = 'https://mpmprnjhunjfeacikgml.supabase.co';
const SB_KEY = process.env.SUPABASE_KEY;

// Transform a Supabase restaurants row into Yelp business shape
function toYelp(r) {
  return {
    id:          r.id,
    name:        r.name,
    rating:      r.rating || 0,
    url:         r.yelp_url || '',
    phone:       r.phone   || '',
    waymo_url:   r.waymo_url || '',
    coordinates: { latitude: r.lat, longitude: r.lng },
    location: {
      address1:  r.address || '',
      city:      r.city    || '',
      zip_code:  r.zip     || '',
      state:     r.state   || '',
    },
    categories: [{ alias: (r.category || '').toLowerCase().replace(/\s+/g,'-'), title: r.category || '' }],
  };
}

async function fromSupabase({ lat, lng, radius, zip, name, ratingMin }) {
  let filter = '';

  if (zip) {
    filter = `zip=eq.${zip}`;
  } else if (lat && lng) {
    // Bounding box from radius (metres → degrees)
    const R   = parseInt(radius) || 3000;
    const dLat = R / 111000;
    const dLng = R / (111000 * Math.cos(parseFloat(lat) * Math.PI / 180));
    const latMin = (parseFloat(lat) - dLat).toFixed(6);
    const latMax = (parseFloat(lat) + dLat).toFixed(6);
    const lngMin = (parseFloat(lng) - dLng).toFixed(6);
    const lngMax = (parseFloat(lng) + dLng).toFixed(6);
    filter = `lat=gte.${latMin}&lat=lte.${latMax}&lng=gte.${lngMin}&lng=lte.${lngMax}`;
  } else if (name && lat && lng) {
    // Name lookup — small box + name ilike
    const dLat = 500 / 111000, dLng = 500 / 111000;
    const latMin = (parseFloat(lat) - dLat).toFixed(6);
    const latMax = (parseFloat(lat) + dLat).toFixed(6);
    const lngMin = (parseFloat(lng) - dLng).toFixed(6);
    const lngMax = (parseFloat(lng) + dLng).toFixed(6);
    filter = `lat=gte.${latMin}&lat=lte.${latMax}&lng=gte.${lngMin}&lng=lte.${lngMax}&name=ilike.*${encodeURIComponent(name)}*`;
  }

  const url = `${SB_URL}/rest/v1/restaurants?select=*&${filter}&limit=200`;
  const resp = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
  });
  if (!resp.ok) throw new Error('Supabase error ' + resp.status);
  let rows = await resp.json();
  if (ratingMin > 0) rows = rows.filter(r => (r.rating || 0) >= ratingMin);
  return { businesses: rows.map(toYelp), total: rows.length, source: 'supabase' };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { name, lat, lng, zip, radius, categories, rating, sort_by } = req.query;
  const ratingMin = parseFloat(rating) || 0;
  const sortBy    = sort_by || 'review_count';
  const cats      = categories || 'restaurants,food,coffee,bars,nightlife,gyms,grocery,shopping,arts';
  const limit     = 50;

  // ── Try Yelp API first ────────────────────────────────────────────
  if (process.env.YELP_API_KEY) {
    try {
      let url;
      if (lat && lng && !name) {
        const r = Math.min(parseInt(radius) || 40000, 40000);
        url = `https://api.yelp.com/v3/businesses/search?latitude=${lat}&longitude=${lng}&radius=${r}&categories=${encodeURIComponent(cats)}&limit=${limit}&sort_by=${sortBy}`;
      } else if (zip) {
        url = `https://api.yelp.com/v3/businesses/search?location=${zip}&categories=${encodeURIComponent(cats)}&limit=${limit}&sort_by=${sortBy}`;
      } else if (name) {
        url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&latitude=${lat}&longitude=${lng}&limit=1`;
      }

      if (url) {
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!data.error) {
            if (data.businesses && ratingMin > 0)
              data.businesses = data.businesses.filter(b => b.rating >= ratingMin);
            return res.status(200).json(data);
          }
        }
      }
    } catch (_) { /* fall through to Supabase */ }
  }

  // ── Supabase fallback ─────────────────────────────────────────────
  if (!lat && !lng && !zip) {
    return res.status(400).json({ error: 'Provide lat+lng, zip, or name+lat+lng' });
  }

  try {
    const data = await fromSupabase({ lat, lng, radius, zip, name, ratingMin });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
