import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { resolveAccountingAccounts, upsertPostedJournalForSource } from "../../lib/accounting";
import { prisma } from "../../lib/prisma";

const paymentUpdateSchema = z.object({
  date: z.string().min(1),
  mode: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  accountId: z.coerce.number().optional().nullable(),
});

const getCompanyId = (req: Request): number => {
  const value = req.auth?.companyId ?? req.companyContext?.company?.id ?? req.header("x-company-id");
  return Number(value);
};

export const getPaymentById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const paymentId = Number(req.params.id);

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, companyId },
    include: {
      customer: true,
      supplier: true,
      invoice: true,
      bill: true,
    },
  });

  if (!payment) {
    return fail(res, 404, "PAYMENT_NOT_FOUND", "Payment not found");
  }

  return ok(res, payment);
};

export const updatePayment = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const paymentId = Number(req.params.id);

  const parsed = paymentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid payment payload", parsed.error.issues);
  }

  const existingPayment = await prisma.payment.findFirst({
    where: { id: paymentId, companyId },
    include: { invoice: true, bill: true },
  });

  if (!existingPayment) {
    return fail(res, 404, "PAYMENT_NOT_FOUND", "Payment not found");
  }

  const updatedPayment = await prisma.$transaction(async (tx) => {
    // 1. Update Payment record
    const pmt = await tx.payment.update({
      where: { id: paymentId },
      data: {
        date: new Date(parsed.data.date),
        mode: parsed.data.mode,
        amount: parsed.data.amount,
        reference: parsed.data.reference ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    // 2. If linked to an invoice, recalculate invoice totals and balanceDue
    if (existingPayment.invoiceId) {
      const allInvoicePayments = await tx.payment.findMany({
        where: { invoiceId: existingPayment.invoiceId, companyId },
      });

      const totalPaid = allInvoicePayments.reduce(
        (sum, p) => sum + (p.id === paymentId ? parsed.data.amount : Number(p.amount)),
        0,
      );

      const invoice = await tx.invoice.findUnique({
        where: { id: existingPayment.invoiceId },
      });

      if (invoice) {
        const grandTotal = Number(invoice.grandTotal);
        const balanceDue = Math.max(0, grandTotal - totalPaid);
        const status = balanceDue === 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "POSTED";

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: totalPaid,
            balanceDue,
            status,
          },
        });
      }

      // Update any document settlement linked to this payment
      await tx.documentSettlement.updateMany({
        where: { sourcePaymentId: paymentId, companyId },
        data: { amount: parsed.data.amount },
      });
    }

    // 3. If linked to a bill, recalculate bill totals and balanceDue
    if (existingPayment.billId) {
      const allBillPayments = await tx.payment.findMany({
        where: { billId: existingPayment.billId, companyId },
      });

      const totalPaid = allBillPayments.reduce(
        (sum, p) => sum + (p.id === paymentId ? parsed.data.amount : Number(p.amount)),
        0,
      );

      const bill = await tx.bill.findUnique({
        where: { id: existingPayment.billId },
      });

      if (bill) {
        const grandTotal = Number(bill.grandTotal);
        const balanceDue = Math.max(0, grandTotal - totalPaid);
        const status = balanceDue === 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "POSTED";

        await tx.bill.update({
          where: { id: bill.id },
          data: {
            paidAmount: totalPaid,
            balanceDue,
            status,
          },
        });
      }

      await tx.documentSettlement.updateMany({
        where: { sourcePaymentId: paymentId, companyId },
        data: { amount: parsed.data.amount },
      });
    }

    // 4. Update journal entry lines if present
    const sourceKeys = [
      `BILL_PAYMENT:${paymentId}`,
      `PAYMENT:${paymentId}`,
      `ADVANCE:${paymentId}`,
      `RECEIPT:${paymentId}`,
      `SUPPLIER_ADVANCE:${paymentId}`,
    ];

    const je = await tx.journalEntry.findFirst({
      where: { companyId, type: { in: sourceKeys } },
      include: { lines: true },
    });

    if (je) {
      const isReceipt =
        existingPayment.type === "RECEIPT" || existingPayment.type === "ADVANCE_RECEIPT";

      for (const line of je.lines) {
        const isCashBank = isReceipt ? line.debit > 0 : line.credit > 0;
        const newAccountId = isCashBank && parsed.data.accountId ? Number(parsed.data.accountId) : line.accountId;
        const newDebit = line.debit > 0 ? parsed.data.amount : 0;
        const newCredit = line.credit > 0 ? parsed.data.amount : 0;

        await tx.journalLine.update({
          where: { id: line.id },
          data: {
            accountId: newAccountId,
            debit: newDebit,
            credit: newCredit,
          },
        });
      }
    }

    return pmt;
  });

  return ok(res, updatedPayment, "Payment updated successfully");
};

