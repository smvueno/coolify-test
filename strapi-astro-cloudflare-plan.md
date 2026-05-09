# PRD: Strapi + Astro + Cloudflare Production Migration

**Version:** 1.0  
**Status:** Ready for Implementation  
**Audience:** AI Coding Agent  
**Project Stack:** Strapi (Coolify VPS) Â· Astro (Static) Â· Cloudflare Pages Â· Cloudflare Workers

---

## 1. Overview & Goal

Migrate the current system to a secure, production-ready, and future-proof architecture. The site is built with **Astro** as a static site generator pulling content from **Strapi** (self-hosted on Coolify). Hosting is **Cloudflare Pages** with **Cloudflare Workers** handling all dynamic runtime features (forms, booking, payments).

The current system has the following critical problems that must be resolved:

1. **Strapi's Public API role exposes content without authentication** â€” must be locked down.
2. **Rebuilds are triggered via Cloudflare's Deploy Hook** â€” this consumes the free-tier build quota. Must be replaced with a GitHub Actions pipeline.
3. **No caching strategy** is in place â€” static assets and pages are not cache-optimised.
4. **No dynamic update detection** â€” users see stale content without a reload.
5. **No standardised pattern for dynamic modules** (contact forms, calendars, checkout) that is safe to extend in the future.

The agent must audit the existing codebase, implement all changes in this document, and not mark the task complete until every acceptance test listed in Section 7 passes with zero errors.

---

## 2. Architecture

### 2.1 Data & Deploy Flow

```
Content Editor
    â”‚
    â–¼
Strapi Admin (Coolify VPS, private)
    â”‚
    â”‚ Webhook POST â†’ GitHub API /repos/{owner}/{repo}/dispatches
    â–¼
GitHub Actions Runner (free)
    â”‚  1. npm ci
    â”‚  2. astro build  (fetches Strapi via read-only API token, build-time only)
    â”‚  3. wrangler pages deploy dist/
    â–¼
Cloudflare Pages CDN (static files, unlimited free bandwidth)
    â”‚
    â”‚  Runtime dynamic requests only
    â–¼
Cloudflare Workers (/api/*)
    â”œâ”€â”€ /api/contact       â†’ Email via Cloudflare Email Routing
    â”œâ”€â”€ /api/availability  â†’ KV cache â†’ Google Calendar API
    â”œâ”€â”€ /api/book          â†’ Google Calendar create event + confirmation email
    â””â”€â”€ /api/checkout      â†’ Stripe API (future module)
```

### 2.2 Environment Separation

| Context | What runs | Strapi access |
|---|---|---|
| Local dev | `astro dev` + `strapi dev` | Direct localhost:1337 with `.env` token |
| GitHub Actions build | `astro build` | STRAPI_API_TOKEN secret, read-only |
| Cloudflare Pages | Static files only | None â€” zero Strapi calls at runtime |
| Cloudflare Workers | `/api/*` handlers | None â€” Workers never talk to Strapi |

---

## 3. Task 1 â€” Secure Strapi

### 3.1 Lock Down the Public Role

1. In Strapi Admin â†’ **Settings â†’ Roles & Permissions â†’ Public**
2. For **every** content type: revoke ALL permissions (find, findOne, create, update, delete).
3. Re-enable only `find` and `findOne` on content types that must be public if absolutely required â€” but the preferred approach is **zero public permissions** because Astro fetches at build time with a token, not at runtime.
4. Confirm no content type has `create`, `update`, or `delete` exposed to the Public role under any circumstances.

### 3.2 Create a Scoped Read-Only API Token

1. In Strapi Admin â†’ **Settings â†’ API Tokens â†’ Create new API Token**
2. Set type: **Read-only**
3. Set expiry: **Never** (this is a build-time secret, not a user-facing token)
4. Name it: `astro-build-token`
5. Copy the token â€” it will only be shown once.
6. Add it to **GitHub Actions secrets** as `STRAPI_API_TOKEN`.
7. Add it to your local `.env` as `STRAPI_API_TOKEN=...` (this file must be in `.gitignore`).

