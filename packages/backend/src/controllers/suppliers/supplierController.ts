import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

const supplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  mobile: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().optional(),
  city: z.string().min(1),
  category: z.enum(["BULLION", "DIAMOND", "KARIGAR", "GENERAL"]),
  creditLimit: z.coerce.number().nonnegative(),
  creditDays: z.coerce.number().int().nonnegative(),
  notes: z.string().optional(),
});

const getSupplierJournalLines = async (companyId: number, supplierId: number, supplierName: string) => {
  const apAccounts = await prisma.account.findMany({
    where: {
      companyId,
      OR: [
        { code: "2100" },
        { name: { contains: "Payable", mode: "insensitive" } },
        { group: { contains: "Payable", mode: "insensitive" } },
        { group: { contains: "Creditor", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  const apAccountIds = apAccounts.map((a) => a.id);
  if (apAccountIds.length === 0) return [];

  return prisma.journalLine.findMany({
    where: {
      companyId,
      accountId: { in: apAccountIds },
      OR: [
        { narration: { contains: `[Party: ${supplierName}`, mode: "insensitive" } },
        { narration: { contains: `#${supplierId}]` } },
        { narration: { contains: supplierName, mode: "insensitive" } },
      ],
      entry: { status: { not: "VOID" } },
    },
    include: { entry: true },
    orderBy: { entry: { date: "asc" } },
  });
};

export const listSuppliers = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const search = req.query.search ? String(req.query.search) : "";
  const category = req.query.category ? String(req.query.category).toUpperCase() : "";
  const city = req.query.city ? String(req.query.city) : "";
  const status = req.query.status ? String(req.query.status).toUpperCase() : "";

  const rows = await prisma.supplier.findMany({
    where: {
      companyId,
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { mobile: { contains: search } },
          { gstin: { contains: search } },
        ]
      } : {}),
      ...(category ? { category } : {}),
      ...(city ? { city: { contains: city } } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      bills: {
        select: { grandTotal: true, paidAmount: true, balanceDue: true, date: true },
        orderBy: { date: "desc" },
        take: 1
      }
    },
    orderBy: { name: "asc" },
  });

  const suppliersWithFinancials = await Promise.all(rows.map(async (row) => {
    const [aggregate, journalLines] = await Promise.all([
      prisma.bill.aggregate({
        where: { companyId, supplierId: row.id, status: { not: "VOID" } },
        _sum: { grandTotal: true, balanceDue: true }
      }),
      getSupplierJournalLines(companyId, row.id, row.name),
    ]);

    const netJournalDue = journalLines.reduce((sum, jl) => {
      return sum + (Number(jl.credit) - Number(jl.debit));
    }, 0);
    
    return {
      ...row,
      totalBusiness: Number(aggregate._sum?.grandTotal || 0),
      outstanding: Math.max(0, Number(aggregate._sum?.balanceDue || 0) + netJournalDue),
      lastBill: row.bills[0]?.date || null
    };
  }));

  return ok(res, suppliersWithFinancials);
};

export const getSupplierById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const row = await prisma.supplier.findFirst({
    where: { id: Number(req.params.id), companyId },
  });
  if (!row) return fail(res, 404, "SUPPLIER_NOT_FOUND", "Supplier not found");

  const [aggregate, journalLines] = await Promise.all([
    prisma.bill.aggregate({
      where: { companyId, supplierId: row.id, status: { not: "VOID" } },
      _sum: { grandTotal: true, balanceDue: true }
    }),
    getSupplierJournalLines(companyId, row.id, row.name),
  ]);

  const netJournalDue = journalLines.reduce((sum, jl) => {
    return sum + (Number(jl.credit) - Number(jl.debit));
  }, 0);

  return ok(res, { 
    ...row, 
    totalBusiness: Number(aggregate._sum?.grandTotal || 0),
    outstanding: Math.max(0, Number(aggregate._sum?.balanceDue || 0) + netJournalDue)
  });
};

export const getSupplierLedger = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const supplier = await prisma.supplier.findFirst({
    where: { id: Number(req.params.id), companyId },
  });
  if (!supplier) return fail(res, 404, "SUPPLIER_NOT_FOUND", "Supplier not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* ── Fetch all documents ── */
  const [bills, debitNotes, standalonePayments, journalLines] = await Promise.all([
    prisma.bill.findMany({
      where: { supplierId: supplier.id, companyId, status: { not: "VOID" } },
      include: { payments: { orderBy: { date: "asc" } } },
      orderBy: { date: "asc" },
    }),
    prisma.noteDocument.findMany({
      where: { companyId, type: "DEBIT_NOTE", partyType: "SUPPLIER", supplierId: supplier.id, status: { not: "VOID" } },
      orderBy: { date: "asc" },
    }),
    prisma.payment.findMany({
      where: { companyId, supplierId: supplier.id, billId: null },
      orderBy: { date: "asc" },
    }),
    getSupplierJournalLines(companyId, supplier.id, supplier.name),
  ]);

  /* ── Build rows ── */
  const rows: any[] = [];

  // Opening balance row (if non-zero)
  if (Number(supplier.openingBalance) !== 0) {
    rows.push({
      type: "Opening Balance",
      number: "—",
      reference: null,
      issueDate: supplier.createdAt,
      dueDate: null,
      dueInDays: null,
      paidDate: null,
      paid: 0,
      due: Number(supplier.openingBalance),
      total: Number(supplier.openingBalance),
      status: "POSTED",
      sourceId: null,
      sourcePath: null,
    });
  }

  // Bills + their payments
  for (const b of bills) {
    const dueDate = b.dueDate ? new Date(b.dueDate) : null;
    let dueInDays: number | null = null;
    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0);
      dueInDays = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
    }

    // Effective status: mark OVERDUE if unpaid and past due
    let status = b.status;
    if (
      dueInDays !== null &&
      dueInDays < 0 &&
      Number(b.balanceDue) > 0 &&
      b.status !== "PAID" &&
      b.status !== "VOID"
    ) {
      status = "OVERDUE";
    }

    // Last payment date
    const lastPayment = b.payments.length > 0 ? b.payments[b.payments.length - 1] : null;

    rows.push({
      type: "Bill",
      number: b.billNo,
      reference: null,
      issueDate: b.date,
      dueDate: b.dueDate ?? null,
      dueInDays,
      paidDate: lastPayment?.date ?? null,
      paid: Number(b.paidAmount),
      due: Number(b.balanceDue),
      total: Number(b.grandTotal),
      status,
      sourceId: b.id,
      sourcePath: `/bills/${b.id}`,
    });

    // Inline receipt rows for each payment
    for (const pmt of b.payments) {
      rows.push({
        type: "Payment",
        number: pmt.reference || `PAY-${pmt.id}`,
        reference: b.billNo,
        issueDate: pmt.date,
        dueDate: null,
        dueInDays: null,
        paidDate: pmt.date,
        paid: Number(pmt.amount),
        due: 0,
        total: Number(pmt.amount),
        status: "PAID",
        sourceId: pmt.id,
        sourcePath: null,
      });
    }
  }

  // Debit notes
  for (const dn of debitNotes) {
    rows.push({
      type: "Purchase Debit Note",
      number: dn.noteNo,
      reference: dn.referenceNo ?? null,
      issueDate: dn.date,
      dueDate: null,
      dueInDays: null,
      paidDate: null,
      paid: 0,
      due: -Number(dn.grandTotal),   // negative — reduces balance
      total: -Number(dn.grandTotal),
      status: dn.status,
      sourceId: dn.id,
      sourcePath: `/debit-notes/${dn.id}`,
    });
  }

  // Standalone advance receipts / unlinked payments
  for (const pmt of standalonePayments) {
    rows.push({
      type: "Payment",
      number: pmt.reference || `PAY-${pmt.id}`,
      reference: null,
      issueDate: pmt.date,
      dueDate: null,
      dueInDays: null,
      paidDate: pmt.date,
      paid: Number(pmt.amount),
      due: 0,
      total: Number(pmt.amount),
      status: "PAID",
      sourceId: pmt.id,
      sourcePath: null,
    });
  }

  // Journal entries touching Accounts Payable for this supplier
  for (const jLine of journalLines) {
    const isCredit = Number(jLine.credit) > 0;
    const amount = isCredit ? Number(jLine.credit) : Number(jLine.debit);

    let cleanRemark = jLine.narration || "";
    cleanRemark = cleanRemark.replace(/^\[Party:\s*.*?\]\s*/, "").replace(/^Party:\s*.*?\s*/, "").trim();
    if (!cleanRemark) {
      cleanRemark = jLine.entry.narration || "Journal Adjustment";
    }

    rows.push({
      type: "Journal Entry",
      number: jLine.entry.entryNo,
      reference: cleanRemark,
      issueDate: jLine.entry.date,
      date: jLine.entry.date ? new Date(jLine.entry.date).toISOString().slice(0, 10) : "",
      dueDate: null,
      dueInDays: null,
      paidDate: null,
      paid: isCredit ? 0 : amount,
      due: isCredit ? amount : -amount,
      total: isCredit ? amount : -amount,
      debit: isCredit ? 0 : amount,
      credit: isCredit ? amount : 0,
      refNo: jLine.entry.entryNo,
      narration: cleanRemark,
      status: jLine.entry.status,
      sourceId: jLine.entry.id,
      sourcePath: `/journal/${jLine.entry.id}/edit`,
    });
  }

  // Sort all rows by issueDate ascending
  rows.sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());

  // Compute running balance (credit-nature: bills +, payments/debit notes -)
  let runningBalance = 0;
  const ledgerRows = rows.map((row) => {
    if (row.type === "Bill" || row.type === "Opening Balance") {
      runningBalance = Number((runningBalance + row.total).toFixed(2));
    } else if (row.type === "Payment") {
      runningBalance = Number((runningBalance - row.paid).toFixed(2));
    } else if (row.type === "Purchase Debit Note") {
      runningBalance = Number((runningBalance + row.total).toFixed(2)); // total is already negative
    } else if (row.type === "Journal Entry") {
      runningBalance = Number((runningBalance + row.total).toFixed(2));
    }
    return { ...row, runningBalance };
  });

  const netJournalDue = journalLines.reduce((sum, jl) => {
    return sum + (Number(jl.credit) - Number(jl.debit));
  }, 0);

  const totalOutstanding = Math.max(0, bills.reduce((s, b) => s + Number(b.balanceDue), 0) + netJournalDue);

  return ok(res, {
    openingBalance: Number(supplier.openingBalance),
    rows: ledgerRows,
    closingBalance: runningBalance,
    totalInvoiced: bills.reduce((s, b) => s + Number(b.grandTotal), 0),
    totalPaid: bills.reduce((s, b) => s + Number(b.paidAmount), 0),
    totalOutstanding,
  });
};

