import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

import { customerSchema } from "@jewelledger/shared";

const getCustomerJournalLines = async (companyId: number, customerId: number, customerName: string) => {
  const arAccounts = await prisma.account.findMany({
    where: {
      companyId,
      OR: [
        { code: "1100" },
        { name: { contains: "Receivable", mode: "insensitive" } },
        { group: { contains: "Receivable", mode: "insensitive" } },
        { group: { contains: "Debtor", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  const arAccountIds = arAccounts.map((a) => a.id);
  if (arAccountIds.length === 0) return [];

  return prisma.journalLine.findMany({
    where: {
      companyId,
      accountId: { in: arAccountIds },
      OR: [
        { narration: { contains: `[Party: ${customerName}`, mode: "insensitive" } },
        { narration: { contains: `#${customerId}]` } },
        { narration: { contains: customerName, mode: "insensitive" } },
      ],
      entry: { status: { not: "VOID" } },
    },
    include: { entry: true },
    orderBy: { entry: { date: "asc" } },
  });
};

export const listCustomers = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const search = req.query.search ? String(req.query.search) : "";
  const category = req.query.category ? String(req.query.category).toUpperCase() : "";
  const city = req.query.city ? String(req.query.city) : "";
  const status = req.query.status ? String(req.query.status).toUpperCase() : "";

  const rows = await prisma.customer.findMany({
    where: {
      companyId,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { mobile: { contains: search } },
          { gstin: { contains: search } },
        ],
      }),
      ...(category && { category }),
      ...(city && { city: { contains: city } }),
      ...(status && { status }),
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const [aggregate, journalLines] = await Promise.all([
        prisma.invoice.aggregate({
          where: { companyId, customerId: row.id, status: { not: "VOID" } },
          _sum: { grandTotal: true, balanceDue: true },
        }),
        getCustomerJournalLines(companyId, row.id, row.name),
      ]);
      const netJournalDue = journalLines.reduce((sum, jl) => {
        return sum + (Number(jl.debit) - Number(jl.credit));
      }, 0);
      return {
        ...row,
        totalBusiness: Number(aggregate._sum?.grandTotal || 0),
        outstanding: Math.max(0, Number(aggregate._sum?.balanceDue || 0) + netJournalDue),
      };
    }),
  );
  return ok(res, enriched);
};

export const getCustomerById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const row = await prisma.customer.findFirst({
    where: { id: Number(req.params.id), companyId },
  });
  
  if (!row) return fail(res, 404, "CUSTOMER_NOT_FOUND", "Customer not found");

  const [invoiceAggregate, advanceAggregate, journalLines] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, customerId: row.id, status: { not: "VOID" } },
      _sum: { grandTotal: true, balanceDue: true },
    }),
    prisma.payment.aggregate({
      where: {
        companyId,
        customerId: row.id,
        type: { in: ["ADVANCE_RECEIPT", "ADVANCE_ADJUSTMENT"] },
      },
      _sum: { amount: true },
    }),
    getCustomerJournalLines(companyId, row.id, row.name),
  ]);

  const netJournalDue = journalLines.reduce((sum, jl) => {
    return sum + (Number(jl.debit) - Number(jl.credit));
  }, 0);

  const outstanding = Math.max(0, Number(invoiceAggregate._sum?.balanceDue || 0) + netJournalDue);
  const creditLimit = Number(row.creditLimit || 0);

  return ok(res, {
    ...row,
    totalBusiness: Number(invoiceAggregate._sum?.grandTotal || 0),
    outstanding,
    advanceBalance: Number(advanceAggregate._sum?.amount || 0),
    creditUsedPct: creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0,
  });
};