### 3.3 Strapi Environment Hardening

Ensure the following exist in Strapi's `.env` on the Coolify VPS:

```env
NODE_ENV=production
APP_KEYS=<random 32-char string>,<random 32-char string>
API_TOKEN_SALT=<random 32-char string>
ADMIN_JWT_SECRET=<random 32-char string>
JWT_SECRET=<random 32-char string>
TRANSFER_TOKEN_SALT=<random 32-char string>
```

All values must be randomly generated (use `openssl rand -base64 32`). None of these values should be committed to any repository.

### 3.4 Restrict Strapi Admin Access

In Coolify, ensure Strapi's admin panel (`/admin`) is **not publicly routable** or is protected behind Cloudflare Access with email pin authentication. The Strapi API port should not be exposed directly to the internet â€” only the Coolify reverse proxy (Traefik/Caddy) should route to it.

---

## 4. Task 2 â€” Replace Deploy Hook with GitHub Actions

### 4.1 Remove Cloudflare Deploy Hook from Strapi

1. In Strapi Admin â†’ **Settings â†’ Webhooks** â€” delete any webhook pointing to `https://api.cloudflare.com/...` or `https://hooks.cloudflare.com/...`.

### 4.2 Add GitHub Dispatch Webhook to Strapi

Create a new webhook in Strapi Admin â†’ **Settings â†’ Webhooks â†’ Add New Webhook**:

- **Name:** `github-rebuild`
- **URL:** `https://api.github.com/repos/{OWNER}/{REPO}/dispatches`
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: application/vnd.github+json`
  - `Authorization: Bearer {GITHUB_PAT}` â€” store as Strapi env var `GITHUB_DISPATCH_TOKEN`, not hardcoded
- **Body:** `{"event_type": "strapi-content-update"}`
- **Triggers:** Entry published, Entry updated, Entry deleted, Entry unpublished

The `GITHUB_PAT` must be a GitHub Personal Access Token (classic) with only the `repo` scope enabled.

### 4.3 GitHub Actions Workflow

Create or update `.github/workflows/deploy.yml`:

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
  repository_dispatch:
    types: [strapi-content-update]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build Astro
        env:
          STRAPI_API_TOKEN: ${{ secrets.STRAPI_API_TOKEN }}
          STRAPI_URL: ${{ secrets.STRAPI_URL }}
        run: npm run build

      - name: Generate version file
        run: echo "{\"deployed\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > dist/version.json

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=${{ secrets.CF_PAGES_PROJECT_NAME }}
```

**Required GitHub Actions secrets:**

| Secret | Value |
|---|---|
| `STRAPI_API_TOKEN` | Read-only Strapi API token from Task 1 |
| `STRAPI_URL` | Full URL of Strapi on Coolify e.g. `https://cms.yourdomain.com` |
| `CLOUDFLARE_API_TOKEN` | CF API token with Pages:Edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Found in CF dashboard right sidebar |
| `CF_PAGES_PROJECT_NAME` | The Pages project name in CF dashboard |

### 4.4 Astro Configuration Verification

Confirm `astro.config.mjs` has:

```js
export default defineConfig({
  output: 'static',  // must be static â€” not 'server' or 'hybrid'
});
```

Confirm there are **zero** Strapi API calls in any client-side JavaScript. All `fetch()` calls to Strapi must exist only inside:
- `getStaticPaths()`
- `Astro.glob()`
- Top-level `await` in `.astro` files (which runs at build time)

Any `fetch()` to Strapi inside `<script>` tags or `.ts`/`.js` files loaded in the browser is a **critical bug** â€” remove it.

---

## 5. Task 3 â€” Caching & Dynamic Updates

### 5.1 Cache Headers (`public/_headers`)

Create `public/_headers` in the Astro project root (Cloudflare Pages reads this file automatically):

