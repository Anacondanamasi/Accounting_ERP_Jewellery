# PERFORMANCE, SCALABILITY & PRODUCTION STANDARDS

> **Agent instruction:** This file is a binding engineering standard for the accounting web app. Read it before starting any task. Every feature, PR and migration must comply. If a rule conflicts with the existing code, flag it, propose a fix, and do not silently ignore the rule. At the end of each task, run the **Definition of Done checklist (Section 18)** and report the results.

Financial correctness always beats speed. Never trade ledger accuracy, auditability or data integrity for performance. Speed comes from good design, not from shortcuts.

---

## 0. Performance Budgets (SLOs): measurable, enforced in CI

| Area | Target |
|---|---|
| API read (list/detail), p95 | < 200 ms |
| API write (invoice/bill/expense save + posting), p95 | < 400 ms |
| API p99, any standard endpoint | < 800 ms |
| Filter / search / sort on lists (any size), p95 | < 250 ms |
| Dashboard first meaningful data | < 1 s (cached aggregates) |
| Standard reports (P&L, Balance Sheet, Trial Balance, GST Summary) | < 2 s for a 1M-row ledger; heavy reports go async |
| Largest Contentful Paint (LCP) | < 2.0 s on 4G mid-range device |
| Interaction to Next Paint (INP) | < 200 ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Time to Interactive (repeat visit) | < 1.5 s |
| Initial JS (gzip), per route | < 170 KB; total app shell < 300 KB |
| Availability | 99.9% (target 99.95%) |
| Error rate | < 0.1% 5xx |
| DB query | No query > 100 ms in the hot path; none without index support |

CI must fail the build if budgets are breached (Lighthouse CI, bundle-size check, API latency benchmark, query-plan check).

---

## 1. "No Loading" UX Strategy (perceived and real speed)

The goal is that users rarely see a spinner. Apply in this order:

1. **Instant navigation**: client-side routing, route-level code splitting, **prefetch** on hover/focus/viewport for links and likely next routes (e.g., invoice list → invoice detail).
2. **Stale-while-revalidate**: show cached data immediately, refresh in the background (TanStack Query / SWR or equivalent). Configure `staleTime` per resource type (masters: minutes; ledger/transactions: seconds).
3. **Optimistic UI** for safe actions (toggle, rename, mark as sent, add line, select filters). For financial postings, show a **provisional state** ("Posting…") and reconcile on server confirmation, and never fake a final posted state.
4. **Skeleton screens** that match final layout (zero layout shift) instead of spinners. Spinners only for actions > 1 s, with inline button state.
5. **Persist cache** (IndexedDB) for masters (items, parties, accounts, tax codes) so a repeat visit renders instantly, then revalidates.
6. **Local-first masters**: load the Chart of Accounts, tax codes, HSN/SAC, and frequent parties/items into client memory at login (delta sync using `updated_at`/ETag). Dropdowns and autocompletes then work with **zero network latency**.
7. **Instant search**: client-side fuzzy index (e.g., MiniSearch/Fuse/FlexSearch) for masters under ~50k rows; server-side search for larger sets.
8. **Debounce 150–250 ms** inputs, **cancel in-flight requests** on new input (AbortController), and ignore stale responses.
9. **Streaming/progressive rendering**: render the shell and above-the-fold content first; stream below-the-fold sections and heavy widgets (SSR streaming / Suspense).
10. **Background everything non-blocking**: PDF generation, emails, e-invoice IRN calls, GSTR exports, and 2B reconciliation run as jobs with progress notifications (SSE/WebSocket), never blocking the UI thread.
11. **Keep the UI responsive**: heavy computation (large imports parse, 2B matching preview) goes to **Web Workers**.

---

## 2. Fast Lists, Filters, Search & Tables

