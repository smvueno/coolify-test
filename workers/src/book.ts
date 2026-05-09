import type { Env } from './index';

interface BookBody {
  name: string;
  email: string;
  phone?: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM (24h)
  duration?: number;  // minutes, default 60
  message?: string;
  turnstileToken?: string;
}

async function getGoogleAccessToken(env: Env): Promise<string> {
  // Reuse the same implementation from availability.ts
  const cached = await env.CACHE.get('google_access_token');
  if (cached) return cached;

  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64Url = (obj: Record<string, unknown>): string => {
    const json = JSON.stringify(obj);
    const encoded = new Uint8Array(new TextEncoder().encode(json));
    let base64 = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (let i = 0; i < encoded.length; i += 3) {
      const b1 = encoded[i], b2 = encoded[i + 1] ?? 0, b3 = encoded[i + 2] ?? 0;
      const triple = (b1 << 16) | (b2 << 8) | b3;
      base64 += chars[(triple >> 18) & 0x3f] + chars[(triple >> 12) & 0x3f] + chars[(triple >> 6) & 0x3f] + chars[triple & 0x3f];
    }
    const pad = encoded.length % 3;
    if (pad === 1) base64 = base64.slice(0, -2) + '==';
    else if (pad === 2) base64 = base64.slice(0, -1) + '=';
    return base64.replace(/\+/g, '-').replace(/\//g, '_');
  };

  const signingInput = `${base64Url(header)}.${base64Url(payload)}`;

  const pemToArrayBuffer = (pem: string): ArrayBuffer => {
    const b64 = pem.replace(/-----BEGIN [\w ]+-----/g, '').replace(/-----END [\w ]+-----/g, '').replace(/\s/g, '');
    const binary = atob(b64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    return buf.buffer;
  };

  const privateKey = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' }, privateKey,
    new TextEncoder().encode(signingInput)
  );

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${signingInput}.${sigBase64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) throw new Error(`Google token exchange failed: ${tokenData.error || JSON.stringify(tokenData)}`);

  await env.CACHE.put('google_access_token', tokenData.access_token, { expirationTtl: 3000 });
  return tokenData.access_token;
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  const data = await res.json() as { success: boolean };
  return data.success;
}

export async function handleBook(request: Request, env: Env, origin: string): Promise<Response> {
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Content-Type': 'application/json',
  };

  let body: BookBody;
  try {
    body = await request.json() as BookBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  // Validate required fields
  if (!body.name || !body.email || !body.date || !body.time) {
    return new Response(JSON.stringify({ error: 'Missing required fields: name, email, date, time' }), { status: 400, headers });
  }

  // Validate date/time format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return new Response(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }), { status: 400, headers });
  }
  if (!/^\d{2}:\d{2}$/.test(body.time)) {
    return new Response(JSON.stringify({ error: 'Invalid time format. Use HH:MM (24h)' }), { status: 400, headers });
  }

  // Verify Turnstile if token provided
  if (body.turnstileToken) {
    const ip = request.headers.get('CF-Connecting-IP') ?? '';
    const valid = await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid captcha' }), { status: 400, headers });
    }
  }

  const duration = body.duration || 60;
  const startDateTime = `${body.date}T${body.time}:00`;
  const endDate = new Date(new Date(startDateTime).getTime() + duration * 60000);
  const endDateTime = endDate.toISOString();

  try {
    const accessToken = await getGoogleAccessToken(env);

    // Create Google Calendar event
    const event = {
      summary: `Booking: ${body.name}`,
      description: `Phone: ${body.phone || 'N/A'}\nMessage: ${body.message || 'N/A'}\nEmail: ${body.email}`,
      start: { dateTime: startDateTime, timeZone: 'Asia/Tokyo' },
      end: { dateTime: endDateTime, timeZone: 'Asia/Tokyo' },
    };

    const createRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Google Calendar API error (${createRes.status}): ${errText}`);
    }

    const createdEvent = await createRes.json() as { id?: string; htmlLink?: string };

    // Send confirmation email via Resend
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@yourdomain.com',
          to: body.email,
          subject: `Booking Confirmation: ${body.date} at ${body.time}`,
          text: `Hi ${body.name},\n\nYour booking has been confirmed for ${body.date} at ${body.time}.\n\nWe'll be in touch shortly to confirm the details.\n\nBest regards,\nHaru Digi`,
        }),
      });
    } catch {
      // Email failure shouldn't break the booking
      console.error('Confirmation email failed');
    }

    // Invalidate the availability cache for this date
    await env.CACHE.delete(`availability:${body.date}`);

    return new Response(JSON.stringify({
      success: true,
      eventId: createdEvent.id,
      link: createdEvent.htmlLink,
    }), { status: 200, headers });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
}