```
# Hashed Astro build assets â€” immutable, cache forever
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Images
/images/*
  Cache-Control: public, max-age=604800

# Fonts
/fonts/*
  Cache-Control: public, max-age=2592000, immutable

# version.json â€” never cache, always fresh
/version.json
  Cache-Control: no-store

# HTML pages â€” short TTL, serve stale while revalidating in background
/*
  Cache-Control: public, max-age=300, stale-while-revalidate=3600
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 5.2 Version File Generation

The GitHub Actions workflow already generates `dist/version.json` with the deploy timestamp (see Section 4.3). This file is excluded from caching via the `_headers` rule above.

### 5.3 Dynamic Update Detection Script

Add the following script to the Astro layout component (e.g. `src/layouts/BaseLayout.astro`) inside the `<head>` or before `</body>`. This runs in the browser and silently reloads the page when a new deploy is detected:

```html
<script>
  (function () {
    const INTERVAL = 5 * 60 * 1000; // check every 5 minutes
    const KEY = 'cf_deploy_version';

    async function checkVersion() {
      try {
        const res = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const { deployed } = await res.json();
        const last = sessionStorage.getItem(KEY);
        if (last && last !== deployed) {
          window.location.reload();
        }
        sessionStorage.setItem(KEY, deployed);
      } catch (_) {
        // Silently ignore network errors
      }
    }

    checkVersion();
    setInterval(checkVersion, INTERVAL);
  })();
</script>
```

---

## 6. Task 4 â€” Cloudflare Workers for Dynamic Features

### 6.1 Project Structure

Create the following directory alongside the Astro project:

```
workers/
â”œâ”€â”€ wrangler.toml
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ index.ts          â† router
â”‚   â”œâ”€â”€ contact.ts        â† contact form handler
â”‚   â”œâ”€â”€ availability.ts   â† Google Calendar availability
â”‚   â””â”€â”€ book.ts           â† Google Calendar booking
```

### 6.2 `wrangler.toml`

```toml
name = "site-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"  # create with: wrangler kv namespace create CACHE

[vars]
# Non-secret config only

# Secrets (set via: wrangler secret put SECRET_NAME)
# Required secrets:
#   GOOGLE_SERVICE_ACCOUNT_JSON
#   GOOGLE_CALENDAR_ID
#   RESEND_API_KEY  (or use CF Email Routing binding)
#   TURNSTILE_SECRET_KEY
```

### 6.3 Worker Router (`src/index.ts`)

```typescript
import { handleContact } from './contact';
import { handleAvailability } from './availability';
import { handleBook } from './book';

export interface Env {
  CACHE: KVNamespace;
  TURNSTILE_SECRET_KEY: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  GOOGLE_CALENDAR_ID: string;
  RESEND_API_KEY: string;
}

const ALLOWED_ORIGIN = 'https://yourdomain.com'; // update to your Pages domain

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

    // Route requests
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
```

### 6.4 Contact Form Handler (`src/contact.ts`)

```typescript
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

  if (!name || !email || !message || !turnstileToken) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const valid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid captcha' }), { status: 400, headers });
  }

  // Send email via Resend API (replace with CF Email Routing if preferred)
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
```

### 6.5 Availability Handler (`src/availability.ts`)

```typescript
import type { Env } from './index';

const KV_TTL = 300; // 5 minutes cache

export async function handleAvailability(request: Request, env: Env, origin: string): Promise<Response> {
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  if (!date) return new Response(JSON.stringify({ error: 'Missing date' }), { status: 400, headers });

  const cacheKey = `availability:${date}`;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) return new Response(cached, { status: 200, headers });

  // Fetch from Google Calendar API using service account
  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const accessToken = await getGoogleAccessToken(serviceAccount);

  const timeMin = `${date}T00:00:00Z`;
  const timeMax = `${date}T23:59:59Z`;
  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const calData = await calRes.json();

  const result = JSON.stringify(calData);
  await env.CACHE.put(cacheKey, result, { expirationTtl: KV_TTL });

  return new Response(result, { status: 200, headers });
}

