-- Expand leads for MetricsCRM + unified statuses; add invoices & expenses.

PRAGMA foreign_keys = OFF;

CREATE TABLE leads_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT,
  project TEXT,
  company TEXT,
  contact_name TEXT,
  site_location TEXT,
  area REAL,
  complexity TEXT,
  deliverables_json TEXT NOT NULL DEFAULT '[]',
  payload_json TEXT NOT NULL DEFAULT '{}',
  estimate_zar REAL NOT NULL DEFAULT 0,
  estimate_formatted TEXT NOT NULL DEFAULT 'R 0,00',
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN (
      'new', 'pending', 'contacted', 'approved', 'sent', 'rejected', 'closed'
    )),
  raw_email TEXT,
  field_days INTEGER,
  process_days INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO leads_new (
  id, email, phone, project, company, contact_name, site_location,
  area, complexity, deliverables_json, payload_json,
  estimate_zar, estimate_formatted, status,
  raw_email, field_days, process_days, created_at, updated_at
)
SELECT
  id, email, phone, project, company, contact_name, site_location,
  area, complexity, deliverables_json, payload_json,
  estimate_zar, estimate_formatted, status,
  NULL, NULL, NULL, created_at, updated_at
FROM leads;

DROP TABLE leads;
ALTER TABLE leads_new RENAME TO leads;

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  client_name TEXT,
  project TEXT,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  vendor TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT,
  date TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date DESC);

PRAGMA foreign_keys = ON;
