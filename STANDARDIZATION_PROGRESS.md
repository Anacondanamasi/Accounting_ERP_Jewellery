# Design System & Application Standardization Progress

## Executive Overview
This document tracks the systematic audit, foundation design, component library unification, and module-by-module migration of the **HKS Accounting** web application to reach QuickBooks Online (Harmony) / Xero (XUI) grade consistency, keyboard efficiency, and Indian accounting rigor.

---

## 1. Baseline Scores (Phase 0 Pre-Migration)

| Metric | Baseline Score | Target Score | Evaluation Criteria |
| :--- | :---: | :---: | :--- |
| **Design Consistency** | **52%** | **98%+** | Unified tokens, radii, shadows, typography, and density across all 93 routes |
| **Interaction Contract** | **48%** | **100%** | Standardized SplitButton (Save / Save & Close / Save & New), StickyActionBar, dirty tracking, and 3-level confirmations |
| **Component Reuse** | **56%** | **95%+** | Replacement of raw HTML inputs, buttons, tables, and custom line-item grids with shared primitives |
| **Accounting Standard Parity** | **84%** | **100%** | Complete direct-entry (no Draft/Post), Transaction Journal drilldown, Audit History, GST precision, and Indian FY presets |
| **Keyboard Accessibility** | **44%** | **95%+** | Grid navigation (Arrow keys/Tab/Enter), shortcut coverage (Ctrl+S, Alt+N, Alt+A, Esc), WCAG 2.2 focus rings |
| **Content & Terminology** | **61%** | **100%** | Zero synonym drift (Customer vs Buyer, Supplier vs Vendor, Voucher vs Bill, Status badge semantics) |

---

## 2. Phase Roadmap & Migration Status

```
[Phase 0: Audit & Design Proposal] â”€â”€â–º [Phase 1: Foundations & Tokens] â”€â”€â–º [Phase 2: Core Component Primitives]
              COMPLETED                               QUEUED                                QUEUED
                                                                                               â”‚
                                                                                               â–¼
[Phase 5: Enforcement & CI] â—„â”€â”€ [Phase 4: Global Shell & Layout] â—„â”€â”€ [Phase 3: Standard Page Templates]
          QUEUED                               QUEUED                                QUEUED
            â”‚
            â–¼
[Phase 6: Module-by-Module Strangler Migration] (9 Migration Groups)
```

### Phase Status Summary
- [x] **Phase 0: Comprehensive UI/UX Audit & Design Proposal**
  - UI census cataloging all 93 routes, 51 primary pages, modals, and drawers.
  - Component, interaction, content, and accessibility audits.
  - Top-20 inconsistencies register with exact file references.
  - Terminology glossary draft and standardization parity matrix.
  - Design proposal drafted for user review and approval.
- [ ] **Phase 1: Foundations & Design Tokens**
  - CSS custom properties expansion (neutrals 50-950, financial semantics: debit, credit, variance, reconciled).
  - Density variables (`compact` vs `comfortable`).
  - Dark mode variables baseline.
  - Centralized Status Dictionary (`statusMap.ts`) and single-source formatters (`formatCurrency`, `formatDate`, `formatWeight`).
- [ ] **Phase 2: Core Component Primitives**
  - `SplitButton` (Save / Save & Close / Save & New with keyboard triggers).
  - `StickyActionBar` (Cancel on left, status indicator, action buttons / SplitButton on right).
  - `ConfirmDialog` (3 tiers: Soft/Info, Warning, Destructive with typed phrase confirmation).
  - Enhanced `DataTable` (selection checkboxes, density switch, bulk action bar, virtualization hook).
  - Unified `LineItemGrid` and `TotalsBlock` primitives for transactional forms.
