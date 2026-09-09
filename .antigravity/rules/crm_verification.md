# CRM Verification & Code Quality Rules

This project rule file strictly governs all feature additions, schema migrations, and bug fixes across the Metrics 3D CRM codebase.

## 1. Database Schema First Principle
- ALWAYS inspect `crm/migrations/*.sql` definitions before writing any SQL `INSERT`, `UPDATE`, or `SELECT` queries in `src/app/actions.ts` or API routes.
- NEVER assume top-level database columns exist without checking migration files.
- The `leads` table schema is: `id`, `email`, `name`, `company`, `project`, `area`, `complexity`, `deliverables`, `status`, `quoteTotal`, `fieldDays`, `processDays`, `rawEmail`, `createdAt`.
- Scoping metadata (phone, mode, customItems, access, accuracy, bimLevel, distanceKm) MUST be stored inside JSON text column `deliverables`.

## 2. Defensive Runtime Type Safety
- NEVER invoke array methods like `.map()`, `.reduce()`, `.filter()`, or `.forEach()` on deserialized JSON payloads without runtime array guards:
  ```ts
  const safeArray = Array.isArray(parsed) ? parsed : [];
  ```
- Always sanitize deliverable keys and mode states (`'calculator'` vs `'custom'`).

## 3. Strict Dual-Mode Execution Guardrails
- `isCustomBoq` MUST strictly require `mode === 'custom' && customItems.length > 0`.
- When in `Calculator Engine` mode, `customItems` sent to backend MUST be empty (`[]`) so fallback UI state does not leak into PDF generation.

## 4. Full End-to-End Pipeline Verification
- After modifying actions or UI components, verify the complete pipeline:
  1. Website Lead Ingestion (`site/src/quote.js`)
  2. Lead Scoping & Deliverables Normalization (`QuoteEditor.tsx`)
  3. Admin Calculator & BoQ Mode Toggle (`AdminQuoteCalculator.tsx`)
  4. Quote PDF Rendering (`/api/quotes/[id]/pdf`)
  5. Tax Invoice PDF Rendering (`/api/invoices/[id]/pdf`)
  6. Client Auto-sync (`clients` table)

## 5. Mandatory Build & Runtime Verification
- ALWAYS run `npm run build` to verify 0 TypeScript/Turbopack compilation errors.
- ALWAYS test dynamic API route generation before presenting completion to the user.
