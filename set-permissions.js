#!/usr/bin/env node
// Set public permissions via Strapi admin API
const http = require('http');

const ADMIN_URL = 'http://localhost:1337';
const EMAIL = 'admin@harudigi.local';
const PASSWORD = 'admin123';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, ADMIN_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // 1. Login
  console.log('Logging in...');
  const login = await request('POST', '/admin/login', { email: EMAIL, password: PASSWORD });
  if (!login.data?.data?.token) {
    console.error('Login failed:', JSON.stringify(login.data).substring(0, 200));
    process.exit(1);
  }
  const token = login.data.data.token;
  console.log('✅ Logged in');

  // 2. Get roles
  const rolesRes = await request('GET', '/users-permissions/roles', null, token);
  console.log('Roles response:', JSON.stringify(rolesRes.data).substring(0, 500));

  const roles = rolesRes.data?.roles || [];
  const publicRole = roles.find(r => r.type === 'public');
  if (!publicRole) {
    console.error('Public role not found. Roles:', JSON.stringify(roles));
    process.exit(1);
  }
  console.log(`Public role: id=${publicRole.id}, name=${publicRole.name}`);

  // 3. Get current permissions
  const roleDetail = await request('GET', `/users-permissions/roles/${publicRole.id}`, null, token);
  console.log('Role detail:', JSON.stringify(roleDetail.data).substring(0, 800));

  // 4. Update permissions
  const perms = {
    ...roleDetail.data?.role?.permissions,
    'api::page': {
      controllers: {
        page: {
          find: { enabled: true },
          findOne: { enabled: true },
        },
      },
    },
    'api::site': {
      controllers: {
        site: {
          find: { enabled: true },
        },
      },
    },
  };

  const updateRes = await request('PUT', `/users-permissions/roles/${publicRole.id}`, {
    permissions: perms,
  }, token);
  console.log('Update result:', updateRes.status, JSON.stringify(updateRes.data).substring(0, 500));

  if (updateRes.status === 200) {
    console.log('✅ Public permissions set!');
  } else {
    console.log('⚠️  Update may have failed, check above');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
