import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateGstin } from "../gstinValidator";
import { evaluatePlaceOfSupply } from "../posEngine";
import { computeLineTax, computeDocumentTax } from "../taxCalculator";
import { generateGstJournalPosting, type GstControlAccounts } from "../gstPostingEngine";

const mockAccounts: GstControlAccounts = {
  receivableId: 1100,
  payableId: 2100,
  salesId: 4000,
  purchaseId: 5000,
  outputGstId: 2200,
  inputGstId: 1200,
  outputCgstId: 2201,
  outputSgstId: 2202,
  outputIgstId: 2203,
  outputCessId: 2204,
  rcmOutputCgstId: 2211,
  rcmOutputSgstId: 2212,
  rcmOutputIgstId: 2213,
  inputCgstId: 1201,
  inputSgstId: 1202,
  inputIgstId: 1203,
  inputCessId: 1204,
  inputRcmCgstId: 1211,
  inputRcmSgstId: 1212,
  inputRcmIgstId: 1213,
  itcBlockedId: 5100,
  roundOffId: 5999,
  bankId: 1002,
  cashId: 1001,
};

describe("Indian GST Engine: Pure Unit Tests", () => {
  it("Scenario 1: Sales invoice (intra-state, 18%, ₹10,000)", () => {
    const pos = evaluatePlaceOfSupply({ supplierGstin: "24AAAAA0000A1Z5", placeOfSupply: "24" });
    const tax = computeDocumentTax([{ rate: 18, amount: 10000 }], pos.isInterstate);

    const lines = generateGstJournalPosting({
      documentType: "INVOICE",
      documentNo: "INV-001",
      posResult: pos,
      taxSummary: tax,
      accounts: mockAccounts,
    });

    // Dr AR 11,800 | Cr Sales 10,000 | Cr Output CGST 900 | Cr Output SGST 900
    assert.equal(lines.length, 4);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.receivableId)?.debit, 11800);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.salesId)?.credit, 10000);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.outputCgstId)?.credit, 900);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.outputSgstId)?.credit, 900);
  });

  it("Scenario 2: Sales invoice (inter-state, 18%, ₹10,000)", () => {
    const pos = evaluatePlaceOfSupply({ supplierGstin: "24AAAAA0000A1Z5", placeOfSupply: "27" });
    const tax = computeDocumentTax([{ rate: 18, amount: 10000 }], pos.isInterstate);

    const lines = generateGstJournalPosting({
      documentType: "INVOICE",
      documentNo: "INV-002",
      posResult: pos,
      taxSummary: tax,
      accounts: mockAccounts,
    });

    // Dr AR 11,800 | Cr Sales 10,000 | Cr Output IGST 1,800
    assert.equal(lines.length, 3);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.receivableId)?.debit, 11800);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.salesId)?.credit, 10000);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.outputIgstId)?.credit, 1800);
  });

  it("Scenario 3: Purchase bill (eligible ITC, intra-state, 18%, ₹10,000)", () => {
    const pos = evaluatePlaceOfSupply({ supplierGstin: "24AAAAA0000A1Z5", placeOfSupply: "24" });
    const tax = computeDocumentTax([{ rate: 18, amount: 10000 }], pos.isInterstate);

    const lines = generateGstJournalPosting({
      documentType: "BILL",
      documentNo: "BILL-001",
      posResult: pos,
      taxSummary: tax,
      accounts: mockAccounts,
    });

    // Dr Purchase 10,000 | Dr Input CGST 900 | Dr Input SGST 900 | Cr AP 11,800
    assert.equal(lines.length, 4);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.purchaseId)?.debit, 10000);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.inputCgstId)?.debit, 900);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.inputSgstId)?.debit, 900);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.payableId)?.credit, 11800);
  });

  it("Scenario 4: Purchase bill (ITC ineligible/blocked 17(5))", () => {
    const pos = evaluatePlaceOfSupply({ supplierGstin: "24AAAAA0000A1Z5", placeOfSupply: "24" });
    const tax = computeDocumentTax([{ rate: 18, amount: 10000, itcEligibility: "BLOCKED_17_5" }], pos.isInterstate);

    const lines = generateGstJournalPosting({
      documentType: "BILL",
      documentNo: "BILL-BLK-001",
      posResult: pos,
      taxSummary: tax,
      accounts: mockAccounts,
    });

    // Dr Purchase 10,000 | Dr Blocked ITC 1,800 | Cr AP 11,800
    assert.equal(lines.length, 3);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.purchaseId)?.debit, 10000);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.itcBlockedId)?.debit, 1800);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.payableId)?.credit, 11800);
  });

  it("Scenario 5: RCM purchase (Reverse Charge, 18%, ₹10,000)", () => {
    const pos = evaluatePlaceOfSupply({ supplierGstin: "24AAAAA0000A1Z5", placeOfSupply: "27" });
    const tax = computeDocumentTax([{ rate: 18, amount: 10000, isRcm: true }], pos.isInterstate);

    const lines = generateGstJournalPosting({
      documentType: "BILL",
      documentNo: "RCM-001",
      posResult: pos,
      taxSummary: tax,
      accounts: mockAccounts,
    });

    // Dr Purchase 10,000 | Cr AP 10,000 | Dr Input RCM IGST 1,800 | Cr RCM Output IGST 1,800
    assert.equal(lines.length, 4);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.purchaseId)?.debit, 10000);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.payableId)?.credit, 10000);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.inputRcmIgstId)?.debit, 1800);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.rcmOutputIgstId)?.credit, 1800);
  });

  it("Scenario 6: Credit note (Sales Return)", () => {
    const pos = evaluatePlaceOfSupply({ supplierGstin: "24AAAAA0000A1Z5", placeOfSupply: "24" });
    const tax = computeDocumentTax([{ rate: 18, amount: 10000 }], pos.isInterstate);

    const lines = generateGstJournalPosting({
      documentType: "CREDIT_NOTE",
      documentNo: "CRN-001",
      posResult: pos,
      taxSummary: tax,
      accounts: mockAccounts,
    });

    // Dr Sales 10,000 | Dr Output CGST 900 | Dr Output SGST 900 | Cr AR 11,800
    assert.equal(lines.length, 4);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.salesId)?.debit, 10000);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.outputCgstId)?.debit, 900);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.outputSgstId)?.debit, 900);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.receivableId)?.credit, 11800);
  });

  it("Scenario 7: Debit note (Purchase Return)", () => {
    const pos = evaluatePlaceOfSupply({ supplierGstin: "24AAAAA0000A1Z5", placeOfSupply: "24" });
    const tax = computeDocumentTax([{ rate: 18, amount: 10000 }], pos.isInterstate);

    const lines = generateGstJournalPosting({
      documentType: "DEBIT_NOTE",
      documentNo: "DBN-001",
      posResult: pos,
      taxSummary: tax,
      accounts: mockAccounts,
    });

    // Dr AP 11,800 | Cr Purchase 10,000 | Cr Input CGST 900 | Cr Input SGST 900
    assert.equal(lines.length, 4);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.payableId)?.debit, 11800);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.purchaseId)?.credit, 10000);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.inputCgstId)?.credit, 900);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.inputSgstId)?.credit, 900);
  });

  it("Scenario 8: Direct Expense with GST (Bank paid)", () => {
    const pos = evaluatePlaceOfSupply({ supplierGstin: "24AAAAA0000A1Z5", placeOfSupply: "24" });
    const tax = computeDocumentTax([{ rate: 18, amount: 5000 }], pos.isInterstate);

    const lines = generateGstJournalPosting({
      documentType: "EXPENSE",
      documentNo: "EXP-001",
      posResult: pos,
      taxSummary: tax,
      accounts: mockAccounts,
      paymentMethodAccountId: mockAccounts.bankId,
    });

    // Dr Expense 5,000 | Dr Input CGST 450 | Dr Input SGST 450 | Cr Bank 5,900
    assert.equal(lines.length, 4);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.purchaseId)?.debit, 5000);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.inputCgstId)?.debit, 450);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.inputSgstId)?.debit, 450);
    assert.equal(lines.find((l) => l.accountId === mockAccounts.bankId)?.credit, 5900);
  });
});
