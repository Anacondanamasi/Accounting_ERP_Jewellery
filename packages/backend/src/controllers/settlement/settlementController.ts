/**
 * settlementController.ts
 *
 * Double-entry set-off engine:
 *  - Apply Credit Note → Invoice(s)
 *  - Apply Debit Note  → Bill(s)
 *  - Apply Payment     → Invoice(s) or Bill(s)  (split allocation)
 *  - Reverse a settlement
 *  - Get all settlements for a document
 */
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { ok, created, fail } from "../../lib/apiResponse";
import { getCompanyId, getActor } from "../../lib/requestUtils";

// ── helpers ──────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Recompute invoice paidAmount / balanceDue / status after any settlement change */
async function recalcInvoice(tx: any, invoiceId: number) {
  const inv = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true,
      settlementsAsTarget: { where: { status: "ACTIVE" } },
    },
  });
  if (!inv) return;

  const fromPayments = inv.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const fromNotes    = inv.settlementsAsTarget
    .filter((s: any) => s.sourceType === "CREDIT_NOTE")
    .reduce((s: number, st: any) => s + Number(st.amount), 0);

  const paidAmount = round2(fromPayments + fromNotes);
  const balanceDue = round2(Number(inv.grandTotal) - paidAmount);

  let status = inv.status;
  if (balanceDue <= 0)                         status = "PAID";
  else if (paidAmount > 0)                     status = "PARTIAL";
  else if (inv.status !== "DRAFT")             status = "POSTED";

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount, balanceDue, status },
  });
}

/** Recompute bill paidAmount / balanceDue / status */
async function recalcBill(tx: any, billId: number) {
  const bill = await tx.bill.findUnique({
    where: { id: billId },
    include: {
      payments: true,
      settlementsAsTarget: { where: { status: "ACTIVE" } },
    },
  });
  if (!bill) return;

  const fromPayments = bill.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const fromNotes    = bill.settlementsAsTarget
    .filter((s: any) => s.sourceType === "DEBIT_NOTE")
    .reduce((s: number, st: any) => s + Number(st.amount), 0);

  const paidAmount = round2(fromPayments + fromNotes);
  const balanceDue = round2(Number(bill.grandTotal) - paidAmount);

  let status = bill.status;
  if (balanceDue <= 0)    status = "PAID";
  else if (paidAmount > 0) status = "PARTIAL";
  else if (bill.status !== "DRAFT") status = "POSTED";

  await tx.bill.update({
    where: { id: billId },
    data: { paidAmount, balanceDue, status },
  });
}

/** Recalculate used amount on NoteDocument */
async function recalcNoteUsed(tx: any, noteId: number) {
  const settlements = await tx.documentSettlement.aggregate({
    where: { sourceNoteId: noteId, status: "ACTIVE" },
    _sum: { amount: true },
  });
  await tx.noteDocument.update({
    where: { id: noteId },
    data: { usedAmount: settlements._sum.amount ?? 0 },
  });
}

// ── GET: settlements on a document ───────────────────────────────────────────

export const getDocumentSettlements = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { targetType, targetId } = req.params;

  const where: any = { companyId, status: "ACTIVE" };
  if (targetType === "invoice") where.targetInvoiceId = Number(targetId);
  else if (targetType === "bill") where.targetBillId = Number(targetId);
  else return fail(res, 400, "INVALID_TARGET_TYPE", "targetType must be invoice or bill");

  const settlements = await prisma.documentSettlement.findMany({
    where,
    include: {
      sourceNote: { select: { noteNo: true, type: true, grandTotal: true, usedAmount: true } },
      sourcePayment: { select: { reference: true, mode: true, amount: true, date: true } },
    },
    orderBy: { settledAt: "asc" },
  });

  return ok(res, settlements);
};

// ── GET: open invoices / bills for a party (for apply-note UI) ────────────────

export const getOpenDocuments = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { partyType, partyId, docType } = req.query as Record<string, string>;

  if (docType === "invoice") {
    const rows = await prisma.invoice.findMany({
      where: {
        companyId,
        customerId: Number(partyId),
        status: { in: ["POSTED", "PARTIAL", "OVERDUE"] },
      },
      select: { id: true, invoiceNo: true, grandTotal: true, paidAmount: true, balanceDue: true, dueDate: true, status: true },
      orderBy: { date: "asc" },
    });
    return ok(res, rows);
  }

  if (docType === "bill") {
    const rows = await prisma.bill.findMany({
      where: {
        companyId,
        supplierId: Number(partyId),
        status: { in: ["POSTED", "PARTIAL", "OVERDUE"] },
      },
      select: { id: true, billNo: true, grandTotal: true, paidAmount: true, balanceDue: true, dueDate: true, status: true },
      orderBy: { date: "asc" },
    });
    return ok(res, rows);
  }

  return fail(res, 400, "INVALID_DOC_TYPE", "docType must be invoice or bill");
};

