import crypto from "crypto";

export interface NormalizedBankRow {
  date: Date;
  valueDate?: Date;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  amount: number; // Signed: positive = deposit, negative = withdrawal
  balance?: number;
  payeeHint?: string;
  categoryHint?: string;
  taxRateHint?: number;
  memo?: string;
  raw: any;
}

export interface BankFormatMapping {
  name: string;
  dateCol: string;
  valueDateCol?: string;
  descCol: string;
  refCol?: string;
  debitCol?: string;
  creditCol?: string;
  amountCol?: string;
  balanceCol?: string;
  indicatorCol?: string; // e.g. "Dr/Cr" or "Type"
}

export class BankFormatDetector {
  /**
   * Parse Indian formatted amount string into a float.
   * Handles:
   *   "1,23,456.78", "₹ 50,000.00", "1250.00 Dr", "50000 Cr", "(2500)", "-1500.50"
   */
  static parseIndianAmount(val: any): { amount: number; isDebit?: boolean; isCredit?: boolean } {
    if (typeof val === "number") return { amount: isNaN(val) ? 0 : val };
    if (!val || typeof val !== "string") return { amount: 0 };

    let cleaned = val.trim().replace(/₹/g, "").replace(/\s+/g, " ");
    let isDebit = false;
    let isCredit = false;

    // Check trailing or leading Dr / Cr
    if (/[\s]?(dr|debit)[\.]?$/i.test(cleaned)) {
      isDebit = true;
      cleaned = cleaned.replace(/[\s]?(dr|debit)[\.]?$/i, "");
    } else if (/[\s]?(cr|credit)[\.]?$/i.test(cleaned)) {
      isCredit = true;
      cleaned = cleaned.replace(/[\s]?(cr|credit)[\.]?$/i, "");
    }

    // Check parentheses (accountant negative)
    if (/^\((.*)\)$/.test(cleaned)) {
      isDebit = true;
      cleaned = cleaned.replace(/^\((.*)\)$/, "$1");
    }

    // Remove Indian & western comma groupings
    cleaned = cleaned.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    if (isNaN(num)) return { amount: 0 };

    if (isDebit) {
      return { amount: -Math.abs(num), isDebit: true };
    }
    if (isCredit) {
      return { amount: Math.abs(num), isCredit: true };
    }

    return { amount: num };
  }

  /**
   * Parses flexible date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, Excel serial)
   */
  static parseFlexibleDate(val: any): Date | null {
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val;
    }
    if (typeof val === "number") {
      // Excel serial date (e.g. 45000 = ~2023)
      if (val > 25569 && val < 100000) {
        const utcDays = val - 25569;
        const ms = utcDays * 86400 * 1000;
        const d = new Date(ms);
        if (!isNaN(d.getTime())) return d;
      }
    }
    if (typeof val !== "string") return null;

