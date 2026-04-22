exports.handler = async (event) => {
  const { lat, lng, radius = '10mi', page = 1 } = event.queryStringParameters || {};

  if (!lat || !lng) {
    return { statusCode: 400, body: JSON.stringify({ error: 'lat and lng required' }) };
  }

  const params = new URLSearchParams({
    'location.latitude':  lat,
    'location.longitude': lng,
    'location.within':    radius,
    'expand':             'venue,logo',
    'page_size':          '20',
    'page':               String(page),
    'sort_by':            'date',
    'token':              process.env.EVENTBRITE_TOKEN
  });

  try {
    const resp = await fetch(`https://www.eventbriteapi.com/v3/events/search/?${params}`);

    if (!resp.ok) {
      const err = await resp.text();
      return {
        statusCode: resp.status,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Eventbrite ${resp.status}`, detail: err })
      };
    }

    const data = await resp.json();
    const now = new Date();

    const events = (data.events || [])
      .filter(e => new Date(e.end?.utc || e.start?.utc) > now)
      .map(e => ({
        id:        e.id,
        name:      e.name?.text || '',
        url:       e.url,
        start_utc: e.start?.utc,
        end_utc:   e.end?.utc,
        is_free:   e.is_free,
        lat:       e.venue?.latitude  ? parseFloat(e.venue.latitude)  : null,
        lng:       e.venue?.longitude ? parseFloat(e.venue.longitude) : null,
        thumb:     e.logo?.url || null
      }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ events, has_more: data.pagination?.has_more_items || false })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