- **Virtualize** any list/grid > 100 rows (TanStack Virtual / react-window). Render only visible rows.
- **Server-side pagination, sorting and filtering** for transactional tables. Use **keyset (cursor) pagination**, not `OFFSET`, for deep pages: `WHERE (date, id) < (:d, :id) ORDER BY date DESC, id DESC LIMIT 50`.
- **Infinite scroll or pagination with prefetch of the next page.**
- **Filters apply instantly**: URL-synced filter state (shareable, back-button safe), debounced, request-cancelled, with cached results for repeated filter combos.
- **Saved views / filter presets** per user.
- **Never `SELECT *`** in lists; return only the columns shown (a summary DTO). Detail endpoints fetch the rest.
- **Total counts**: use an estimated or cached count for big tables (`pg_class.reltuples` / capped `COUNT` up to N+1), not exact `COUNT(*)` on every request. Show "1,000+" when over the cap.
- **Full-text and fuzzy search** with proper indexes (Postgres `pg_trgm` + GIN, `tsvector`) or a search engine (OpenSearch/Meilisearch/Typesense) for invoice no., party name, GSTIN, HSN, amount, narration. Index fields must match the filter UI.
- **Column-level filtering** must have a supporting index. Add the filter only if its index exists.
- Excel-like grid features (column resize, pin, hide, keyboard navigation, bulk select) must stay smooth at 100k rows through virtualization.
- **Bulk actions** run server-side as jobs on selection criteria (not by sending 10k IDs from the client).

---

## 3. Database Design & Optimization (Postgres assumed; adapt if different)

**Schema**
- Use `NUMERIC(18,2)`/integer paise for money. Never floats. Store currency and FX rate on every foreign-currency document.
- Use `bigint` or UUIDv7 (time-ordered) primary keys. Avoid random UUIDv4 for large write-heavy tables (index bloat).
- Every table carries `company_id` (tenant) as the **leading column** in composite indexes.
- Append-only **ledger_entries** (journal lines) table: never updated, only reversed. Immutable data is easy to cache and partition.
- Constraints at the DB level: `CHECK` for debit/credit non-negative, a deferred constraint/trigger asserting **sum(debit) = sum(credit) per journal**, foreign keys, unique `(company_id, document_type, series, number)`.

**Indexing**
- Composite indexes matching actual query patterns, e.g. `(company_id, account_id, txn_date, id)`, `(company_id, party_id, txn_date)`, `(company_id, status, due_date)`, `(company_id, gst_period, tax_code_id)`.
- **Partial indexes** for hot subsets (`WHERE status = 'unpaid'`, `WHERE is_deleted = false`).
- **Covering indexes** (`INCLUDE`) for list endpoints to enable index-only scans.
- **GIN/trigram** indexes for search. **BRIN** for huge append-only time-ordered tables.
- Review with `EXPLAIN (ANALYZE, BUFFERS)`. No sequential scans on large tables in hot paths. Drop unused indexes (`pg_stat_user_indexes`), because every index slows writes.

**Scale**
- **Partition** the ledger and audit tables by `company_id` hash and/or by financial-year/month range once > ~50M rows. Plan this from the start (partition key in the schema).
- **Materialized/aggregate tables** (see Section 6) so reports never scan raw ledger.
- Use **read replicas** for reports and dashboards (tolerate replication lag; show "as of" timestamps). Writes go to primary.
- **Connection pooling** (PgBouncer, transaction mode); app pool sized to `cores × 2–4`. Never open a connection per request.
- Set `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`. Keep transactions short; no external calls (GSP/IRP, email) inside a DB transaction.
- Avoid N+1: use joins/batched loaders (DataLoader). Add a **query-count guard in tests** (fail if a request exceeds N queries).
- Vacuum/analyze tuning for hot tables; monitor bloat. Use `fillfactor` for update-heavy tables.
- Zero-downtime migrations only: add column nullable → backfill in batches → add constraint `NOT VALID` then `VALIDATE` → switch code → drop old. Create indexes `CONCURRENTLY`. Never take long table locks.

