# Bank Rules & Intelligent Automation Guide

> **Standard:** Indian GST, Double-Entry GL Accuracy, QBO-Grade Rule Automation & Safety Ceilings.
> **Applies to:** HKS Jewellery ERP Banking Module (`/banking/rules`, `/banking/transactions`, `/banking/reconcile`).

---

## 1. Executive Summary

The **Bank Rules module** brings QuickBooks Online (QBO) Advanced rule automation to Indian banking, specifically tailored for jewellery retail and wholesale operations.

Bank Rules automate the categorization, tax posting, party assignment, and auto-confirmation of statement lines imported into the **Bank Feed**, eliminating repetitive manual bookkeeping while enforcing **strict double-entry and GST accounting safety**.

```
[Imported Bank Line / Feed]
           │
           ▼
[Indian Narration Normalizer]  ──► Extracts: UPI VPA, NEFT UTR, IMPS Ref, Card Merchant, Channel
           │
           ▼
[Bank Rules Engine (Multi-condition Evaluator)]
           ├── Conditions: Description vs Bank Text, Amount, Channel, Day of Month, Account
           ├── Action: Expense, Deposit, Transfer, Customer/Vendor Payment, Exclude
           ├── Splits: Fixed Amount or Percentage (Paise accurate, remainder line)
           │
           ├── Mode A: Suggest Only ──► Surfaced in Feed for 1-click Add
           │
           └── Mode B: Auto-Add (Direct Entry)
                    │
                    ├── Guard: Amount <= maxAutoAmount ceiling?
                    ├── Guard: Accounting period not locked?
                    ├── Guard: Non-duplicate posting?
                    │
                    ├── PASS ──► Post via Single Save Pipeline (BankFeedPostingService)
                    └── FAIL ──► Degrade safely to Suggest Only (No ledger mutation)
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
| **Bank Charges + 18% GST** | Bank Text contains `CHRG`, `FEE`, `ANNUAL MAINT`, `SMS CHG` | Expense: `Bank Charges & Fees` | GST 18% (`ELIGIBLE` ITC) | Suggest-Only (Auto-Add Ceiling: ₹5,000) |
| **Bank Interest Credit** | Bank Text contains `INT.PD`, `INTEREST CREDIT`, `SB INT` | Deposit: `Interest Income` | Exempt (0%) | Suggest-Only |
| **ATM Cash Drawings** | Bank Text contains `ATM WDL`, `CASH WDL`, `NFS*` | Transfer to `Petty Cash` | Exempt (0%) | Suggest-Only (Ceiling: ₹50,000) |
| **GST Govt Challan (PMT-06)** | Bank Text contains `GST PMT`, `CBIC`, `GST.GOV` | Expense / Tax Ledger: `GST Liability Clearing` | 0% | Suggest-Only (Ceiling: ₹5,00,000) |
| **TDS Govt Challan (ITNS 281)** | Bank Text contains `ITNS 281`, `OLTAS`, `TDS PYMT` | Expense / Tax Ledger: `TDS Payable Clearing` | 0% | Suggest-Only (Ceiling: ₹2,00,000) |
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
1. **Amount Guard (`maxAutoAmount`)**: If the transaction amount exceeds the rule's specified ceiling (e.g. ₹25,000), it will NOT auto-post. The transaction is tagged as `SUGGESTED` and waits for human review in the Bank Feed inbox.
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
| **BR-01** | Rule evaluation with `ALL` match mode | Matches only when all conditions pass; skips if one fails | ✅ Passed |
| **BR-02** | Rule evaluation with `ANY` match mode | Matches if at least one condition passes | ✅ Passed |
| **BR-03** | Auto-add amount under `maxAutoAmount` ceiling | Auto-adds transaction, posts balanced journal, status `CATEGORIZED` | ✅ Passed |
| **BR-04** | Auto-add amount exceeding `maxAutoAmount` ceiling | Blocks auto-add; degrades to `SUGGESTED`; remains in `FOR_REVIEW` | ✅ Passed |
| **BR-05** | Split by Percentage (e.g. 70% Shop Expense, 30% Owner Drawings) | Accurate paise allocation with remainder assigned cleanly to last line | ✅ Passed |
| **BR-06** | ReDoS safety on malicious regex string | Pattern truncated safely; evaluation completed under timeout without freeze | ✅ Passed |
| **BR-07** | Priority drag-and-drop / reordering | Lower priority number evaluates first; first matching rule applies | ✅ Passed |
| **BR-08** | Real-time Dry Run Preview | Drawer displays exact match count, conflict warnings, and sample lines | ✅ Passed |
| **BR-09** | Undo all lines added by rule | Reverses all ledger postings and returns lines to `FOR_REVIEW` | ✅ Passed |
| **BR-10** | Seed Starter Rules | Seeds standard Indian banking catalog without overriding custom rules | ✅ Passed |
