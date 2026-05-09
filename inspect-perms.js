const Database = require('better-sqlite3');
const db = new Database('/root/projects/coolify-test/apps/cms/.tmp/data.db', { readonly: true });

// Check the role link table
console.log('=== up_permissions_role_lnk ===');
try { console.log(JSON.stringify(db.prepare("SELECT * FROM up_permissions_role_lnk LIMIT 20").all(), null, 2)); } catch(e) { console.log(e.message); }

// Count total permissions
console.log('\nTotal permissions:', db.prepare("SELECT COUNT(*) as cnt FROM up_permissions").get().cnt);

// Check which permissions are for public role (role id 2)
const publicPerms = db.prepare(`
  SELECT p.action, p.id as perm_id, l.role_id
  FROM up_permissions p
  JOIN up_permissions_role_lnk l ON l.permission_id = p.id
  WHERE l.role_id = 2
`).all();
console.log(`\nPublic role permissions (${publicPerms.length}):`);
publicPerms.forEach(p => console.log(`  ${p.action}`));

// Check the createMany approach that the seed would use
console.log('\n=== Test: find permissions by role ===');
const byRole = db.prepare("SELECT p.action FROM up_permissions p JOIN up_permissions_role_lnk l ON l.permission_id = p.id WHERE l.role_id = 2").all();
byRole.forEach(p => console.log(' ', p.action));

db.close();