export const deletePayment = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const paymentId = Number(req.params.id);

  const existingPayment = await prisma.payment.findFirst({
    where: { id: paymentId, companyId },
  });

  if (!existingPayment) {
    return fail(res, 404, "PAYMENT_NOT_FOUND", "Payment not found");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete associated settlements
    await tx.documentSettlement.deleteMany({
      where: { sourcePaymentId: paymentId, companyId },
    });

    // 2. Delete payment
    await tx.payment.delete({
      where: { id: paymentId },
    });

    // 3. Recalculate invoice if linked
    if (existingPayment.invoiceId) {
      const remainingPayments = await tx.payment.findMany({
        where: { invoiceId: existingPayment.invoiceId, companyId },
      });

      const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const invoice = await tx.invoice.findUnique({
        where: { id: existingPayment.invoiceId },
      });

      if (invoice) {
        const grandTotal = Number(invoice.grandTotal);
        const balanceDue = Math.max(0, grandTotal - totalPaid);
        const status = balanceDue === 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "POSTED";

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: totalPaid, balanceDue, status },
        });
      }
    }

    // 4. Recalculate bill if linked
    if (existingPayment.billId) {
      const remainingPayments = await tx.payment.findMany({
        where: { billId: existingPayment.billId, companyId },
      });

      const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const bill = await tx.bill.findUnique({
        where: { id: existingPayment.billId },
      });

      if (bill) {
        const grandTotal = Number(bill.grandTotal);
        const balanceDue = Math.max(0, grandTotal - totalPaid);
        const status = balanceDue === 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "POSTED";

        await tx.bill.update({
          where: { id: bill.id },
          data: { paidAmount: totalPaid, balanceDue, status },
        });
      }
    }

    // 5. Delete associated journal entry & lines
    const sourceKeys = [
      `BILL_PAYMENT:${paymentId}`,
      `PAYMENT:${paymentId}`,
      `ADVANCE:${paymentId}`,
      `RECEIPT:${paymentId}`,
      `SUPPLIER_ADVANCE:${paymentId}`,
    ];
    const jes = await tx.journalEntry.findMany({
      where: { companyId, type: { in: sourceKeys } },
      select: { id: true },
    });
    if (jes.length > 0) {
      const jeIds = jes.map((j) => j.id);
      await tx.journalLine.deleteMany({ where: { entryId: { in: jeIds }, companyId } });
      await tx.journalEntry.deleteMany({ where: { id: { in: jeIds }, companyId } });
    }
  });

  return ok(res, { id: paymentId }, "Payment deleted successfully");
};

