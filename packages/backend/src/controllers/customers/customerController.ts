import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

import { customerSchema } from "@jewelledger/shared";

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
      const aggregate = await prisma.invoice.aggregate({
        where: { companyId, customerId: row.id, status: { not: "VOID" } },
        _sum: { grandTotal: true, balanceDue: true },
      });
      return {
        ...row,
        totalBusiness: Number(aggregate._sum?.grandTotal || 0),
        outstanding: Number(aggregate._sum?.balanceDue || 0),
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

  const invoiceAggregate = await prisma.invoice.aggregate({
    where: { companyId, customerId: row.id, status: { not: "VOID" } },
    _sum: { grandTotal: true, balanceDue: true },
  });
  const advanceAggregate = await prisma.payment.aggregate({
    where: {
      companyId,
      customerId: row.id,
      type: { in: ["ADVANCE_RECEIPT", "ADVANCE_ADJUSTMENT"] },
    },
    _sum: { amount: true },
  });

  const outstanding = Number(invoiceAggregate._sum?.balanceDue || 0);
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
  const [invoices, creditNotes, standalonePayments] = await Promise.all([
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
      sourcePath: `/invoices/${inv.id}`,
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
        sourcePath: null,
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
      sourcePath: null,
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
    }
    return { ...row, runningBalance };
  });

  return ok(res, {
    openingBalance: Number(customer.openingBalance),
    rows: ledgerRows,
    closingBalance: runningBalance,
    totalInvoiced: invoices.reduce((s, i) => s + Number(i.grandTotal), 0),
    totalPaid: invoices.reduce((s, i) => s + Number(i.paidAmount), 0),
    totalOutstanding: invoices.reduce((s, i) => s + Number(i.balanceDue), 0),
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
