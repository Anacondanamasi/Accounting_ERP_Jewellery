import test from "node:test";
import assert from "node:assert/strict";
import { TransactionJournalService } from "../transactionJournalService";

test("TransactionJournalService: Non-Posting Documents (Quotes & POs)", async () => {
  const quoteJournal = await TransactionJournalService.getTransactionJournal(1, "QUOTE", 101);
  assert.equal(quoteJournal.isPostingDocument, false);
  assert.ok(quoteJournal.nonPostingReason?.includes("Quotations/Estimates are non-posting"));
  assert.equal(quoteJournal.lines.length, 0);
  assert.equal(quoteJournal.totals.debit, 0);
  assert.equal(quoteJournal.totals.credit, 0);

  const poJournal = await TransactionJournalService.getTransactionJournal(1, "PURCHASE_ORDER", 205);
  assert.equal(poJournal.isPostingDocument, false);
  assert.ok(poJournal.nonPostingReason?.includes("Purchase Orders are non-posting"));
  assert.equal(poJournal.lines.length, 0);

  const challanJournal = await TransactionJournalService.getTransactionJournal(1, "DELIVERY_CHALLAN", 301);
  assert.equal(challanJournal.isPostingDocument, false);
  assert.ok(challanJournal.nonPostingReason?.includes("Delivery Challans track physical custody"));
});