// ── POST: apply a credit/debit note to one or more invoices/bills ─────────────

const applyNoteSchema = z.object({
  sourceNoteId: z.number().int().positive(),
  allocations: z.array(
    z.object({
      targetId: z.number().int().positive(),
      amount: z.number().positive(),
    })
  ).min(1),
  settledAt: z.string().optional(),
  notes: z.string().optional(),
});

export const applyNote = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const parsed = applyNoteSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid payload", parsed.error.issues);

  const { sourceNoteId, allocations, settledAt, notes } = parsed.data;

  const note = await prisma.noteDocument.findFirst({
    where: { id: sourceNoteId, companyId },
  });
  if (!note) return fail(res, 404, "NOTE_NOT_FOUND", "Credit/Debit note not found");

  const noteType   = note.type === "CREDIT_NOTE" ? "CREDIT_NOTE" : "DEBIT_NOTE";
  const targetType = noteType === "CREDIT_NOTE"  ? "INVOICE"     : "BILL";

  const remainingCredit = round2(Number(note.grandTotal) - Number(note.usedAmount));
  const totalToApply    = round2(allocations.reduce((s, a) => s + a.amount, 0));

  if (totalToApply > remainingCredit + 0.005) {
    return fail(res, 400, "EXCEEDS_CREDIT", `Cannot apply ₹${totalToApply} — only ₹${remainingCredit} remaining on ${note.noteNo}`);
  }

  const results = await prisma.$transaction(async (tx) => {
    const created: any[] = [];

    for (const alloc of allocations) {
      // Check target document outstanding
      let outstanding = 0;
      if (targetType === "INVOICE") {
        const inv = await tx.invoice.findFirst({ where: { id: alloc.targetId, companyId, customerId: note.customerId ?? undefined } });
        if (!inv) throw new Error(`Invoice #${alloc.targetId} not found or party mismatch`);
        outstanding = round2(Number(inv.balanceDue));
      } else {
        const bill = await tx.bill.findFirst({ where: { id: alloc.targetId, companyId, supplierId: note.supplierId ?? undefined } });
        if (!bill) throw new Error(`Bill #${alloc.targetId} not found or party mismatch`);
        outstanding = round2(Number(bill.balanceDue));
      }

      if (alloc.amount > outstanding + 0.005) {
        throw new Error(`Amount ₹${alloc.amount} exceeds outstanding ₹${outstanding} on target #${alloc.targetId}`);
      }

      // Check for duplicate linkage
      const dup = await tx.documentSettlement.findFirst({
        where: {
          companyId,
          sourceNoteId,
          ...(targetType === "INVOICE" ? { targetInvoiceId: alloc.targetId } : { targetBillId: alloc.targetId }),
          status: "ACTIVE",
        },
      });
      if (dup) throw new Error(`Note ${note.noteNo} is already linked to target #${alloc.targetId}`);

      const settlement = await tx.documentSettlement.create({
        data: {
          companyId,
          sourceType: noteType,
          sourceNoteId,
          targetType,
          targetInvoiceId: targetType === "INVOICE" ? alloc.targetId : null,
          targetBillId:    targetType === "BILL"    ? alloc.targetId : null,
          amount: alloc.amount,
          settledAt: settledAt ? new Date(settledAt) : new Date(),
          notes,
          createdBy: actor,
        },
      });
      created.push(settlement);

      // Recalc target
      if (targetType === "INVOICE") await recalcInvoice(tx, alloc.targetId);
      else                           await recalcBill(tx, alloc.targetId);
    }

    // Recalc note used amount
    await recalcNoteUsed(tx, sourceNoteId);

    return created;
  });

  return created(res, results, `${noteType === "CREDIT_NOTE" ? "Credit" : "Debit"} note applied successfully`);
};

// ── POST: apply a payment to invoices/bills (split allocation) ────────────────

const applyPaymentSchema = z.object({
  sourcePaymentId: z.number().int().positive(),
  allocations: z.array(
    z.object({
      targetId: z.number().int().positive(),
      targetType: z.enum(["INVOICE", "BILL"]),
      amount: z.number().positive(),
    })
  ).min(1),
  settledAt: z.string().optional(),
  notes: z.string().optional(),
});

