## Pages Found in HTML
- [x] Dashboard (`page-dashboard`) - partial functional prototype with static KPI/cards/charts
- [x] Chart of Accounts (`page-coa`) - partial table + filters UI, static data
- [x] Sales Invoices (`page-invoices`) - partial table + stat pills, static data
- [x] Customers (`page-customers`) - partial table/filter, static data
- [x] Purchase Bills (`page-purchases`) - partial table, static data
- [x] Inventory Dashboard (`page-inventory`) - partial KPIs + chart
- [x] Banking & Reconciliation (`page-banking`) - partial recon layout
- [x] Journal Entry (`page-journal`) - partial form and line rows
- [x] Reports / P&L (`page-reports`) - partial report table
- [x] GST Returns (`page-gst`) - partial return cards + HSN summary
- [x] Karigar Management (`page-karigar`) - partial overview cards
- [x] Metal Rate Master (`page-metalrates`) - partial rate cards + history layout
- [x] Settings (`page-settings`) - partial company/integration form

## Page Coverage Checklist (Spec vs HTML Prototype)
- DONE in HTML prototype: Dashboard, Chart of Accounts, Sales Invoices, Customers, Purchase Bills, Inventory Dashboard, Banking, Journal, P&L report, GST, Karigar, Metal Rates, Settings
- PARTIAL in HTML prototype: Dashboard interactions, COA actions, invoice actions, banking matching workflow, journal posting logic, report drill-downs, GST export flows, settings persistence
- MISSING in HTML prototype: Auth screens, credit/debit notes, ledgers, trial balance, balance sheet, cash flow, ageing pages, detailed customer/supplier pages, full inventory item forms, bank import wizard, payroll, schemes, full report centre, command palette data integration, most advanced forms/modals/workflows

## Design Elements to Preserve
- Colors detected in prototype:
  - `#C9922A`, `#E2BC6D`, `#FDF8EE`, `#1A1D23`, `#F7F5F0`, `#FFFFFF`, `#1E7B5E`, `#C0392B`, `#2563EB`, `#8B8070`, `#EDE8DF`
- Fonts detected:
  - `Cormorant Garamond`, `DM Sans`, `JetBrains Mono`
- Layout patterns:
  - Sidebar width: `260px`
  - Header height: ~`64px`
  - Card visual style: white card + subtle border/shadow + gold top accent
  - Active nav style: left gold border + tinted background
- Custom components worth retaining:
  - Gold ticker strip
  - Notification panel
  - Command search overlay (prototype version)
  - Reconciliation split workspace pattern

## Hardcoded / Placeholder Audit
- Static KPI, transactions, account, invoice, customer, purchase, inventory, bank, report, GST and settings values.
- Inline click handlers (`showPage`, `toggleNotif`, `openSearch`) instead of routed navigation/state.
- Prototype charts built directly with Chart.js script block and hardcoded arrays.
- No API calls for business modules except static UI simulation.
- No validation layer, auth persistence, or backend integration.

## Conversion Mapping (HTML -> React Components)
- `.sidebar` -> `src/components/layout/Sidebar.tsx`
- `.header` -> `src/components/layout/Header.tsx`
- `.search-overlay` -> `src/components/shared/CommandPalette.tsx`
- `.kpi-card` -> `src/components/shared/KPICard.tsx`
- `.table-wrap` tables -> `src/components/shared/DataTable.tsx`
- `.page-header` -> `src/components/shared/PageHeader.tsx`
- Badge/status classes -> `src/components/shared/StatusBadge.tsx`
- Page sections:
  - Dashboard -> `src/pages/dashboard/DashboardPage.tsx`
  - COA -> `src/pages/accounts/AccountsPage.tsx`
  - Invoices -> `src/pages/invoices/InvoiceListPage.tsx`
  - Customers -> `src/pages/customers/CustomerListPage.tsx`
  - Purchase Bills -> `src/pages/bills/BillListPage.tsx`
  - Inventory -> `src/pages/inventory/InventoryDashboardPage.tsx`
  - Banking -> `src/pages/banking/BankAccountsPage.tsx`
  - Journal -> `src/pages/journal/JournalListPage.tsx`
  - Reports -> `src/pages/reports/ProfitLossPage.tsx`
  - GST -> `src/pages/tax/GSTPage.tsx`
  - Settings -> `src/pages/settings/CompanySettingsPage.tsx`

## Conflict Resolution Applied
- Prototype and spec are mostly aligned on colors/fonts.
- Where prototype uses extra tones (`gold-deep`, `charcoal2`, additional accent shades), canonical Section 3 tokens are used as authority in React/Tailwind setup.
- Inline styles from HTML are converted to token-based Tailwind utility classes.

## Prioritized Build Order (Applied)
1. App shell (layout + sidebar + header + routing)
2. Dashboard page and data service wiring
3. Invoice list module scaffolding
4. Customer/Supplier and party modules scaffolding
5. Chart of Accounts module scaffolding
6. Inventory module scaffolding
7. Banking module scaffolding
8. Reports and GST scaffolding
9. Backend API foundation
10. Full module deepening in iterative passes
