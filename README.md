# MetricsCRM

MetricsCRM is an autonomous, AI-powered Executive Command Center built specifically for 3D Scan Metrics. It acts as a comprehensive ERP, CRM, and accounting ledger, eliminating manual data entry by processing incoming emails, generating quotes, tracking finances, and dispatching legally binding PDFs.

## System Architecture

This application is built on modern web technologies optimized for speed, reliability, and AI integration.

- **Frontend Framework:** [Next.js 14+](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + Lucide React for iconography
- **Database:** `better-sqlite3` (Local SQLite file: `crm.db`)
- **AI Integration:** Google Gemini 1.5 (`@google/genai`)
- **Email Pipeline:** Resend SDK
- **Document Generation:** `pdfkit`

## Core Modules

### 1. Inbound Webhook Pipeline (`src/app/api/webhooks/email/route.ts`)
Instead of manually entering leads, the system exposes a serverless webhook endpoint. When an RFP (Request for Proposal) arrives via email, Resend forwards it to this endpoint. The system then:
1. Feeds the raw email to Gemini to extract structural metrics (Area, Complexity, Deliverables).
2. Calculates a baseline price using the proprietary Pricing Engine.
3. Inserts the lead into the database under a `PENDING` status.

### 2. The Pricing Engine (`scripts/engine.ts`)
A deterministic math engine that calculates the financial quote based on:
- Tiered base rates (e.g., area > 10,000 sqm = lower ZAR/sqm rate).
- Complexity multipliers (Civil, Industrial, Mining, Underground).
- Flat additions (e.g., mobilization costs).
- Deliverable multipliers (CAD, Topo, BIM).

### 3. Human-in-the-Loop Inbox (`src/app/page.tsx` & `src/app/actions.ts`)
The main dashboard displays all `PENDING` leads. The user can:
- Review the original email.
- Manually override the AI's extracted metrics (Area, Complexity).
- Apply **Advanced Pricing Overrides** (custom base rates or hard-coded final totals).
- Upload custom PDF attachments (Company Profiles, etc.).
- Click "Save & Invoice" to approve the quote.

### 4. Automated Document Dispatch (`src/lib/pdf.ts`)
Upon approval, the system:
1. Dynamically generates a branded PDF quote using `pdfkit`.
2. Appends a static "General Terms and Conditions" page to the PDF.
3. Bundles the Quote PDF + any custom user attachments.
4. Dispatches the email to the client using the Resend API.
5. Automatically creates an `UNPAID` invoice in the ledger.

### 5. Bookkeeping & Ledger (`src/lib/db.ts`)
A comprehensive accounting module tracking:
- **Accounts Receivable:** Tracks issued invoices and allows marking them as `PAID`.
- **Accounts Payable:** Tracks logged business expenses.
- **Profit & Loss:** A real-time dashboard calculating Net Profit based on Revenue minus Expenses.

### 6. The AI Executive Assistant (`src/app/api/assistant/route.ts`)
A natural language chat interface built directly into the dashboard. Powered by Gemini **Function Calling**, the AI has been granted tools to execute database operations. Users can type commands like *"Log a R450 expense for Uber under Travel"*, and the AI will parse the intent, execute the SQL query, and automatically refresh the UI.

## Environment Variables

To run this project, you must define the following variables in a `.env.local` file:

```env
# Google Gemini API Key for parsing emails and running the Chat Assistant
GEMINI_API_KEY=your_gemini_api_key

# Resend API Key for sending outbound PDF emails
RESEND_API_KEY=your_resend_api_key

# Basic Auth Credentials (protects the entire dashboard)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=metrics2026
```

## Running the Application

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Development Server:**
   ```bash
   npm run dev
   ```

3. **Access the Dashboard:**
   Navigate to `http://localhost:3000` and log in using your Basic Auth credentials.

## Deployment Notes
* **Database:** Before deploying to a serverless host like Vercel, the SQLite database (`better-sqlite3`) must be migrated to a hosted PostgreSQL database (like Supabase or Neon), as serverless functions use ephemeral file systems.
* **Security:** The current Basic Auth middleware (`src/middleware.ts`) is highly secure for a single admin. If role-based access (RBAC) is required for employees in the future, upgrade to Auth.js or Clerk.
