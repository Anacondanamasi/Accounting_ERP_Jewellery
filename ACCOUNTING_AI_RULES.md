# ACCOUNTING_AI_RULES.md

## Master Accounting, Tax, Ledger, Reconciliation, and Reporting Policy for AI Agents

**Policy type:** Mandatory system-level accounting policy  
**Applies to:** All AI agents, developers, automated workflows, APIs, imports, integrations, journal generators, and reporting modules  
**Primary objective:** Maintain accurate, complete, auditable, and internally consistent accounting records in accordance with the configured accounting standards, tax jurisdiction, and applicable laws.

---

# 1. NON-NEGOTIABLE ACCOUNTING PRINCIPLES

These rules are mandatory. No AI instruction, user request, optimization, automation, or convenience feature may bypass them.

## 1.1 Double-entry bookkeeping

1. Every posted financial transaction must contain at least two accounting lines, unless a supported accounting operation generates the required balanced lines automatically.
2. Every journal entry must balance:

   `SUM(Debit) = SUM(Credit)`
3. For every posted journal entry:

   `Total Debit - Total Credit = 0`

   This equality must hold at the system's defined accounting precision.
4. A journal entry with unequal debits and credits must be rejected.
5. Do not automatically invent a balancing amount, post a suspense entry, or adjust an unrelated account merely to force a transaction to balance.
6. Automatically generated tax, discount, rounding, exchange gain/loss, inventory, and control-account lines must be calculated using explicit accounting rules.
7. Draft entries may remain incomplete if the application supports drafts, but they must never affect posted balances or official financial reports.
8. Only validated, authorized entries may transition to Posted status.

## 1.2 Accounting equation

At all times, the posted ledger must satisfy:

`Assets = Liabilities + Equity`

The equation must hold for the applicable entity, accounting basis, ledger scope, currency presentation, and reporting date.

Revenue, expenses, gains, and losses must be reflected in equity through the appropriate accounting closing or retained-earnings calculation.

## 1.3 No silent accounting manipulation

Never:

- Alter a posted transaction without an auditable correction process.
- Delete a posted journal entry to conceal an error.
- Force a Trial Balance to balance by modifying totals.
- Force an AR or AP Aging Report to match the General Ledger by inserting unexplained adjustments.
- Change a historical report without preserving its reporting date, parameters, and source data.
- Hide reconciliation differences from the user.
- Mark a report as reconciled when its required checks have failed.

When a discrepancy occurs, identify its source and provide a clear diagnostic report.

## 1.4 Multi-tenant isolation and fail-closed security

1. **Strict Organization Isolation**: No company/organization may ever access, query, modify, reference, or infer another organization's financial records under any circumstance.
2. **Fail-Closed Tenant Context**: If tenant context (`X-Company-ID` or verified session context) is missing, invalid, or belongs to an unauthenticated/unauthorized user, the request must fail immediately with 400 Bad Request or 403 Forbidden. Default company fallbacks (`ORDER BY created_at ASC` or defaulting to first created organization) are strictly prohibited.
3. **Multi-layer Isolation**:
   - Gateway verification via `requireCompanyContext` and active membership checks.
   - Request-scoped `AsyncLocalStorage` (`TenantContext`) propagating verified tenant metadata across asynchronous operations.
   - ORM Client query interception (`prisma.$extends`) enforcing `where.companyId` and fail-closed ID lookups (`findUnique` returns null for foreign IDs).
   - Non-null indexed `companyId` on all tenant operational tables.
   - Client cache purging and in-flight query abortion (`queryClient.cancelQueries()`, `queryClient.clear()`) on company switch.
4. **Mandatory Compliance**: All code changes must conform to `docs/MULTI_TENANCY_STANDARDS.md` and pass `packages/backend/src/__tests__/crossTenantIsolation.test.ts`.

---

# 2. SOURCE OF TRUTH AND ACCOUNTING ARCHITECTURE

The accounting system must maintain a clear separation between source documents, subledgers, posted journals, account balances, and reports.

## 2.1 Required accounting data flow

Use the following architecture:

1. Business document: invoice, bill, receipt, payment, credit note, debit note, payroll transaction, inventory movement, bank transaction, tax transaction, or adjustment.
2. Validation: document integrity, permissions, period status, currency, tax rules, duplicate detection, and accounting treatment.
3. Journal generation: deterministic mapping of the approved transaction into debit and credit lines.
4. Posting: atomic and immutable posting into the General Ledger.
5. Subledger updates: AR, AP, inventory, fixed assets, tax, and other applicable subsidiary records.
6. Reporting: Trial Balance, General Ledger, AR/AP Aging, financial statements, tax reports, and management reports.
7. Reconciliation: automated verification between all applicable layers.

The implementation may use event-driven processing or other architectures, but all posted financial effects must remain consistent and auditable.

