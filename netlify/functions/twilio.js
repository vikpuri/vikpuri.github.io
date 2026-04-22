const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  let name, phone, message, subject;
  try {
    ({ name, phone, message, subject } = JSON.parse(event.body));
  } catch (e) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!name || !phone || !message) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'name, phone, and message required' }) };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE;
  const to         = process.env.ADMIN_PHONE || from;
  const bodyText   = `Requation lead${subject ? ' - ' + subject : ''}\nFrom: ${name} (${phone})\n${message}`;

  const credentials = accountSid + ':' + authToken;
  const encoded = btoa(credentials);

  const formBody = 'To=' + encodeURIComponent(to)
    + '&From=' + encodeURIComponent(from)
    + '&Body=' + encodeURIComponent(bodyText);

  const resp = await fetch(
    'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + encoded,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formBody
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    return { statusCode: resp.status, headers: CORS, body: JSON.stringify({ error: errText }) };
  }

  return {
    statusCode: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
