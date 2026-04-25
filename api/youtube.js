module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { q, maxResults = 6, pageToken } = req.query;

  if (!q) return res.status(400).json({ error: 'Missing query param q' });

  const params = new URLSearchParams({
    part:              'snippet',
    q,
    type:              'video',
    maxResults,
    relevanceLanguage: 'en',
    ...(pageToken ? { pageToken } : {}),
    key:               process.env.YOUTUBE_API_KEY
  });

  try {
    const resp = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (!resp.ok) {
      const err = await resp.text();
      return res.status(resp.status).json({ error: err });
    }
    const data = await resp.json();
    const videos = (data.items || []).map(item => ({
      id:        item.id.videoId,
      title:     item.snippet.title,
      channel:   item.snippet.channelTitle,
      thumb:     item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      published: item.snippet.publishedAt
    }));
    return res.status(200).json({ videos, nextPageToken: data.nextPageToken });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