export const getCustomerLedger = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const customer = await prisma.customer.findFirst({
    where: { id: Number(req.params.id), companyId },
  });
  if (!customer) return fail(res, 404, "CUSTOMER_NOT_FOUND", "Customer not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* ── Fetch all documents ── */
  const [invoices, creditNotes, standalonePayments, journalLines] = await Promise.all([
    prisma.invoice.findMany({
      where: { customerId: customer.id, companyId, status: { not: "VOID" } },
      include: { payments: { orderBy: { date: "asc" } } },
      orderBy: { date: "asc" },
    }),
    prisma.noteDocument.findMany({
      where: { companyId, type: "CREDIT_NOTE", partyType: "CUSTOMER", customerId: customer.id, status: { not: "VOID" } },
      orderBy: { date: "asc" },
    }),
    prisma.payment.findMany({
      where: { companyId, customerId: customer.id, invoiceId: null, type: { in: ["ADVANCE_RECEIPT", "RECEIPT"] } },
      orderBy: { date: "asc" },
    }),
    getCustomerJournalLines(companyId, customer.id, customer.name),
  ]);

  /* ── Build rows ── */
  const rows: any[] = [];

  // Opening balance row (if non-zero)
  if (Number(customer.openingBalance) !== 0) {
    rows.push({
      type: "Opening Balance",
      number: "—",
      reference: null,
      issueDate: customer.createdAt,
      dueDate: null,
      dueInDays: null,
      paidDate: null,
      paid: 0,
      due: Number(customer.openingBalance),
      total: Number(customer.openingBalance),
      status: "POSTED",
      sourceId: null,
      sourcePath: null,
    });
  }

  // Invoices + their payments
  for (const inv of invoices) {
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
    let dueInDays: number | null = null;
    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0);
      dueInDays = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
    }

    // Effective status: mark OVERDUE if unpaid and past due
    let status = inv.status;
    if (
      dueInDays !== null &&
      dueInDays < 0 &&
      Number(inv.balanceDue) > 0 &&
      inv.status !== "PAID" &&
      inv.status !== "VOID"
    ) {
      status = "OVERDUE";
    }

    // Last payment date
    const lastPayment = inv.payments.length > 0 ? inv.payments[inv.payments.length - 1] : null;

    rows.push({
      type: "Invoice",
      number: inv.invoiceNo,
      reference: inv.notes ?? null,
      issueDate: inv.date,
      dueDate: inv.dueDate ?? null,
      dueInDays,
      paidDate: lastPayment?.date ?? null,
      paid: Number(inv.paidAmount),
      due: Number(inv.balanceDue),
      total: Number(inv.grandTotal),
      status,
      sourceId: inv.id,
      sourcePath: `/invoices/${inv.id}/edit`,
    });

    // Inline receipt rows for each payment
    for (const pmt of inv.payments) {
      rows.push({
        type: "Receive Money",
        number: pmt.reference || `RCP-${pmt.id}`,
        reference: inv.invoiceNo,
        issueDate: pmt.date,
        dueDate: null,
        dueInDays: null,
        paidDate: pmt.date,
        paid: Number(pmt.amount),
        due: 0,
        total: Number(pmt.amount),
        status: "PAID",
        sourceId: pmt.id,
        sourcePath: `/customers/${customer.id}?paymentId=${pmt.id}`,
        payment: {
          id: pmt.id,
          date: pmt.date ? new Date(pmt.date).toISOString().slice(0, 10) : "",
          mode: pmt.mode,
          amount: Number(pmt.amount),
          reference: pmt.reference || "",
          notes: pmt.notes || "",
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          customerName: customer.name,
        },
      });
    }
  }

  // Credit notes
  for (const cn of creditNotes) {
    rows.push({
      type: "Sales Credit Note",
      number: cn.noteNo,
      reference: cn.referenceNo ?? null,
      issueDate: cn.date,
      dueDate: null,
      dueInDays: null,
      paidDate: null,
      paid: 0,
      due: -Number(cn.grandTotal),   // negative — reduces balance
      total: -Number(cn.grandTotal),
      status: cn.status,
      sourceId: cn.id,
      sourcePath: `/credit-notes/${cn.id}`,
    });
  }

  // Standalone advance receipts / unlinked payments
  for (const pmt of standalonePayments) {
    rows.push({
      type: "Receive Money",
      number: pmt.reference || `RCP-${pmt.id}`,
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
      sourcePath: `/customers/${customer.id}?paymentId=${pmt.id}`,
      payment: {
        id: pmt.id,
        date: pmt.date ? new Date(pmt.date).toISOString().slice(0, 10) : "",
        mode: pmt.mode,
        amount: Number(pmt.amount),
        reference: pmt.reference || "",
        notes: pmt.notes || "",
        invoiceId: null,
        invoiceNo: null,
        customerName: customer.name,
      },
    });
  }

  // Journal entries touching Accounts Receivable for this customer
  for (const jLine of journalLines) {
    const isDebit = Number(jLine.debit) > 0;
    const amount = isDebit ? Number(jLine.debit) : Number(jLine.credit);

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
      paid: isDebit ? 0 : amount,
      due: isDebit ? amount : -amount,
      total: isDebit ? amount : -amount,
      debit: isDebit ? amount : 0,
      credit: isDebit ? 0 : amount,
      refNo: jLine.entry.entryNo,
      narration: cleanRemark,
      status: jLine.entry.status,
      sourceId: jLine.entry.id,
      sourcePath: `/journal/${jLine.entry.id}/edit`,
    });
  }

  // Sort all rows by issueDate ascending
  rows.sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());

  // Compute running balance (debit-nature: invoices +, payments/credit notes -)
  let runningBalance = 0;
  const ledgerRows = rows.map((row) => {
    if (row.type === "Invoice" || row.type === "Opening Balance") {
      runningBalance = Number((runningBalance + row.total).toFixed(2));
    } else if (row.type === "Receive Money") {
      runningBalance = Number((runningBalance - row.paid).toFixed(2));
    } else if (row.type === "Sales Credit Note") {
      runningBalance = Number((runningBalance + row.total).toFixed(2)); // total is already negative
    } else if (row.type === "Journal Entry") {
      runningBalance = Number((runningBalance + row.total).toFixed(2));
    }
    return { ...row, runningBalance };
  });

  const netJournalDue = journalLines.reduce((sum, jl) => {
    return sum + (Number(jl.debit) - Number(jl.credit));
  }, 0);

  const totalOutstanding = Math.max(0, invoices.reduce((s, i) => s + Number(i.balanceDue), 0) + netJournalDue);

  return ok(res, {
    openingBalance: Number(customer.openingBalance),
    rows: ledgerRows,
    closingBalance: runningBalance,
    totalInvoiced: invoices.reduce((s, i) => s + Number(i.grandTotal), 0),
    totalPaid: invoices.reduce((s, i) => s + Number(i.paidAmount), 0),
    totalOutstanding,
  });
};


