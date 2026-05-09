const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST = '/root/projects/coolify-test/apps/web/dist';
const PROJECT_ROOT = '/root/projects/coolify-test';
const STRAPI_UPSTREAM = { hostname: 'localhost', port: 1337 };
const PORT = 4321;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff2': 'font/woff2', '.xml': 'application/xml',
};

// ── Load _headers rules ────────────────────────────────────────────
const HEADERS_FILE = path.join(DIST, '_headers');
let headersRules = [];
function loadHeaders() {
  headersRules = [];
  if (!fs.existsSync(HEADERS_FILE)) return;
  const content = fs.readFileSync(HEADERS_FILE, 'utf8');
  let currentPath = null;
  let currentHeaders = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('/')) {
      if (currentPath) headersRules.push({ path: currentPath, headers: currentHeaders });
      currentPath = trimmed.replace(/\s*#.*$/, '').trim();
      currentHeaders = [];
    } else if (trimmed.includes(':')) {
      const [key, ...vals] = trimmed.split(':');
      currentHeaders.push({ key: key.trim(), value: vals.join(':').trim() });
    }
  }
  if (currentPath) headersRules.push({ path: currentPath, headers: currentHeaders });
}
loadHeaders();

function matchHeaders(urlPath) {
  const matched = [];
  for (const rule of headersRules) {
    // Convert glob pattern to regex (e.g. /_astro/* → ^/_astro/.*$)
    const pattern = '^' + rule.path.replace(/\*/g, '.*') + '$';
    if (new RegExp(pattern, 'i').test(urlPath)) {
      matched.push(...rule.headers);
      break; // First match wins (Cloudflare _headers semantics)
    }
  }
  return matched;
}

// ── Proxy to Strapi ────────────────────────────────────────────────
function proxyRequest(req, res) {
  const options = {
    hostname: STRAPI_UPSTREAM.hostname,
    port: STRAPI_UPSTREAM.port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers },
  };
  delete options.headers.host;

  const proxyReq = http.request(options, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers };
    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Upstream unavailable' }));
  });

  req.pipe(proxyReq);
}

// ── Rebuild on Strapi webhook ──────────────────────────────────────
function triggerRebuild(res) {
  console.log(`[${new Date().toISOString()}] Rebuild triggered by Strapi webhook...`);
  try {
    const env = { ...process.env, STRAPI_URL: 'http://localhost:1337' };
    const out = execSync('npm run build', { cwd: PROJECT_ROOT, env, timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
    console.log(out.toString().split('\n').slice(-3).join('\n'));
    loadHeaders(); // Reload _headers after rebuild
    console.log(`[${new Date().toISOString()}] Rebuild complete`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Rebuild failed:`, err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

// ── Server ─────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // ── Rebuild webhook (accept from Strapi) ──
  if (req.url === '/__webhook/rebuild' && req.method === 'POST') {
    // Accept any POST — no auth needed for local dev
    return triggerRebuild(res);
  }

  // ── API proxy: /api/* → Strapi (all methods) ──
  if (req.url.startsWith('/api/')) {
    return proxyRequest(req, res);
  }

  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── Determine file path ──
  let filePath;
  if (req.url === '/') {
    filePath = path.join(DIST, 'index.html');
  } else {
    filePath = path.join(DIST, req.url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  // SPA fallback
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  // ── Apply _headers rules + standard cache ──
  const responseHeaders = { 'Content-Type': contentType };
  const matched = matchHeaders(req.url);
  for (const h of matched) {
    responseHeaders[h.key] = h.value;
  }

  // Default cache for hashed Astro assets
  if (req.url.startsWith('/_astro/') && !responseHeaders['Cache-Control']) {
    responseHeaders['Cache-Control'] = 'public, max-age=31536000, immutable';
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    const head = Object.keys(responseHeaders).map(k => `${k}: ${responseHeaders[k]}`).join('\n  ');
    res.writeHead(200, responseHeaders);
    res.end(content);
  });
});

// ── Watch for dist/ changes (hot rebuild from webhook) ──
fs.watchFile(HEADERS_FILE, { interval: 2000 }, () => {
  loadHeaders();
  console.log('_headers reloaded');
});

server.listen(PORT, () => {
  console.log(`\n  Haru Digi local server`);
  console.log(`  Site:      http://localhost:${PORT}`);
  console.log(`  API proxy: /api/* → Strapi at localhost:1337`);
  console.log(`  Rebuild:   POST /__webhook/rebuild\n`);
});
