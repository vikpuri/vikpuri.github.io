module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { address } = req.query;
  const key = process.env.YOUTUBE_API_KEY;

  if (!address) return res.status(400).json({ error: 'address required' });

  try {
    const r = await fetch(
      `https://aerialview.googleapis.com/v1/videos:lookupVideo?X-Goog-Api-Key=${key}&address=${encodeURIComponent(address)}`
    );

    if (r.status === 404) return res.status(200).json({ state: 'NOT_FOUND' });
    if (!r.ok) return res.status(r.status).json(await r.json());

    return res.status(200).json(await r.json());
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
