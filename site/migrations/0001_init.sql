-- Leads captured from the Instant Estimate wizard
CREATE TABLE IF NOT EXISTS leads (
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
  payload_json TEXT NOT NULL,
  estimate_zar REAL NOT NULL,
  estimate_formatted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);

-- Single-row pricing configuration (editable from admin)
CREATE TABLE IF NOT EXISTS pricing_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO pricing_config (id, config_json) VALUES (
  1,
  '{
    "area_tiers": [
      { "max_area": 200, "rate": 18.0 },
      { "max_area": 1000, "rate": 14.0 },
      { "max_area": 5000, "rate": 9.5 },
      { "max_area": 10000, "rate": 6.5 },
      { "max_area": null, "rate": 4.5 }
    ],
    "site_multipliers": {
      "Commercial/Retail/Residential": 1.0,
      "Civil Infrastructure": 1.2,
      "Industrial Facility / Plant": 1.5,
      "Mining (Surface)": 1.5,
      "Mining (Underground)": 2.0
    },
    "processing_base": 0.2,
    "deliverable_multipliers": {
      "raw": 0.0,
      "viewer": 0.1,
      "cad": 0.5,
      "topo": 0.4,
      "bim": 1.2
    },
    "flat_fee": 2500,
    "floor": 4500
  }'
);
