const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/root/projects/coolify-test/apps/web/dist';
const STRAPI_UPSTREAM = { hostname: 'localhost', port: 1337 };
const PORT = 4321;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff2': 'font/woff2', '.xml': 'application/xml',
};

function proxyRequest(req, res) {
  // Stream the request to Strapi upstream
  const options = {
    hostname: STRAPI_UPSTREAM.hostname,
    port: STRAPI_UPSTREAM.port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers },
  };
  // Strip host header so Strapi sees localhost
  delete options.headers.host;

  const proxyReq = http.request(options, (proxyRes) => {
    // Forward status, headers, and body as a stream
    const responseHeaders = { ...proxyRes.headers };
    // Override Content-Type to ensure JSON (Strapi API always returns JSON)
    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Upstream unavailable' }));
  });

  // Pipe the incoming request body to the upstream
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  // ── API proxy: /api/* → Strapi (all methods: GET, POST, PUT, DELETE, etc.) ──
  if (req.url.startsWith('/api/')) {
    return proxyRequest(req, res);
  }

  // ── CORS (for any non-API route) ──
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── Serve static files ──
  let filePath;

  if (req.url === '/') {
    filePath = path.join(DIST, 'index.html');
  } else {
    filePath = path.join(DIST, req.url);
    // If URL points to a directory, serve index.html inside it
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  // SPA fallback for truly unknown routes
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
