exports.handler = async (event) => {
  const { lat, lng, radius = '10mi', page = 1 } = event.queryStringParameters || {};

  if (!lat || !lng) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'lat and lng required' })
    };
  }

  const limit  = 20;
  const offset = (parseInt(page) - 1) * limit;
  const today  = new Date().toISOString().split('T')[0];

  const params = new URLSearchParams({
    'within':     `${radius}@${lat},${lng}`,
    'active.gte': today,
    'sort':       'start',
    'limit':      String(limit),
    'offset':     String(offset)
  });

  try {
    const resp = await fetch(
      `https://api.predicthq.com/v1/events/?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PREDICTHQ_KEY}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      return {
        statusCode: resp.status,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `PredictHQ ${resp.status}`, detail: err.slice(0, 400) })
      };
    }

    const data = await resp.json();

    const events = (data.results || []).map(e => {
      const coords  = e.location?.coordinates; // GeoJSON: [lng, lat]
      const venue   = (e.entities || []).find(x => x.type === 'venue');
      const website = (e.entities || []).find(x => x.type === 'event-group')?.website
                   || venue?.website || null;
      return {
        id:        e.id,
        name:      e.title || '',
        url:       website,
        start_utc: e.start,
        end_utc:   e.end || e.predicted_end,
        category:  e.category || 'community',
        labels:    (e.labels || []).slice(0, 3),
        venue:     venue?.name || null,
        address:   venue?.formatted_address || null,
        lat:       coords ? coords[1] : null,
        lng:       coords ? coords[0] : null,
        rank:      e.local_rank || e.rank || 0,
        attendance: e.phq_attendance || null
      };
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ events, count: data.count || 0 })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
