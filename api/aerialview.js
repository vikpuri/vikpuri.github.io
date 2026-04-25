module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { lat, lng, address } = req.query;
  const key = process.env.YOUTUBE_API_KEY; // same Google Cloud project key

  let url;
  if (lat && lng) {
    url = `https://aerialview.googleapis.com/v1/videos:lookupVideo?location.latitude=${lat}&location.longitude=${lng}&key=${key}`;
  } else if (address) {
    url = `https://aerialview.googleapis.com/v1/videos:lookupVideo?address=${encodeURIComponent(address)}&key=${key}`;
  } else {
    return res.status(400).json({ error: 'lat+lng or address required' });
  }

  try {
    const r = await fetch(url);
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
