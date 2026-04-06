exports.handler = async (event) => {
  const { name, lat, lng, zip } = event.queryStringParameters;
  try {
    let url;
    if (zip) {
      url = `https://api.yelp.com/v3/businesses/search?location=${zip}&categories=restaurants,food&limit=20&sort_by=rating`;
    } else {
      url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&latitude=${lat}&longitude=${lng}&limit=1`;
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` }
    });
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
