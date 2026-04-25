// ESPN public API — no key required
// ?sport=nba&team=lal   → Lakers
// ?sport=nba&team=phx   → Suns
// ?sport=nfl&team=ari   → Cardinals
// ?sport=mlb&team=ari   → Diamondbacks

const SPORT_PATH = {
  nba: 'basketball/nba',
  nfl: 'football/nfl',
  mlb: 'baseball/mlb',
  mls: 'soccer/usa.1'
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { sport = 'nba', team } = req.query;
  if (!team) return res.status(400).json({ error: 'team param required (e.g. lal, phx, ari)' });

  const path = SPORT_PATH[sport];
  if (!path) return res.status(400).json({ error: 'sport must be nba|nfl|mlb|mls' });

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${team}/schedule`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) return res.status(resp.status).json({ error: `ESPN ${resp.status}` });

    const data  = await resp.json();
    const now   = Date.now();
    const games = (data.events || [])
      .filter(e => new Date(e.date).getTime() > now)
      .slice(0, 5)
      .map(e => {
        const comp  = (e.competitions || [])[0] || {};
        const home  = (comp.competitors || []).find(c => c.homeAway === 'home') || {};
        const away  = (comp.competitors || []).find(c => c.homeAway === 'away') || {};
        return {
          id:      e.id,
          name:    e.name || e.shortName,
          date:    e.date,
          venue:   comp.venue?.fullName || null,
          home:    home.team?.displayName || null,
          away:    away.team?.displayName || null,
          tv:      (comp.broadcasts || []).map(b => b.names?.join(', ')).filter(Boolean)[0] || null,
          tickets: comp.tickets?.[0]?.links?.[0]?.href || null
        };
      });

    return res.status(200).json({ games, team: data.team?.displayName || team, sport });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