---

## 4. Concurrency, Correctness & Idempotency (critical for accounting)

- **Idempotency keys** on all write endpoints (invoice create, payment, posting, IRP calls). A retry or double-click must never double-post. Store key + response for 24–72 h.
- **Document number generation** must be gap-free and race-safe (GST requires consecutive series): use a per-series counter row with `SELECT … FOR UPDATE` or an atomic `UPDATE … RETURNING`, inside the same transaction as document creation.
- **Optimistic concurrency**: a `version` column on documents. Reject stale updates with 409 and show a merge/refresh prompt.
- **Posting is transactional**: document + journal entries + tax lines + audit log commit atomically, or none do.
- **Transactional outbox** for events (emails, e-invoice, webhooks, cache invalidation): write the event in the same DB transaction, a worker publishes it. No dual-write bugs.
- **Row-level locking** only where needed (number series, bank reconciliation, period close). Avoid table-wide locks.
- Use deterministic lock ordering to prevent deadlocks; retry on serialization failure/deadlock with backoff + jitter.
- Period-lock/GST-filing-lock checks are enforced server-side inside the posting transaction.

---

## 5. Caching Strategy (multi-layer, with correct invalidation)

| Layer | What | Notes |
|---|---|---|
| Browser (HTTP) | Static assets: `Cache-Control: public, max-age=31536000, immutable` with hashed filenames | Fonts, JS, CSS, images |
| CDN / edge | Static assets, public pages, API `GET`s that are safe to share | Brotli compression, HTTP/3 |
| Client data cache | Masters + recent lists (SWR/TanStack Query + IndexedDB) | Delta sync with ETag |
| App cache (Redis) | Sessions, permissions, tax codes, CoA, rate/config, computed aggregates, rate-limit counters | Namespaced by `company_id`; TTL + explicit invalidation |
| DB | Shared buffers, prepared statements, materialized aggregates | |

Rules:
- Cache key always includes `company_id` and a **version/epoch** (bump the epoch on master change instead of deleting many keys).
- **Never cache** user-specific financial data in a shared CDN. Use `Cache-Control: private, no-store` where needed.
- Prevent cache stampede: request coalescing (single-flight), jittered TTL, stale-while-revalidate on the server.
- Support **ETag / If-None-Match** and `304` on list and master endpoints.
- Cache invalidation is triggered by outbox events on writes. If unsure, prefer a short TTL over a risky long cache.

---

## 6. Reports & Aggregates (the hardest performance area in accounting)

- Reports must **not** scan the raw ledger for every request.
- Maintain **running balance / period summary tables** updated transactionally or by a worker:
  - `account_period_balances (company_id, account_id, period, debit_total, credit_total)`
  - `party_balances`, `gst_period_summary`, `inventory_stock_summary`
- Trial Balance, P&L, Balance Sheet = **sum of period balances** plus a small tail query for the open period. Drill-down hits the raw ledger with an index.
- Use **materialized views with `REFRESH … CONCURRENTLY`** or incremental aggregation (event-driven). Show "as of <time>" when slightly stale; offer a "refresh now".
- **Heavy reports** (GSTR-1/3B, 2B reconciliation, HSN summary, aged analysis, full ledger export) run as **async jobs**: request → job id → progress via SSE → downloadable result (stored in object storage, signed URL, auto-expire).
- Report parameters are normalized and **results cached** by `(company_id, report, params, data_epoch)`.
- Exports (CSV/XLSX/PDF) are **streamed** (cursor + stream writer). Never load millions of rows into memory.
- Consider a **columnar/OLAP store** (ClickHouse / DuckDB / Postgres + Citus) later for analytics; keep OLTP clean.
- A reconciliation test must prove that **report totals == ledger totals** for every release.

---

## 7. Backend & API Performance

