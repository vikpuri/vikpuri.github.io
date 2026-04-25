module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { lat, lng, address, radius = '10mi', page = 1 } = req.query;

  if (!lat && !lng && !address) {
    return res.status(400).json({ error: 'lat+lng or address required' });
  }

  const token = process.env.EVENTBRITE_TOKEN;
  const locationParams = address
    ? { 'location.address': address }
    : { 'location.latitude': lat, 'location.longitude': lng, 'location.within': radius };

  const params = new URLSearchParams({
    ...locationParams, 'expand': 'venue,logo',
    'page_size': '20', 'page': String(page), 'sort_by': 'date', 'token': token
  });

  try {
    const resp = await fetch(`https://www.eventbriteapi.com/v3/events/search/?${params}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const rawText = await resp.text();
    if (!resp.ok) return res.status(resp.status).json({ error: `Eventbrite ${resp.status}`, detail: rawText.slice(0, 300) });

    let data;
    try { data = JSON.parse(rawText); } catch { return res.status(502).json({ error: 'Non-JSON response', detail: rawText.slice(0, 300) }); }

    const now    = new Date();
    const events = (data.events || [])
      .filter(e => new Date(e.end?.utc || e.start?.utc) > now)
      .map(e => ({
        id: e.id, name: e.name?.text || '', url: e.url,
        start_utc: e.start?.utc, end_utc: e.end?.utc, is_free: e.is_free,
        lat: e.venue?.latitude  ? parseFloat(e.venue.latitude)  : null,
        lng: e.venue?.longitude ? parseFloat(e.venue.longitude) : null,
        thumb: e.logo?.url || null
      }));

    return res.status(200).json({ events, has_more: data.pagination?.has_more_items || false });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
