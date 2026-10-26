# Master Review & Polish Progress (`REVIEW_PROGRESS.md`)

> **Last Updated:** 2026-10-26 (Phase 0 Baseline Completed)  
> **Active Branch:** `review/audit-and-polish`  
> **Engineering Standards:** Compliant with `PERFORMANCE_STANDARDS.md` and Indian GST Direct-Entry Architecture.

---

## 1. Executive Summary & Review Sequence

This document tracks the end-to-end audit, bug fixes, feature parity extensions, UX polish, and keyboard-first transformation across **all 11 core modules** of HKS Jewellery Accounting ERP.

### Execution Priority Order:
1. **Phase 0:** Complete System Inventory, Module Register & Baseline Assessment *(DONE)*
2. **Module 1:** Posting & Transactions (Sales Invoices, Purchase Bills, Direct Expenses, Customer Receipts, Supplier Payments, Credit/Debit Notes, Manual Journals)
3. **Module 2:** Chart of Accounts, General Ledger & Master Data (Customers, Suppliers, Products & Services, Price Lists, Locations)
4. **Module 3:** Banking & Cash Management (Bank Accounts, Cash Book, Spend/Receive/Transfer, CSV Bank Feeds, Bank Reconciliation, Cheques)
5. **Module 4:** Indian Tax & Compliance (GST Engine, E-Invoice, E-Way Bill, GSTR-1, GSTR-3B, GSTR-2B Reconciler, TDS/TCS, MSME 45-Day Sec 43B(h))
6. **Module 5:** Inventory & Jewellery Domain (Item Master, Karigar Orders, Job Work, Gold/Silver Rates, Stock Ledger, Weight/Purity Adjustments)
7. **Module 6:** Reports & Analytics (Trial Balance, P&L, Balance Sheet, Cash Flow, Day Book, Aged Receivables/Payables, Custom Report Builder)
8. **Module 7:** Dashboard & Command Palette (Executive KPIs, Cash Position, Quick Actions, Global Search, Omnibox)
9. **Module 8:** Central Keyboard Shortcut Engine & Tally-Style Navigation (App-wide registry, `?` cheat-sheet, spreadsheet-like entry)
10. **Module 9:** Design System & UI/UX Polish (Tokens, MoneyInput with Indian numbering, DatePicker shortcuts, WCAG 2.2 AA a11y, Print/PDF templates)
11. **Module 10:** Multi-Entity, Security, Settings & Onboarding (Company Settings, Multi-branch GSTINs, Audit Trail, Lock Dates, Role-based Access)
12. **Module 11:** Cross-Cutting Sweeps, End-to-End QA, Load Testing & Final Sign-Off

---

## 2. Module Register & Status Snapshot

