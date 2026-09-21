# MetricsCRM - Cloudflare Production Deployment Guide

This document outlines the architecture of MetricsCRM and the necessary steps to take this Next.js application from its local MVP state into a secure, scalable production environment.

## Production target

- Worker: `crm-admin`
- Custom domain: `portal.3dscanmetrics.co.za`
- Git root directory: `crm`
- Shared D1 binding: `DB` -> `3dscanmetrics-crm`
- Canonical migrations: `../site/migrations`

The public website is currently deployed separately as a static Pages project. Its
`/api/quote` Worker route and D1 binding are not active in that Pages deployment.
Deploy the CRM independently first; enabling shared lead capture requires a
separate, verified cutover of the website to the Worker defined by
`site/wrangler.jsonc` (or an equivalent Pages Function) without changing its
public hostname.

## Tech Stack Overview
*   **Framework:** Next.js 14+ (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS + Lucide React Icons
*   **Database:** Cloudflare D1, shared with the public website
*   **AI Engine:** Google Gemini 1.5 (`@google/genai`)
*   **Email Dispatch:** Resend API
*   **PDF Generation:** `pdfkit`

## Crucial Pre-Deployment Steps (IT Action Required)

### 1. Database Migration (Mandatory)
Export the remote D1 database before applying any migration. Inspect the live schema, verify it matches migrations 0001-0003, then apply 0004. Never apply the retired migrations in `crm/migrations` to the shared production database.

### 2. Environment Variables (.env)
You must configure the following environment variables in your production host (e.g., Vercel):
*   `GEMINI_API_KEY`: Required for the AI extraction and the Executive Assistant.
*   `RESEND_API_KEY`: Required for dispatching the outbound PDF quotes.
*   `ADMIN_USERNAME`: Custom username for the Basic Auth login (Default: `admin`).
*   `ADMIN_PASSWORD`: Custom password for the Basic Auth login.
*   `WEBHOOK_SIGNING_SECRET`: Shared secret supplied in the `x-webhook-secret` header for inbound email webhooks.

### 3. Inbound Webhooks Setup
We have replaced the fragile local IMAP polling script with a robust serverless API route (`/api/webhooks/email/route.ts`).
*   **Action:** Log into your Resend (or SendGrid) account.
*   **Implementation:** Configure an "Inbound Webhook" to push all incoming emails (e.g., to `estimates@3dscanmetrics.co.za`) directly to your deployed production URL: `https://your-domain.com/api/webhooks/email/route.ts`. This will ensure instant, 24/7 AI parsing of new RFPs with zero downtime.

### 4. Authentication
Protect `portal.3dscanmetrics.co.za` with Cloudflare Access and allow only `isaiah@3dscanmetrics.co.za`. Basic Auth remains as a second layer and fails closed if either credential secret is absent.

## Running Locally for Review
To review the code locally before pushing to production:
1. Navigate to the project directory.
2. Run `npm install` to install all dependencies (`pdfkit`, `resend`, `@google/genai`).
3. Run `npm run dev` to start the local Next.js server.
4. Set local `ADMIN_USERNAME` and `ADMIN_PASSWORD`, then navigate to `http://localhost:3000`.

---
*Engineered by Antigravity AI.*
