// database.js - SQLite database initialization
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'ecotrack.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS waste_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT NOT NULL,
    category TEXT NOT NULL,
    weight REAL NOT NULL,
    cost REAL DEFAULT 0,
    reason TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity REAL NOT NULL,
    expiry TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_waste_date ON waste_logs(date);
  CREATE INDEX IF NOT EXISTS idx_waste_category ON waste_logs(category);
  CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry);
`);

console.log('✅ Database initialized at ecotrack.db');

module.exports = db;
