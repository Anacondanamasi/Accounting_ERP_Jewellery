# Advanced Company Settings Center: Functional Mapping

## Scope used for implementation
- Target: Xero-like settings center behavior and breadth (reference functionality only, no branding/UI copy).
- Explicit exclusions applied: `Projects`, `Contacts`.
- Added enterprise-forward scope for US bookkeeping firms: multi-entity, consolidation, inter-company, client portal, e-signature, AI/OCR, bank rules, recurring transactions, workflow builder, custom report builder.

## Coverage model implemented
- Single-record policy modules are stored per company with typed validation.
- Multi-record modules are stored per company with keyed records (create/update/archive).
- Each section has role-aware visibility and manage permissions.
- Every write emits structured audit events with old/new payload snapshots.
- Global search, favorites, and recent modules are supported.

## Section map (implemented)
- General Settings
- Financial Settings
- Tax Settings (multi-rate engine records)
- Invoice Settings
- Credit Note Settings
- Quote Settings
- Purchase Settings
- Chart of Accounts
- Bank Accounts
- Payment Methods
- Currencies
- Exchange Rates
- Tracking Categories
- Custom Fields
- Document Numbering
- Branding Themes
- Email Templates
- Users & Permissions
- Approval Workflows
- Roles & Access Control
- Audit Log policy
- Attachments & Storage
- Integrations
- API & Webhooks
- Import & Export
- Data Migration
- Automation Rules
- Notifications
- Company Documents
- Fiscal Year Settings
- Accounting Lock Dates
- Opening Balances
- Backup & Restore
- Subscription & Billing

## Enterprise-plus map (implemented as modules)
- Multi-Entity Management
- Consolidated Reporting
- Inter-Company Transactions
- Client Portal
- E-Signature Settings
- AI Automation Settings
- OCR Settings
- Bank Rule Engine
- Recurring Transactions
- Workflow Builder
- Custom Report Builder

## Data model strategy
- `settings_center_records`:
  - company-scoped, section-scoped, record-keyed
  - JSON payload, status, ordering, effective dates
  - supports both single-record and multi-record settings modules
- `settings_center_user_meta`:
  - company/user-scoped favorites and recent sections

## API model strategy
- Definition endpoint for role-aware section catalog.
- Section record endpoint for listing records by module.
- Upsert endpoint for single/multi module payload persistence.
- Archive endpoint for multi-record lifecycle.
- Search endpoint for cross-module discoverability.
- Meta endpoint for favorites/recent persistence.

## Validation strategy
- Strict Zod schemas for core accounting-risk modules:
  - General, Financial, Tax, Payment Methods, Currencies, FX, Numbering, Custom Fields, Tracking, Approval Workflows, Attachments, API/Webhooks, Automation, Fiscal/Lock Dates, Opening Balances, Backup, Subscription.
- Generic validated object fallback for extensibility modules.

## Role and permission strategy
- Global codes:
  - `settings.center.view`
  - `settings.center.manage`
- Section codes:
  - `settings.<section>.view`
  - `settings.<section>.manage`
- Owner/Admin override for operational continuity.

## Reference basis used for feature parity design
- Xero settings reference URL (feature intent and workflow shape):  
  [go.xero.com settings](https://go.xero.com/app/!211XX/settings)
- Xero support docs and settings-related help indexes (financial details, defaults, templates, tracking, tax, users, integrations):  
  [Xero Central](https://central.xero.com/)
- QuickBooks Online settings, users, recurring/workflow and tax/admin capability references:  
  [QuickBooks Learn & Support](https://quickbooks.intuit.com/learn-support/)
- NetSuite preferences, accounting period controls, OneWorld/intercompany references:  
  [NetSuite Help / Oracle](https://docs.oracle.com/en/cloud/saas/netsuite/)
- Sage Intacct platform/admin and automation references:  
  [Sage Intacct Help Center](https://www.sage.com/en-us/support/intacct/)
- Microsoft Dynamics 365 Finance setup/workflow/data management references:  
  [Microsoft Learn: Dynamics 365 Finance](https://learn.microsoft.com/en-us/dynamics365/finance/)
- Oracle Fusion Cloud ERP financial setup/workflow references:  
  [Oracle Fusion Cloud ERP Docs](https://docs.oracle.com/en/cloud/saas/financials/)

