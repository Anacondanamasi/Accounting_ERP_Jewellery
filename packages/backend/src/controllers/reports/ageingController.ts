import type { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId } from "../../lib/requestUtils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AgeingBucket {
  label: string;
  from: number; // inclusive lower bound in days overdue (-Infinity = current)
  to: number;   // inclusive upper bound in days overdue (Infinity = no cap)
}

const DEFAULT_BUCKETS: AgeingBucket[] = [
  { label: "Current",   from: -Infinity, to: 0   },
  { label: "1-30",      from: 1,         to: 30  },
  { label: "31-60",     from: 31,        to: 60  },
  { label: "61-90",     from: 61,        to: 90  },
  { label: "91-120",    from: 91,        to: 120 },
  { label: "120+",      from: 121,       to: Infinity },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const daysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

const r2 = (n: number) => Number(n.toFixed(2));

/**
 * Parse the `buckets` query param.
 * Format: "0,30,60,90,120"  → creates buckets [Current, 1-30, 31-60, 61-90, 91-120, 120+]
 */
const parseBuckets = (raw?: string): AgeingBucket[] => {
  if (!raw) return DEFAULT_BUCKETS;
  const thresholds = raw
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
  if (thresholds.length < 1) return DEFAULT_BUCKETS;

  const buckets: AgeingBucket[] = [{ label: "Current", from: -Infinity, to: thresholds[0] }];
  for (let i = 0; i < thresholds.length; i++) {
    const from = thresholds[i] + 1;
    const to = thresholds[i + 1] ?? Infinity;
    const label = to === Infinity ? `${thresholds[i] + 1}+` : `${from}-${to}`;
    buckets.push({ label, from, to });
  }
  return buckets;
};

const computeLedgerAgeingRow = (
  openingBalance: number,
  documents: { id: number; grandTotal: unknown; dueDate: Date; documentNo: string; date: Date; status: string }[],
  paymentsTotal: number,
  creditNotesTotal: number,
  asOf: Date,
  buckets: AgeingBucket[],
  isSupplier: boolean = false
) => {
  const result: Record<string, number> = {};
  for (const b of buckets) result[b.label] = 0;

  const totalDocs = documents.reduce((sum, doc) => sum + Number(doc.grandTotal), 0);
  const totalOutstanding = r2(openingBalance + totalDocs - paymentsTotal - creditNotesTotal);

  if (totalOutstanding <= 0) {
    result[buckets[0].label] = totalOutstanding;
    return { ...result, totalOutstanding, detailRows: [] };
  }

  let remaining = totalOutstanding;
  const sortedDocs = [...documents].sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  const detailRows = [];

  for (const doc of sortedDocs) {
    if (remaining <= 0) break;
    const age = daysBetween(doc.dueDate, asOf);
    const bucket = buckets.find((b) => age >= b.from && age <= b.to);
    const label = bucket?.label ?? buckets[0].label;

    const docTotal = Number(doc.grandTotal);
    const allocate = Math.min(remaining, docTotal);
    result[label] = r2(result[label] + allocate);
    remaining = r2(remaining - allocate);

    detailRows.push({
      id: doc.id,
      documentNo: doc.documentNo,
      date: doc.date,
      dueDate: doc.dueDate,
      originalAmount: r2(docTotal),
      paidAmount: r2(docTotal - allocate),
      balanceDue: r2(allocate),
      status: doc.status,
      ageDays: Math.max(0, age),
      bucket: label,
    });
  }

  if (remaining > 0) {
    const oldestBucket = buckets[buckets.length - 1].label;
    result[oldestBucket] = r2(result[oldestBucket] + remaining);
  }

  return { ...result, totalOutstanding, detailRows };
};

const buildCsv = (headers: string[], rows: string[][]): string => {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");
};

// ─────────────────────────────────────────────────────────────────────────────
// RECEIVABLES AGEING
// ─────────────────────────────────────────────────────────────────────────────

export const getReceivablesAgeing = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const asOf     = req.query.asOf     ? new Date(String(req.query.asOf))     : new Date();
  const search   = req.query.search   ? String(req.query.search).trim()       : "";
  const category = req.query.category ? String(req.query.category).toUpperCase() : "";
  const city     = req.query.city     ? String(req.query.city)                : "";
  const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : "";
  const view     = req.query.view     === "detail" ? "detail" : "summary";
  const exportFmt = req.query.export   ? String(req.query.export)             : "";
  const buckets  = parseBuckets(String(req.query.buckets ?? ""));

  // End-of-day for the as-of date
  const asOfEnd = new Date(asOf);
  asOfEnd.setHours(23, 59, 59, 999);

  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      ...(city     ? { city: { contains: city } }                           : {}),
      ...(category ? { category }                                           : {}),
      ...(search   ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
        ],
      } : {}),
    },
    include: {
      invoices: {
        where: {
          date:   { lte: asOfEnd },
          status: statusFilter
            ? { equals: statusFilter }
            : { notIn: ["VOID", "DRAFT"] },
        },
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const payments = await prisma.payment.groupBy({
    by: ["customerId"],
    where: { 
      companyId, 
      date: { lte: asOfEnd }, 
      customerId: { not: null },
      type: { in: ["RECEIPT", "ADVANCE_RECEIPT"] }
    },
    _sum: { amount: true },
  });
  const paymentMap = new Map(payments.map(p => [p.customerId, Number(p._sum.amount)]));

  const creditNotes = await prisma.noteDocument.groupBy({
    by: ["customerId"],
    where: { 
      companyId, 
      type: "CREDIT_NOTE", 
      partyType: "CUSTOMER", 
      status: { not: "VOID" }, 
      date: { lte: asOfEnd }, 
      customerId: { not: null } 
    },
    _sum: { grandTotal: true },
  });
  const creditNoteMap = new Map(creditNotes.map(c => [c.customerId, Number(c._sum.grandTotal)]));

  const rows = customers
    .map((customer) => {
      const openingBalance = Number(customer.openingBalance || 0);
      const customerPayments = paymentMap.get(customer.id) || 0;
      const customerCreditNotes = creditNoteMap.get(customer.id) || 0;
      
      const mappedInvoices = customer.invoices.map(inv => ({
        id: inv.id,
        grandTotal: inv.grandTotal,
        dueDate: inv.dueDate,
        documentNo: inv.invoiceNo,
        date: inv.date,
        status: inv.status,
      }));

      const computed = computeLedgerAgeingRow(
        openingBalance,
        mappedInvoices,
        customerPayments,
        customerCreditNotes,
        asOfEnd,
        buckets
      );

      const invoiceRows = computed.detailRows.map(row => ({
        ...row,
        invoiceNo: row.documentNo,
        currency: "INR",
      }));

      return {
        customerId:       customer.id,
        customerCode:     customer.code,
        customerName:     customer.name,
        category:         customer.category ?? "",
        city:             customer.city ?? "",
        currency:         "INR",
        totalOutstanding: computed.totalOutstanding,
        ...computed,
        invoices:         view === "detail" ? invoiceRows : undefined,
      };
    })
    .filter((row) => row.totalOutstanding !== 0 || Number(row.openingBalance || 0) !== 0 || row.invoices?.length || paymentMap.get(row.customerId));

  // ── Grand Totals ──
  const grandTotals: Record<string, number> = { totalOutstanding: 0 };
  for (const b of buckets) grandTotals[b.label] = 0;
  for (const row of rows) {
    for (const b of buckets) {
      grandTotals[b.label] = r2(grandTotals[b.label] + ((row as any)[b.label] ?? 0));
    }
    grandTotals.totalOutstanding = r2(grandTotals.totalOutstanding + row.totalOutstanding);
  }

  // ── CSV Export ──
  if (exportFmt === "csv") {
    const headers = ["Customer Code", "Customer Name", "Category", "City", ...buckets.map((b) => b.label), "Total Outstanding"];
    const csvRows = rows.map((row) => [
      row.customerCode,
      row.customerName,
      row.category,
      row.city,
      ...buckets.map((b) => String((row as any)[b.label] ?? 0)),
      String(row.totalOutstanding),
    ]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="receivables-ageing-${asOf.toISOString().slice(0, 10)}.csv"`);
    return res.send(buildCsv(headers, csvRows));
  }

  return ok(res, {
    asOf:        asOfEnd.toISOString().slice(0, 10),
    view,
    buckets:     buckets.map((b) => b.label),
    rows,
    grandTotals,
    reconciliation: {
      totalFromAgeing: grandTotals.totalOutstanding,
      note: "Cross-check with AR Control Account in Trial Balance for full reconciliation.",
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYABLES AGEING
// ─────────────────────────────────────────────────────────────────────────────

export const getPayablesAgeing = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const asOf      = req.query.asOf      ? new Date(String(req.query.asOf))     : new Date();
  const search    = req.query.search    ? String(req.query.search).trim()       : "";
  const category  = req.query.category  ? String(req.query.category).toUpperCase() : "";
  const city      = req.query.city      ? String(req.query.city)                : "";
  const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : "";
  const view      = req.query.view      === "detail" ? "detail" : "summary";
  const exportFmt = req.query.export    ? String(req.query.export)              : "";
  const buckets   = parseBuckets(String(req.query.buckets ?? ""));

  const asOfEnd = new Date(asOf);
  asOfEnd.setHours(23, 59, 59, 999);

  const suppliers = await prisma.supplier.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      ...(city     ? { city: { contains: city } }                           : {}),
      ...(category ? { category }                                           : {}),
      ...(search   ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
        ],
      } : {}),
    },
    include: {
      bills: {
        where: {
          date:   { lte: asOfEnd },
          status: statusFilter
            ? { equals: statusFilter }
            : { notIn: ["VOID", "DRAFT"] },
        },
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const payments = await prisma.payment.groupBy({
    by: ["supplierId"],
    where: { 
      companyId, 
      date: { lte: asOfEnd }, 
      supplierId: { not: null },
      type: { in: ["PAYMENT", "ADVANCE_PAYMENT", "EXPENSE"] }
    },
    _sum: { amount: true },
  });
  const paymentMap = new Map(payments.map(p => [p.supplierId, Number(p._sum.amount)]));

  const debitNotes = await prisma.noteDocument.groupBy({
    by: ["supplierId"],
    where: { 
      companyId, 
      type: "DEBIT_NOTE", 
      partyType: "SUPPLIER", 
      status: { not: "VOID" }, 
      date: { lte: asOfEnd }, 
      supplierId: { not: null } 
    },
    _sum: { grandTotal: true },
  });
  const debitNoteMap = new Map(debitNotes.map(c => [c.supplierId, Number(c._sum.grandTotal)]));

  const rows = suppliers
    .map((supplier) => {
      const openingBalance = Number(supplier.openingBalance || 0);
      const supplierPayments = paymentMap.get(supplier.id) || 0;
      const supplierDebitNotes = debitNoteMap.get(supplier.id) || 0;

      const mappedBills = supplier.bills.map(bill => ({
        id: bill.id,
        grandTotal: bill.grandTotal,
        dueDate: bill.dueDate,
        documentNo: bill.billNo,
        date: bill.date,
        status: bill.status,
      }));

      const computed = computeLedgerAgeingRow(
        openingBalance,
        mappedBills,
        supplierPayments,
        supplierDebitNotes,
        asOfEnd,
        buckets,
        true
      );

      const billRows = computed.detailRows.map(row => ({
        ...row,
        billNo: row.documentNo,
        currency: "INR",
      }));

      return {
        supplierId:    supplier.id,
        supplierCode:  supplier.code,
        supplierName:  supplier.name,
        category:      supplier.category ?? "",
        city:          supplier.city ?? "",
        currency:      "INR",
        totalOutstanding: computed.totalOutstanding,
        ...computed,
        bills:         view === "detail" ? billRows : undefined,
      };
    })
    .filter((row) => row.totalOutstanding !== 0 || Number(row.openingBalance || 0) !== 0 || row.bills?.length || paymentMap.get(row.supplierId));

  // ── Grand Totals ──
  const grandTotals: Record<string, number> = { totalOutstanding: 0 };
  for (const b of buckets) grandTotals[b.label] = 0;
  for (const row of rows) {
    for (const b of buckets) {
      grandTotals[b.label] = r2(grandTotals[b.label] + ((row as any)[b.label] ?? 0));
    }
    grandTotals.totalOutstanding = r2(grandTotals.totalOutstanding + row.totalOutstanding);
  }

  // ── CSV Export ──
  if (exportFmt === "csv") {
    const headers = ["Supplier Code", "Supplier Name", "Category", "City", ...buckets.map((b) => b.label), "Total Outstanding"];
    const csvRows = rows.map((row) => [
      row.supplierCode,
      row.supplierName,
      row.category,
      row.city,
      ...buckets.map((b) => String((row as any)[b.label] ?? 0)),
      String(row.totalOutstanding),
    ]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="payables-ageing-${asOf.toISOString().slice(0, 10)}.csv"`);
    return res.send(buildCsv(headers, csvRows));
  }

  return ok(res, {
    asOf:        asOfEnd.toISOString().slice(0, 10),
    view,
    buckets:     buckets.map((b) => b.label),
    rows,
    grandTotals,
    reconciliation: {
      totalFromAgeing: grandTotals.totalOutstanding,
      note: "Cross-check with AP Control Account in Trial Balance for full reconciliation.",
    },
  });
};