async function getGoogleAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  // Implement JWT signing for Google service account OAuth2
  // Use the Web Crypto API available in Workers runtime
  // Reference: https://developers.google.com/identity/protocols/oauth2/service-account
  // This function must sign a JWT with RS256 using the service account private key
  // and exchange it for a short-lived access token at https://oauth2.googleapis.com/token
  throw new Error('Implement getGoogleAccessToken using Web Crypto API');
}
```

> **Note to agent:** The `getGoogleAccessToken` function stub above must be fully implemented using the Workers Web Crypto API to sign a JWT with RS256. Reference the Google OAuth2 service account documentation. Do not use Node.js `crypto` or `jsonwebtoken` packages â€” use `crypto.subtle.importKey` and `crypto.subtle.sign`.

### 6.6 Set Worker Secrets

Run these commands locally after installing Wrangler:

```bash
cd workers/
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
wrangler secret put GOOGLE_CALENDAR_ID
wrangler secret put RESEND_API_KEY
```

Never put secrets in `wrangler.toml` or commit them to version control.

---

## 7. Adding New Modules in the Future

This architecture is intentionally extensible. When adding a new dynamic module (e.g., shop checkout, newsletter, reviews):

1. **Static content** (product listings, pricing etc.) â†’ Add a Strapi content type â†’ fetch at build time in Astro â†’ baked into static HTML. No Worker needed.
2. **User-triggered actions** (add to cart, checkout, submit review) â†’ Add a new handler file in `workers/src/` (e.g. `checkout.ts`) â†’ register the route in `workers/src/index.ts` â†’ add any required secrets with `wrangler secret put`.
3. **No changes needed** to Astro config, GitHub Actions, or the deploy pipeline.

The single Worker acts as an API gateway â€” new routes are just new files.

---

## 8. Acceptance Tests â€” Must All Pass Before Marking Complete

The task is **not complete** until every test below passes with no exceptions. The agent must perform each test manually or via script and report results.

---

### 8.1 Security Tests

**S-01: Strapi Public Role is locked**
- Open `{STRAPI_URL}/api/{any-content-type}` in the browser (no token in the request).
- **Expected:** `403 Forbidden` or `401 Unauthorized` JSON response.
- **Fail if:** Any content is returned.

**S-02: No Strapi token in browser JavaScript**
- Open the deployed Pages site in Chrome DevTools â†’ Sources â†’ search all JS files for `STRAPI`, `strapi`, `1337`, or the Strapi URL.
- **Expected:** Zero matches.
- **Fail if:** Any match is found.

**S-03: No secrets in GitHub repository**
- Run `git log --all --full-diff -p | grep -E "(STRAPI_API_TOKEN|CLOUDFLARE_API_TOKEN|GITHUB_PAT|GOOGLE_SERVICE_ACCOUNT)"` in the repo root.
- **Expected:** Zero matches.
- **Fail if:** Any match is found.

**S-04: Worker CORS is restricted**
- From a browser console on a different domain, run:
  `fetch('https://site-api.{account}.workers.dev/api/contact', {method:'POST', body:'{}', headers:{'Content-Type':'application/json'}})`.
- **Expected:** CORS error in browser, or `403` if origin header is missing/wrong.
- **Fail if:** Response returns 200 from an unauthorized origin.

**S-05: Security headers present**
- Use `curl -I https://yourdomain.pages.dev/` and verify the response includes:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Permissions-Policy`
- **Fail if:** Any of these headers are missing.

---

### 8.2 Build & Deploy Tests

**B-01: GitHub Actions workflow triggers on push**
- Push a commit to `main`.
- **Expected:** Workflow starts within 30 seconds, completes successfully (green checkmark), and a new deploy appears in Cloudflare Pages dashboard.
- **Fail if:** Workflow fails or deploy does not appear.

**B-02: GitHub Actions workflow triggers from Strapi publish**
- In Strapi Admin, update and publish any content entry.
- **Expected:** A new workflow run appears in GitHub Actions within 60 seconds with trigger `repository_dispatch`.
- **Fail if:** No workflow run is triggered.

**B-03: Astro output is fully static**
- After build, inspect `dist/` â€” confirm no server-side files, only `.html`, `.js`, `.css`, assets.
- **Expected:** `dist/version.json` exists and contains a valid ISO timestamp.
- **Fail if:** Any server-rendered files or Strapi API URLs appear in the output.