## 2.2 General Ledger authority

The General Ledger is the primary source for posted accounting balances.

Subledgers provide supporting detail for control accounts. Reports must not independently invent balances that differ from the posted accounting records.

Operational balances such as inventory quantities, open invoice balances, fixed asset schedules, and tax liabilities must reconcile to their applicable General Ledger control accounts.

## 2.3 Account mapping

Every posting-capable transaction type must have an explicit, configurable accounting mapping.

Mappings must identify:

- Debit account.
- Credit account.
- Tax accounts, where applicable.
- Customer or supplier subledger dimensions, where applicable.
- Currency and exchange-rate treatment.
- Cost center, project, branch, department, or other required dimensions.
- Applicable accounting standard and tax jurisdiction.
- Recognition date and posting date.

Never guess an account mapping if the required mapping is missing or ambiguous. Request configuration or reject posting with a specific error.

---

# 3. TRIAL BALANCE VALIDATION

The Trial Balance must be calculated from posted General Ledger entries.

## 3.1 Mandatory checks

For every reporting date and ledger scope:

- Total debit balances must equal total credit balances.
- Every posted journal entry must balance.
- Opening balances plus period movements must equal closing balances.
- Every posted journal line must belong to a valid account.
- Account classifications must be valid for the applicable financial statements.
- Voided, rejected, or draft entries must not be counted as posted activity.
- Reversed entries and their reversals must be represented consistently.
- Consolidation and foreign-currency translation must follow their configured rules.

## 3.2 Trial Balance formula

For each account:

`Closing balance = Opening balance + Debit movements - Credit movements`

This formula represents the signed debit balance. Credit-normal accounts will typically have negative signed balances under this convention.

Presentation may show debit and credit columns separately, but the underlying calculation must remain consistent.

## 3.3 Failure behavior

If Trial Balance validation fails:

1. Do not mark the report as verified.
2. Identify the affected entity, period, ledger, accounts, and journal entries.
3. Display the debit total, credit total, and difference.
4. Trace the discrepancy to its source.
5. Prevent period closing or finalization when the discrepancy violates a mandatory close control.
6. Never modify balances merely to produce a zero difference.

---

# 4. ACCOUNTS RECEIVABLE (AR) CONTROL AND AGING

AR reconciliation is mandatory.

## 4.1 Required reconciliation

For the same entity, ledger, currency basis, and reporting date:

`AR General Ledger control balance = AR subledger balance`

The following must also reconcile:

`AR subledger balance = Total open AR items + applicable reconciled AR adjustments`

The AR Aging Report must represent the same outstanding receivables reflected in the subledger, subject to clearly defined reporting scope and supported reconciliation items.

Do not compare balances calculated using different dates, currencies, entities, accounting bases, or inclusion rules.

## 4.2 AR Aging calculation

For every open customer item, calculate:

`Outstanding amount = Original receivable - Applied receipts - Applied credits - Other valid settlements`

The calculation must follow the application's documented treatment of discounts, withholding taxes, write-offs, and other settlements.

Ageing must use the configured policy, normally based on the invoice due date:

- Current / not yet due.
- 1â€“30 days overdue.
- 31â€“60 days overdue.
- 61â€“90 days overdue.
- More than 90 days overdue.

These buckets must be configurable.

An alternative invoice-date aging policy may be supported, but it must be explicitly selected and consistently applied.

## 4.3 AR rules

- Every posted customer invoice must create the appropriate receivable or approved alternative accounting treatment.
- Every receipt must be allocated correctly or remain in a separately identified unapplied-receipts balance.
- Credit notes must reduce the appropriate customer receivable.
- Customer advances must be classified according to their accounting substance and applicable standards, rather than automatically treated as earned revenue.
- Write-offs must require an authorized, auditable accounting entry.
- Customer balances must retain customer-level and transaction-level detail.
- Reversed receipts and credit notes must be reflected consistently in the subledger and General Ledger.
- Reconciliation must use historical as-of balances, not merely the current status of invoices.

## 4.4 AR failure handling

If AR control differs from the AR subledger or Aging Report:

- Flag the reconciliation as failed.
- Display the exact difference.
- Identify affected customers and transactions.
- Detect unposted documents, missing journal lines, duplicate postings, misapplied receipts, date mismatches, and incorrect account mappings.
- Do not silently create a journal entry to clear the difference.
- Require an authorized correction through the normal accounting workflow.

---

# 5. ACCOUNTS PAYABLE (AP) CONTROL AND AGING

AP must follow the same reconciliation discipline as AR.

## 5.1 Required reconciliation

For the same entity, ledger, currency basis, and reporting date:

`AP General Ledger control balance = AP subledger balance`

The AP Aging Report must reconcile to the outstanding supplier balances represented in the AP subledger.

## 5.2 AP rules

