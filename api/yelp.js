module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { name, lat, lng, zip, categories, rating } = req.query;
  const ratingMin = parseFloat(rating) || 4;

  try {
    let url;
    if (zip) {
      const cats = categories || 'restaurants,food';
      url = `https://api.yelp.com/v3/businesses/search?location=${zip}&categories=${encodeURIComponent(cats)}&limit=50&sort_by=rating`;
    } else if (name) {
      url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&latitude=${lat}&longitude=${lng}&limit=1`;
    } else {
      return res.status(400).json({ error: 'Provide zip or name+lat+lng' });
    }

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` }
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const data = await resp.json();
    if (data.businesses && zip) {
      data.businesses = data.businesses.filter(b => b.rating >= ratingMin);
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