- Stateless app servers; scale horizontally behind a load balancer; graceful shutdown (drain connections), health/readiness probes.
- **Async/non-blocking I/O**; no synchronous CPU-heavy work on the request thread. Offload to workers.
- **Job queue** (BullMQ/Celery/Sidekiq/SQS/RabbitMQ) with: retries + exponential backoff, dead-letter queue, priorities, concurrency limits per tenant (fairness), idempotent handlers, and visibility dashboard.
- **Pagination everywhere**, with a hard server cap (`limit ≤ 200`). **Field selection / sparse payloads**; avoid over-fetching.
- **Compression**: Brotli/gzip. **HTTP/2 or HTTP/3**, keep-alive. Consider **batching/multiplexing** endpoints (e.g., a `POST /batch` or GraphQL with persisted queries) to reduce round trips.
- Fast serialization; avoid deep ORM object graphs on list endpoints (use raw/optimized queries or projections).
- **Rate limiting** per user, per tenant and per IP (token bucket in Redis), with higher limits for authenticated tenants and strict limits on auth/OTP/GSTIN-lookup endpoints.
- **Backpressure and load shedding**: return `429/503` with `Retry-After` under overload; protect the core (posting) before nice-to-haves (dashboards).
- **Circuit breakers, timeouts, retries with jitter, and bulkheads** around third-party calls (GSP/IRP/e-way bill, GSTIN API, email/SMS, payment gateway). Provide fallbacks and queue-and-retry. A GST portal outage must never block invoicing.
- Webhooks: signed, retried, idempotent, with replay.
- API versioning (`/v1`), backwards-compatible changes, OpenAPI spec generated and contract-tested.
- Use **server-side caching of computed documents** (rendered PDF stored in object storage keyed by document version).

---

## 8. Frontend Performance

- **Bundle**: route-based code splitting, lazy-load heavy modules (charts, PDF viewer, rich editors, report designers), tree-shaking, no moment.js/lodash-whole imports. Analyze bundle on each PR (size-limit / bundle-analyzer).
- **Rendering**: memoize expensive components, avoid re-render storms (selector-based state, split contexts, signals/fine-grained state), stable keys, `useDeferredValue/startTransition` for heavy filters. Use **React Compiler / equivalent** if available.
- Keep the invoice **line-item grid** fast: uncontrolled/optimized inputs, calculate totals in a pure function (debounced micro-batch), row-level memoization, keyboard-first entry (Tab/Enter/shortcuts), and paste-from-Excel support. 500-line invoices must stay smooth.
- **Images/fonts**: AVIF/WebP, responsive `srcset`, lazy loading, `font-display: swap`, subset fonts (include Devanagari/Gujarati subsets only if used), preload critical fonts. Use SVG sprites for icons.
- **Resource hints**: `preconnect` to API/CDN, `preload` critical assets, `prefetch` next routes.
- **SSR/SSG/streaming** for the shell and marketing/login pages; client-rendered authenticated app is fine if the shell is cached and prefetched.
- **Service Worker / PWA**: cache the app shell and static assets, offline-tolerant drafts (queue unsaved drafts in IndexedDB, sync when online), background sync.
- Avoid layout thrashing; use CSS `contain`, `content-visibility: auto` for off-screen sections; animate only `transform`/`opacity`.
- Third-party scripts (analytics, chat) are loaded deferred/async, or off-thread (Partytown), and must never block render.
- Real User Monitoring (Web Vitals) reported per route; alert on regressions.
- Accessibility and performance coexist: semantic HTML, keyboard navigation, ARIA for virtualized grids.
- Data entry ergonomics = speed: keyboard shortcuts, command palette (Ctrl/Cmd+K), autosave drafts, "Save & New", recent items, barcode scan.

---

## 9. Multi-Tenancy & Fairness