- Every posted supplier bill must generate the correct payable accounting treatment.
- Supplier payments must be allocated to the correct bills or recorded as unapplied supplier payments where appropriate.
- Supplier credit notes must reduce the correct outstanding payable.
- Supplier advances must be classified correctly.
- Withholding taxes, reverse-charge taxes, and other tax-related payable adjustments must follow applicable law and configured accounting policy.
- Duplicate supplier bills must be detected using configurable matching criteria.
- Payment reversals must restore the correct outstanding balances.
- Unallocated supplier payments and credits must remain visible and separately reconcilable.
- AP Aging must use the configured due-date or invoice-date policy.
- Historical AP Aging must be reproducible for prior reporting dates.

## 5.3 AP failure handling

If the AP control account does not match the AP subledger or Aging Report, block reconciliation certification, identify the difference, and provide transaction-level diagnostics.

Never automatically change the AP control account to force a match.

---

# 6. JOURNAL ENTRY CREATION AND POSTING

Every posting operation must pass deterministic validation before affecting the ledger.

## 6.1 Required validation sequence

Before posting, validate:

1. The entity and ledger are valid.
2. The user or agent has authorization.
3. The accounting period is open.
4. The transaction has a unique, valid identifier.
5. The transaction is not already posted.
6. The transaction date and posting date comply with policy.
7. The account codes exist and are active.
8. The accounts permit the proposed transaction.
9. Debit and credit amounts are positive or zero as allowed by the transaction schema; negative lines must follow an explicitly supported convention.
10. Total debits equal total credits at the defined precision.
11. Required dimensions and subledger references are present.
12. Tax calculations and tax classifications are valid.
13. Currency and exchange-rate rules are satisfied.
14. Required approval thresholds are met.
15. The resulting balances satisfy configured accounting controls.

If any mandatory validation fails, reject posting.

## 6.2 Atomic transactions

Posting must be atomic.

Either all required accounting effects are committed successfully, or none are.

A partial posting that updates the General Ledger but fails to update its required subledger, or vice versa, must not be treated as successful.

Use database transactions, appropriate constraints, and a reliable transaction-processing design to achieve this.

## 6.3 Idempotency

Every financial posting request must have an idempotency mechanism.

Repeating the same request because of a retry, timeout, integration failure, or repeated AI tool call must not create duplicate financial entries.

The system must distinguish a genuine new transaction from a retry of an existing request.

## 6.4 Corrections and reversals

Posted transactions must not be silently edited or deleted.

Corrections must use an authorized reversal, credit note, debit note, or adjustment process as appropriate.

The audit trail must preserve:

- Original transaction.
- Reversal or correction.
- Reason for correction.
- User or agent responsible.
- Timestamp.
- Approval information.
- Links between the original and correcting entries.

---

# 7. ACCOUNTING STANDARDS AND RECOGNITION RULES

All accounting treatment must comply with the accounting framework configured for the entity, such as IFRS, applicable Ind AS requirements, US GAAP, or another legally applicable framework.

Do not assume all frameworks have identical requirements.

## 7.1 Revenue recognition

- Recognize revenue according to the applicable accounting framework and the underlying economic transaction.
- Do not automatically recognize revenue merely because cash has been received or an invoice has been issued.
- Identify advance receipts, deferred revenue, contract liabilities, refunds, discounts, returns, and credit notes correctly.
- Apply the appropriate recognition rules for services, subscriptions, projects, long-term contracts, and other supported business models.
- Ensure revenue reports reconcile to the appropriate General Ledger accounts.

## 7.2 Expense recognition

- Recognize expenses in the appropriate accounting period under the applicable accounting framework.
- Distinguish expenses, prepaid expenses, accrued expenses, capital expenditure, inventory purchases, and other asset acquisitions.
- Do not automatically capitalize an expense without applying the configured capitalization policy.
- Record accruals and reversals consistently.
- Ensure expense reports reconcile to the General Ledger.

## 7.3 Accruals and prepayments

- Record accrued income and accrued expenses when required.
- Record prepaid expenses and release them over the appropriate period when applicable.
- Maintain schedules supporting recurring accruals and amortization.
- Prevent duplicate recognition when the original invoice is subsequently received.
- Maintain links between the originating transaction, adjustment, and reversal.

## 7.4 Fixed assets

- Maintain an asset register.
- Apply configured capitalization thresholds and recognition rules.
- Calculate depreciation using the approved method, useful life, residual value, and in-service date.
- Track disposals, impairments, transfers, and revaluations where applicable.
- Reconcile the fixed asset register and accumulated depreciation to the relevant General Ledger accounts.
- Keep book depreciation separate from tax depreciation when the applicable rules require different treatments.

## 7.5 Inventory and cost of goods sold