export const getCustomerInvoices = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const rows = await prisma.invoice.findMany({
    where: { customerId: Number(req.params.id), companyId },
    orderBy: { date: "desc" }
  });
  return ok(res, rows);
};

export const getCustomerAdvances = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  
  const rows = await prisma.payment.findMany({
    where: {
      companyId,
      customerId: Number(req.params.id),
      type: { in: ["ADVANCE_RECEIPT", "ADVANCE_ADJUSTMENT"] },
    },
    orderBy: { date: "desc" },
  });
  return ok(res, rows);
};

const sanitizeCustomerData = (data: any) => {
  const {
    billingAddress,
    shippingAddress,
    companyName,
    workPhone,
    currency,
    paymentTerms,
    ...cleanData
  } = data;
  return cleanData;
};

export const createCustomer = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid customer payload", parsed.error.issues);
  }

  const code = parsed.data.code || `CUST-${Date.now()}`;
  const existing = await prisma.customer.findFirst({
    where: { companyId, code }
  });
  if (existing) {
    return fail(res, 400, "DUPLICATE_CODE", "Customer code already exists");
  }

  // Remove fields not in the DB model
  const customerData = sanitizeCustomerData(parsed.data);

  const row = await prisma.customer.create({
    data: {
      ...customerData,
      code,
      companyId,
      createdBy: getActor(req),
      status: "ACTIVE",
    }
  });
  
  return created(res, row, "Customer created");
};

export const updateCustomer = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid customer payload", parsed.error.issues);
  }

  const customerData = sanitizeCustomerData(parsed.data);

  try {
    const row = await prisma.customer.update({
      where: { id: Number(req.params.id), companyId },
      data: customerData,
    });
    return ok(res, row, "Customer updated");
  } catch {
    return fail(res, 404, "CUSTOMER_NOT_FOUND", "Customer not found");
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  try {
    await prisma.customer.update({
      where: { id: Number(req.params.id), companyId },
      data: { status: "INACTIVE" },
    });
    return ok(res, true, "Customer deactivated");
  } catch {
    return fail(res, 404, "CUSTOMER_NOT_FOUND", "Customer not found");
  }
};

export const exportCustomers = async (_req: Request, res: Response) =>
  ok(res, { url: "/export/customers.xlsx" });

export const importCustomers = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  let imported = 0;
  let duplicates = 0;

  for (const source of rows) {
    const parsed = customerSchema.safeParse(source);
    if (!parsed.success) continue;
    const existing = await prisma.customer.findFirst({ where: { companyId, code: parsed.data.code } });
    if (existing) {
      duplicates += 1;
      continue;
    }
    const customerData = sanitizeCustomerData(parsed.data);
    await prisma.customer.create({
      data: { ...customerData, companyId, createdBy: getActor(req), status: "ACTIVE" },
    });
    imported += 1;
  }

  ok(res, { imported, duplicates }, "Customers imported");
};

export const sendCustomerStatement = async (req: Request, res: Response) =>
  ok(res, true, `Statement queued for customer ${req.params.id}`);
