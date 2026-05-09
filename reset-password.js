// Reset admin password to a known value
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('/root/projects/coolify-test/apps/cms/.tmp/data.db');

const newPassword = 'admin123';
const hash = bcrypt.hashSync(newPassword, 10);

db.prepare("UPDATE admin_users SET password = ? WHERE email = ?").run(hash, 'admin@harudigi.local');
console.log('Password reset to: admin123 for admin@harudigi.local');
console.log('Hash:', hash.substring(0, 30) + '...');
db.close();
