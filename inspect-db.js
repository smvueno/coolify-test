// Quick script to list tables and schema from Strapi's SQLite database
const Database = require('better-sqlite3');
const db = new Database('/root/projects/coolify-test/apps/cms/.tmp/data.db', { readonly: true });

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('=== TABLES ===');
tables.forEach(t => console.log(t.name));

// Up users permissions roles
console.log('\n=== up_roles ===');
try { console.log(JSON.stringify(db.prepare("SELECT * FROM up_roles LIMIT 5").all(), null, 2)); } catch(e) { console.log('Error:', e.message); }

console.log('\n=== up_permissions (first 3) ===');
try { console.log(JSON.stringify(db.prepare("SELECT * FROM up_permissions LIMIT 3").all(), null, 2)); } catch(e) { console.log('Error:', e.message); }

console.log('\n=== admin_users ===');
try { console.log(JSON.stringify(db.prepare("SELECT id, email, username FROM admin_users LIMIT 5").all(), null, 2)); } catch(e) { console.log('Error:', e.message); }

db.close();
