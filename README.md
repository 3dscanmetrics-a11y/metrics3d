# 3D Scan Metrics

Public marketing site and MetricsCRM in one repo. Both share Cloudflare D1 `3dscanmetrics`.

| Package | Role | Worker |
|---------|------|--------|
| [`site/`](site/) | Marketing pages + Instant Estimate (`POST /api/quote`) | `3dscanmetrics` |
| [`crm/`](crm/) | Admin inbox, PDF quotes, invoices, expenses, P&L | `admin` |

## Local

Copy `.env.local` (gitignored) with `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RESEND_API_KEY`, `GEMINI_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.

```bash
cd site && npm install && npm run dev     # http://localhost:8787
cd crm && npm install && npm run dev      # http://localhost:3000
```

## Deploy

```bash
set -a && . ./.env.local && set +a
npm run deploy:site   # Worker 3dscanmetrics
npm run deploy:crm    # Worker admin
```

A public Instant Estimate writes a lead into D1; the CRM inbox reads the same database.
