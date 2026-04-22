exports.handler = async (event) => {
  const { lat, lng, address, radius = '10mi', page = 1 } = event.queryStringParameters || {};

  if (!lat && !lng && !address) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'lat+lng or address required' })
    };
  }

  const token = process.env.EVENTBRITE_TOKEN;

  // Build location params — try address-based first (wider API support),
  // fall back to lat/lng if address not provided
  const locationParams = address
    ? { 'location.address': address }
    : {
        'location.latitude':  lat,
        'location.longitude': lng,
        'location.within':    radius
      };

  const params = new URLSearchParams({
    ...locationParams,
    'expand':    'venue,logo',
    'page_size': '20',
    'page':      String(page),
    'sort_by':   'date',
    'token':     token
  });

  // Try both auth styles — header first, token-in-param already in URL
  const urls = [
    // Style 1: token in query string (v3 legacy)
    `https://www.eventbriteapi.com/v3/events/search/?${params}`,
    // Style 2: /organizers endpoint won't work without org_id, so just retry search
  ];

  try {
    const resp = await fetch(urls[0], {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    // Capture the raw response for debugging
    const rawText = await resp.text();

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Eventbrite ${resp.status}`, detail: rawText.slice(0, 300) })
      };
    }

    let data;
    try { data = JSON.parse(rawText); } catch {
      return {
        statusCode: 502,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Non-JSON response', detail: rawText.slice(0, 300) })
      };
    }

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
