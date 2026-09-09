-- Seed Initial Demo Data
INSERT OR IGNORE INTO leads (
    id, email, name, company, project, area, complexity, deliverables, status, quoteTotal, fieldDays, processDays, rawEmail
) VALUES (
    'lead-demo-1',
    'john.doe@aec-partners.co.za',
    'John Doe',
    'AEC Partners',
    'Sandton Commercial Complex Scoping',
    15000,
    'Commercial',
    '["Point Cloud", "Scan-to-BIM LOD300"]',
    'PENDING',
    145000.00,
    5,
    10,
    'Hi 3D Scan Metrics team, we require a high-resolution 3D laser scan and Scan-to-BIM model for our Sandton site.'
);

INSERT OR IGNORE INTO expenses (id, vendor, amount, category) VALUES ('exp-1', 'Leica Geosystems', 14500.00, 'EQUIPMENT');
INSERT OR IGNORE INTO expenses (id, vendor, amount, category) VALUES ('exp-2', 'TotalEnergies Substation', 3200.00, 'TRAVEL');
