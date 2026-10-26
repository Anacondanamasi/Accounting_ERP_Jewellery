import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";

const lineSchema = z.object({
  accountId: z.coerce.number(),
  drCr: z.enum(["DR", "CR"]),
  amount: z.coerce.number().positive(),
  narration: z.string().optional(),
  partyName: z.string().optional().nullable().default(""),
});

const formatLineNarration = (line: z.infer<typeof lineSchema>) => {
  const party = (line.partyName || "").trim();
  const remark = (line.narration || "").trim();
  if (party && remark) {
    return `[Party: ${party}] ${remark}`;
  }
  if (party) {
    return `Party: ${party}`;
  }
  return remark || undefined;
};


const journalSchema = z.object({
  date: z.string().min(1),
  reference: z.string().optional(),
  narration: z.string().min(1),
  costCentreId: z.coerce.number().optional(),
  lines: z.array(lineSchema).min(2),
});

const templateSchema = z.object({
  name: z.string().min(1),
  narration: z.string().optional(),
  lines: z.array(lineSchema).min(2),
});

export const listJournalEntries = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const rows = await prisma.journalEntry.findMany({
    where: {
      companyId,
      ...(from || to ? { date: { gte: from, lte: to } } : {}),
      ...(status ? { status } : {}),
      ...(search ? { narration: { contains: search } } : {}),
    },
    include: { lines: true },
    orderBy: { date: "desc" },
  });

  return ok(
    res,
    rows.map((row) => ({
      ...row,
      debit: row.lines.reduce((sum, line) => sum + Number(line.debit), 0),
      credit: row.lines.reduce((sum, line) => sum + Number(line.credit), 0),
    })),
  );
};

export const getJournalEntryById = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const id = Number(req.params.id);
  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid journal entry ID");

  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId },
    include: { lines: true },
  });
  
  if (!entry) return fail(res, 404, "JOURNAL_NOT_FOUND", "Journal entry not found");

  const formattedDate = entry.date ? new Date(entry.date).toISOString().slice(0, 10) : "";

  const lines = entry.lines.map((line) => {
    let partyName = "";
    let cleanNarration = line.narration ?? "";
    const match1 = cleanNarration.match(/^\[Party:\s*(.*?)\]\s*(.*)$/);
    if (match1) {
      partyName = match1[1];
      cleanNarration = match1[2];
    } else {
      const match2 = cleanNarration.match(/^Party:\s*(.*?)$/);
      if (match2) {
        partyName = match2[1];
        cleanNarration = "";
      }
    }
    return {
      ...line,
      partyName,
      narration: cleanNarration,
    };
  });

  return ok(res, {
    ...entry,
    date: formattedDate,
    lines,
  });
};

export const createJournalEntry = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const parsed = journalSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid journal payload", parsed.error.issues);
  }

  const { lines, ...header } = parsed.data;
  const debit = lines.filter((line) => line.drCr === "DR").reduce((sum, line) => sum + line.amount, 0);
  const credit = lines.filter((line) => line.drCr === "CR").reduce((sum, line) => sum + line.amount, 0);
  
  if (Math.abs(debit - credit) > 0.01) {
    return fail(res, 400, "JOURNAL_NOT_BALANCED", "Debit and credit totals must match");
  }

  const entry = await prisma.journalEntry.create({
    data: {
      companyId,
      entryNo: `JNL-${Date.now()}`,
      date: new Date(header.date),
      narration: header.narration,
      status: "POSTED",
      postedAt: new Date(),
      postedBy: getActor(req),
      createdBy: getActor(req),
      lines: {
        create: lines.map((line) => ({
          companyId,
          accountId: line.accountId,
          debit: line.drCr === "DR" ? line.amount : 0,
          credit: line.drCr === "CR" ? line.amount : 0,
          narration: formatLineNarration(line),
          createdBy: getActor(req),
        })),
      },
    },
    include: { lines: true },
  });

  return created(res, entry, "Journal entry created and posted");
};

export const updateJournalEntry = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const id = Number(req.params.id);
  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid journal entry ID");

  const parsed = journalSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid journal payload", parsed.error.issues);
  }

  try {
    const { lines, ...header } = parsed.data;
    const debit = lines.filter((line) => line.drCr === "DR").reduce((sum, line) => sum + line.amount, 0);
    const credit = lines.filter((line) => line.drCr === "CR").reduce((sum, line) => sum + line.amount, 0);
    
    if (Math.abs(debit - credit) > 0.01) {
      return fail(res, 400, "JOURNAL_NOT_BALANCED", "Debit and credit totals must match");
    }

    const entry = await prisma.$transaction(async (tx) => {
      await tx.journalLine.deleteMany({ where: { entryId: id } });
      
      return tx.journalEntry.update({
        where: { id, companyId },
        data: {
          date: new Date(header.date),
          narration: header.narration,
          lines: {
            create: lines.map((line) => ({
              companyId,
              accountId: line.accountId,
              debit: line.drCr === "DR" ? line.amount : 0,
              credit: line.drCr === "CR" ? line.amount : 0,
              narration: formatLineNarration(line),
              createdBy: getActor(req),
            })),
          },
        },
        include: { lines: true },
      });
    });

    return ok(res, entry, "Journal entry updated");
  } catch (error) {
    console.error(error);
    return fail(res, 404, "JOURNAL_NOT_FOUND", "Journal entry not found or locked");
  }
};

export const postJournalEntry = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const entry = await prisma.journalEntry.findFirst({
    where: { id: Number(req.params.id), companyId },
  });
  if (!entry) return fail(res, 404, "JOURNAL_NOT_FOUND", "Journal entry not found");
  return ok(res, entry, "Journal entry is active");
};

export const reverseJournalEntry = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const entry = await prisma.journalEntry.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: { lines: true },
  });

  if (!entry) return fail(res, 404, "JOURNAL_NOT_FOUND", "Journal entry not found");
  if (entry.status !== "POSTED") {
    return fail(res, 400, "INVALID_STATUS", "Only posted entries can be reversed");
  }

  const reversed = await prisma.journalEntry.create({
    data: {
      companyId,
      entryNo: `REV-${entry.entryNo}`,
      date: new Date(),
      narration: `Reversal of ${entry.entryNo}`,
      status: "POSTED",
      reversalOf: entry.id,
      createdBy: getActor(req),
      lines: {
        create: entry.lines.map((line) => ({
          companyId,
          accountId: line.accountId,
          debit: line.credit, // Swap debit/credit for reversal
          credit: line.debit,
          narration: line.narration,
          createdBy: getActor(req),
        })),
      },
    },
    include: { lines: true },
  });

  await prisma.journalEntry.update({
    where: { id: entry.id },
    data: { status: "VOID" }, // Mapping REVERSED to VOID as per schema status
  });

  return created(res, reversed, "Reversal entry posted");
};

export const listJournalTemplates = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const rows = await prisma.journalTemplate.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
  return ok(res, rows);
};

export const createJournalTemplate = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid template payload", parsed.error.issues);
  }
  const row = await prisma.journalTemplate.create({
    data: {
      companyId,
      name: parsed.data.name,
      narration: parsed.data.narration,
      lines: JSON.stringify(parsed.data.lines),
      createdBy: getActor(req),
    },
  });
  return created(res, row, "Template saved");
};

export const deleteJournalTemplate = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const row = await prisma.journalTemplate.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!row) return fail(res, 404, "TEMPLATE_NOT_FOUND", "Template not found");
  await prisma.journalTemplate.delete({ where: { id: row.id } });
  return ok(res, true, "Template deleted");
};

