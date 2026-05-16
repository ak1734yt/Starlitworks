const Database = require('better-sqlite3');
const db = new Database('backend/database.sqlite');
const rows = db.prepare('SELECT * FROM site_settings').all();
console.log(JSON.stringify(rows, null, 2));
db.close();
