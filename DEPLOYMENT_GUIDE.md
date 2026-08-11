# MetricsCRM - IT Team Handover & Deployment Guide

This document outlines the architecture of MetricsCRM and the necessary steps to take this Next.js application from its local MVP state into a secure, scalable production environment.

## Tech Stack Overview
*   **Framework:** Next.js 14+ (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS + Lucide React Icons
*   **Current Database:** `better-sqlite3` (Local SQLite for rapid prototyping)
*   **AI Engine:** Google Gemini 1.5 (`@google/genai`)
*   **Email Dispatch:** Resend API
*   **PDF Generation:** `pdfkit`

## Crucial Pre-Deployment Steps (IT Action Required)

### 1. Database Migration (Mandatory)
The application currently uses a local SQLite database (`src/lib/db.ts`). If you deploy this to a serverless environment (like Vercel or AWS Lambda), the ephemeral file system will wipe the SQLite file on every restart.
*   **Action:** Transition the database to a hosted PostgreSQL instance (e.g., Supabase, Neon, or Vercel Postgres).
*   **Implementation:** Replace `better-sqlite3` in `src/lib/db.ts` with a PostgreSQL driver (like `pg` or Drizzle ORM). The SQL schemas (Leads, Invoices, Expenses) are standard and will port to Postgres seamlessly.

### 2. Environment Variables (.env)
You must configure the following environment variables in your production host (e.g., Vercel):
*   `GEMINI_API_KEY`: Required for the AI extraction and the Executive Assistant.
*   `RESEND_API_KEY`: Required for dispatching the outbound PDF quotes.
*   `ADMIN_USERNAME`: Custom username for the Basic Auth login (Default: `admin`).
*   `ADMIN_PASSWORD`: Custom password for the Basic Auth login.

### 3. Inbound Webhooks Setup
We have replaced the fragile local IMAP polling script with a robust serverless API route (`/api/webhooks/email/route.ts`).
*   **Action:** Log into your Resend (or SendGrid) account.
*   **Implementation:** Configure an "Inbound Webhook" to push all incoming emails (e.g., to `estimates@3dscanmetrics.co.za`) directly to your deployed production URL: `https://your-domain.com/api/webhooks/email/route.ts`. This will ensure instant, 24/7 AI parsing of new RFPs with zero downtime.

### 4. Advanced Authentication (Optional but Recommended)
The app currently uses Next.js Edge Middleware for HTTP Basic Authentication (`src/middleware.ts`). This is highly secure for a single admin user. 
*   **Action:** If you intend to have multiple employees (Estimators, Sales reps, Accountants) using the system with varying permissions, replace the middleware with **NextAuth.js (Auth.js)** or **Clerk** for robust Role-Based Access Control (RBAC).

## Running Locally for Review
To review the code locally before pushing to production:
1. Navigate to the project directory.
2. Run `npm install` to install all dependencies (`pdfkit`, `resend`, `@google/genai`).
3. Run `npm run dev` to start the local Next.js server.
4. Navigate to `http://localhost:3000` (Login with `admin` / `metrics2026`).

---
*Engineered by Antigravity AI.*
