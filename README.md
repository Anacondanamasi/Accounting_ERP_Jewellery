# HKS Accounting & ERP System

> **High-Performance Multi-Tenant Cloud Accounting, Double-Entry Ledger & Jewellery ERP**  
> Designed to QuickBooks Online (QBO) and Xero interaction standards with strict Indian statutory compliance (GST/TDS, Companies Act 2013, Income-tax Act 1961).

---

## 1. Documentation Map & Single Source of Truth

To avoid confusion, all documentation is consolidated into the following authoritative files:

| File | Purpose | Key Contents |
| :--- | :--- | :--- |
| **[`ACCOUNTING_AI_RULES.md`](./ACCOUNTING_AI_RULES.md)** | **Master Accounting & Invariants Policy** | Non-negotiable double-entry rules, direct-entry (no Draft/Post), rounding & precision, multi-tenant isolation, and Section 21 Testable Invariants ($ \sum\text{Dr}=\sum\text{Cr}$, Balance Sheet, AR/AP, GST symmetry, metal weight conservation). |
| **[`PERFORMANCE_STANDARDS.md`](./PERFORMANCE_STANDARDS.md)** | **Production & Scalability Standards** | Performance budgets (p95 < 200ms read, < 400ms write), SQL query optimization, indexing, idempotent posting, concurrency locks, and Definition of Done. |
| **[`STANDARDIZATION_PROGRESS.md`](./STANDARDIZATION_PROGRESS.md)** | **Design System & Feature Parity Roadmap** | Progress tracking from Phase 0 to Phase 6, standardization parity matrix across modules, baseline scores, and historical module audit logs. |
| **[`docs/ENTERPRISE_MODULES_AND_COMPLIANCE_GUIDE.md`](./docs/ENTERPRISE_MODULES_AND_COMPLIANCE_GUIDE.md)** | **Module User & Compliance Manual** | Complete operational and technical guide for: <br>• Ch 1: Banking & Statement-Based Reconciliation<br>• Ch 2: Bank Rules Engine & Indian Automation<br>• Ch 3: Fixed Assets Management (Companies Act & Tax Books)<br>• Ch 4: Transaction Journal & Tamper-Evident Audit Trail<br>• Ch 5: Enterprise Settings Center Architecture |

---

## 2. Core Architecture & Philosophy

1. **Direct-Entry Architecture**:
   - No intermediate "Draft / Post" states. Clicking "Save" validates and posts transactions directly to the General Ledger (`JournalEntry` / `JournalLine`) in an atomic database transaction.
   - Corrections are handled via credit/debit notes or reversible adjustments, preserving a complete audit trail.
2. **Indian Statutory Native**:
   - Automated Intrastate (CGST + SGST 50/50 split) vs Interstate (IGST) determination by Place of Supply.
   - Dual depreciation books for capital assets: Companies Act 2013 (useful life / residual value) and Income-tax Act 1961 (block of assets WDV).
   - E-Invoice / E-Way Bill ready with HSN/SAC master classification.
3. **Paise Precision & Float Protection**:
   - All financial amounts are stored as integer paise or high-precision decimals (`Decimal.js`), preventing floating-point rounding errors.
4. **Jewellery Domain Precision**:
   - High-precision metal weight tracking (3 decimal places in grams: $0.001\text{g}$, tola, carat).
   - Karigar job work lifecycle: pure gold issue, scrap receipt, stone studded tracking, and wastage loss accounting.

---

## 3. Tech Stack

- **Monorepo Structure**: `pnpm` workspaces
  - `packages/shared`: Shared TypeScript types, Zod schemas, calculation utilities, and invariant helpers.
  - `packages/frontend`: React 18, Vite, Tailwind CSS, Lucide icons, TanStack React Table & Query, React Hook Form.
  - `packages/backend`: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (Supabase), JWT auth, Winston logging.
  - `packages/webapp`: Next.js companion workspace.

---

## 4. Running Locally

### Prerequisites
- Node.js $\ge 20$
- pnpm $\ge 9$
- PostgreSQL instance configured in `packages/backend/.env`

### Starting the Application
```bash
# Terminal 1: Backend API Server (Port 4000)
npm run dev:backend

# Terminal 2: Frontend Client (Port 5173)
npm run dev:frontend
```

### Verification & Testing
```bash
# Typecheck all packages
npm run typecheck

# Run backend unit & compliance test suite (60/60 passing)
npm test

# Build all packages for production
npm run build
```
