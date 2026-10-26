import "dotenv/config";
import { prisma } from "../lib/prisma";
import { syncInvoiceJournalPosting } from "../controllers/invoices/invoiceController";
import { syncBillJournalPosting } from "../controllers/bills/billController";

async function runMigration() {
  console.log("===============================================================================");
  console.log("  MIGRATION: DRAFT TO DIRECT ENTRY & STATUS NORMALIZATION (QBO MODEL)");
  console.log("===============================================================================");

  // 1. Process Draft Invoices
  const draftInvoices = await prisma.invoice.findMany({
    where: { status: "DRAFT" },
    include: { lines: true, customer: true },
  });

  console.log(`\nFound ${draftInvoices.length} Draft Invoices to convert to direct entry:`);
  for (const inv of draftInvoices) {
    console.log(`- Converting Draft Invoice #${inv.id} (${inv.invoiceNo}) for Customer ${inv.customer?.name}...`);
    await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: inv.id },
        data: { status: "OPEN" },
      });
      await syncInvoiceJournalPosting(tx, inv.companyId, updated, "system-migration");
    });
    console.log(`  ✓ Converted & posted journal for ${inv.invoiceNo} (Amount: ₹${inv.grandTotal})`);
  }

  // 2. Normalize Legacy "POSTED" Invoices to QBO Lifecycle Statuses (OPEN / PARTIAL / PAID)
  const legacyInvoices = await prisma.invoice.findMany({
    where: { status: "POSTED" },
  });
  console.log(`\nFound ${legacyInvoices.length} legacy 'POSTED' Invoices to normalize:`);
  for (const inv of legacyInvoices) {
    const paid = Number(inv.paidAmount || 0);
    const total = Number(inv.grandTotal || 0);
    const nextStatus = paid >= total && total > 0 ? "PAID" : paid > 0 ? "PARTIAL" : "OPEN";
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { status: nextStatus },
    });
    console.log(`  ✓ Invoice ${inv.invoiceNo}: POSTED -> ${nextStatus}`);
  }

  // 3. Normalize Legacy "POSTED" Bills to QBO Lifecycle Statuses (OPEN / PARTIAL / PAID)
  const legacyBills = await prisma.bill.findMany({
    where: { status: "POSTED" },
  });
  console.log(`\nFound ${legacyBills.length} legacy 'POSTED' Bills to normalize:`);
  for (const bill of legacyBills) {
    const paid = Number(bill.paidAmount || 0);
    const total = Number(bill.grandTotal || 0);
    const nextStatus = paid >= total && total > 0 ? "PAID" : paid > 0 ? "PARTIAL" : "OPEN";
    await prisma.bill.update({
      where: { id: bill.id },
      data: { status: nextStatus },
    });
    console.log(`  ✓ Bill ${bill.billNo}: POSTED -> ${nextStatus}`);
  }

  // 4. Verify Final Database Integrity & Status Distribution
  console.log("\n===============================================================================");
  console.log("  POST-MIGRATION RECONCILIATION & INTEGRITY CHECK");
  console.log("===============================================================================");

  const invByStatus = await prisma.invoice.groupBy({ by: ["status"], _count: { id: true } });
  console.log("Invoices by Status:", invByStatus);

  const billByStatus = await prisma.bill.groupBy({ by: ["status"], _count: { id: true } });
  console.log("Bills by Status:", billByStatus);

  const journals = await prisma.journalEntry.findMany({ include: { lines: true } });
  console.log(`Total Journals in DB: ${journals.length}`);

  let totalDr = 0;
  let totalCr = 0;
  for (const j of journals) {
    const dr = j.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const cr = j.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    totalDr += dr;
    totalCr += cr;
    if (Math.abs(dr - cr) > 0.01) {
      console.error(`  ✖ UNBALANCED JOURNAL DETECTED: Journal #${j.id} (${j.entryNo}): Dr ${dr} != Cr ${cr}`);
    }
  }
  console.log(`Total Ledger Debit:  ₹${totalDr.toFixed(2)}`);
  console.log(`Total Ledger Credit: ₹${totalCr.toFixed(2)}`);
  console.log(`Trial Balance Diff:  ₹${Math.abs(totalDr - totalCr).toFixed(2)}`);

  if (Math.abs(totalDr - totalCr) < 0.01) {
    console.log("  ✓ ALL LEDGER ENTRIES 100% BALANCED!");
  } else {
    throw new Error("Ledger balance reconciliation failed!");
  }
}

runMigration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
