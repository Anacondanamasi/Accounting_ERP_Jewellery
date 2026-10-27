# Multi-Tenancy Architecture & Security Standards

## 1. Core Principles
1. **Zero-Trust Cross-Tenant Boundary**: Every organization (tenant) is completely isolated. Data belonging to Company A must never be read, modified, referenced, or cached in any context accessible by Company B.
2. **Fail-Closed Execution**: If tenant context is missing, malformed, or untrusted, the system must immediately reject the request with `400 Bad Request` or `403 Forbidden` (`ACCESS_DENIED`). It must **never** fall back to default organizations, `ORDER BY created_at ASC`, or unscoped datasets.
3. **Multi-Layer Defense-in-Depth**:
   - **Layer 1 (Gateway Middleware)**: `requireCompanyContext` verifies active tenant membership in PostgreSQL and binds the active company context to the request.
   - **Layer 2 (Execution Scope)**: Node.js `AsyncLocalStorage` (`tenantStorage`) retains request-scoped tenant parameters across asynchronous call trees.
   - **Layer 3 (ORM Enforcement)**: Prisma Client query extension intercepts all operational models (`findMany`, `findFirst`, `findUnique`, `count`, `create`, `updateMany`, `deleteMany`) and injects/verifies `where.companyId`. Direct ID lookups via `findUnique` fail closed (return `null`) if an ID belongs to another tenant.
   - **Layer 4 (Database Schema)**: Every operational table contains `companyId` (non-null, indexed). Composite foreign keys preserve tenant integrity across parent-child relations.
   - **Layer 5 (Client Cache & Storage)**: Frontend TanStack Query cache is aborted (`cancelQueries()`) and purged (`clear()`) upon company switch. All `localStorage` keys are namespaced by `companyId`.

---

## 2. API & Controller Standards
- Every tenant-scoped route mounted in Express MUST include `authMiddleware, requireCompanyContext`.
- Never execute inner `router.use(authMiddleware)` inside child router files that could clobber verified company context.
- Mint fresh JWT access tokens containing the newly selected tenant context upon company switch or creation.
- ID lookups must always verify tenant ownership:
  ```ts
  const record = await prisma.invoice.findFirst({
    where: { id, companyId }
  });
  if (!record) return fail(res, 404, "NOT_FOUND", "Invoice not found");
  ```

---

## 3. Database & Schema Standards
- Every new business table must include `companyId Int` or `company_id uuid` with `NOT NULL`.
- Foreign keys between tenant entities must enforce composite integrity:
  `(company_id, customer_id) REFERENCES customers(company_id, id)`.
- Global models without tenant boundaries must be explicitly declared in `GLOBAL_MODELS` whitelist (`TenantCompany`, `TenantUser`, `SubscriptionPlan`, `HSNMaster`, etc.).

---

## 4. Frontend Standards
- TanStack Query cache must be cleared and in-flight queries canceled on company switch:
  ```ts
  queryClient.cancelQueries();
  queryClient.clear();
  ```
- Local storage items storing tenant-specific state must always prefix the key with `companyId`:
  ```ts
  const storageKey = `payroll_loans_tracker_v1:${companyId || 'default'}`;
  ```

---

## 5. Automated CI Gates & Verification
- `packages/backend/src/__tests__/crossTenantIsolation.test.ts` runs on all pull requests and builds.
- Tests verify:
  1. Read isolation across entities (invoices, bills, customers, accounts).
  2. IDOR protection on direct ID queries.
  3. Header spoofing and non-member access prevention (403).
  4. Fail-closed behavior on missing or unauthenticated context.
  5. Concurrent requests under interleaved parallel execution.
  6. Schema gate checking every public table for `companyId` against the whitelist.
