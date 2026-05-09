import type { Env } from './index';

const KV_TTL = 300; // 5 minutes cache

// ── Google Calendar OAuth2 (service account, RS256 JWT) ────────────

async function getGoogleAccessToken(env: Env): Promise<string> {
  const cached = await env.CACHE.get('google_access_token');
  if (cached) return cached;

  const serviceAccount: {
    client_email: string;
    private_key: string;
    token_uri?: string;
  } = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
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

  // Import the RSA private key from PEM
  const pemToArrayBuffer = (pem: string): ArrayBuffer => {
    const b64 = pem
      .replace(/-----BEGIN [\w ]+-----/g, '')
      .replace(/-----END [\w ]+-----/g, '')
      .replace(/\s/g, '');
    const binary = atob(b64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    return buf.buffer;
  };

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${signingInput}.${sigBase64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw new Error(`Google token exchange failed: ${tokenData.error || JSON.stringify(tokenData)}`);
  }

  // Cache for 50 minutes (tokens expire in 60)
  await env.CACHE.put('google_access_token', tokenData.access_token, { expirationTtl: 3000 });

  return tokenData.access_token;
}

// ── Availability Handler ───────────────────────────────────────────

export async function handleAvailability(request: Request, env: Env, origin: string): Promise<Response> {
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  if (!date) {
    return new Response(JSON.stringify({ error: 'Missing date parameter (YYYY-MM-DD)' }), { status: 400, headers });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }), { status: 400, headers });
  }

  const cacheKey = `availability:${date}`;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, { status: 200, headers });
  }

  try {
    const accessToken = await getGoogleAccessToken(env);
    const timeMin = `${date}T00:00:00Z`;
    const timeMax = `${date}T23:59:59Z`;

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calRes.ok) {
      const errText = await calRes.text();
      throw new Error(`Google Calendar API error (${calRes.status}): ${errText}`);
    }

    const calData = await calRes.json() as { items?: Array<{ start?: { dateTime?: string }; end?: { dateTime?: string } }> };

    // Build list of busy time slots
    const busySlots: Array<{ start: string; end: string }> = [];
    if (calData.items) {
      for (const event of calData.items) {
        if (event.start?.dateTime && event.end?.dateTime) {
          busySlots.push({
            start: event.start.dateTime,
            end: event.end.dateTime,
          });
        }
      }
    }

    const result = JSON.stringify({ date, busySlots, available: busySlots.length === 0 });
    // Cache for 5 minutes
    await env.CACHE.put(cacheKey, result, { expirationTtl: KV_TTL });

    return new Response(result, { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
}
