import type { Env } from './index';

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  const data = await res.json() as { success: boolean };
  return data.success;
}

export async function handleContact(request: Request, env: Env, origin: string): Promise<Response> {
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Content-Type': 'application/json',
  };

  const body = await request.json() as Record<string, string>;
  const { name, email, message, turnstileToken } = body;

  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
  }

  // Verify Turnstile if token provided (optional until frontend widget is added)
  if (turnstileToken) {
    const ip = request.headers.get('CF-Connecting-IP') ?? '';
    const valid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid captcha' }), { status: 400, headers });
    }
  }

  // Send email via Resend API
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@yourdomain.com',
      to: 'you@yourdomain.com',
      subject: `Contact form: ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  });

  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}
