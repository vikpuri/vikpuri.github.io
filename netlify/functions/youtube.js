exports.handler = async (event) => {
  const { q, maxResults = 6, pageToken } = event.queryStringParameters || {};

  if (!q) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing query param q' }) };
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q,
    type: 'video',
    maxResults,
    relevanceLanguage: 'en',
    ...(pageToken ? { pageToken } : {}),
    key: process.env.YOUTUBE_API_KEY
  });

  try {
    const resp = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (!resp.ok) {
      const err = await resp.text();
      return { statusCode: resp.status, body: JSON.stringify({ error: err }) };
    }
    const data = await resp.json();

    const videos = (data.items || []).map(item => ({
      id:        item.id.videoId,
      title:     item.snippet.title,
      channel:   item.snippet.channelTitle,
      thumb:     item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      published: item.snippet.publishedAt
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ videos, nextPageToken: data.nextPageToken })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