export const applyPayment = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const parsed = applyPaymentSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid payload", parsed.error.issues);

  const { sourcePaymentId, allocations, settledAt, notes } = parsed.data;

  const payment = await prisma.payment.findFirst({ where: { id: sourcePaymentId, companyId } });
  if (!payment) return fail(res, 404, "PAYMENT_NOT_FOUND", "Payment not found");

  // Existing applied amount
  const alreadyApplied = await prisma.documentSettlement.aggregate({
    where: { companyId, sourcePaymentId, status: "ACTIVE" },
    _sum: { amount: true },
  });
  const usedSoFar = round2(Number(alreadyApplied._sum.amount ?? 0));
  const available  = round2(Number(payment.amount) - usedSoFar);
  const toApply    = round2(allocations.reduce((s, a) => s + a.amount, 0));

  if (toApply > available + 0.005) {
    return fail(res, 400, "EXCEEDS_PAYMENT", `Cannot allocate ₹${toApply} — only ₹${available} unapplied on payment #${sourcePaymentId}`);
  }

  const results = await prisma.$transaction(async (tx) => {
    const created: any[] = [];

    for (const alloc of allocations) {
      let outstanding = 0;
      if (alloc.targetType === "INVOICE") {
        const inv = await tx.invoice.findFirst({ where: { id: alloc.targetId, companyId } });
        if (!inv) throw new Error(`Invoice #${alloc.targetId} not found`);
        outstanding = round2(Number(inv.balanceDue));
      } else {
        const bill = await tx.bill.findFirst({ where: { id: alloc.targetId, companyId } });
        if (!bill) throw new Error(`Bill #${alloc.targetId} not found`);
        outstanding = round2(Number(bill.balanceDue));
      }

      if (alloc.amount > outstanding + 0.005) {
        throw new Error(`Amount ₹${alloc.amount} exceeds outstanding ₹${outstanding} on target #${alloc.targetId}`);
      }

      // Duplicate check
      const dup = await tx.documentSettlement.findFirst({
        where: {
          companyId, sourcePaymentId,
          ...(alloc.targetType === "INVOICE" ? { targetInvoiceId: alloc.targetId } : { targetBillId: alloc.targetId }),
          status: "ACTIVE",
        },
      });
      if (dup) throw new Error(`Payment is already linked to target #${alloc.targetId}`);

      const settlement = await tx.documentSettlement.create({
        data: {
          companyId,
          sourceType: "PAYMENT",
          sourcePaymentId,
          targetType: alloc.targetType,
          targetInvoiceId: alloc.targetType === "INVOICE" ? alloc.targetId : null,
          targetBillId:    alloc.targetType === "BILL"    ? alloc.targetId : null,
          amount: alloc.amount,
          settledAt: settledAt ? new Date(settledAt) : new Date(),
          notes,
          createdBy: actor,
        },
      });
      created.push(settlement);

      if (alloc.targetType === "INVOICE") await recalcInvoice(tx, alloc.targetId);
      else                                 await recalcBill(tx, alloc.targetId);
    }

    return created;
  });

  return created(res, results, "Payment allocated successfully");
};

// ── DELETE: reverse (unlink) a settlement ─────────────────────────────────────

export const reverseSettlement = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);

  const settlement = await prisma.documentSettlement.findFirst({ where: { id, companyId } });
  if (!settlement) return fail(res, 404, "NOT_FOUND", "Settlement not found");
  if (settlement.status === "REVERSED") return fail(res, 400, "ALREADY_REVERSED", "Settlement already reversed");

  await prisma.$transaction(async (tx) => {
    await tx.documentSettlement.update({
      where: { id },
      data: { status: "REVERSED", reversedAt: new Date(), reversedBy: actor },
    });

    if (settlement.targetInvoiceId) await recalcInvoice(tx, settlement.targetInvoiceId);
    if (settlement.targetBillId)    await recalcBill(tx, settlement.targetBillId);
    if (settlement.sourceNoteId)    await recalcNoteUsed(tx, settlement.sourceNoteId);
  });

  return ok(res, { id, message: "Settlement reversed" });
};

// ── GET: outstanding summary for a document ───────────────────────────────────