export const getSupplierBills = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const bills = await prisma.bill.findMany({
    where: { supplierId: Number(req.params.id), companyId },
    orderBy: { date: "desc" }
  });
  
  return ok(res, bills);
};

export const createSupplier = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid supplier payload", parsed.error.issues);
  
  const existing = await prisma.supplier.findFirst({
    where: { companyId, code: parsed.data.code }
  });
  if (existing) {
    return fail(res, 400, "DUPLICATE_CODE", "Supplier code already exists");
  }

  const row = await prisma.supplier.create({
    data: {
      ...parsed.data,
      companyId,
      email: parsed.data.email || null,
      openingBalance: 0,
      createdBy: getActor(req),
    }
  });

  return created(res, row, "Supplier created");
};

export const updateSupplier = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid supplier payload", parsed.error.issues);
  
  try {
    const row = await prisma.supplier.update({
      where: { id: Number(req.params.id), companyId },
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
      },
    });
    return ok(res, row, "Supplier updated");
  } catch {
    return fail(res, 404, "SUPPLIER_NOT_FOUND", "Supplier not found");
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  try {
    const aggregate = await prisma.bill.aggregate({
      where: { companyId, supplierId: Number(req.params.id), status: { not: "VOID" } },
      _sum: { balanceDue: true }
    });
    
    if (Number(aggregate._sum?.balanceDue || 0) > 0) {
      return fail(res, 400, "OUTSTANDING_EXISTS", "Cannot deactivate supplier with outstanding balance");
    }

    await prisma.supplier.update({
      where: { id: Number(req.params.id), companyId },
      data: { status: "INACTIVE" },
    });
    return ok(res, true, "Supplier deactivated");
  } catch {
    return fail(res, 404, "SUPPLIER_NOT_FOUND", "Supplier not found");
  }
};
