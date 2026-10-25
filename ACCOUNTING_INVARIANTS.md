# ACCOUNTING_INVARIANTS.md

## Executable & Testable Accounting Invariants for Jewelledger

This document defines the strict, non-negotiable accounting rules and automated validation assertions enforced across the backend engine, database transactions, and frontend workflows.

---

### Invariant 1: Double-Entry Equality
* **Rule**: For every posted journal entry:
  $$\sum \text{Debit} = \sum \text{Credit}$$
* **Tolerance**: ₹0.00 (exact equality at defined precision).
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
