-- Migration number: 0003 	 2026-08-12
ALTER TABLE leads ADD COLUMN estimate_low REAL;
ALTER TABLE leads ADD COLUMN estimate_high REAL;
