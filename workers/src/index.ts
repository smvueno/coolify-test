import { handleContact } from './contact';
import { handleAvailability } from './availability';
import { handleBook } from './book';

export interface Env {
  CACHE: KVNamespace;
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  GOOGLE_CALENDAR_ID: string;
}

const ALLOWED_ORIGIN = 'https://coolify-test.pages.dev';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Routes
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContact(request, env, ALLOWED_ORIGIN);
    }
    if (url.pathname === '/api/availability' && request.method === 'GET') {
      return handleAvailability(request, env, ALLOWED_ORIGIN);
    }
    if (url.pathname === '/api/book' && request.method === 'POST') {
      return handleBook(request, env, ALLOWED_ORIGIN);
    }

    return new Response('Not Found', { status: 404 });
  },
};