const supplierPaymentSchema = z.object({
  supplierId: z.coerce.number(),
  accountId: z.coerce.number(),
  billId: z.coerce.number().optional().nullable(),
  date: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  mode: z.enum(["CASH", "CARD", "UPI", "CHEQUE", "BANK_TRANSFER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const listSupplierPayments = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return fail(res, 401, "UNAUTHORIZED", "Missing company context");

    const fromDate = req.query.from ? new Date(String(req.query.from)) : undefined;
    let toDate = req.query.to ? new Date(String(req.query.to)) : undefined;
    if (toDate && !String(req.query.to).includes("T")) {
      toDate.setHours(23, 59, 59, 999);
    }

    const dateFilter =
      fromDate && toDate
        ? { gte: fromDate, lte: toDate }
        : fromDate
        ? { gte: fromDate }
        : toDate
        ? { lte: toDate }
        : undefined;

    const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined;
    const mode = req.query.mode ? String(req.query.mode) : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const typeParam = req.query.type ? String(req.query.type) : undefined;
    const typeFilter =
      typeParam === "ALL"
        ? undefined
        : typeParam
        ? typeParam
        : { in: ["PAYMENT", "ADVANCE_PAYMENT"] };

    const rows = await prisma.payment.findMany({
      where: {
        companyId,
        ...(typeFilter ? (typeof typeFilter === "string" ? { type: typeFilter } : { type: typeFilter }) : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(mode ? { mode } : {}),
        ...(dateFilter ? { date: dateFilter } : {}),
        ...(search
          ? {
              OR: [
                { reference: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                { supplier: { name: { contains: search, mode: "insensitive" } } },
                { bill: { billNo: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, code: true, mobile: true } },
        bill: { select: { id: true, billNo: true, date: true, dueDate: true, grandTotal: true, balanceDue: true } },
      },
      orderBy: { date: "desc" },
    });

    const sourceKeys: string[] = [];
    rows.forEach((r) => {
      sourceKeys.push(`BILL_PAYMENT:${r.id}`);
      sourceKeys.push(`PAYMENT:${r.id}`);
      sourceKeys.push(`SUPPLIER_ADVANCE:${r.id}`);
    });

    const journalEntries =
      sourceKeys.length > 0
        ? await prisma.journalEntry.findMany({
            where: { companyId, type: { in: sourceKeys } },
            include: {
              lines: {
                where: { credit: { gt: 0 } },
              },
            },
          })
        : [];

    const accountIds = Array.from(
      new Set(journalEntries.flatMap((je) => je.lines.map((l) => l.accountId))),
    );
    const accounts =
      accountIds.length > 0
        ? await prisma.account.findMany({
            where: { id: { in: accountIds } },
            select: { id: true, code: true, name: true, group: true },
          })
        : [];
    const accountsById = new Map<number, { id: number; code: string; name: string; group: string }>(
      accounts.map((a) => [a.id, a]),
    );

    const accountBySourceKey = new Map<string, { id: number; code: string; name: string; group: string }>();
    for (const je of journalEntries) {
      if (je.type && je.lines[0]?.accountId) {
        const acc = accountsById.get(je.lines[0].accountId);
        if (acc) {
          accountBySourceKey.set(je.type, acc);
        }
      }
    }

    const enriched = rows.map((r) => ({
      ...r,
      paidFromAccount:
        accountBySourceKey.get(`BILL_PAYMENT:${r.id}`) ||
        accountBySourceKey.get(`PAYMENT:${r.id}`) ||
        accountBySourceKey.get(`SUPPLIER_ADVANCE:${r.id}`) ||
        null,
    }));

    return ok(res, enriched);
  } catch (error: any) {
    console.error("Error in listSupplierPayments:", error);
    return fail(res, 500, "SUPPLIER_PAYMENTS_ERROR", error?.message || "Failed to list supplier payments");
  }
};

export const createSupplierPayment = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return fail(res, 401, "UNAUTHORIZED", "Missing company context");

    const parsed = supplierPaymentSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid payload", parsed.error.issues);

    const actor = String(req.auth?.userId || "system");
    const row = await prisma.$transaction(async (tx) => {
      const accounts = await resolveAccountingAccounts(tx, companyId, actor);
      const cashBankAccountId = parsed.data.accountId;

      if (parsed.data.billId) {
        const bill = await tx.bill.findFirst({
          where: { id: parsed.data.billId, companyId },
        });
        if (!bill) throw new Error("Selected purchase bill not found");

        const payment = await tx.payment.create({
          data: {
            companyId,
            supplierId: parsed.data.supplierId,
            billId: bill.id,
            type: "PAYMENT",
            date: new Date(parsed.data.date),
            amount: parsed.data.amount,
            mode: parsed.data.mode,
            reference: parsed.data.reference,
            notes: parsed.data.notes,
            createdBy: actor,
          },
        });

        const newPaidAmount = Number(bill.paidAmount) + parsed.data.amount;
        const newBalanceDue = Math.max(0, Number(bill.grandTotal) - newPaidAmount);

        await tx.bill.update({
          where: { id: bill.id },
          data: {
            paidAmount: newPaidAmount,
            balanceDue: newBalanceDue,
            status: newBalanceDue <= 0 ? "PAID" : "PARTIAL",
          },
        });

        await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey: `BILL_PAYMENT:${payment.id}`,
          entryPrefix: "PAY",
          date: payment.date,
          narration: `Payment for bill ${bill.billNo} via ${payment.mode}`,
          actor,
          lines: [
            { accountId: accounts.payableId, debit: Number(payment.amount), narration: `Payment for ${bill.billNo}` },
            { accountId: cashBankAccountId, credit: Number(payment.amount), narration: `Paid via ${payment.mode}` },
          ],
        });

        return payment;
      } else {
        const payment = await tx.payment.create({
          data: {
            companyId,
            supplierId: parsed.data.supplierId,
            billId: null,
            type: "ADVANCE_PAYMENT",
            date: new Date(parsed.data.date),
            amount: parsed.data.amount,
            mode: parsed.data.mode,
            reference: parsed.data.reference,
            notes: parsed.data.notes,
            createdBy: actor,
          },
        });

        await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey: `SUPPLIER_ADVANCE:${payment.id}`,
          entryPrefix: "SADV",
          date: payment.date,
          narration: `Advance payment to supplier via ${payment.mode}`,
          actor,
          lines: [
            { accountId: accounts.supplierAdvanceId, debit: Number(payment.amount), narration: "Advance payment asset" },
            { accountId: cashBankAccountId, credit: Number(payment.amount), narration: `Paid via ${payment.mode}` },
          ],
        });

        return payment;
      }
    });

    return created(res, row, "Supplier payment recorded successfully");
  } catch (error: any) {
    console.error("Error in createSupplierPayment:", error);
    return fail(res, 500, "CREATE_SUPPLIER_PAYMENT_ERROR", error?.message || "Failed to record supplier payment");
  }
};
