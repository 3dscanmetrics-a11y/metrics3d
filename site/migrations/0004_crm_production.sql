-- Canonical shared schema for the public website and MetricsCRM.
-- This migration assumes 0001-0003 have established the website's snake_case schema.

PRAGMA foreign_keys = OFF;

ALTER TABLE invoices RENAME TO invoices_before_crm_0004;

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  client_name TEXT,
  project TEXT,
  amount REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'UNPAID'
    CHECK (status IN ('DRAFT', 'UNPAID', 'PARTIAL', 'PAID', 'VOID')),
  due_date TEXT,
  payment_terms TEXT DEFAULT '30 Days',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

INSERT INTO invoices (id, lead_id, client_name, project, amount, amount_paid, status, created_at)
SELECT id, lead_id, client_name, project, amount,
  CASE WHEN status = 'PAID' THEN amount ELSE 0 END,
  CASE WHEN status = 'PAID' THEN 'PAID' ELSE 'UNPAID' END,
  created_at
FROM invoices_before_crm_0004;

DROP TABLE invoices_before_crm_0004;

CREATE INDEX idx_invoices_created_at ON invoices (created_at DESC);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_lead_id ON invoices (lead_id);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  account_number TEXT,
  client_type TEXT DEFAULT 'Company',
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  mobile TEXT,
  website TEXT,
  registration_number TEXT,
  vat_number TEXT,
  tax_number TEXT,
  currency TEXT DEFAULT 'ZAR',
  payment_terms TEXT DEFAULT '30 Days',
  discount_percent REAL DEFAULT 0,
  billing_street TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal_code TEXT,
  billing_country TEXT DEFAULT 'South Africa',
  postal_street TEXT,
  postal_city TEXT,
  postal_state TEXT,
  postal_postal_code TEXT,
  postal_country TEXT DEFAULT 'South Africa',
  industry TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients (company);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  budget_zar REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_zar REAL NOT NULL,
  total_zar REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items (invoice_id);

CREATE TABLE IF NOT EXISTS ai_automation_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

PRAGMA foreign_keys = ON;