    const s = val.trim();
    if (!s) return null;

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10) - 1;
      const year = parseInt(dmy[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // YYYY-MM-DD or YYYY/MM/DD
    const ymd = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (ymd) {
      const year = parseInt(ymd[1], 10);
      const month = parseInt(ymd[2], 10) - 1;
      const day = parseInt(ymd[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    const fallback = new Date(s);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  /**
   * Auto-detect columns from header names
   */
  static detectMapping(headers: string[]): BankFormatMapping {
    const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");
    const map = new Map<string, string>();
    headers.forEach((h) => map.set(normalize(h), h));

    const findCol = (...candidates: string[]): string | undefined => {
      for (const c of candidates) {
        const norm = normalize(c);
        if (map.has(norm)) return map.get(norm);
        for (const [key, orig] of map.entries()) {
          if (key.includes(norm) || norm.includes(key)) return orig;
        }
      }
      return undefined;
    };

    // HDFC Bank check
    if (map.has("chqrefnumber") || map.has("withdrawalamt") || map.has("depositamt")) {
      return {
        name: "HDFC Bank",
        dateCol: findCol("Date", "Txn Date") || headers[0],
        valueDateCol: findCol("Value Dt", "Value Date"),
        descCol: findCol("Narration", "Description") || headers[1],
        refCol: findCol("Chq/Ref Number", "ChqRefNumber", "Reference"),
        debitCol: findCol("Withdrawal Amt.", "Withdrawal Amt", "Debit"),
        creditCol: findCol("Deposit Amt.", "Deposit Amt", "Credit"),
        balanceCol: findCol("Closing Balance", "Balance"),
      };
    }

    // ICICI Bank check
    if (map.has("chequenumber") || map.has("transactiondate")) {
      return {
        name: "ICICI Bank",
        dateCol: findCol("Transaction Date", "Txn Date", "Date") || headers[0],
        valueDateCol: findCol("Value Date"),
        descCol: findCol("Description", "Remarks", "Narration") || headers[1],
        refCol: findCol("Cheque Number", "Chq No", "Reference"),
        debitCol: findCol("Debit", "Withdrawal"),
        creditCol: findCol("Credit", "Deposit"),
        balanceCol: findCol("Balance", "Available Balance"),
      };
    }

    // SBI check
    if (map.has("refnochequeno") || map.has("txndate")) {
      return {
        name: "State Bank of India (SBI)",
        dateCol: findCol("Txn Date", "Date") || headers[0],
        valueDateCol: findCol("Value Date"),
        descCol: findCol("Description", "Narration") || headers[1],
        refCol: findCol("Ref No./Cheque No.", "Ref No", "Cheque No"),
        debitCol: findCol("Debit"),
        creditCol: findCol("Credit"),
        balanceCol: findCol("Balance"),
      };
    }

    // Generic / Template mapping
    return {
      name: "Generic / Template",
      dateCol: findCol("Date", "Txn Date", "Transaction Date") || headers[0],
      valueDateCol: findCol("Value Date", "Value Dt"),
      descCol: findCol("Description", "Narration", "Particulars") || headers[1],
      refCol: findCol("Reference / UTR / Cheque No.", "Reference", "Ref No", "UTR", "Cheque No"),
      debitCol: findCol("Debit (Money Out)", "Debit", "Withdrawal", "Out"),
      creditCol: findCol("Credit (Money In)", "Credit", "Deposit", "In"),
      amountCol: findCol("Amount (Signed: -Out / +In)", "Amount", "Net Amount"),
      balanceCol: findCol("Balance", "Closing Balance", "Running Balance"),
      indicatorCol: findCol("Dr / Cr", "Type", "CR/DR"),
    };
  }

  /**
   * Normalizes a raw key-value row according to the mapping
   */
  static normalizeRow(row: Record<string, any>, mapping: BankFormatMapping): NormalizedBankRow | null {
    const rawDate = row[mapping.dateCol];
    const parsedDate = this.parseFlexibleDate(rawDate);
    if (!parsedDate) return null;

    const rawDesc = String(row[mapping.descCol] || "").trim();
    if (!rawDesc) return null;

    let debit = 0;
    let credit = 0;

    if (mapping.debitCol && row[mapping.debitCol] !== undefined && row[mapping.debitCol] !== "") {
      const parsed = this.parseIndianAmount(row[mapping.debitCol]);
      debit = Math.abs(parsed.amount);
    }
    if (mapping.creditCol && row[mapping.creditCol] !== undefined && row[mapping.creditCol] !== "") {
      const parsed = this.parseIndianAmount(row[mapping.creditCol]);
      credit = Math.abs(parsed.amount);
    }

    // If signed amount column was provided
    if (debit === 0 && credit === 0 && mapping.amountCol && row[mapping.amountCol] !== undefined) {
      const parsed = this.parseIndianAmount(row[mapping.amountCol]);
      let isDeb = parsed.isDebit || parsed.amount < 0;
      let isCred = parsed.isCredit || parsed.amount > 0;

      // Indicator column like "Dr" or "Cr"
      if (mapping.indicatorCol && row[mapping.indicatorCol]) {
        const ind = String(row[mapping.indicatorCol]).toLowerCase();
        if (ind.includes("dr") || ind.includes("debit") || ind.includes("w")) {
          isDeb = true;
          isCred = false;
        } else if (ind.includes("cr") || ind.includes("credit") || ind.includes("d")) {
          isCred = true;
          isDeb = false;
        }
      }

      if (isDeb) {
        debit = Math.abs(parsed.amount);
      } else {
        credit = Math.abs(parsed.amount);
      }
    }

    // If both debit & credit are zero, ignore line
    if (debit === 0 && credit === 0) {
      return null;
    }

    const signedAmount = credit > 0 ? credit : -debit;

    let balance: number | undefined;
    if (mapping.balanceCol && row[mapping.balanceCol] !== undefined && row[mapping.balanceCol] !== "") {
      const p = this.parseIndianAmount(row[mapping.balanceCol]);
      balance = Math.abs(p.amount);
    }

    const reference = mapping.refCol ? String(row[mapping.refCol] || "").trim() : undefined;
    const valueDate = mapping.valueDateCol ? this.parseFlexibleDate(row[mapping.valueDateCol]) ?? undefined : undefined;

    // Optional fields in Template v1
    const payeeHint = row["Payee / Party Name"] || row["Payee"] || undefined;
    const categoryHint = row["Category / Account"] || row["Category"] || row["Account"] || undefined;
    const taxRateHint = row["Tax Code / GST %"] ? parseFloat(row["Tax Code / GST %"]) : undefined;
    const memo = row["Memo / Notes"] || row["Memo"] || row["Notes"] || undefined;

    return {
      date: parsedDate,
      valueDate,
      description: rawDesc,
      reference: reference || undefined,
      debit,
      credit,
      amount: signedAmount,
      balance,
      payeeHint: payeeHint ? String(payeeHint).trim() : undefined,
      categoryHint: categoryHint ? String(categoryHint).trim() : undefined,
      taxRateHint: isNaN(taxRateHint!) ? undefined : taxRateHint,
      memo: memo ? String(memo).trim() : undefined,
      raw: row,
    };
  }

  /**
   * Generates a stable deduplication hash for a bank line
   */
  static generateDedupeHash(
    companyId: number,
    bankAccountId: number,
    date: Date,
    description: string,
    amount: number,
    reference?: string,
    occurrenceIndex: number = 0
  ): string {
    const dateStr = date.toISOString().slice(0, 10);
    const normDesc = description.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    const amtStr = Math.round(amount * 100).toString(); // Exact integer paise
    const refStr = (reference || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const payload = `${companyId}:${bankAccountId}:${dateStr}:${normDesc}:${amtStr}:${refStr}:${occurrenceIndex}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }
}
