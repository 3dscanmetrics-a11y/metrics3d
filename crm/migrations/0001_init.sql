-- Migration number: 0001 	 2026-08-11
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  project TEXT,
  area REAL,
  complexity TEXT,
  deliverables TEXT,
  status TEXT DEFAULT 'PENDING',
  quoteTotal REAL,
  fieldDays INTEGER,
  processDays INTEGER,
  rawEmail TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  leadId TEXT,
  clientName TEXT,
  project TEXT,
  amount REAL,
  status TEXT DEFAULT 'UNPAID',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  vendor TEXT,
  amount REAL,
  category TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP
);
