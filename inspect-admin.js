const Database = require('better-sqlite3');
const db = new Database('/root/projects/coolify-test/apps/cms/.tmp/data.db', { readonly: true });

// Check admin user details
console.log('=== admin_users (full) ===');
const admin = db.prepare("SELECT * FROM admin_users").all();
admin.forEach(a => {
  console.log(`id: ${a.id}, email: ${a.email}, username: ${a.username}`);
  console.log(`password hash length: ${a.password ? a.password.length : 'NULL'}`);
  console.log(`password first 20: ${a.password ? a.password.substring(0, 20) : 'NULL'}`);
  console.log(`firstname: ${a.firstname}, lastname: ${a.lastname}`);
  console.log(`is_active: ${a.is_active}`);
});

db.close();
