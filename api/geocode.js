// Geocoding API — residential address → precise lat/lng
// Used for all property coordinates; Places API cannot geocode residential plots
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'address required' });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== 'OK') return res.status(404).json({ error: data.status, details: data });
    const { lat, lng } = data.results[0].geometry.location;
    res.status(200).json({
      lat,
      lng,
      formatted: data.results[0].formatted_address,
      placeId:   data.results[0].place_id,
      locationType: data.results[0].geometry.location_type  // ROOFTOP = best precision
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
