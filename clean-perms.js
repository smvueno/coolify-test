// Remove direct-insert permissions (IDs 21-23)
const Database = require('better-sqlite3');
const db = new Database('/root/projects/coolify-test/apps/cms/.tmp/data.db');
db.prepare('DELETE FROM up_permissions_role_lnk WHERE permission_id IN (21,22,23)').run();
db.prepare('DELETE FROM up_permissions WHERE id IN (21,22,23)').run();
console.log('Removed direct-insert permissions');
console.log('Remaining perms:', db.prepare('SELECT COUNT(*) as c FROM up_permissions').get().c);
db.close();
