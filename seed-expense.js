const db = require('better-sqlite3')('crm.db'); 
db.prepare(`INSERT INTO expenses (id, vendor, amount, category) VALUES (?, ?, ?, ?)`).run('exp-1', 'Leica Geosystems', 125000.00, 'Hardware/Equipment');
console.log('Expense inserted!');