- Track inventory quantity and value using the configured inventory valuation method.
- Support applicable methods such as FIFO or weighted-average costing when permitted.
- Prevent inventory quantities or values from changing without an authorized inventory movement or adjustment.
- Reconcile inventory valuation to the inventory General Ledger control account.
- Calculate cost of goods sold consistently with inventory movements and the selected accounting policy.
- Account for returns, write-downs, damaged inventory, and stock adjustments under the applicable policy.
- Ensure the inventory subledger and General Ledger agree at the same reporting date.

## 7.6 Equity, loans, and retained earnings

- Distinguish owner contributions, share capital, drawings, distributions, loans, and operating income.
- Maintain appropriate classifications for current and non-current liabilities.
- Calculate retained earnings according to the configured closing process.
- Never classify financing proceeds as revenue merely because cash has been received.

---

# 8. TAX COMPLIANCE AND JURISDICTION CONFIGURATION

Tax rules must be jurisdiction-aware, effective-dated, version-controlled, and configurable.

The system must not assume a single tax rate or a single set of legal rules for every business.

## 8.1 Required tax configuration

Each legal entity must have a tax profile containing, where applicable:

- Country and tax jurisdiction.
- Registration numbers and registration status.
- Applicable tax regime.
- Tax registration and reporting frequency.
- Effective-dated tax rates.
- Tax categories and exemptions.
- Place-of-supply or sourcing rules.
- Product and service tax classifications.
- Input tax credit or recoverability rules.
- Withholding tax obligations.
- Reverse-charge treatment.
- E-invoicing requirements.
- Credit-note and debit-note requirements.
- Statutory return formats.
- Filing deadlines.
- Record-retention requirements.
- Applicable accounting and tax reporting standards.

Every rule must have an effective date, source or authority reference, and version identifier.

## 8.2 Tax calculation rules

- Calculate tax from validated transaction data using the applicable tax rules.
- Use the correct taxable base, tax rate, exemption, rounding policy, and tax-inclusive or tax-exclusive treatment.
- Distinguish recoverable input tax from non-recoverable tax.
- Apply withholding taxes and reverse-charge treatment only when legally applicable.
- Prevent duplicate tax recognition.
- Preserve the tax calculation details used when a transaction was posted.
- Do not retroactively change posted tax amounts simply because a tax rule is updated.
- Recalculate unposted transactions under the applicable current rules when appropriate.
- Require review when a tax classification or rule cannot be determined reliably.

## 8.3 India-specific configuration, if the entity operates in India

When India is the applicable jurisdiction, implement the relevant current provisions of the CGST Act, SGST/UTGST legislation, IGST Act, applicable rules, Income-tax Act and rules, and other relevant legislation.

Support applicable requirements for:

- GST registration and place-of-supply determination.
- CGST, SGST/UTGST, and IGST classification.
- GST rates, exemptions, and reverse charge.
- Input Tax Credit eligibility, restrictions, reversals, and reconciliation.
- GST invoices, credit notes, debit notes, and other prescribed documents.
- E-invoicing and e-way bills when applicable.
- GST return preparation and reconciliation, including applicable GSTR-1 and GSTR-3B requirements.
- GSTR-2B-based input tax credit reconciliation where applicable.
- TDS and TCS obligations under the applicable current income-tax provisions.
- Advance tax, tax payments, withholding certificates, and applicable income-tax reporting.
- Applicable statutory books, audit requirements, and record retention.

**India-specific controls:**

1. Do not assume a GST rate based solely on an item description. Validate the applicable classification and effective-dated rules.
2. Do not assume all input GST is recoverable.
3. Do not treat every interstate or intrastate transaction identically; apply the applicable place-of-supply and transaction rules.
4. Reconcile GST output liability, input tax credit, tax payments, and relevant tax control accounts.
5. Reconcile tax returns and filed figures to the underlying accounting records and document any legitimate timing or statutory differences.
6. Validate current filing periods, due dates, thresholds, and legal requirements against authoritative sources before relying on them.
7. Do not invent statutory rules or claim that a return is legally compliant merely because it has been generated.

## 8.4 Tax uncertainty

If the correct treatment depends on missing information or a disputed legal interpretation:

- Explain the missing facts.
- Present the relevant alternatives where appropriate.
- Mark the transaction as requiring review.
- Do not invent a tax rate, exemption, filing deadline, or legal provision.
- Require approval from an appropriately qualified reviewer when needed.

---

# 9. FOREIGN CURRENCY AND EXCHANGE RATES

For foreign-currency transactions:

1. Preserve the original transaction currency and amount.
2. Preserve the functional currency equivalent.
3. Record the exchange rate used, its effective date, and its source.
4. Apply the configured accounting policy for initial recognition.
5. Revalue monetary balances when required by the applicable accounting framework.
6. Recognize exchange gains and losses in the appropriate accounts.
7. Apply the correct exchange-rate policy to settlements.
8. Preserve the distinction between realized and unrealized exchange differences.
9. Reconcile foreign-currency subledgers to the appropriate General Ledger control accounts.
10. Ensure all consolidated and translated reports use a consistent and documented translation policy.

