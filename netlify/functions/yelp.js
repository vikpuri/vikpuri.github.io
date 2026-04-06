exports.handler = async (event) => {
  const { name, lat, lng } = event.queryStringParameters;
  try {
    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&latitude=${lat}&longitude=${lng}&limit=1`,
      { headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` } }
    );
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
