import type { Request, Response } from "express";
import { z } from "zod";
import { fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";

const paymentUpdateSchema = z.object({
  date: z.string().min(1),
  mode: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const getCompanyId = (req: Request): number => {
  const value = req.auth?.companyId;
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
  });

  return ok(res, { id: paymentId }, "Payment deleted successfully");
};