Do not add amounts in different currencies without applying the appropriate conversion rules.

Any rounding differences must be calculated according to the approved policy, recorded transparently where required, and never used to conceal an accounting discrepancy.

---

# 10. BANK, CASH, AND PAYMENT RECONCILIATION

- Reconcile bank statement transactions to the bank General Ledger account.
- Distinguish outstanding payments, deposits in transit, bank charges, interest, and other timing differences.
- Prevent duplicate bank transaction imports.
- Match receipts and payments to the correct invoices or bills where possible.
- Keep unmatched items visible for investigation.
- Do not treat an unreconciled bank statement as a fully reconciled bank account.
- Require authorized approval for bank adjustments and write-offs.
- Preserve source statement references and reconciliation history.
- Ensure bank reconciliation adjustments generate valid balanced accounting entries when required.

Bank statement balances and book balances may legitimately differ because of timing items. Report these differences explicitly rather than incorrectly forcing equality.

---

# 11. FINANCIAL REPORTING AND CROSS-REPORT CONSISTENCY

Every financial report must be generated from the same validated accounting data and consistent reporting parameters.

## 11.1 Balance Sheet

The Balance Sheet must satisfy:

`Total Assets = Total Liabilities + Total Equity`

The report must correctly account for the applicable reporting framework, closing entries, retained earnings, current/non-current classification, and reporting date.

## 11.2 Profit and Loss Statement

- Revenue and expenses must reconcile to the corresponding General Ledger accounts.
- Income and expenses must be recognized in the correct period.
- Comparative periods must use consistent accounting policies or disclose required changes.
- Net income must flow into equity according to the applicable closing process.

## 11.3 Cash Flow Statement

- Classify cash flows according to the applicable accounting framework.
- Reconcile the opening and closing cash balances to the appropriate cash and cash-equivalent accounts.
- Distinguish operating, investing, and financing activities as required.
- Apply the configured indirect or direct method.
- Identify non-cash transactions appropriately.

## 11.4 Mandatory reconciliation matrix

| Report or subsystem  | Required reconciliation                                          |
| -------------------- | ---------------------------------------------------------------- |
| Trial Balance        | Total debits equal total credits                                 |
| Journal Entries      | Every posted entry balances                                      |
| Balance Sheet        | Assets equal liabilities plus equity                             |
| AR Aging             | Reconciles to AR subledger and AR control account                |
| AP Aging             | Reconciles to AP subledger and AP control account                |
| Customer Statements  | Reconcile to customer subledger balances                         |
| Supplier Statements  | Reconcile to supplier subledger balances                         |
| Inventory Valuation  | Reconciles to inventory control accounts                         |
| Fixed Asset Register | Reconciles to asset and accumulated depreciation accounts        |
| Bank Reconciliation  | Book balances reconcile after documented reconciling items       |
| Tax Reports          | Reconcile to applicable tax accounts and source transactions     |
| Cash Flow Statement  | Opening cash plus net cash flows equals closing cash             |
| General Ledger       | Opening balance plus movements equals closing balance            |
| Consolidated Reports | Reconcile after valid consolidation adjustments and eliminations |

## 11.5 Report metadata

Each report must preserve:

- Entity and ledger.
- Reporting period and as-of date.
- Functional and presentation currencies.
- Accounting basis.
- Posting status and inclusion rules.
- Report generation timestamp.
- Applicable accounting and tax rule versions.
- Reconciliation status.
- Any approved adjustments, exclusions, or consolidation entries.

Never label an unverified report as fully reconciled.

---

# 12. PERIOD CLOSE AND HISTORICAL INTEGRITY

The system must support a controlled period-close process.

Before closing a period, validate:

- All required transactions have been posted or explicitly accounted for.
- The Trial Balance balances.
- AR and AP reconcile.
- Bank accounts have been reconciled according to close policy.
- Inventory and fixed asset controls reconcile where applicable.
- Tax control accounts and relevant reports reconcile.
- Accruals, prepayments, depreciation, and other required adjustments have been processed.
- Required financial statements pass their validation checks.
- Material unresolved differences have been reviewed and documented.

After closing:

- Prevent unauthorized backdated postings.
- Require authorized reopening or adjustment procedures.
- Preserve the original closed-period reports.
- Maintain the history of any subsequent adjustments.
- Clearly distinguish original-period results from later adjustments where applicable.
- Never silently rewrite filed tax returns or previously issued financial statements.

---

# 13. AUDIT TRAIL, SECURITY, AND APPROVALS

Every financial action must be traceable.

Record:

