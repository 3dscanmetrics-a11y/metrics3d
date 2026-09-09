-- Migration number: 0002 	 2026-08-28
-- Advanced Financials & AI Automation Layer

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    tax_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    budget_zar REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1.0,
    unit_price_zar REAL NOT NULL,
    total_zar REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_automation_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    status TEXT DEFAULT 'COMPLETED',
    result_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