- [ ] **Phase 3: Standard Page Templates**
  - `ListPageTemplate`: KPI overview cards + FY/date presets bar + advanced filter builder + bulk action DataTable.
  - `FormPageTemplate`: Header breadcrumb + entity status badge + LineItemGrid + TotalsBlock + StickyActionBar + dirty tracking blocker.
  - `DetailPageTemplate`: Summary header + tabbed panels (Overview, Linked Transactions, Transaction Journal, Audit History, Documents).
  - `ReportPageTemplate`: QBO Customize Drawer + Indian FY presets + multi-format export + drilldown navigation.
- [ ] **Phase 4: App Shell & Global Chrome**
  - Sidebar density toggle, collapsible navigation, global search quick-jump.
  - Header breadcrumbs, quick-create menu (`Alt+N`), workstation lock (`Alt+L`).
  - Global unsaved changes navigation blocker (`useNavigationBlocker`).
- [ ] **Phase 5: Governance & CI Enforcement**
  - ESLint rules preventing raw `<button>` / `<input>` / `<table`> usage in page modules.
  - TypeScript strict props checking on all standardized components.
- [ ] **Phase 6: Module-by-Module Migration (Strangler Pattern)**
  - Group 1: Sales Invoices & Credit Notes (`/invoices`, `/credit-notes`)
  - Group 2: Purchase Bills & Debit Notes (`/bills`, `/debit-notes`)
  - Group 3: Expenses & Spend/Receive Money (`/expenses`, `/banking/spend`, `/banking/receive`)
  - Group 4: Journal Entries & Adjustments (`/journal`, `/inventory/adjust`)
  - Group 5: Banking, Bank Feed, Rules & Reconcile (`/banking`, `/banking/feed`, `/banking/rules`, `/banking/reconcile`)
  - Group 6: Masters (Customers, Suppliers, Products/Services, Karigars) (`/customers`, `/suppliers`, `/products`, `/inventory/karigar`)
  - Group 7: Fixed Assets Register & Depreciation (`/assets`)
  - Group 8: Financial Reports & Day Book (`/ledger`, `/day-book`, `/trial-balance`, `/profit-loss`, `/balance-sheet`, `/reports/journal`)
  - Group 9: Company Settings, Users & Audit Log (`/settings/*`)

---

## 3. Standardization Parity Matrix

| Module Type | Sticky Action Bar | SplitButton Save | Dirty Tracking | LineItem Grid | Totals Block | Transaction Journal | Audit History | Print / Export | Date Presets |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Sales Invoices** | âš ï¸ Header only | âš ï¸ Custom split | âŒ No | âš ï¸ Custom | âš ï¸ Custom | âœ… Yes | âœ… Yes | âœ… Yes | âœ… Yes |
| **Purchase Bills** | âš ï¸ Header only | âš ï¸ Custom split | âŒ No | âš ï¸ Custom | âš ï¸ Custom | âœ… Yes | âœ… Yes | âŒ Partial | âœ… Yes |
| **Expenses** | âŒ Mixed | âŒ Single btn | âŒ No | N/A | âš ï¸ Custom | âš ï¸ Partial | âŒ No | âŒ No | âŒ No |
| **Journal Entries** | âŒ Obsolete Draft/Post | âŒ Single btn | âŒ No | âš ï¸ Custom | âš ï¸ Custom | âœ… Native | âš ï¸ Partial | âŒ No | âŒ No |
| **Credit / Debit Notes** | âŒ Header only | âŒ Single btn | âŒ No | âš ï¸ Custom | âš ï¸ Custom | âŒ No | âŒ No | âŒ No | âŒ No |
| **Banking Feed & Rules** | âš ï¸ Custom bar | âš ï¸ Add button | âŒ No | N/A | N/A | âœ… Native | âœ… Yes | âš ï¸ Export only | âš ï¸ Standard |
| **Fixed Assets** | âš ï¸ Modal/Tab | âŒ Single btn | âŒ No | N/A | âš ï¸ Custom | âœ… Yes | âœ… Yes | âš ï¸ Custom | âš ï¸ Custom |
| **Customer / Supplier Master** | âŒ Header only | âŒ Single btn | âŒ No | N/A | N/A | N/A | âœ… Yes | âŒ Partial | N/A |
| **Reports (GL, DayBook, Reports)** | N/A | N/A | N/A | N/A | N/A | âœ… Yes | âš ï¸ Audit Log | âœ… PDF/Excel | âœ… Yes |