---

### 8.3 Browser Tests

**BR-01: Site loads with no console errors**
- Open the production Pages URL in Chrome.
- Open DevTools â†’ Console.
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R).
- **Expected:** Zero red errors in the console.
- **Fail if:** Any JavaScript errors, failed network requests, or CORS errors appear.

**BR-02: Site loads with no console warnings related to the build**
- Same as BR-01, review warnings tab.
- **Expected:** No warnings about missing resources, deprecated APIs, or Content Security Policy violations.
- **Fail if:** Any resource-loading warnings appear.

**BR-03: All pages render correctly**
- Navigate to every top-level page of the site.
- **Expected:** Each page renders fully with all text, images, and components visible. No blank sections or broken layouts.
- **Fail if:** Any page shows a blank component, broken image, or layout shift.

**BR-04: Version detection script is active**
- In DevTools â†’ Network, filter by `version.json`.
- Wait 5 minutes (or temporarily set `INTERVAL = 10 * 1000` for testing).
- **Expected:** A `GET /version.json` request appears in Network tab at the expected interval.
- **Fail if:** No request is made or request fails.

**BR-05: Contact form submits and delivers**
- If the contact form Worker is deployed, fill out the form on the site and submit.
- **Expected:** Success message appears on the page. Email arrives at the configured destination within 2 minutes. No errors in DevTools console.
- **Fail if:** Form shows an error, no email is received, or console shows errors.

**BR-06: No mixed content warnings**
- In DevTools â†’ Console, confirm no "Mixed Content" warnings.
- **Expected:** All resources (fonts, images, scripts) load over HTTPS.
- **Fail if:** Any HTTP (non-HTTPS) resource is loaded.

---

### 8.4 Cache Tests

**C-01: Static assets are cached with correct headers**
- In DevTools â†’ Network, click on any `/_astro/` file.
- **Expected:** Response header `Cache-Control: public, max-age=31536000, immutable`.
- **Fail if:** No Cache-Control header, or `max-age` is less than 31536000.

**C-02: HTML pages use stale-while-revalidate**
- In DevTools â†’ Network, click on the main HTML document.
- **Expected:** Response header contains `stale-while-revalidate`.
- **Fail if:** Cache-Control is missing or does not include stale-while-revalidate.

**C-03: version.json is never cached**
- In DevTools â†’ Network, click on `version.json`.
- **Expected:** Response header `Cache-Control: no-store`.
- **Fail if:** version.json is cached or returns a `304 Not Modified`.

---

### 8.5 Final Security Scan

**FS-01: Run a security header scan**
- Submit the production URL to `https://securityheaders.com`.
- **Expected:** Grade of **A** or higher.
- **Fail if:** Grade is B or below.

**FS-02: Confirm no Cloudflare Deploy Hook webhooks remain**
- In Strapi Admin â†’ Settings â†’ Webhooks â€” review all configured webhooks.
- **Expected:** Only the `github-rebuild` webhook pointing to `api.github.com` exists.
- **Fail if:** Any webhook pointing to Cloudflare API endpoints remains.

**FS-03: Verify Strapi is not publicly indexable**
- Check `robots.txt` on the Strapi Coolify URL.
- **Expected:** `Disallow: /` â€” or Strapi URL is not resolvable from the public internet at all.
- **Fail if:** Strapi admin panel is accessible from a public IP without authentication.

---

## 9. Completion Criteria

The implementation is considered complete **only when**:

- [ ] All S-01 through S-05 security tests pass
- [ ] All B-01 through B-03 build/deploy tests pass
- [ ] All BR-01 through BR-06 browser tests pass with **zero console errors**
- [ ] All C-01 through C-03 cache tests pass
- [ ] All FS-01 through FS-03 final security scan tests pass
- [ ] A summary report is provided listing each test ID, pass/fail status, and any notes

Do not mark the task as done if any test is skipped or produces a partial result. If a test cannot be run (e.g. a module is not yet deployed), note it explicitly as "deferred â€” module not yet deployed" and ensure all other tests pass.
