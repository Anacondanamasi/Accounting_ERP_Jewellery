# HKS Accounting — Enterprise Modules & Compliance Guide

> **Official System Documentation**  
> **Applicable Standard:** Indian GST/TDS, Companies Act 2013, Income-tax Act 1961, Double-Entry Direct Ledger Posting, QBO/Xero Grade Workflows.  
> **Modules Covered:** Banking & Reconciliation, Bank Rules Engine, Fixed Assets (Dual Books), Transaction Journal & Audit Log, Enterprise Settings Center.

---

## Table of Contents
1. [Chapter 1: Banking & Statement-Based Reconciliation](#chapter-1-banking--statement-based-reconciliation)
2. [Chapter 2: Bank Rules & Intelligent Automation Engine](#chapter-2-bank-rules--intelligent-automation-engine)
3. [Chapter 3: Fixed Assets Management (Companies Act & Income Tax Books)](#chapter-3-fixed-assets-management)
4. [Chapter 4: Transaction Journal & Tamper-Evident Audit Trail](#chapter-4-transaction-journal--tamper-evident-audit-trail)
5. [Chapter 5: Enterprise Settings Center Architecture](#chapter-5-enterprise-settings-center-architecture)

---

# Chapter 1: Banking & Statement-Based Reconciliation

## 1. Architectural Overview

### 1.1 Core Tenets
- **Direct Entry Posting**: No "Draft/Post" intermediate states. In accordance with the single-save pipeline, clicking **"Add"** or **"Match"** on a bank feed line atomically posts the double-entry accounting effect directly to the General Ledger (`JournalEntry` and `JournalLine`) and links accounts in a single database transaction.
- **Universal Import & Adapter Pattern (`BankFeedSource`)**:
  - Statements can be uploaded via styled `.xlsx` or raw `.csv`.
  - Built-in format detectors auto-recognize major Indian bank layouts: **HDFC Bank**, **ICICI Bank**, **State Bank of India (SBI)**, **Axis Bank**, and generic ERP formats.
  - Pluggable design: Live Account Aggregator (AA) or bank API integrations can be plugged directly into the `BankFeedSource` adapter interface without altering downstream UI or posting logic.
- **Cryptographic Deduplication (`dedupe_hash`)**:
  - Overlapping statement uploads (e.g. uploading April 1â€“30 and later April 15â€“May 15) never create duplicate transactions.
  - Each feed line calculates a deterministic SHA-256 hash:
    $$\text{Hash} = \text{SHA256}(\text{account\_id} + \text{txn\_date} + \text{amount\_paise} + \text{normalized\_narration} + \text{occurrence\_index})$$
  - Duplicate lines are skipped idempotently during batch insertion.
- **Multi-Tenant Scoping & Lock Dates**:
  - Every batch, feed line, rule, and reconciliation is strictly scoped by `companyId`.
  - Locked accounting dates are enforced before posting any categorized feed line.

---

## 2. Bank Feed (Bank Transactions)

### 2.1 The 3-State Inbox
Located at `/banking/transactions` (or `/banking/feed`):
1. **For Review (`FOR_REVIEW`)**:
   - Newly imported bank transactions waiting for user action.
   - Shows live confidence badge if auto-match candidate or rule is detected.
   - 1-click **"Add"** button uses intelligent defaults (e.g. 18% GST Bank Charges, Exempt Interest, or Open Invoices).
2. **Categorized (`CATEGORIZED` / `MATCHED` / `TRANSFER`)**:
   - Feed lines that have been processed and posted to the General Ledger.
   - Shows the generated journal reference, payee, and ledger account.
   - Provides an **"Undo"** button that reverses the journal entry and returns the transaction to "For Review".
3. **Excluded (`EXCLUDED`)**:
   - Duplicate or non-business lines excluded from accounting.
   - Provides an **"Undo"** button to restore back to "For Review".

### 2.2 Inline Action Modes
Clicking any line in "For Review" expands the inline drawer with three tabs:
- **Categorize**:
  - **Expense / Payment**: Direct posting to selected GL expense account with optional GST tax rate.
  - **Deposit / Sales**: Direct posting to revenue or income account.
  - **Customer / Supplier Payment**: Records invoice/bill settlement against open party balances.
  - **Split Categorization**: Allows splitting a single bank line across multiple accounts and GST rates.
- **Match**:
  - Intelligent scoring engine scans open unpaid Invoices, open unpaid Bills, and manual Bank Transactions.
  - Scores candidates by:
    - Exact amount match (+55 points)
    - Party name similarity (+25 points)
    - Cheque / Ref / UTR match (+30 points)
    - Proximity to statement date (+15 points)
  - Scores $\ge 90$ qualify for instant 1-click match.
- **Record as Transfer**:
  - Records a contra fund transfer between two bank accounts or between a bank account and Cash in Hand.

---

## 3. Bank Statement Reconciliation (Reconcile)

Located at `/banking/reconcile`:

### 3.1 Step 1: Beginning Balance & Statement Info
- **Account Selector**: Choose between active bank accounts.
- **Beginning Balance**:
  - Read-only; auto-carried over from the `endingBalance` of the previous reconciled statement.
  - If it is the first reconciliation, defaults to the bank account's initial opening balance.
- **Statement Ending Date**: The closing date printed on your physical/PDF bank statement.
- **Statement Ending Balance**: The final net closing balance shown on your statement.

### 3.2 Step 2: The Reconcile Workspace
- **Sticky Summary Header**:
  - **Statement Ending Balance (A)**
  - **Cleared Balance (B)**:
    $$\text{Cleared Balance} = \text{Beginning Balance} + \sum \text{Cleared Deposits} - \sum \text{Cleared Payments}$$
  - **Difference ($A - B$)**:
    - **Difference = â‚¹0.00**: Large Emerald Green badge with checkmark. Ready to finalize!
    - **Difference $\neq$ â‚¹0.00**: Amber badge indicating unreconciled discrepancy.
- **Sub-Tabs**:
  - **All**: View all uncleared book entries up to the statement date.
  - **Payments / Money Out**: Uncleared cheques, bank transfers, and expenses.
  - **Deposits / Money In**: Uncleared customer receipts, NEFT/RTGS credits, and interest.
- **Instant Client-Side Recalculation**: Toggling checkboxes immediately recalculates cleared sums and difference with zero server latency.
- **Save for Later**: Persists the session state and checked items so you can leave and resume anytime.

### 3.3 Step 3: Finalize & Discrepancy Handling
- **When Difference = â‚¹0.00**:
  - Clicking **"Finish now"** locks all cleared journal lines (`reconciliationId` stamped, `clearedAt` timestamped).
  - Transactions become read-only to prevent tampering or silent alteration.
- **When Difference $\neq$ â‚¹0.00**:
  - A confirmation dialog displays:
    1. *Keep Working*: Continue reviewing uncleared items.
    2. *Auto-adjust*: Automatically posts a balancing double-entry journal entry to the **"Reconciliation Discrepancies"** account and finalizes the statement.

### 3.4 History, Reports & Undo
- **Statement Report**: Summary card with Beginning Balance, Cleared Items, Ending Statement Balance, Uncleared Book Items, and Reconciled Book Balance. Printable via **"Print Report"**.
- **Undo Reconciliation**:
  - Strict audit safety: Only the **latest** reconciliation for an account can be undone.
  - Undoing unlocks all journal lines, deletes any auto-generated discrepancy journal, and marks the reconciliation record as `UNDONE`.

---

## 4. Indian Bank Statement Formats Supported

The engine includes built-in parsers for:
1. **HDFC Bank**:
   - Headers: `Date, Narration, Chq/Ref No, Value Dt, Withdrawal Amt, Deposit Amt, Closing Balance`
   - Date formats: `DD/MM/YYYY`, `DD-MM-YYYY`
   - Currency: Lakhs/Crores grouping (`1,25,000.00`)
2. **ICICI Bank**:
   - Headers: `Transaction Date, Value Date, Cheque Number, Transaction Remarks, Debit, Credit, Balance`
3. **State Bank of India (SBI)**:
   - Headers: `Txn Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance`
4. **Generic ERP Import Template**:
   - Multi-sheet Excel (`.xlsx`) generated dynamically with dropdown validations and instructions.
   - CSV format: `Date, Description, Reference, Withdrawal (Debit), Deposit (Credit), Balance`

Sample files for testing are available in `docs/sample_statements/`:
- `hdfc_sample_statement.csv`
- `icici_sample_statement.csv`
- `sbi_sample_statement.csv`
- `bank_import_template_v1.csv`

---

## 5. End-to-End QA Test Matrix

| # | Test Scenario | Expected Result | Verified Status |
|---|---|---|:---:|
| 1 | Download XLSX / CSV Template | File downloads with valid headers and guidance sheet | PASSED |
| 2 | Upload HDFC Sample Statement | 8 lines imported into "For Review", duplicate lines skipped | PASSED |
| 3 | Auto-Deduplication on Re-upload | 0 new lines added, batch report shows "All lines were duplicates" | PASSED |
| 4 | Bank Charges Rule Heuristic | Auto-categorizes to Bank Charges with 18% GST (CGST 9% + SGST 9%) | PASSED |
| 5 | Savings Interest Rule Heuristic | Auto-categorizes to Interest Income with 0% GST (Exempt) | PASSED |
| 6 | 1-Click "Add" Direct Entry | Immediately creates `JournalEntry` and `JournalLine` in database | PASSED |
| 7 | Match open customer invoice | Links invoice, creates customer settlement, clears invoice status | PASSED |
| 8 | Undo categorized line | Deletes journal entry and restores line back to "For Review" | PASSED |
| 9 | Start Reconciliation Session | Loads previous ending balance as beginning balance | PASSED |
| 10 | Reconcile Checklist Toggle | Live difference updates instantly without network latency | PASSED |
| 11 | Finish Reconcile at â‚¹0.00 Diff | Marks items as cleared, locks statement and journal lines | PASSED |
| 12 | Undo Latest Reconciliation | Unlocks journal lines, restores reconciliation to undone | PASSED |


---

# Chapter 2: Bank Rules & Intelligent Automation Engine

## 1. Executive Summary

The **Bank Rules module** brings QuickBooks Online (QBO) Advanced rule automation to Indian banking, specifically tailored for jewellery retail and wholesale operations.

Bank Rules automate the categorization, tax posting, party assignment, and auto-confirmation of statement lines imported into the **Bank Feed**, eliminating repetitive manual bookkeeping while enforcing **strict double-entry and GST accounting safety**.

```
[Imported Bank Line / Feed]
           â”‚
           â–¼
[Indian Narration Normalizer]  â”€â”€â–º Extracts: UPI VPA, NEFT UTR, IMPS Ref, Card Merchant, Channel
           â”‚
           â–¼
[Bank Rules Engine (Multi-condition Evaluator)]
           â”œâ”€â”€ Conditions: Description vs Bank Text, Amount, Channel, Day of Month, Account
           â”œâ”€â”€ Action: Expense, Deposit, Transfer, Customer/Vendor Payment, Exclude
           â”œâ”€â”€ Splits: Fixed Amount or Percentage (Paise accurate, remainder line)
           â”‚
           â”œâ”€â”€ Mode A: Suggest Only â”€â”€â–º Surfaced in Feed for 1-click Add
           â”‚
           â””â”€â”€ Mode B: Auto-Add (Direct Entry)
                    â”‚
                    â”œâ”€â”€ Guard: Amount <= maxAutoAmount ceiling?
                    â”œâ”€â”€ Guard: Accounting period not locked?
                    â”œâ”€â”€ Guard: Non-duplicate posting?
                    â”‚
                    â”œâ”€â”€ PASS â”€â”€â–º Post via Single Save Pipeline (BankFeedPostingService)
                    â””â”€â”€ FAIL â”€â”€â–º Degrade safely to Suggest Only (No ledger mutation)
```

---

## 2. Description vs. Bank Text: Practical Examples

In Indian banking statements, raw narrations contain cryptic prefixes, clearinghouse codes, and reference numbers. The engine differentiates between **Description** (normalized, cleansed counterparty text) and **Bank Text** (the raw unedited statement string).

| Channel | Raw Bank Text (Statement) | Normalized Description | Extracted Channel | Extracted Ref / Counterparty |
| :--- | :--- | :--- | :--- | :--- |
| **UPI** | `UPI/412389102938/CR/PARTH GEMS/SBIN0001234/bullion` | `PARTH GEMS` | `UPI` | UTR: `412389102938`, VPA: `parthgems@okhdfcbank` |
| **NEFT** | `NEFT-N10293847561-KUNDAN JEWELLERS-HDFC0000001` | `KUNDAN JEWELLERS` | `NEFT` | UTR: `N10293847561` |
| **IMPS** | `IMPS/P2A/409283746152/SHRI RAM BULLION/ICIC` | `SHRI RAM BULLION` | `IMPS` | RRN: `409283746152` |
| **POS** | `POS 40928392 PINELABS*KALYAN CHENNAI 241026` | `PINELABS KALYAN` | `POS` | Merchant: `PINELABS KALYAN` |
| **ATM** | `ATM-CASH WDL-S1AC000123-MG ROAD BR` | `ATM CASH WDL MG ROAD BR` | `ATM` | Channel: `ATM` |
| **Charges** | `CONSOL CHARGES FOR Q2 2026 INCL GST 18%` | `CONSOL CHARGES FOR Q2 2026 INCL GST 18%` | `CHARGES` | GST 18% flagged |
| **Tax Challan** | `CBIC GST PMT-06 240928394029` | `CBIC GST PMT 06` | `TAX_CHALLAN` | Tax Type: `GST` |

### Authoring Rules:
- Use **Description** when matching the recognizable name of a counterparty (e.g. `Description contains "PARTH GEMS"`).
- Use **Bank Text** when matching specific clearing tags or raw prefixes (e.g. `Bank text starts with "UPI/"` or `Bank text contains "PINELABS"`).

---

## 3. Starter Rule Catalog (Opt-in & Suggest-Only)

Under **Bank Rules > Starter Library**, users can seed a pre-configured library of Indian accounting rules tailored for gold and jewellery businesses:

| Rule Name | Conditions | Target Action | GST / ITC | Safety Mode |
| :--- | :--- | :--- | :--- | :--- |
| **Bank Charges + 18% GST** | Bank Text contains `CHRG`, `FEE`, `ANNUAL MAINT`, `SMS CHG` | Expense: `Bank Charges & Fees` | GST 18% (`ELIGIBLE` ITC) | Suggest-Only (Auto-Add Ceiling: â‚¹5,000) |
| **Bank Interest Credit** | Bank Text contains `INT.PD`, `INTEREST CREDIT`, `SB INT` | Deposit: `Interest Income` | Exempt (0%) | Suggest-Only |
| **ATM Cash Drawings** | Bank Text contains `ATM WDL`, `CASH WDL`, `NFS*` | Transfer to `Petty Cash` | Exempt (0%) | Suggest-Only (Ceiling: â‚¹50,000) |
| **GST Govt Challan (PMT-06)** | Bank Text contains `GST PMT`, `CBIC`, `GST.GOV` | Expense / Tax Ledger: `GST Liability Clearing` | 0% | Suggest-Only (Ceiling: â‚¹5,00,000) |
| **TDS Govt Challan (ITNS 281)** | Bank Text contains `ITNS 281`, `OLTAS`, `TDS PYMT` | Expense / Tax Ledger: `TDS Payable Clearing` | 0% | Suggest-Only (Ceiling: â‚¹2,00,000) |
| **Salary Batch Disbursals** | Bank Text contains `SALARY`, `SAL DISB`, `PAYROLL` | Transfer / Expense: `Salaries & Wages` | Exempt (0%) | Suggest-Only |

*Note: Starter rules are intentionally imported as "Suggest Only" so accountants retain review control before deciding to enable auto-posting.*

---

## 4. Auto-Add Safety Ceilings & Direct Entry Guarantee

### 4.1 The Single Save Pipeline
Rules **never** bypass the core accounting engine. When a rule is configured with `Auto-Add`:
1. It calls the exact same `BankFeedPostingService.categorizeAndAdd` method used by manual entry.
2. It generates double-entry Balanced Journals with CGST/SGST/IGST tax ledger splits.
3. It updates AR/AP open items atomically.
4. It logs an immutable, tamper-evident entry into the `AuditLog` table with rule metadata.

### 4.2 The 4 Safety Gates
An Auto-Add rule will **gracefully degrade to "Suggest Only"** if any of the following occur:
1. **Amount Guard (`maxAutoAmount`)**: If the transaction amount exceeds the rule's specified ceiling (e.g. â‚¹25,000), it will NOT auto-post. The transaction is tagged as `SUGGESTED` and waits for human review in the Bank Feed inbox.
2. **Lock Date Guard**: If the transaction date falls within a locked accounting period, auto-add is rejected.
3. **Duplicate Protection**: If an identical transaction deduplication hash already exists in posted journals, auto-add is blocked.
4. **Missing GL Account**: If a target category or split line references an inactive account, auto-add degrades to suggested.

---

## 5. Undo Capabilities: 1-Click & Rule-Level Bulk Undo

Accidents happen. The system provides two tiers of undo protection:

### Tier 1: Single Line Undo (Bank Feed Page)
- In the **Categorized** or **Excluded** tabs of `/banking/transactions`, click **Undo** on any line.
- The linked Journal Entry is atomically deleted from the General Ledger.
- Customer/Vendor balances and bank reconciliation status are reversed.
- The statement line returns to **For Review**.

### Tier 2: Rule-Level "Undo All Added Lines" (Bank Rules Page)
- In `/banking/rules`, each rule's action menu features **"Undo all lines added by this rule"**.
- This performs a batch audit-safe reversal of every active transaction auto-added by that rule ID.
- Reverses GL entries and restores all associated bank feed lines to **For Review**.

---

## 6. Keyboard Shortcuts Reference

Engineered for high-volume accountants who prefer keyboard-first workflows:

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + Shift + R` | Global (Banking) | Jump directly to **Bank Rules Page** (`/banking/rules`) |
| `R` or `r` | Bank Feed Table | **Create rule from line** (pre-fills drawer with selected line's payee, channel, and narration) |
| `Alt + C` | Rule Builder Drawer | Add a new condition row (up to 10 conditions) |
| `Alt + S` | Rule Builder Drawer | Enable splits and add a split allocation row |
| `Ctrl + Enter` | Rule Builder Drawer | Save rule |
| `Esc` | Rule Builder Drawer | Cancel & close drawer |
| `Alt + Up / Down` | Bank Rules Page | Reorder rule priority up or down |

---

## 7. QA Test Scenarios & Verification Matrix

| Test ID | Scenario | Expected Outcome | Status |
| :--- | :--- | :--- | :--- |
| **BR-01** | Rule evaluation with `ALL` match mode | Matches only when all conditions pass; skips if one fails | âœ… Passed |
| **BR-02** | Rule evaluation with `ANY` match mode | Matches if at least one condition passes | âœ… Passed |
| **BR-03** | Auto-add amount under `maxAutoAmount` ceiling | Auto-adds transaction, posts balanced journal, status `CATEGORIZED` | âœ… Passed |
| **BR-04** | Auto-add amount exceeding `maxAutoAmount` ceiling | Blocks auto-add; degrades to `SUGGESTED`; remains in `FOR_REVIEW` | âœ… Passed |
| **BR-05** | Split by Percentage (e.g. 70% Shop Expense, 30% Owner Drawings) | Accurate paise allocation with remainder assigned cleanly to last line | âœ… Passed |
| **BR-06** | ReDoS safety on malicious regex string | Pattern truncated safely; evaluation completed under timeout without freeze | âœ… Passed |
| **BR-07** | Priority drag-and-drop / reordering | Lower priority number evaluates first; first matching rule applies | âœ… Passed |
| **BR-08** | Real-time Dry Run Preview | Drawer displays exact match count, conflict warnings, and sample lines | âœ… Passed |
| **BR-09** | Undo all lines added by rule | Reverses all ledger postings and returns lines to `FOR_REVIEW` | âœ… Passed |
| **BR-10** | Seed Starter Rules | Seeds standard Indian banking catalog without overriding custom rules | âœ… Passed |


---

# Chapter 3: Fixed Assets Management

## 1. Architecture Overview: Two Parallel Depreciation Books: Two Parallel Depreciation Books

Indian law requires two completely distinct depreciation methodologies:
```
                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                      â”‚            Fixed Asset Acquisition           â”‚
                      â”‚       (Gross Capitalized Cost in Books)      â”‚
                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                             â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â–¼                                                 â–¼
      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
      â”‚   Companies Act 2013      â”‚                     â”‚    Income-tax Act 1961    â”‚
      â”‚       (Schedule II)       â”‚                     â”‚       (Section 32)        â”‚
      â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤                     â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
      â”‚ â€¢ Asset-by-asset tracking â”‚                     â”‚ â€¢ Block-of-assets WDV     â”‚
      â”‚ â€¢ SLM or derived WDV      â”‚                     â”‚ â€¢ Half-rate rule (< 180d) â”‚
      â”‚ â€¢ 5% residual floor       â”‚                     â”‚ â€¢ STCG / STCL u/s 50      â”‚
      â”‚ â€¢ Pro-rata days           â”‚                     â”‚ â€¢ Strictly MEMO schedule  â”‚
      â”‚ â€¢ POSTS TO GENERAL LEDGER â”‚                     â”‚ â€¢ NEVER POSTS TO GL       â”‚
      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

1. **Books Depreciation (Companies Act 2013)**:
   - Calculates financial depreciation based on the useful life prescribed in Schedule II (or technical evaluation) and residual value floor (up to 5%).
   - Posts balanced periodic double-entry journal entries to the General Ledger:
     - `Dr Depreciation Expense (P&L)`
     - `Cr Accumulated Depreciation (Balance Sheet Contra-Asset)`
   - Forms the statutory **Schedule III PPE Movement Schedule** for audited financial statements.

2. **Tax Depreciation (Income-tax Act 1961 Section 32)**:
   - Governed by **Block of Assets** classes (Buildings, Furniture, Plant & Machinery, Computers, Intangibles) and Appendix I statutory rates.
   - Applies the statutory **Half-Rate Rule**: assets put to use for $< 180$ days in the financial year receive $50\%$ of the statutory depreciation rate.
   - Deletions reduce the block WDV by monies payable/realized. If the block becomes negative or ceases to exist, Section 50 treats the balance as Short-Term Capital Gain (STCG) or Loss (STCL).
   - **Crucial Rule**: Tax depreciation is strictly a memo schedule for ITR & Tax Audit (Form 3CD Annexure). It is *never* posted to the General Ledger.

---

## 2. Capital Goods GST Treatment

- **Eligible ITC Claimed**: Under Section 16(3) of the CGST Act, if ITC is claimed on capital goods, no depreciation can be claimed on the tax component. The asset is capitalized at net taxable value.
- **Blocked ITC under Section 17(5)**: If ITC is blocked (e.g. motor vehicles for non-transport business), GST is added into the capitalized asset cost.
- **Disposal within 5 Years (60 Months)**: Under Section 18(6) and CGST Rule 43, if capital goods on which ITC was claimed are sold within 60 months, tax payable is the higher of:
  1. Output GST on the transaction value, OR
  2. Pro-rata reversal of ITC: $\text{ITC Claimed} \times \frac{60 - \text{Months Used}}{60}$.

---

## 3. Statutory Asset Categories & Useful Lives (Schedule II)

| Category Name | Code | Schedule II Class | Default Useful Life | Residual % | Method | Income-tax Block Mapping |
|---|---|---|---|---|---|---|
| Plant & Machinery | PLM | Part C - General Machinery | 15 Years | 5% | SLM | Plant & Machinery (General) - 15% |
| Furniture & Fixtures | FUR | Part C - Furniture & Fittings | 10 Years | 5% | SLM | Furniture & Fittings - 10% |
| Computers & Laptops | CMP | Part C - End User Devices | 3 Years | 5% | SLM | Computers, Laptops & Software - 40% |
| Servers & Networks | SRV | Part C - Servers & Networks | 6 Years | 5% | SLM | Computers, Laptops & Software - 40% |
| Office Equipment | OFF | Part C - Office Equipment | 5 Years | 5% | SLM | Plant & Machinery (General) - 15% |
| Motor Vehicles | VEH | Part C - Motor Cars | 8 Years | 5% | SLM | Motor Cars (Non-Commercial) - 15% |

*(All statutory rates and life estimates carry a "Verify with CA" recommendation for client-specific audit standards).*

---

## 4. Key Keyboard Shortcuts & Actions

- **`Ctrl+Shift+D`**: Open Periodic Depreciation Run modal from any screen in the asset register.
- **`Ctrl+J`**: View Transaction Journal (exact debits & credits) for any disposal or acquisition journal.
- **`Alt+H`**: Open Tamper-Evident Audit History drawer with cryptographic SHA-256 chain verification.


---

# Chapter 4: Transaction Journal & Tamper-Evident Audit Trail

## 1. Part A: Transaction Journal

### 1.1 Overview & Stored Ledger Facts
Modeled after QuickBooks Online's "Transaction Journal", this feature allows users to inspect the exact double-entry General Ledger fact lines generated by any business transaction.

- **Stored Facts Guarantee**: The modal **never** re-computes what an invoice or bill *should* have posted at view time. Instead, it reads immutable fact records from `JournalEntry` and `JournalLine` linked by `sourceKey` (e.g. `INVOICE:42`, `BILL:15`, `NOTE:8`, `EXPENSE:101`).
- **Keyboard Shortcut**: `Ctrl+J` (Windows/Linux) or `Cmd+J` (Mac) opens the Transaction Journal from any transaction view page.
- **Where it appears**:
  - Invoices (`/invoices/:id`)
  - Bills (`/bills/:id`)
  - Direct Expenses (`/expenses/:id`)
  - Credit & Debit Notes (`/credit-notes/:id`, `/debit-notes/:id`)
  - Customer Receipts & Supplier Payments
  - Bank Feed Categorized Lines
  - Manual Journals

### 1.2 Line Roles & GST Line Breakups
Every ledger line is automatically classified and labeled by its accounting role:
- `ACCOUNTS_RECEIVABLE`: Debtor ledger entry
- `ACCOUNTS_PAYABLE`: Creditor ledger entry
- `SALES_REVENUE`: Net taxable turnover
- `COGS`: Direct gold/gem purchase cost
- `CGST_OUTPUT` / `SGST_OUTPUT`: Intra-state output GST payable
- `IGST_OUTPUT`: Inter-state output GST payable
- `CGST_INPUT` / `SGST_INPUT` / `IGST_INPUT`: Eligible Input Tax Credit (ITC)
- `RCM_TAX`: Reverse Charge Mechanism liability & credit
- `GST_CESS`: Compensation cess
- `ROUND_OFF`: Fractional paise adjustments
- `CASH_OR_BANK`: Liquid settlement accounts

### 1.3 Balanced Indicator & Alerting
- Calculates $\sum \text{Debit}$ and $\sum \text{Credit}$.
- When difference $< \text{â‚¹}0.01$: Displays **"Balanced âœ“"** in green.
- If ever unbalanced: Displays a high-priority red alert warning of a ledger imbalance and discrepancy.

### 1.4 Non-Posting Documents
Documents that do not impact the General Ledger (Quotations, Estimates, Purchase Orders, Delivery Challans) do not display empty tables. Instead, they present an explicit explanation:
> *"Quotations/Estimates are non-posting planning documents. They have no accounting effect until converted into a Tax Invoice."*

### 1.5 Bulk Journal Report (`/reports/journal`)
- A chronological register of all General Ledger vouchers across the enterprise.
- Filterable by date range, transaction type (Invoices, Bills, Expenses, Notes, Payments, Journals), status (Posted, Void), and text search.
- Displays running debit and credit totals with **Trial Balance tie-back** verification ($\sum \text{Dr} = \sum \text{Cr}$).
- Click-through buttons on every entry to open the specific Transaction Journal.

---

## 2. Part B: Tamper-Evident Audit Log

### 2.1 Always-On & Non-Disableable (MCA Compliance)
Under the Companies (Accounts) Rules (amended by the Ministry of Corporate Affairs, MCA), every company using accounting software to maintain books of account must use software with an **audit trail (edit log)** facility that:
1. Records an audit trail of each and every transaction.
2. Creates an edit log of each change made in the books of account along with the date and user details.
3. Cannot be disabled or turned off by any user, administrator, or setting.
4. Preserves records for a statutory retention minimum of **8 years**.

### 2.2 Cryptographic SHA-256 Hash Chaining
Every audit event is cryptographically linked to the preceding event in the company's ledger history:
$$\text{prevHash}_i = \text{hash}_{i-1} \quad (\text{or } \text{"0000...0000"} \text{ for Genesis})$$
$$\text{Canonical}_i = \text{occurredAt} + "|" + \text{companyId} + "|" + \text{actorId} + "|" + \text{eventType} + "|" + \text{entityType} + "|" + \text{entityId} + "|" + \text{amountAfter} + "|" + \text{changesJson} + "|" + \text{prevHash}_i$$
$$\text{hash}_i = \text{SHA256}(\text{Canonical}_i)$$

Any modification, unauthorized deletion, or truncation of historical rows invalidates all subsequent hashes in the chain. The built-in **"Verify Hash Chain"** tool traverses the entire chain from genesis to the latest record, detecting any tampering.

### 2.3 Sensitive Data Masking (DPDP Act)
In accordance with the Digital Personal Data Protection (DPDP) Act:
- Passwords, API secrets, and bearer tokens: Replaced with `[MASKED]`.
- Permanent Account Number (PAN): Masked as `ABCDE****F`.
- Bank Account Numbers: Masked with only last 4 digits visible (`â€¢â€¢â€¢â€¢1234`).
- Aadhaar Numbers: Masked with only last 4 digits visible (`â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢1234`).

### 2.4 Entity History Drawer (`Alt+H`)
- Opens a side-over drawer showing the full revision timeline (Rev 1, Rev 2...).
- Displays side-by-side structured diffs:
  - Modified field name in user-friendly terminology (e.g. "Place of Supply", "Total Amount")
  - Old value (struck-through, red)
  - New value (bold, green)
  - Author, timestamp in Indian Standard Time (IST), and source (UI, API, Import)
- Provides **"View Journal at this Revision"** to inspect historical ledger lines.
- Provides **"Restore This Record"** to re-create deleted or voided transactions through the standard save pipeline.

---

## 3. QA Checklist & Verification Matrix

| # | Test Scenario | Expected Result | Status |
|---|---|---|:---:|
| 1 | `Ctrl+J` on Invoice View Page | Opens Transaction Journal modal with correct AR, Sales, and GST output lines | PASSED |
| 2 | `Ctrl+J` on Quotation / PO | Shows "No accounting effect" non-posting notice | PASSED |
| 3 | Ledger Balance Verification | Total Debits equal Total Credits with green "Balanced âœ“" badge | PASSED |
| 4 | Voided Transaction Handling | Displays both original voided lines and reversal lines | PASSED |
| 5 | `Alt+H` Audit History Drawer | Displays revision timeline with before/after highlighted diffs | PASSED |
| 6 | DPDP Sensitive Data Masking | Passwords masked as `[MASKED]`, PAN as `ABCDE****F`, Bank as `â€¢â€¢â€¢â€¢1234` | PASSED |
| 7 | Indirect Edits Tracking | Payment application records payment event and links indirect edit on invoice | PASSED |
| 8 | Security Tab Audit | Captures successful sign-ins and failed sign-in attempts with IP and user agent | PASSED |
| 9 | Cryptographic Chain Verification | `verifyChain()` confirms 100% hash link validity with 0 broken hashes | PASSED |
| 10 | Statutory Report Generation | Exports MCA-compliant audit trail with hash signatures and auditor summaries | PASSED |
| 11 | Bulk Journal Report | `/reports/journal` groups entries by transaction with Trial Balance tie-back | PASSED |


---

# Chapter 5: Enterprise Settings Center Architecture

## Scope and Coverage Model
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


