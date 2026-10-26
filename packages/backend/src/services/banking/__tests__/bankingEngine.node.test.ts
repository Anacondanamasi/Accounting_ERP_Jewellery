import test from "node:test";
import assert from "node:assert/strict";
import { BankFormatDetector } from "../bankFormatDetector";
import { BankRulesEngine } from "../bankRulesEngine";
import { BankTemplateService } from "../bankTemplateService";

test("Banking Engine: BankFormatDetector - Indian Amounts", () => {
  // Test Indian comma groupings
  assert.equal(BankFormatDetector.parseIndianAmount("1,23,456.78").amount, 123456.78);
  assert.equal(BankFormatDetector.parseIndianAmount("₹ 50,000.00").amount, 50000.00);

  // Test Dr / Cr suffixes
  const dr = BankFormatDetector.parseIndianAmount("1,250.00 Dr");
  assert.equal(dr.amount, -1250.00);
  assert.equal(dr.isDebit, true);

  const cr = BankFormatDetector.parseIndianAmount("50,000.00 Cr");
  assert.equal(cr.amount, 50000.00);
  assert.equal(cr.isCredit, true);

  // Test Parentheses
  const paren = BankFormatDetector.parseIndianAmount("(4,500.50)");
  assert.equal(paren.amount, -4500.50);
  assert.equal(paren.isDebit, true);
});

test("Banking Engine: BankFormatDetector - Date Parsing", () => {
  const d1 = BankFormatDetector.parseFlexibleDate("15/04/2025");
  assert.ok(d1);
  assert.equal(d1?.getDate(), 15);
  assert.equal(d1?.getMonth(), 3); // April is 3
  assert.equal(d1?.getFullYear(), 2025);

  const d2 = BankFormatDetector.parseFlexibleDate("2025-05-20");
  assert.ok(d2);
  assert.equal(d2?.getDate(), 20);
  assert.equal(d2?.getMonth(), 4);

  // Excel serial date 45000 (~March 2023)
  const d3 = BankFormatDetector.parseFlexibleDate(45000);
  assert.ok(d3);
  assert.equal(d3?.getFullYear(), 2023);
});

test("Banking Engine: BankFormatDetector - Layout Detection", () => {
  const hdfcHeaders = ["Date", "Narration", "Chq/Ref Number", "Value Dt", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"];
  const hdfcMapping = BankFormatDetector.detectMapping(hdfcHeaders);
  assert.equal(hdfcMapping.name, "HDFC Bank");
  assert.equal(hdfcMapping.descCol, "Narration");
  assert.equal(hdfcMapping.debitCol, "Withdrawal Amt.");
  assert.equal(hdfcMapping.creditCol, "Deposit Amt.");

  const iciciHeaders = ["Transaction Date", "Value Date", "Cheque Number", "Description", "Debit", "Credit", "Balance"];
  const iciciMapping = BankFormatDetector.detectMapping(iciciHeaders);
  assert.equal(iciciMapping.name, "ICICI Bank");

  const sbiHeaders = ["Txn Date", "Value Date", "Description", "Ref No./Cheque No.", "Debit", "Credit", "Balance"];
  const sbiMapping = BankFormatDetector.detectMapping(sbiHeaders);
  assert.equal(sbiMapping.name, "State Bank of India (SBI)");
});

test("Banking Engine: BankFormatDetector - Dedupe Hashing", () => {
  const date = new Date(2025, 3, 15);
  const hash1 = BankFormatDetector.generateDedupeHash(1, 10, date, "NEFT-AXIS-999", 50000, "AXIS999", 0);
  const hash2 = BankFormatDetector.generateDedupeHash(1, 10, date, "NEFT-AXIS-999", 50000, "AXIS999", 0);
  const hash3 = BankFormatDetector.generateDedupeHash(1, 10, date, "NEFT-AXIS-999", 50000, "AXIS999", 1); // Second occurrence

  assert.equal(hash1, hash2, "Identical transactions must generate identical dedupe hash");
  assert.notEqual(hash1, hash3, "Subsequent occurrences of same-day transactions must generate distinct hash");
});

test("Banking Engine: BankRulesEngine - Default Indian Patterns", () => {
  // Bank charges with 18% GST
  const chg = BankRulesEngine.detectDefaultIndianPatterns("CONSOLIDATED CHARGES CHG-APR25", false);
  assert.ok(chg);
  assert.equal(chg?.targetType, "EXPENSE");
  assert.equal(chg?.targetTaxRate, 18);

  // Interest credit
  const intCr = BankRulesEngine.detectDefaultIndianPatterns("INTEREST CREDITED Q4", true);
  assert.ok(intCr);
  assert.equal(intCr?.targetType, "DEPOSIT");
  assert.equal(intCr?.targetTaxRate, 0);

  // GST challan payment
  const gstPmt = BankRulesEngine.detectDefaultIndianPatterns("GST CPIN 250412349008 PMT", false);
  assert.ok(gstPmt);
  assert.equal(gstPmt?.targetPayee, "GST Department");
});

test("Banking Engine: BankTemplateService - CSV Template Generation", () => {
  const csv = BankTemplateService.generateCsvTemplate();
  assert.ok(csv.includes("Date,Description,Reference / UTR / Cheque No."));
  assert.ok(csv.includes("UPI/510523891045/Chai and Refreshment"));
  assert.ok(csv.includes("NEFT-INW-AXISN09871234"));
});
