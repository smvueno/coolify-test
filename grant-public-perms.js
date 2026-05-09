const Database = require('better-sqlite3');
const crypto = require('crypto');

const db = new Database('/root/projects/coolify-test/apps/cms/.tmp/data.db');

// Actions to add for public role (role id = 2)
const publicRoleId = 2;
const actions = [
  'api::page.page.find',
  'api::page.page.findOne',
  'api::site.site.find',
];

const insertPerm = db.prepare(`
  INSERT INTO up_permissions (action, created_at, updated_at, published_at, document_id)
  VALUES (?, ?, ?, ?, ?)
`);

const insertLink = db.prepare(`
  INSERT INTO up_permissions_role_lnk (permission_id, role_id, permission_ord)
  VALUES (?, ?, ?)
`);

const now = Date.now();

const existingActions = db.prepare(`
  SELECT p.action FROM up_permissions p
  JOIN up_permissions_role_lnk l ON l.permission_id = p.id
  WHERE l.role_id = ?
`).all(publicRoleId).map(r => r.action);

const toAdd = actions.filter(a => !existingActions.includes(a));

if (toAdd.length === 0) {
  console.log('All permissions already exist. Nothing to add.');
} else {
  const transaction = db.transaction(() => {
    for (const action of toAdd) {
      const docId = crypto.randomBytes(12).toString('base64url');
      const result = insertPerm.run(action, now, now, now, docId);
      const permId = result.lastInsertRowid;
      insertLink.run(permId, publicRoleId, permId);
      console.log(`✓ Added: ${action} (perm_id=${permId})`);
    }
  });
  transaction();
}

// Verify
console.log('\n=== Public role permissions after ===');
const after = db.prepare(`
  SELECT p.action FROM up_permissions p
  JOIN up_permissions_role_lnk l ON l.permission_id = p.id
  WHERE l.role_id = ?
`).all(publicRoleId);
after.forEach(p => console.log(' ', p.action));

db.close();
console.log('\nDone. Restart Strapi to pick up changes.');
