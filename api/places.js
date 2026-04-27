// Server maps Google place types → color + SVG icon (vendor Rule 2 — type logic lives here, not in UI)
const CATEGORY = {
  grocery_or_supermarket: { color: '#4CAF50', label: 'Grocery'    },
  cafe:                   { color: '#795548', label: 'Cafe'       },
  restaurant:             { color: '#FF5722', label: 'Restaurant' },
  gym:                    { color: '#2196F3', label: 'Gym'        },
  shopping_mall:          { color: '#9C27B0', label: 'Shopping'   },
  museum:                 { color: '#FF9800', label: 'Museum'     },
  park:                   { color: '#8BC34A', label: 'Park'       },
  movie_theater:          { color: '#E91E63', label: 'Theater'    },
  hotel:                  { color: '#607D8B', label: 'Hotel'      },
  library:                { color: '#009688', label: 'Library'    },
};

function makeSvgIcon(color) {
  const hex = color.replace('#', '%23');
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='9' fill='${hex}' stroke='white' stroke-width='2.5'/></svg>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng, radius = 800 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const types = Object.keys(CATEGORY);

  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.rating,places.googleMapsUri'
      },
      body: JSON.stringify({
        includedTypes: types,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius: parseFloat(radius)
          }
        }
      })
    });
    const data = await r.json();

    // Attach server-decided icon + category to each place
    const places = (data.places || []).map(p => {
      const type = (p.types || []).find(t => CATEGORY[t]) || 'restaurant';
      const cat  = CATEGORY[type] || { color: '#888888', label: 'Place' };
      return {
        id:          p.id,
        name:        (p.displayName && p.displayName.text) || p.id,
        lat:         p.location.latitude,
        lng:         p.location.longitude,
        type,
        category:    cat.label,
        color:       cat.color,
        icon:        makeSvgIcon(cat.color),   // ← vendor pattern: icon from server
        rating:      p.rating || null,
        mapsUri:     p.googleMapsUri || null
      };
    });

    res.status(200).json({ places });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
