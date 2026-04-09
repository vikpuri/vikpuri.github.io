exports.handler = async (event) => {
  const { name, lat, lng, zip, categories, rating } = event.queryStringParameters || {};
  const ratingMin = parseFloat(rating) || 4;

  try {
    let url;
    if (zip) {
      const cats = categories || 'restaurants,food';
      url = `https://api.yelp.com/v3/businesses/search?location=${zip}&categories=${encodeURIComponent(cats)}&limit=50&sort_by=rating`;
    } else if (name) {
      url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&latitude=${lat}&longitude=${lng}&limit=1`;
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Provide zip or name+lat+lng' }) };
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` }
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await response.json();

    // Filter by minimum rating server-side
    if (data.businesses && zip) {
      data.businesses = data.businesses.filter(b => b.rating >= ratingMin);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
