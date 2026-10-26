# Fixed Assets Module: User & Compliance Guide

> **Standard Compliance**:
> - **Companies Act, 2013**: Section 123, Schedule II (Useful lives & residual values), Schedule III Part I (PPE Movement Schedule).
> - **Accounting Standards**: Ind AS 16 / AS 10 (Property, Plant & Equipment & Component Accounting), Ind AS 36 / AS 28 (Impairment), Ind AS 12 / AS 22 (Accounting for Taxes on Income & Timing Differences).
> - **Income-tax Act, 1961**: Section 32 & Appendix I (Block of Assets WDV), Section 50 (Short-Term Capital Gains / Losses on depreciable assets).
> - **GST Law**: Section 16(3), Section 17(5)(a)-(d) (Blocked Credit), Section 18(6) & CGST Rule 43 (Capital Goods ITC reversal on disposal).

---

## 1. Architecture Overview: Two Parallel Depreciation Books

Indian law requires two completely distinct depreciation methodologies:
```
                      ┌──────────────────────────────────────────────┐
                      │            Fixed Asset Acquisition           │
                      │       (Gross Capitalized Cost in Books)      │
                      └──────────────────────┬───────────────────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    ▼                                                 ▼
      ┌───────────────────────────┐                     ┌───────────────────────────┐
      │   Companies Act 2013      │                     │    Income-tax Act 1961    │
      │       (Schedule II)       │                     │       (Section 32)        │
      ├───────────────────────────┤                     ├───────────────────────────┤
      │ • Asset-by-asset tracking │                     │ • Block-of-assets WDV     │
      │ • SLM or derived WDV      │                     │ • Half-rate rule (< 180d) │
      │ • 5% residual floor       │                     │ • STCG / STCL u/s 50      │
      │ • Pro-rata days           │                     │ • Strictly MEMO schedule  │
      │ • POSTS TO GENERAL LEDGER │                     │ • NEVER POSTS TO GL       │
      └───────────────────────────┘                     └───────────────────────────┘
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