| Module ID | Module Name | Primary Frontend Files | Primary Backend Files | Prisma Models | Status | Test Coverage |
|---|---|---|---|---|:---:|:---:|
| **MOD-01** | Sales Invoices | `InvoiceFormPage.tsx`, `InvoiceListPage.tsx`, `InvoiceViewPage.tsx` | `invoiceController.ts`, `invoiceRoutes.ts` | `Invoice`, `InvoiceItem` | Complete (Direct Entry) | Unit (8 scenarios) |
| **MOD-02** | Purchase Bills | `BillFormPage.tsx`, `BillListPage.tsx`, `BillViewPage.tsx` | `billController.ts`, `billRoutes.ts` | `Bill`, `BillItem` | Complete (Direct Entry) | Unit (8 scenarios) |
| **MOD-03** | Credit / Debit Notes | `CreditNote*.tsx`, `DebitNote*.tsx`, `NotePages.tsx` | `noteRoutes.ts`, `accounting.ts` | `NoteDocument`, `NoteLine` | Partial | Manual QA |
| **MOD-04** | Direct Expenses | `ExpenseFormPage.tsx`, `ExpenseListPage.tsx` | `expenseController.ts`, `expenseRoutes.ts` | `JournalEntry`, `JournalLine` | Complete | Unit (8 scenarios) |
| **MOD-05** | Customer Receipts / Payments | `AdvanceReceiptsPage.tsx`, `RecordPaymentModal.tsx` | `advanceController.ts`, `paymentController.ts` | `Payment`, `DocumentSettlement` | Partial | Manual QA |
| **MOD-06** | Supplier Payments / Advances | `AdvancePaymentsPage.tsx`, `RecordBillPaymentModal.tsx` | `advanceController.ts`, `paymentController.ts` | `Payment`, `DocumentSettlement` | Partial | Manual QA |
| **MOD-07** | Manual Journals | `JournalListPage.tsx`, `JournalEntryForm.tsx` | `journalController.ts`, `journalRoutes.ts` | `JournalEntry`, `JournalLine`, `JournalTemplate` | Complete (Direct Entry) | Unit (8 scenarios) |
| **MOD-08** | Chart of Accounts & GL | `AccountsPage.tsx`, `GeneralLedgerPage.tsx`, `DayBookPage.tsx` | `ledgerController.ts`, `ledgerRoutes.ts` | `Account`, `AccountGroup` | Complete | Manual QA |
| **MOD-09** | Customers Master | `CustomerListPage.tsx`, `CustomerFormPage.tsx`, `CustomerDetailPage.tsx` | `customerController.ts`, `customerRoutes.ts` | `Customer` | Complete | Manual QA |
| **MOD-10** | Suppliers Master | `SupplierListPage.tsx`, `SupplierFormModal.tsx`, `SupplierDetailPage.tsx` | `supplierController.ts`, `supplierRoutes.ts` | `Supplier` | Complete | Manual QA |
| **MOD-11** | Products & Services | `ProductServiceListPage.tsx`, `ProductServiceFormPage.tsx` | `productServicesController.ts` | `ProductService`, `Item` | Complete | Manual QA |
| **MOD-12** | Banking & Cash | `BankAccountsPage.tsx`, `BankTransactionsPage.tsx`, `Spend/Receive/TransferMoneyPage.tsx` | `bankingController.ts`, `bankingRoutes.ts` | `BankAccount`, `BankTransaction` | Complete | Partial |
| **MOD-13** | Bank Reconciliation | `BankReconciliationPage.tsx`, `BankImportPage.tsx` | `bankingController.ts` | `BankReconciliation` | Partial | Needs Refactor |
| **MOD-14** | GST & Compliance | `GSTPage.tsx`, `TaxLedgerPage.tsx`, `HSNMasterPage.tsx`, `GstSettingsTab.tsx` | `taxController.ts`, `gstEngineController.ts` | `HSNMaster`, `Setting` | Complete | Unit (8 scenarios) |
| **MOD-15** | TDS / TCS Engine | `TDSPage.tsx` | `taxController.ts` | `SalaryRecord`, `JournalLine` | Partial | Needs Rules |
| **MOD-16** | Inventory & Stock Ledger | `ItemMasterPage.tsx`, `StockLedgerPage.tsx`, `AdjustmentFormPage.tsx` | `itemController.ts`, `adjustmentController.ts` | `Item`, `StockLedger`, `InventoryAdjustment` | Complete | Manual QA |
| **MOD-17** | Jewellery Domain (Karigar / Job Work) | `KarigarPage.tsx`, `JobWorkPage.tsx`, `MetalRatesPage.tsx` | `karigarController.ts`, `jobWorkRoutes.ts`, `metalRateRoutes.ts` | `Karigar`, `JobWorkOrder`, `MetalRate` | Complete | Manual QA |
| **MOD-18** | Gold Schemes | `SchemeListPage.tsx`, `SchemeMembersPage.tsx` | `schemeRoutes.ts` | `GoldScheme`, `SchemeMember` | Complete | Manual QA |
| **MOD-19** | Financial Reports | `TrialBalancePage.tsx`, `ProfitLossPage.tsx`, `BalanceSheetPage.tsx`, `CashFlowPage.tsx` | `financialController.ts` | Ledger Views | Complete | Manual QA |
| **MOD-20** | Ageing Reports (AR/AP) | `ReceivablesAgeingPage.tsx`, `PayablesAgeingPage.tsx` | `ageingController.ts` | `Invoice`, `Bill`, `Payment` | Complete | Manual QA |
| **MOD-21** | Report Centre & Custom Reports | `ReportCentrePage.tsx`, `ReportViewerPage.tsx` | `financialController.ts` | Report Engine | Complete | Manual QA |
| **MOD-22** | Settings & Multi-Branch IAM | `CompanySettingsPage.tsx`, `TeamSettingsPage.tsx`, `AuditLogPage.tsx` | `companyController.ts`, `settingsCenterController.ts` | `Company`, `Branch`, `AuditLog`, `User` | Complete | Manual QA |
| **MOD-23** | Keyboard Shortcuts Engine | `GlobalShortcuts.tsx`, `CommandPalette.tsx` | N/A (Frontend UX) | N/A | Partial | Needs Central Registry |

