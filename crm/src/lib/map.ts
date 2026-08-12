const OPEN_STATUSES = new Set(['new', 'pending', 'contacted', 'PENDING']);

export function mapLead(row: Record<string, unknown> | null) {
  if (!row) return null;
  const rawStatus = String(row.status || 'new');
  let status = 'PENDING';
  if (rawStatus === 'approved' || rawStatus === 'APPROVED') status = 'APPROVED';
  else if (rawStatus === 'sent' || rawStatus === 'SENT') status = 'SENT';
  else if (rawStatus === 'rejected' || rawStatus === 'REJECTED' || rawStatus === 'closed') status = 'REJECTED';
  else if (OPEN_STATUSES.has(rawStatus)) status = 'PENDING';

  const deliverables =
    (row.deliverables as string) ||
    (row.deliverables_json as string) ||
    '[]';

  return {
    ...row,
    name: (row.name as string) || (row.contact_name as string) || '',
    quoteTotal: Number(row.quoteTotal ?? row.estimate_zar ?? 0),
    deliverables,
    rawEmail: (row.rawEmail as string) || (row.raw_email as string) || '',
    fieldDays: Number(row.fieldDays ?? row.field_days ?? 0),
    processDays: Number(row.processDays ?? row.process_days ?? 0),
    createdAt: (row.createdAt as string) || (row.created_at as string) || '',
    status,
  };
}

export function mapInvoice(row: Record<string, unknown>) {
  return {
    ...row,
    clientName: (row.clientName as string) || (row.client_name as string) || '',
    createdAt: (row.createdAt as string) || (row.created_at as string) || '',
  };
}

export function toDbStatus(uiStatus: 'PENDING' | 'APPROVED' | 'SENT' | 'REJECTED') {
  if (uiStatus === 'APPROVED') return 'approved';
  if (uiStatus === 'SENT') return 'sent';
  if (uiStatus === 'REJECTED') return 'rejected';
  return 'pending';
}