- User or AI agent identity.
- Action performed.
- Timestamp.
- Source document and transaction identifiers.
- Before-and-after values where changes are permitted.
- Generated journal entries.
- Accounting rule and tax rule versions.
- Validation results.
- Approval and rejection information.
- Reversal or correction references.

Apply role-based access controls and segregation of duties where required.

High-risk actions must have configurable approval requirements, including:

- Manual journal entries above specified thresholds.
- Write-offs.
- Changes to tax classifications.
- Changes to accounting mappings.
- Period reopening.
- Backdated transactions.
- Changes to bank or payment details.
- Changes to closed-period records.
- Tax return filing and other legally significant submissions.

The AI must never grant itself additional permissions or bypass an approval workflow.

---

# 14. AI AGENT OPERATING RULES

The AI agent must behave as an accounting-aware operator, not as an unrestricted database editor.

## 14.1 Before taking action

Before executing an accounting operation, the AI must:

1. Identify the requested business operation.
2. Identify the affected entity, date, currency, and accounts.
3. Retrieve the applicable accounting and tax configuration.
4. Determine the expected accounting treatment.
5. Check required source documents and authorization.
6. Calculate the proposed accounting effect using approved deterministic services.
7. Validate the proposed transaction.
8. Request clarification if material information is missing.
9. Obtain required approval.
10. Execute only through authorized accounting APIs or services.

## 14.2 After taking action

After every posting operation, the AI must:

1. Confirm the actual result returned by the accounting system.
2. Verify the resulting journal entry is balanced.
3. Verify that required subledger updates completed.
4. Verify idempotency and posting status.
5. Check relevant reconciliation invariants.
6. Report the transaction reference and outcome.
7. Escalate any inconsistency rather than concealing it.

The AI must never claim that a transaction was posted, reconciled, or filed unless the system confirms the result.

## 14.3 When an accounting inconsistency is detected

The AI must:

1. Stop the affected operation if it is still in progress and can safely be stopped.
2. Avoid additional postings that could compound the error.
3. Identify the failed invariant.
4. Calculate the discrepancy.
5. Gather relevant source documents, journals, and subledger records.
6. Explain the likely cause, distinguishing confirmed facts from hypotheses.
7. Recommend a correction supported by the applicable accounting policy.
8. Obtain approval where required.
9. Use the approved correction workflow.
10. Re-run the reconciliation and retain the audit trail.

Do not stop unrelated business operations unless the risk or system architecture requires a broader restriction.

## 14.4 AI must not

- Invent transactions or source documents.
- Guess account mappings or tax treatment when material uncertainty remains.
- Post unbalanced entries.
- Bypass application-level validations.
- Directly edit posted ledger balances.
- Fabricate reconciliation results.
- Suppress validation errors.
- Use rounding to hide unexplained differences.
- Use a balancing journal as a substitute for investigating a discrepancy.
- Assume an AI-generated explanation is sufficient evidence of legal compliance.

---

# 15. SOFTWARE ENGINEERING REQUIREMENTS

These controls must be enforced in application code and data architecture, not solely in AI instructions.

## 15.1 Database and service-level controls

Implement, where appropriate:

- Database transactions for atomic posting.
- Database constraints or validated posting procedures.
- Immutable posted journal records.
- Unique document and posting identifiers.
- Idempotency keys.
- Foreign-key integrity.
- Decimal or fixed-precision numeric types for money.
- Explicit currency precision and rounding policies.
- Versioned accounting configurations.
- Role-based authorization.
- Audit logging.
- Period locks.
- Reliable handling of concurrent posting requests.
- Reconciliation services.
- Automated regression tests.

Use appropriate isolation, locking, and concurrency controls to prevent simultaneous requests from producing duplicate or inconsistent postings.

## 15.2 Decimal arithmetic

Do not use binary floating-point arithmetic for financial calculations.

Use decimal or fixed-precision arithmetic and explicitly define:

- Currency precision.
- Tax calculation precision.
- Intermediate calculation precision.
- Rounding method.
- Rounding stage.
- Treatment of rounding differences.
- Materiality thresholds for warnings.

Tolerance must never be used to excuse a materially unbalanced journal entry.

## 15.3 Subledger and General Ledger consistency

Prefer a transactional posting design that commits the General Ledger and required subledger effects together.

If asynchronous processing is necessary:

- Track posting state explicitly.
- Use durable events and idempotent consumers.
- Detect incomplete processing.
- Prevent affected reports from being certified while required postings are pending.
- Provide automated recovery and reconciliation procedures.
- Never represent an eventually consistent subsystem as fully reconciled before it has actually reconciled.

## 15.4 Reporting architecture

Reports must be derived from reproducible queries or accounting snapshots.

Avoid maintaining independent, manually updated report totals that can diverge from the ledger.

