SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name IN (
    'leads', 'pricing_config', 'invoices', 'expenses',
    'clients', 'projects', 'invoice_items', 'ai_automation_logs'
  )
ORDER BY name;

SELECT
  (SELECT COUNT(*) FROM leads) AS lead_count,
  (SELECT COUNT(*) FROM invoices) AS invoice_count,
  (SELECT COUNT(*) FROM expenses) AS expense_count,
  (SELECT COUNT(*) FROM clients) AS client_count;

SELECT
  (SELECT COUNT(*) FROM pragma_table_info('leads')
    WHERE name IN (
      'id', 'email', 'contact_name', 'deliverables_json', 'payload_json',
      'estimate_zar', 'estimate_formatted', 'estimate_low', 'estimate_high',
      'field_days', 'process_days', 'created_at', 'updated_at'
    )) AS required_lead_columns,
  (SELECT COUNT(*) FROM pragma_table_info('invoices')
    WHERE name IN (
      'id', 'lead_id', 'client_name', 'amount', 'amount_paid', 'status',
      'due_date', 'payment_terms', 'created_at', 'updated_at'
    )) AS required_invoice_columns,
  (SELECT COUNT(*) FROM pragma_table_info('clients')
    WHERE name IN (
      'id', 'name', 'company', 'email', 'phone', 'vat_number',
      'payment_terms', 'billing_street', 'created_at', 'updated_at'
    )) AS required_client_columns;

SELECT COUNT(*) AS orphan_invoice_count
FROM invoices i
LEFT JOIN leads l ON l.id = i.lead_id
WHERE i.lead_id IS NOT NULL AND l.id IS NULL;
