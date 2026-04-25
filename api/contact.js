module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method Not Allowed' });

  let name, email, message;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    ({ name, email, message } = body);
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      from:     'Requation <hello@requation.com>',
      to:       ['vikpuri@live.com'],
      reply_to: email,
      subject:  `Enquiry from ${name}`,
      text:     `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return res.status(500).json({ error: errText });
  }

  return res.status(200).json({ ok: true });
};