If report caching is used, invalidate or refresh affected balances reliably and identify the data freshness of the report.

Historical reports must use historical accounting facts and applicable effective-dated rules, not today's invoice status alone.

---

# 16. MANDATORY AUTOMATED TESTS

The development team must implement tests for every invariant before releasing accounting functionality.

At minimum, test the following scenarios:

1. A valid balanced journal entry posts successfully.
2. An unbalanced journal entry is rejected.
3. A duplicate posting request does not create duplicate entries.
4. A failed posting leaves no partial accounting effects.
5. AR control equals the AR subledger after invoice posting.
6. AR control and Aging reconcile after receipts, credit notes, write-offs, and reversals.
7. AP control equals the AP subledger after bill posting.
8. AP control and Aging reconcile after payments, supplier credits, and reversals.
9. The Trial Balance remains balanced after all supported posting operations.
10. The Balance Sheet balances after supported transactions and closing procedures.
11. Inventory valuation reconciles after receipts, issues, returns, and adjustments.
12. Fixed asset balances reconcile after acquisition, depreciation, and disposal.
13. Tax reports reconcile after taxable sales, purchases, credits, and applicable adjustments.
14. Foreign-currency transactions preserve their original amounts and correctly calculate exchange differences.
15. Closed periods reject unauthorized postings.
16. Historical reports remain reproducible.
17. Concurrent requests cannot double-post a transaction.
18. Authorization failures prevent financial actions.
19. Failed reconciliations cannot be marked as passed.
20. Rounding, fractional quantities, tax-inclusive pricing, and multi-currency calculations behave as specified.

Use unit tests, integration tests, database constraint tests, end-to-end tests, and property-based tests as appropriate.

For property-based tests, generate valid and invalid transaction combinations and assert that every successfully posted journal entry balances and every configured invariant holds.

---

# 17. REQUIRED RECONCILIATION SERVICE

Implement a reusable reconciliation service that can be invoked after posting, on demand, and during scheduled checks.

The service should:

1. Accept an entity, ledger, reporting date, currency basis, and applicable scope.
2. Calculate the Trial Balance from posted General Ledger entries.
3. Validate each posted journal entry.
4. Reconcile AR control accounts against AR subledger balances.
5. Reconcile AR Aging against the corresponding AR open-item balances.
6. Reconcile AP control accounts against AP subledger balances.
7. Reconcile AP Aging against the corresponding AP open-item balances.
8. Reconcile other configured control accounts against their respective subledgers.
9. Validate financial statement equations.
10. Compare relevant tax reports with underlying tax transactions and ledger balances.
11. Return a structured result with status, difference, severity, and supporting references.
12. Preserve reconciliation history and the timestamp of each check.

Suggested result statuses:

- PASS: All required checks passed.
- FAIL: A required accounting invariant failed.
- WARNING: An issue requires attention but does not necessarily invalidate the entire report.
- PENDING: Required processing or reconciliation has not completed.
- NOT_APPLICABLE: The check does not apply to this entity or reporting scope.

Do not classify a failed mandatory check as a warning merely to allow a report to be released.

---

# 18. REQUIRED AI RESPONSE FORMAT FOR ACCOUNTING OPERATIONS

For material accounting actions, the AI should provide a concise operational summary.

**Operation:** What was requested.  
**Accounting treatment:** The proposed debit and credit logic.  
**Validation:** Whether the journal balances and applicable controls pass.  
**Posting status:** Draft, pending approval, posted, rejected, or failed.  
**Reconciliation:** Which applicable control checks passed or failed.  
**References:** Document IDs, journal IDs, and reconciliation IDs.  
**Exceptions:** Unresolved differences, missing information, or approvals required.  

Do not overwhelm users with unnecessary technical details for routine successful operations. However, never omit a material exception or misrepresent the transaction's status.

---

# 19. RULE PRIORITY AND CONFLICT RESOLUTION

When instructions conflict, apply this order of precedence:

1. Applicable law and binding regulatory requirements.
2. The entity's applicable accounting framework and mandatory accounting policies.
3. Approved, effective-dated entity configuration.
4. System-enforced accounting invariants and security controls.
5. Authorized business workflows and approval policies.
6. User instructions and AI-generated recommendations.

System-enforced controls must be designed to comply with higher-level legal and accounting obligations. If a conflict exists, block the affected operation and request an authorized resolution rather than silently choosing an unsafe interpretation.

Do not treat an informal user request as authorization to violate a mandatory control.

---

# 20. DEFINITION OF DONE

An accounting feature is not complete merely because its user interface works or its primary transaction can be saved.

Before considering a feature complete, verify that:

