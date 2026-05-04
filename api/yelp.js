module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { name, lat, lng, zip, radius, categories, rating, sort_by } = req.query;
  const ratingMin = parseFloat(rating) || 0;
  const sortBy = sort_by || 'review_count';
  const cats = categories || 'restaurants,food,coffee,bars,nightlife,gyms,grocery,shopping,arts';
  const limit = 50;

  try {
    let url;

    if (lat && lng && !name) {
      const r = Math.min(parseInt(radius) || 40000, 40000);
      url = `https://api.yelp.com/v3/businesses/search?latitude=${lat}&longitude=${lng}&radius=${r}&categories=${encodeURIComponent(cats)}&limit=${limit}&sort_by=${sortBy}`;
    } else if (zip) {
      url = `https://api.yelp.com/v3/businesses/search?location=${zip}&categories=${encodeURIComponent(cats)}&limit=${limit}&sort_by=${sortBy}`;
    } else if (name) {
      url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&latitude=${lat}&longitude=${lng}&limit=1`;
    } else {
      return res.status(400).json({ error: 'Provide lat+lng, zip, or name+lat+lng' });
    }

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` }
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const data = await resp.json();
    if (data.businesses && ratingMin > 0) {
      data.businesses = data.businesses.filter(b => b.rating >= ratingMin);
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