- Every query is scoped by `company_id` (enforce with **Row-Level Security** or a mandatory repository/ORM scope. Never rely on developers remembering).
- Prevent **noisy neighbors**: per-tenant rate limits, job concurrency caps, query timeouts and quotas. Large tenants can be moved to a dedicated shard/DB (design a `tenant → shard` routing table from day one).
- Tenant-aware cache keys, logs, metrics and encryption context.
- Tenant data export/delete tooling (for compliance) that doesn't lock production tables.

---

## 10. Security & Compliance in Production

- **AuthN/Z**: short-lived JWT/session + refresh rotation, MFA (TOTP/OTP) for owners/accountants, RBAC + fine-grained permissions (override tax, lock period, file GST, export), re-auth for sensitive actions.
- **OWASP Top 10**: parameterized queries only, output encoding, CSRF protection, strict CORS, secure/HttpOnly/SameSite cookies, CSP + security headers (HSTS, X-Content-Type-Options, Referrer-Policy), SSRF protection on outbound calls, file-upload scanning and type/size limits.
- **Encryption**: TLS 1.2+ everywhere; encryption at rest (DB, backups, object storage); field-level encryption for sensitive data (PAN, bank accounts, GSP/API credentials, Aadhaar if ever stored. Prefer not to store it). Secrets in a vault/secret manager, never in repo/env files committed.
- **Audit log**: append-only, tamper-evident (hash chain), recording who/what/when/before/after/IP for all financial and tax-affecting changes. Retain per legal requirements (the Companies Act audit trail requirement of edit logs, and 6+ years' retention for GST records).
- **Indian data/legal**: DPDP Act 2023 compliance (consent, purpose limitation, deletion/export requests), data residency in India region where required, retention policies.
- Dependency scanning (SCA), SAST, container scanning, secret scanning in CI; renovate/dependabot; SBOM.
- Rate-limit and bot-protect login, OTP, password reset, public invoice links (signed, expiring, unguessable tokens).
- Regular **pen-test** and a vulnerability disclosure policy.

---

## 11. Observability & Operations

- **Three pillars**: structured JSON logs (with `request_id`, `company_id`, `user_id`, never PII/secrets), metrics (RED: Rate/Errors/Duration; USE for resources), distributed tracing (OpenTelemetry) across web → API → DB → queue → external APIs.
- **Dashboards**: latency percentiles per endpoint, DB slow queries (`pg_stat_statements`), queue depth/lag, cache hit ratio, error budget burn, job failures, third-party API health, Web Vitals (RUM).
- **Alerting** on SLO burn rate, not noise: page only for user-impacting issues; runbook link in every alert.
- Error tracking (Sentry or equivalent) with release tagging and source maps (kept private).
- Synthetic monitoring for critical journeys (login → create invoice → post → pay → report) every minute from multiple regions.
- **Feature flags** for gradual rollout, kill switches and per-tenant enablement. Decouple deploy from release.
- Log slow requests (> 1 s) and slow queries (> 100 ms) automatically with the query plan.
- Capacity dashboards and forecasting (CPU, memory, DB IOPS, connection counts, storage growth).

---

## 12. Infrastructure, Deployment & Scaling

- **Containerize** (Docker, minimal base images, non-root), orchestrate (Kubernetes/ECS/Nomad or managed PaaS), **infrastructure as code** (Terraform/Pulumi).
- Environments: dev → staging (production-like data volume, anonymized) → production. Config via env/secret manager, 12-factor.
- **CI/CD**: lint, type-check, unit/integration/e2e tests, migration dry-run, security scans, performance budget checks, build once and promote the same artifact. Deployments: **blue-green or canary** with automatic rollback on SLO breach. Zero-downtime.
- **Autoscaling** on CPU/latency/queue depth; separate scaling for web, API, workers and schedulers. Reserve capacity before GST due dates (the 10th–11th, 20th, and the month-end/quarter-end rush) with scheduled scale-up.
- **Multi-AZ** for DB, cache, and app; managed Postgres with automated failover. Consider multi-region DR.
- **CDN + WAF + DDoS protection** in front (Cloudflare/CloudFront/Akamai). Serve static assets from the edge nearest India (Mumbai/Hyderabad PoPs); host app and DB in an **India region** (e.g., ap-south-1) for latency and data residency.
- **Object storage** for attachments/PDFs/exports (S3-compatible) with lifecycle rules, signed URLs, virus scanning.
- **Scheduler** for recurring invoices, reminders, depreciation, bank-feed sync, GST due-date alerts. Use a single-leader or lock-based scheduler to avoid duplicate runs.
- Cost controls: tagging, budgets, right-sizing, storage tiering for old audit/archive data.

---

## 13. Backup, Recovery & Data Integrity

- **Automated backups** + **PITR (point-in-time recovery)**; tested restores monthly. Target **RPO ≤ 5 min, RTO ≤ 1 h**.
- Cross-region encrypted backup copy; immutable (WORM) backups against ransomware.
- Daily **integrity jobs**: ledger balance check (Σ debit = Σ credit), subledger-to-control-account reconciliation (AR/AP/Inventory/GST ledgers), orphan checks, document-number gap detection, report-vs-ledger reconciliation. Alert on any drift.
- Soft-delete + restore for non-posted entities; posted records are never hard-deleted.
- Data archival: move closed financial years to cold storage/partitions while keeping reports available.
- Disaster-recovery runbook and an annual game-day exercise.

---

## 14. Imports, Exports & Bulk Operations

- Bulk import (items, parties, opening balances, invoices, bank statements) via **streamed parse → validate → staged table → preview with error report → async commit in batches**. Do not insert row-by-row; use `COPY`/multi-row inserts, with progress and resumability.
- Validation errors downloadable as a file with row numbers and reasons. Dry-run mode.
- Large exports are streamed and run in background; email/notify when ready.
- Imports must go through the **same posting engine** (no side-door writes that skip GST/ledger rules).

---

## 15. Testing for Performance & Reliability

- **Load tests** (k6/Gatling/Locust) in CI/nightly on staging with realistic data: 100k invoices/tenant, 50M ledger rows total, 5,000 concurrent users, spikes at GST due dates. Scenarios: login, list+filter, create/post invoice, payment, bank reconciliation, report generation, GSTR export.
- **Soak test** (24h, memory-leak detection), **stress test** (find the breaking point), **spike test**, **chaos tests** (kill a DB replica, a worker, Redis, or a GSP timeout) and verify graceful degradation.
- **Seed data generator** to produce realistic, skewed, large datasets. Never test performance on tiny data.
- **Query-plan regression tests** for hot queries (fail if the plan changes to a seq scan).
- **Concurrency tests**: parallel invoice creation (gap-free numbering), double-submit (idempotency), concurrent edits (optimistic lock), period-lock races.
- **Property-based tests** on the posting engine (always balanced; rounding stays within tolerance).
- Lighthouse CI + Web Vitals budget tests on key routes; bundle-size regression guard.
- Contract tests for third-party adapters (sandbox + recorded fixtures).

---

## 16. Graceful Degradation & Resilience

- If Redis is down: fall back to the DB (slower, but works). If the read replica lags: fall back to primary for read-your-writes needs. If the search engine is down: fall back to a basic DB filter. If the GSP/IRP is down: queue the e-invoice and let the user continue with "IRN pending". If the report DB is slow: serve the cached report with an "as of" stamp.
- Read-your-own-writes: after a write, the client reads from primary (or uses a version token) so users never see their own entry "missing".
- Retry-safe UI: network drop shows an offline banner, keeps the draft, and replays queued actions when back online.
- Timeouts on every network call; no unbounded waits anywhere.

---

## 17. Code Quality & Engineering Hygiene (to keep performance from regressing)

- Strict typing (TypeScript strict / mypy), lint + format enforced in pre-commit and CI.
- Layered architecture: controllers thin → services → domain (posting engine, pure) → repositories. No business logic in UI or SQL triggers (except integrity constraints).
- Small PRs, code review checklist includes: indexes for new queries, N+1 check, pagination, caching/invalidation, idempotency, audit log, permissions, tenant scoping, error handling, tests.
- ADRs (architecture decision records) for major decisions; keep docs in `/docs`.
- Remove dead code and unused dependencies; pin versions; reproducible builds.
- Profiling culture: profile before optimizing (flamegraphs, `EXPLAIN`, React Profiler). Record the benchmark before/after in the PR description.

---

## 18. Definition of Done: the agent must verify before finishing any task

- [ ] New/changed queries have supporting indexes; `EXPLAIN ANALYZE` reviewed; no N+1; query count asserted in tests.
- [ ] Lists use server-side filtering + keyset pagination + virtualization; no `SELECT *`; filter state in the URL.
- [ ] Write endpoints are idempotent, transactional, version-checked, tenant-scoped, permission-checked and audit-logged.
- [ ] Posting engine output is balanced; report totals reconcile with the ledger; period/GST lock enforced server-side.
- [ ] No floating-point money; rounding rules tested.
- [ ] Heavy work is async via jobs; UI shows progress; no blocking external calls inside DB transactions.
- [ ] Caching added where sensible, with explicit invalidation and tenant-scoped keys; nothing sensitive in shared caches.
- [ ] Frontend: skeletons (not spinners) for first load, optimistic/provisional updates, prefetch, bundle within budget, Web Vitals within budget.
- [ ] Migrations are zero-downtime and reversible; backfills batched; indexes created concurrently.
- [ ] Security checks (inputs validated, authZ, secrets, headers) pass; dependency/SAST scans clean.
- [ ] Logs/metrics/traces added for the new path; alerts/runbook updated if user-impacting.
- [ ] Tests added: unit, integration, concurrency, e2e; load-test scenario updated for new critical paths.
- [ ] Performance budgets (Section 0) verified; before/after numbers recorded in the PR.
- [ ] Docs/ADR updated.

---

## 19. Suggested Reference Stack (use if starting fresh; otherwise map to the existing stack)

- **Frontend**: React + TypeScript + Vite/Next.js, TanStack Query, TanStack Table + Virtual, Zustand/Redux Toolkit, React Hook Form + Zod, Workbox (PWA), MiniSearch/Fuse.
- **Backend**: Node (NestJS/Fastify) or Python (FastAPI) or Go; REST + OpenAPI (or GraphQL with persisted queries).
- **Data**: PostgreSQL (RLS, partitioning, pg_trgm, pg_stat_statements) + PgBouncer; Redis; OpenSearch/Meilisearch/Typesense for search; S3-compatible object storage; ClickHouse/DuckDB for heavy analytics (later).
- **Async**: BullMQ/Celery/SQS + outbox pattern; SSE/WebSocket for progress.
- **Ops**: Docker, Kubernetes/ECS, Terraform, GitHub Actions/GitLab CI, OpenTelemetry + Grafana/Prometheus/Loki/Tempo or Datadog, Sentry, k6, Lighthouse CI.

---

## 20. Priority Order When Building (what to do first)

1. Correctness foundation: schema constraints, posting engine, idempotency, numbering, audit log, tenant scoping.
2. Indexes + keyset pagination + server-side filtering on every list.
3. Aggregate tables for reports + async jobs for heavy exports.
4. Frontend speed layer: client cache, prefetch, skeletons, virtualization, local masters.
5. Observability + load testing + budgets in CI.
6. Caching, read replicas, autoscaling, CDN, DR.
7. Advanced: sharding, OLAP store, edge optimization, offline-first.

> If a trade-off is required, choose in this order: **data correctness → security → availability → performance → feature speed.** Document every deliberate exception in an ADR.