---

## 3. Baseline Audit Results (Phase 0)

### 3.1 Code Quality & Type Check
- **`packages/shared`**: 0 errors (100% clean).
- **`packages/backend`**: 22 type errors identified (type mismatches in `financialController.ts`, `ageingController.ts`, `authController.ts`, and `.ts` extension import flags).
- **`packages/frontend`**: 28 type errors across legacy form props (`LinkedSettlementsPanel`, `Input`, `Select`, `BankReconciliationPage`, `SalaryPage`, `LoansAdvancesPage`, `SchemeMembersPage`).
- **Frontend Build**: Vite v5.4 with SWC builds production bundle in **12.3s** (Bundle size: 1.86 MB uncompressed, 458 kB gzip).

### 3.2 Test Suites
- **Backend Node Native Tests (`src/lib/gst/__tests__/gstEngine.node.test.ts`)**: 8/8 tests pass (100% passing, 5.3ms duration).
- **Backend Jest Runner**: Blocked by outdated Babel parser on TypeScript type-only imports (`import { a, type b }`). Needs Jest config update or migration to Vitest.
- **Frontend Vitest**: No test files registered (`vitest run` exited with 1).

### 3.3 Performance & Latency Baselines
- **API Health (`GET /health`)**: 2 ms response time.
- **In-Memory Cache & Context Processing**: Under 10 ms for tenant-scoped authorization.
- **Database Connection**: Configured for Supabase PostgreSQL with local IPv4 pooler/tunnel fallback.

---

## 4. Master Issues Log (Phase 0 Findings)

| Issue ID | Module | Severity | Type | Description | Files | Proposed Fix | Status |
|---|---|:---:|:---:|---|---|---|:---:|
| **ISS-001** | Tooling | High | Build | Jest test runner fails on inline TS type imports | `packages/backend/jest.config.js` | Update transform or migrate tests to Vitest / Node native runner | Open |
| **ISS-002** | Reports | Medium | Type | `ageingController.ts` has duplicate `totalOutstanding` property assignment | `ageingController.ts` | Remove duplicate key and clean return type | Open |
| **ISS-003** | Reports | Medium | Type | `financialController.ts` passes optional `Date` to strict `Date` parameters | `financialController.ts` | Add date fallback / non-null assertion | Open |
| **ISS-004** | UI Forms | Medium | Type | `Input.tsx`, `Select.tsx`, `TextArea.tsx` pass unexpected `id` prop to `ErrorMessage` | `Input.tsx`, `Select.tsx`, `TextArea.tsx` | Update `ErrorMessageProps` or omit `id` | Open |
| **ISS-005** | Shortcuts | High | UX | Shortcuts are hardcoded in `GlobalShortcuts.tsx` without cheat sheet (`?`) or config | `GlobalShortcuts.tsx` | Build centralized `shortcutRegistry` with modal overlay | Open |
| **ISS-006** | Transactions | Medium | UX | Transaction line grids lack spreadsheet-like keyboard navigation (Tab/Enter new row) | `InvoiceFormPage.tsx`, `BillFormPage.tsx` | Add arrow key, Enter-to-add, and duplicate line shortcuts | Open |
| **ISS-007** | GST | Medium | Feature | GSTR-2B purchase reconciler exists in services but needs UI button in `GSTPage.tsx` | `GSTPage.tsx`, `gstr2bReconciler.ts` | Wire upload JSON action to `reconcileGstr2b` | Open |
| **ISS-008** | Numbering | Low | UX | Number formatting in some tables uses standard US commas instead of Indian lakh/crore | `formatters.ts` | Enforce Indian grouping (`12,34,567.00`) app-wide | Open |

---

## 5. Next Immediate Step
Proceed to **Module 1: Posting & Transactions Review & Hardening**:
1. Review Sales Invoices, Purchase Bills, Credit/Debit Notes, and Manual Journals.
2. Resolve all TypeScript errors in controllers.
3. Add spreadsheet-style keyboard shortcuts (`Enter` to add line, `Ctrl+D` duplicate line, `Ctrl+S` save, `Ctrl+Enter` save & new).
4. Run integration regression tests and report per-module findings.
