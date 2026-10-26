import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";
import { resolveAccountingAccounts, upsertPostedJournalForSource } from "../lib/accounting";
import { evaluatePlaceOfSupply, generateGstJournalPosting, type DocumentTaxSummary } from "../lib/gst";
import { prisma } from "../lib/prisma";
import { ok, created, fail } from "../lib/apiResponse";
import { makeDocumentNumber, roundMoney } from "../lib/documents";
import { getActor, getCompanyId } from "../lib/requestUtils";
import { authMiddleware } from "../middleware/authMiddleware";

export const noteRoutes = Router();
noteRoutes.use(authMiddleware);

const company = (req: Request) => getCompanyId(req);
const actor = (req: Request) => getActor(req);

const noteSchema = z.object({
  date: z.string().default(() => new Date().toISOString()),
  partyType: z.enum(["CUSTOMER", "SUPPLIER"]).default("CUSTOMER"),
  customerId: z.coerce.number().optional().nullable(),
  supplierId: z.coerce.number().optional().nullable(),
  referenceNo: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  lines: z.array(z.object({
    description: z.string().min(1),
    quantity: z.coerce.number().default(1),
    rate: z.coerce.number().default(0),
    gstPct: z.coerce.number().default(0),
  })).default([]),
});

const registerNoteRoutes = (basePath: string, type: "CREDIT_NOTE" | "DEBIT_NOTE", prefix: "CRN" | "DBN") => {
  noteRoutes.get(basePath, async (req, res) => {
    const companyId = company(req);
    const rows = await prisma.noteDocument.findMany({
      where: { companyId, type },
      include: { lines: true, customer: true, supplier: true },
      orderBy: { date: "desc" },
    });
    return ok(res, rows);
  });

  noteRoutes.get(`${basePath}/:id`, async (req, res) => {
    const companyId = company(req);
    const row = await prisma.noteDocument.findFirst({
      where: { companyId, type, id: Number(req.params.id) },
      include: { lines: true, customer: true, supplier: true },
    });
    if (!row) return fail(res, 404, "NOTE_NOT_FOUND", "Note not found");
    return ok(res, row);
  });

  noteRoutes.post(basePath, async (req, res) => {
    const companyId = company(req);
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid note payload", parsed.error.issues);
    const lineTotals = parsed.data.lines.map((line) => {
      const amount = roundMoney(line.quantity * line.rate);
      const taxAmount = roundMoney((amount * line.gstPct) / 100);
      return { ...line, amount, taxAmount, total: roundMoney(amount + taxAmount) };
    });
    const subTotal = roundMoney(lineTotals.reduce((sum, line) => sum + line.amount, 0));
    const taxTotal = roundMoney(lineTotals.reduce((sum, line) => sum + line.taxAmount, 0));
    const grandTotal = roundMoney(subTotal + taxTotal);
    const row = await prisma.$transaction(async (tx) => {
      const createdRow = await tx.noteDocument.create({
        data: {
          companyId,
          type,
          noteNo: makeDocumentNumber(prefix),
          date: new Date(parsed.data.date),
          partyType: parsed.data.partyType,
          customerId: parsed.data.customerId,
          supplierId: parsed.data.supplierId,
          referenceNo: parsed.data.referenceNo,
          reason: parsed.data.reason,
          status: "POSTED",
          subTotal,
          taxTotal,
          grandTotal,
          createdBy: actor(req),
          lines: {
            create: lineTotals.map((line) => ({ ...line, companyId, createdBy: actor(req) })),
          },
        },
        include: { lines: true },
      });

            const companyRecord = await tx.company.findUnique({ where: { id: companyId } });
      const accounts = await resolveAccountingAccounts(tx, companyId, actor(req));
      const sourceKey = `NOTE:${createdRow.id}`;
      const posResult = evaluatePlaceOfSupply({
        supplierState: companyRecord?.state || "Gujarat",
        placeOfSupply: companyRecord?.state || "Gujarat",
      });
      const taxSummary: DocumentTaxSummary = {
        lines: [],
        subTotal: Number(createdRow.subTotal),
        totalDiscount: 0,
        taxableAmount: Number(createdRow.subTotal),
        cgst: Math.round((Number(createdRow.taxTotal) / 2) * 100) / 100,
        sgst: Math.round((Number(createdRow.taxTotal) / 2) * 100) / 100,
        igst: 0,
        cess: 0,
        taxTotal: Number(createdRow.taxTotal),
        roundOff: 0,
        grandTotal: Number(createdRow.grandTotal),
        rateBreakup: [],
      };
      const postingLines = generateGstJournalPosting({
        documentType: type,
        documentNo: createdRow.noteNo,
        posResult,
        taxSummary,
        accounts,
      });
      await upsertPostedJournalForSource(tx, {
        companyId,
        sourceKey,
        entryPrefix: prefix,
        date: createdRow.date,
        narration: `${type.replace("_", " ")} ${createdRow.noteNo}`,
        actor: actor(req),
        lines: postingLines,
      });

      return createdRow;
    }, {
      maxWait: 30000,
      timeout: 60000,
    });

    return created(res, row, `${type.replace("_", " ")} created`);
  });

  noteRoutes.put(`${basePath}/:id`, async (req, res) => {
    const companyId = company(req);
    const parsed = noteSchema.partial().safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid note payload", parsed.error.issues);
    const existing = await prisma.noteDocument.findFirst({ where: { companyId, id: Number(req.params.id), type } });
    if (!existing) return fail(res, 404, "NOTE_NOT_FOUND", "Note not found");

    const lineTotals = parsed.data.lines?.map((line) => {
      const quantity = line.quantity ?? 1;
      const rate = line.rate ?? 0;
      const gstPct = line.gstPct ?? 0;
      const amount = roundMoney(quantity * rate);
      const taxAmount = roundMoney((amount * gstPct) / 100);
      return {
        description: line.description ?? "",
        quantity,
        rate,
        gstPct,
        amount,
        taxAmount,
        total: roundMoney(amount + taxAmount),
      };
    });
    const subTotal = lineTotals ? roundMoney(lineTotals.reduce((sum, line) => sum + line.amount, 0)) : undefined;
    const taxTotal = lineTotals ? roundMoney(lineTotals.reduce((sum, line) => sum + line.taxAmount, 0)) : undefined;
    const grandTotal = lineTotals ? roundMoney((subTotal ?? 0) + (taxTotal ?? 0)) : undefined;

    const row = await prisma.$transaction(async (tx) => {
      if (lineTotals) await tx.noteLine.deleteMany({ where: { noteId: existing.id, companyId } });
      const updatedRow = await tx.noteDocument.update({
        where: { id: existing.id },
        data: {
          date: parsed.data.date ? new Date(parsed.data.date) : undefined,
          partyType: parsed.data.partyType,
          customerId: parsed.data.customerId,
          supplierId: parsed.data.supplierId,
          referenceNo: parsed.data.referenceNo,
          reason: parsed.data.reason,
          subTotal,
          taxTotal,
          grandTotal,
          ...(lineTotals ? { lines: { create: lineTotals.map((line) => ({ ...line, companyId, createdBy: actor(req) })) } } : {}),
        },
        include: { lines: true },
      });

      const accounts = await resolveAccountingAccounts(tx, companyId, actor(req));
      const sourceKey = `NOTE:${updatedRow.id}`;
      if (type === "CREDIT_NOTE") {
        await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey,
          entryPrefix: "CRN",
          date: updatedRow.date,
          narration: `Credit Note ${updatedRow.noteNo}`,
          actor: actor(req),
          lines: [
            { accountId: accounts.salesId, debit: Number(updatedRow.subTotal), narration: `Credit Note ${updatedRow.noteNo}` },
            { accountId: accounts.outputGstId, debit: Number(updatedRow.taxTotal), narration: `GST reversal ${updatedRow.noteNo}` },
            { accountId: accounts.receivableId, credit: Number(updatedRow.grandTotal), narration: `Credit Note ${updatedRow.noteNo}` },
          ],
          forceReplace: true,
        });
      } else {
        await upsertPostedJournalForSource(tx, {
          companyId,
          sourceKey,
          entryPrefix: "DBN",
          date: updatedRow.date,
          narration: `Debit Note ${updatedRow.noteNo}`,
          actor: actor(req),
          lines: [
            { accountId: accounts.purchaseId, debit: Number(updatedRow.subTotal), narration: `Debit Note ${updatedRow.noteNo}` },
            { accountId: accounts.inputGstId, debit: Number(updatedRow.taxTotal), narration: `Input GST ${updatedRow.noteNo}` },
            { accountId: accounts.payableId, credit: Number(updatedRow.grandTotal), narration: `Debit Note ${updatedRow.noteNo}` },
          ],
          forceReplace: true,
        });
      }
      return updatedRow;
    }, {
      maxWait: 30000,
      timeout: 60000,
    });
    return ok(res, row, "Note updated");
  });

  noteRoutes.delete(`${basePath}/:id`, async (req, res) => {
    try {
      const companyId = company(req);
      const id = Number(req.params.id);

      const existing = await prisma.noteDocument.findFirst({
        where: { companyId, id, type },
      });
      if (!existing) return fail(res, 404, "NOTE_NOT_FOUND", "Note not found");

      await prisma.$transaction(async (tx) => {
        // 1. Delete journal entry & lines
        const jes = await tx.journalEntry.findMany({
          where: { companyId, type: `NOTE:${id}` },
          select: { id: true },
        });
        if (jes.length > 0) {
          const jeIds = jes.map((j) => j.id);
          await tx.journalLine.deleteMany({ where: { entryId: { in: jeIds }, companyId } });
          await tx.journalEntry.deleteMany({ where: { id: { in: jeIds }, companyId } });
        }

        // 2. Delete note lines & note document
        await tx.noteLine.deleteMany({ where: { noteId: id, companyId } });
        await tx.noteDocument.delete({ where: { id } });
      });

      return ok(res, { id }, "Note deleted successfully");
    } catch (err: any) {
      console.error("Error deleting note:", err);
      return fail(res, 500, "DELETE_NOTE_ERROR", err?.message || "Failed to delete note");
    }
  });
};

registerNoteRoutes("/credit-notes", "CREDIT_NOTE", "CRN");
registerNoteRoutes("/debit-notes", "DEBIT_NOTE", "DBN");
