# Banking & Bank Reconciliation Guide (QBO & Xero Standard)

This document provides a comprehensive operational guide and technical architectural reference for the enterprise **Bank Transactions (Bank Feed)** and **Statement-based Reconciliation** engine in the jewellery accounting ERP.

---

## 1. Architectural Overview

### 1.1 Core Tenets
- **Direct Entry Posting**: No "Draft/Post" intermediate states. In accordance with the single-save pipeline, clicking **"Add"** or **"Match"** on a bank feed line atomically posts the double-entry accounting effect directly to the General Ledger (`JournalEntry` and `JournalLine`) and links accounts in a single database transaction.
- **Universal Import & Adapter Pattern (`BankFeedSource`)**:
  - Statements can be uploaded via styled `.xlsx` or raw `.csv`.
  - Built-in format detectors auto-recognize major Indian bank layouts: **HDFC Bank**, **ICICI Bank**, **State Bank of India (SBI)**, **Axis Bank**, and generic ERP formats.
  - Pluggable design: Live Account Aggregator (AA) or bank API integrations can be plugged directly into the `BankFeedSource` adapter interface without altering downstream UI or posting logic.
- **Cryptographic Deduplication (`dedupe_hash`)**:
  - Overlapping statement uploads (e.g. uploading April 1–30 and later April 15–May 15) never create duplicate transactions.
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
    - **Difference = ₹0.00**: Large Emerald Green badge with checkmark. Ready to finalize!
    - **Difference $\neq$ ₹0.00**: Amber badge indicating unreconciled discrepancy.
- **Sub-Tabs**:
  - **All**: View all uncleared book entries up to the statement date.
  - **Payments / Money Out**: Uncleared cheques, bank transfers, and expenses.
  - **Deposits / Money In**: Uncleared customer receipts, NEFT/RTGS credits, and interest.
- **Instant Client-Side Recalculation**: Toggling checkboxes immediately recalculates cleared sums and difference with zero server latency.
- **Save for Later**: Persists the session state and checked items so you can leave and resume anytime.

### 3.3 Step 3: Finalize & Discrepancy Handling
- **When Difference = ₹0.00**:
  - Clicking **"Finish now"** locks all cleared journal lines (`reconciliationId` stamped, `clearedAt` timestamped).
  - Transactions become read-only to prevent tampering or silent alteration.
- **When Difference $\neq$ ₹0.00**:
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
| 11 | Finish Reconcile at ₹0.00 Diff | Marks items as cleared, locks statement and journal lines | PASSED |
| 12 | Undo Latest Reconciliation | Unlocks journal lines, restores reconciliation to undone | PASSED |