export const getOutstandingSummary = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { targetType, targetId } = req.params;

  if (targetType === "invoice") {
    const inv = await prisma.invoice.findFirst({
      where: { id: Number(targetId), companyId },
      include: {
        customer: { select: { name: true } },
        payments: true,
        settlementsAsTarget: {
          where: { status: "ACTIVE" },
          include: {
            sourceNote:    { select: { noteNo: true, type: true } },
            sourcePayment: { select: { reference: true, mode: true } },
          },
          orderBy: { settledAt: "asc" },
        },
      },
    });
    if (!inv) return fail(res, 404, "NOT_FOUND", "Invoice not found");

    const settlements = inv.settlementsAsTarget.map((s: any) => ({
      id: s.id,
      type:       s.sourceType,
      refNo:      s.sourceNote?.noteNo ?? s.sourcePayment?.reference ?? `PMT-${s.sourcePaymentId}`,
      sourceType: s.sourceNote?.type ?? "PAYMENT",
      sourceId:   s.sourceNoteId ?? s.sourcePaymentId,
      date:       s.settledAt,
      amount:     Number(s.amount),
    }));

    const directPayments = inv.payments.map((p: any) => ({
      id:         null,
      type:       "PAYMENT",
      refNo:      p.reference || `PAY-${p.id}`,
      sourceType: "PAYMENT",
      date:       p.date,
      amount:     Number(p.amount),
    }));

    const allLinked = [...settlements, ...directPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalSettled = allLinked.reduce((s, l) => s + l.amount, 0);

    return ok(res, {
      id: inv.id,
      docType:          "INVOICE",
      number:           inv.invoiceNo,
      party:            inv.customer?.name ?? "—",
      date:             inv.date,
      dueDate:          inv.dueDate,
      grandTotal:       Number(inv.grandTotal),
      paidAmount:       Number(inv.paidAmount),
      balanceDue:       Number(inv.balanceDue),
      status:           inv.status,
      linkedSettlements: allLinked,
      totalSettled,
    });
  }

  if (targetType === "bill") {
    const bill = await prisma.bill.findFirst({
      where: { id: Number(targetId), companyId },
      include: {
        supplier: { select: { name: true } },
        payments: true,
        settlementsAsTarget: {
          where: { status: "ACTIVE" },
          include: {
            sourceNote:    { select: { noteNo: true, type: true } },
            sourcePayment: { select: { reference: true, mode: true } },
          },
          orderBy: { settledAt: "asc" },
        },
      },
    });
    if (!bill) return fail(res, 404, "NOT_FOUND", "Bill not found");

    const settlements = bill.settlementsAsTarget.map((s: any) => ({
      id:         s.id,
      type:       s.sourceType,
      refNo:      s.sourceNote?.noteNo ?? s.sourcePayment?.reference ?? `PMT-${s.sourcePaymentId}`,
      sourceType: s.sourceNote?.type ?? "PAYMENT",
      sourceId:   s.sourceNoteId ?? s.sourcePaymentId,
      date:       s.settledAt,
      amount:     Number(s.amount),
    }));

    const directPayments = bill.payments.map((p: any) => ({
      id:         null,
      type:       "PAYMENT",
      refNo:      p.reference || `PAY-${p.id}`,
      sourceType: "PAYMENT",
      date:       p.date,
      amount:     Number(p.amount),
    }));

    const allLinked = [...settlements, ...directPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalSettled = allLinked.reduce((s, l) => s + l.amount, 0);

    return ok(res, {
      id: bill.id,
      docType:           "BILL",
      number:            bill.billNo,
      party:             bill.supplier?.name ?? "—",
      date:              bill.date,
      dueDate:           bill.dueDate,
      grandTotal:        Number(bill.grandTotal),
      paidAmount:        Number(bill.paidAmount),
      balanceDue:        Number(bill.balanceDue),
      status:            bill.status,
      linkedSettlements: allLinked,
      totalSettled,
    });
  }

  if (targetType === "note") {
    const note = await prisma.noteDocument.findFirst({
      where: { id: Number(targetId), companyId },
      include: {
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
        settlementsAsSource: {
          where: { status: "ACTIVE" },
          include: {
            targetInvoice: { select: { invoiceNo: true } },
            targetBill:    { select: { billNo: true } },
          },
          orderBy: { settledAt: "asc" },
        },
      },
    });
    if (!note) return fail(res, 404, "NOT_FOUND", "Note not found");

    const settlements = note.settlementsAsSource.map((s: any) => ({
      id:         s.id,
      type:       s.targetType,
      refNo:      s.targetInvoice?.invoiceNo ?? s.targetBill?.billNo ?? "Unknown",
      sourceType: "NOTE",
      date:       s.settledAt,
      amount:     Number(s.amount),
      targetId:   s.targetInvoiceId ?? s.targetBillId,
    }));

    const totalSettled = settlements.reduce((s: number, l: any) => s + l.amount, 0);
    const balanceDue = round2(Number(note.grandTotal) - totalSettled);

    return ok(res, {
      id: note.id,
      docType:           note.type,
      number:            note.noteNo,
      party:             note.customer?.name ?? note.supplier?.name ?? "—",
      date:              note.date,
      dueDate:           note.date,
      grandTotal:        Number(note.grandTotal),
      paidAmount:        totalSettled,
      balanceDue:        balanceDue,
      status:            balanceDue <= 0 ? "APPLIED" : (totalSettled > 0 ? "PARTIAL" : "OPEN"),
      linkedSettlements: settlements,
      totalSettled,
    });
  }

  return fail(res, 400, "INVALID_TYPE", "targetType must be invoice, bill, or note");
};
