import { prisma } from "../lib/prisma.ts";

async function auditData() {
  console.log("=== INVOICES BY STATUS ===");
  const invoices = await prisma.invoice.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  console.log(invoices);

  console.log("=== BILLS BY STATUS ===");
  const bills = await prisma.bill.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  console.log(bills);

  console.log("=== JOURNAL ENTRIES BY STATUS ===");
  const journals = await prisma.journalEntry.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  console.log(journals);

  console.log("=== NOTE DOCUMENTS BY STATUS ===");
  const notes = await prisma.noteDocument.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  console.log(notes);

  console.log("=== INVENTORY ADJUSTMENTS BY STATUS ===");
  const invAdj = await prisma.inventoryAdjustment.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  console.log(invAdj);

  console.log("=== DRAFT INVOICE SAMPLES ===");
  const draftInvoices = await prisma.invoice.findMany({
    where: { status: "DRAFT" },
    select: { id: true, invoiceNo: true, customerId: true, grandTotal: true, date: true, createdAt: true, lines: true },
  });
  console.log("Draft invoices count:", draftInvoices.length, JSON.stringify(draftInvoices, null, 2));

  console.log("=== DRAFT BILL SAMPLES ===");
  const draftBills = await prisma.bill.findMany({
    where: { status: "DRAFT" },
    select: { id: true, billNo: true, supplierId: true, grandTotal: true, date: true, createdAt: true },
  });
  console.log("Draft bills count:", draftBills.length, JSON.stringify(draftBills, null, 2));

  console.log("=== DRAFT JOURNALS SAMPLES ===");
  const draftJournals = await prisma.journalEntry.findMany({
    where: { status: "DRAFT" },
    select: { id: true, entryNo: true, date: true, createdAt: true },
  });
  console.log("Draft journals count:", draftJournals.length, JSON.stringify(draftJournals, null, 2));

  console.log("=== DRAFT NOTES SAMPLES ===");
  const draftNotes = await prisma.noteDocument.findMany({
    where: { status: "DRAFT" },
    select: { id: true, noteNo: true, date: true, createdAt: true },
  });
  console.log("Draft notes count:", draftNotes.length, JSON.stringify(draftNotes, null, 2));
}

auditData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