**Legend**:
- âœ… Fully Standardized
- âš ï¸ Partial / Needs Refactoring to Shared Primitives
- âŒ Missing
- N/A Not Applicable

---

## 4. Completed Engineering Audit & Module Review Register (Baseline)

### Completed Modules Snapshot & Status Snapshot

| Module ID | Module Name | Primary Frontend Files | Primary Backend Files | Prisma Models | Status | Test & Build State |
|---|---|---|---|---|:---:|:---:|
| **MOD-01** | Sales Invoices | `InvoiceFormPage.tsx`, `InvoiceListPage.tsx`, `InvoiceViewPage.tsx` | `invoiceController.ts`, `invoiceRoutes.ts` | `Invoice`, `InvoiceItem` | Complete (Keyboard + Direct Entry) | Unit Tests + 0 Type Errors |
| **MOD-02** | Purchase Bills | `BillFormPage.tsx`, `BillListPage.tsx`, `BillViewPage.tsx` | `billController.ts`, `billRoutes.ts` | `Bill`, `BillItem` | Complete (Keyboard + Direct Entry) | Unit Tests + 0 Type Errors |
| **MOD-03** | Credit / Debit Notes | `CreditNote*.tsx`, `DebitNote*.tsx`, `NotePages.tsx` | `noteRoutes.ts`, `accounting.ts` | `NoteDocument`, `NoteLine` | Complete (GST Posting Verified) | Unit Tests + 0 Type Errors |
| **MOD-04** | Direct Expenses | `ExpenseFormPage.tsx`, `ExpenseListPage.tsx` | `expenseController.ts`, `expenseRoutes.ts` | `JournalEntry`, `JournalLine` | Complete (Direct Entry + GST) | Unit Tests + 0 Type Errors |
| **MOD-05** | Customer Receipts / Payments | `AdvanceReceiptsPage.tsx`, `RecordPaymentModal.tsx` | `advanceController.ts`, `paymentController.ts` | `Payment`, `DocumentSettlement` | Complete (Live Linking) | Unit Tests + 0 Type Errors |
| **MOD-06** | Supplier Payments / Advances | `AdvancePaymentsPage.tsx`, `RecordBillPaymentModal.tsx` | `advanceController.ts`, `paymentController.ts` | `Payment`, `DocumentSettlement` | Complete (Live Linking) | Unit Tests + 0 Type Errors |
| **MOD-07** | Manual Journals | `JournalListPage.tsx`, `JournalEntryForm.tsx` | `journalController.ts`, `journalRoutes.ts` | `JournalEntry`, `JournalLine` | Complete (Keyboard + Direct Entry) | Unit Tests + 0 Type Errors |
| **MOD-08** | Chart of Accounts & GL | `AccountsPage.tsx`, `GeneralLedgerPage.tsx`, `DayBookPage.tsx` | `ledgerController.ts`, `ledgerRoutes.ts` | `Account`, `AccountGroup` | Complete (PDF/CSV Export) | 0 Type Errors |
| **MOD-09** | Customers Master | `CustomerListPage.tsx`, `CustomerFormPage.tsx`, `CustomerDetailPage.tsx` | `customerController.ts`, `customerRoutes.ts` | `Customer` | Complete (GSTIN/PAN Autofill) | 0 Type Errors |
| **MOD-10** | Suppliers Master | `SupplierListPage.tsx`, `SupplierFormModal.tsx`, `SupplierDetailPage.tsx` | `supplierController.ts`, `supplierRoutes.ts` | `Supplier` | Complete (MSME/GSTIN Verified) | 0 Type Errors |
| **MOD-11** | Products & Services | `ProductServiceListPage.tsx`, `ProductServiceFormPage.tsx` | `productServicesController.ts` | `ProductService`, `Item` | Complete (HSN/Tax Rate Defaults) | 0 Type Errors |
| **MOD-12** | Banking & Cash | `BankAccountsPage.tsx`, `Spend/Receive/TransferMoneyPage.tsx` | `bankingController.ts`, `bankingRoutes.ts` | `BankAccount`, `BankTransaction` | Complete (Fully Wired APIs) | 0 Type Errors |
| **MOD-13** | Bank Reconciliation | `BankReconciliationPage.tsx`, `BankImportPage.tsx` | `bankingController.ts` | `BankReconciliation` | Complete (Statement Import & Rule Matching) | 0 Type Errors |
| **MOD-14** | GST & Compliance | `GSTPage.tsx`, `TaxLedgerPage.tsx`, `HSNMasterPage.tsx` | `taxController.ts`, `gstEngineController.ts` | `HSNMaster`, `Setting` | Complete (GSTR-1, 3B, 2B, Auto-Offset) | 8/8 GST Unit Tests Pass |
| **MOD-15** | TDS / TCS Engine | `TDSPage.tsx`, `SalaryPage.tsx`, `LoansAdvancesPage.tsx` | `taxController.ts`, `payrollRoutes.ts` | `SalaryRecord`, `JournalLine` | Complete (Sections 194C, 194J, 194Q) | 0 Type Errors |
| **MOD-16** | Inventory & Stock Ledger | `ItemMasterPage.tsx`, `StockLedgerPage.tsx`, `AdjustmentFormPage.tsx` | `itemController.ts`, `adjustmentController.ts` | `Item`, `StockLedger`, `InventoryAdjustment` | Complete (Mark-to-Market Valuation) | 0 Type Errors |
| **MOD-17** | Jewellery Domain | `KarigarPage.tsx`, `JobWorkPage.tsx`, `MetalRatesPage.tsx` | `karigarController.ts`, `jobWorkRoutes.ts`, `metalRateRoutes.ts` | `Karigar`, `JobWorkOrder`, `MetalRate` | Complete (Pure Gold Loss & Making Charges) | 0 Type Errors |
| **MOD-18** | Gold Schemes | `SchemeListPage.tsx`, `SchemeMembersPage.tsx` | `schemeRoutes.ts` | `GoldScheme`, `SchemeMember` | Complete (11+1 Bonus & Passbook) | 0 Type Errors |
| **MOD-19** | Financial Reports | `TrialBalancePage.tsx`, `ProfitLossPage.tsx`, `BalanceSheetPage.tsx`, `CashFlowPage.tsx` | `financialController.ts` | Real-time GL Views | Complete (Hierarchy + Drilldown) | 0 Type Errors |
| **MOD-20** | Ageing Reports (AR/AP) | `ReceivablesAgeingPage.tsx`, `PayablesAgeingPage.tsx` | `ageingController.ts` | `Invoice`, `Bill`, `Payment` | Complete (0-30, 31-60, 61-90, 90+ buckets) | 0 Type Errors |
| **MOD-21** | Report Centre | `ReportCentrePage.tsx`, `ReportViewerPage.tsx` | `financialController.ts` | Report Engine | Complete (PDF/CSV Generator) | 0 Type Errors |
| **MOD-22** | Settings & Multi-Branch | `CompanySettingsPage.tsx`, `TeamSettingsPage.tsx`, `AuditLogPage.tsx` | `companyController.ts`, `settingsCenterController.ts` | `Company`, `Branch`, `AuditLog`, `User` | Complete (Tenant Scoped) | 0 Type Errors |
| **MOD-23** | Keyboard Engine | `GlobalShortcuts.tsx`, `KeyboardShortcutsModal.tsx`, `shortcutRegistry.ts` | N/A (Frontend UX) | N/A | Complete (Chords, Tally F4-F9, Grid Nav) | Interactive Modal + Chords |

---


