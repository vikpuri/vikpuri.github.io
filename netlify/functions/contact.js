exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let name, email, message;
  try {
    ({ name, email, message } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!name || !email || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name, email, and message are required' }) };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Requation <hello@requation.com>',
      to: ['vikpuri@live.com'],
      reply_to: email,
      subject: `Enquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    return { statusCode: 500, body: JSON.stringify({ error: errText }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