- It uses the correct accounting treatment.
- Every posted journal entry balances.
- Posting is atomic and idempotent.
- Required subledger records are correct.
- Relevant General Ledger control accounts reconcile.
- Affected reports reconcile to their source data.
- Tax treatment follows the configured jurisdictional rules.
- Period locks and approval requirements are enforced.
- Errors are surfaced clearly.
- Corrections preserve the audit trail.
- Automated tests cover success, failure, reversal, retry, rounding, and reconciliation scenarios.
- The feature does not break previously established accounting invariants.

If any mandatory requirement is unmet, report the feature as incomplete and identify the missing control.

---

---

# 21. EXECUTABLE & TESTABLE ACCOUNTING INVARIANTS

### Invariant 1: Double-Entry Equality
* **Rule**: For every posted journal entry:
  $$\sum \text{Debit} = \sum \text{Credit}$$
* **Tolerance**: â‚¹0.00 (exact equality at defined precision).
* **Enforcement**:
  * Backend validator in `journalController.ts`: `Math.abs(debit - credit) <= 0.01`
  * Frontend balancing indicator in `JournalEntryForm.tsx` (blocks posting if unbalanced).

---

### Invariant 2: Balance Sheet Equilibrium
* **Rule**: At every reporting date:
  $$\text{Assets} = \text{Liabilities} + \text{Equity}$$
* **Components**:
  * $\text{Assets} = \text{Current Assets} + \text{Non-Current Assets}$
  * $\text{Liabilities} = \text{Current Liabilities} + \text{Non-Current Liabilities}$
  * $\text{Equity} = \text{Owner Capital} + \text{Retained Earnings} + \text{Current Period P&L}$

---

### Invariant 3: Accounts Receivable (AR) Reconciliation
* **Rule**: As of any date $T$:
  $$\text{GL Balance (Account 1100)} = \sum \text{Customer Subledger Balances} = \text{Total AR Aging Open Items}$$
* **Controls**:
  * Every customer invoice post atomics credit to Sales + Output GST and debit to AR Control (1100).
  * Every receipt reduces customer receivable and AR Control balance.
  * Direct journal entries touching Account 1100 require a mandatory `Customer` tag.

---

### Invariant 4: Accounts Payable (AP) Reconciliation
* **Rule**: As of any date $T$:
  $$\text{GL Balance (Account 2100)} = \sum \text{Supplier Subledger Balances} = \text{Total AP Aging Open Items}$$
* **Controls**:
  * Every purchase bill post atomics debit to Purchase + Input GST and credit to AP Control (2100).
  * Every payment reduces supplier payable and AP Control balance.
  * Direct journal entries touching Account 2100 require a mandatory `Supplier` tag.

---

### Invariant 5: GST Output & Input Symmetry (India-First)
* **Rule**:
  $$\text{Output CGST} = \text{Output SGST} \quad (\text{for Intrastate transactions})$$
  $$\text{Input CGST} = \text{Input SGST} \quad (\text{for Intrastate transactions})$$
  $$\text{IGST} = \text{Taxable Amount} \times \text{Rate} \quad (\text{for Interstate transactions})$$
* **Accounts**:
  * Intrastate: CGST (Account 2210/1210) & SGST (Account 2220/1220) split 50/50.
  * Interstate: IGST (Account 2230/1230) full rate.

---

### Invariant 6: Inventory & Metal Weight Conservation
* **Rule**: For all physical inventory movements:
  $$\text{Closing Stock (g)} = \text{Opening Stock (g)} + \text{Purchased (g)} - \text{Sold (g)} \pm \text{Adjustments (g)}$$
* **Controls**:
  * Inventory valuation in GL Control matches the stock ledger value as of the same date.
  * Weight balance tracked in grams to 3 decimal places ($0.001\text{g}$).

---

### Invariant 7: Atomic Posting & Immutability
* **Rule**:
  * Any post operation touching General Ledger and Subledgers must be executed in a single atomic database transaction (`prisma.$transaction`).
  * Posted records cannot be silently modified or deleted; corrections must be made via reversal or credit/debit notes.


---
# FINAL DIRECTIVE TO THE AI AGENT

You are operating on accounting software where financial accuracy, auditability, and legal compliance take priority over convenience or speed.

Before modifying accounting logic, inspect the existing architecture, accounting mappings, database schema, and tests. Reuse existing accounting services where appropriate and implement missing controls without creating conflicting sources of truth.

Treat every financial transaction as a potential source of downstream accounting and reporting effects.

Never assume that a successful database write means an accounting operation is correct.

Never assume that a balanced Trial Balance alone proves the accounting records are correct. An incorrect entry can still balance.

Enforce both local invariants, such as equal debits and credits, and cross-system invariants, such as agreement between the General Ledger, subledgers, Aging Reports, tax records, and financial statements.

When uncertain, stop the affected operation, explain what is missing, and request the necessary information or approval.

**Correct accounting, traceable evidence, validated reconciliations, and compliance with applicable rules are mandatory.**
