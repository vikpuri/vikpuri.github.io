const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method Not Allowed' });

  let name, phone, message, subject;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    ({ name, phone, message, subject } = body);
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!name || !phone || !message) {
    return res.status(400).json({ error: 'name, phone, and message required' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE;
  const to         = process.env.ADMIN_PHONE || from;
  const bodyText   = `Requation lead${subject ? ' - ' + subject : ''}\nFrom: ${name} (${phone})\n${message}`;

  const encoded  = Buffer.from(accountSid + ':' + authToken).toString('base64');
  const formBody = 'To=' + encodeURIComponent(to)
    + '&From=' + encodeURIComponent(from)
    + '&Body=' + encodeURIComponent(bodyText);

  const resp = await fetch(
    'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json',
    {
      method:  'POST',
      headers: { 'Authorization': 'Basic ' + encoded, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    formBody
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    return res.status(resp.status).json({ error: errText });
  }

  const data = await resp.json();
  return res.status(200).json({ ok: true, sid: data.sid, status: data.status, error_code: data.error_code, error_message: data.error_message });
};
