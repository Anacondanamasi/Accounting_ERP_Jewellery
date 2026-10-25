import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { ok, fail, created } from "../../lib/apiResponse";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import { canonicalAccountType } from "../../lib/accounting";
import { ensureCompanyDefaultAccounts, ensureCompanyFinancialYears } from "../../lib/defaultAccounts";

const createYearSchema = z.object({
  label: z.string().trim().min(1, "Label is required (e.g. FY 2025-26)"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isActive: z.boolean().default(false),
});

const round = (val: number) => Number(Number(val || 0).toFixed(2));

export const listFinancialYears = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  // Auto-ensure default accounts and financial years if not present
  await ensureCompanyDefaultAccounts(companyId, actor);

  const years = await prisma.financialYear.findMany({
    where: { companyId },
    orderBy: { startDate: "desc" },
  });

  return ok(res, years);
};

export const createFinancialYear = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  const parsed = createYearSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid financial year data", parsed.error.issues);
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);

  if (endDate <= startDate) {
    return fail(res, 400, "INVALID_DATES", "End date must be after start date");
  }

  // If this year is active, deactivate others
  if (parsed.data.isActive) {
    await prisma.financialYear.updateMany({
      where: { companyId },
      data: { isActive: false },
    });
  }

  const createdYear = await prisma.financialYear.create({
    data: {
      companyId,
      label: parsed.data.label,
      startDate,
      endDate,
      isActive: parsed.data.isActive,
      isClosed: false,
      createdBy: actor,
    },
  });

  return created(res, createdYear, "Financial year created successfully");
};

export const setActiveFinancialYear = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const id = Number(req.params.id);

  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid financial year ID");

  const year = await prisma.financialYear.findFirst({
    where: { id, companyId },
  });
  if (!year) return fail(res, 404, "NOT_FOUND", "Financial year not found");

  await prisma.$transaction([
    prisma.financialYear.updateMany({
      where: { companyId },
      data: { isActive: false },
    }),
    prisma.financialYear.update({
      where: { id },
      data: { isActive: true },
    }),
  ]);

  return ok(res, { success: true, activeYearId: id }, `Set ${year.label} as active financial year`);
};

export const getClosingPreview = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);

  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid financial year ID");

  await ensureCompanyDefaultAccounts(companyId, actor);

  const year = await prisma.financialYear.findFirst({
    where: { id, companyId },
  });
  if (!year) return fail(res, 404, "NOT_FOUND", "Financial year not found");

  // Query all accounts
  const accounts = await prisma.account.findMany({
    where: { companyId, isActive: true },
    select: { id: true, code: true, name: true, type: true, heading: true, group: true },
  });

  // Query posted journal lines in this year's date range, excluding previous year-end close journals
  const journalLines = await prisma.journalLine.findMany({
    where: {
      companyId,
      entry: {
        status: "POSTED",
        date: { gte: year.startDate, lte: year.endDate },
        narration: { not: { contains: "Financial Year End Closing" } },
      },
    },
    select: { accountId: true, debit: true, credit: true },
  });

  const movements = new Map<number, { debit: number; credit: number }>();
  for (const jl of journalLines) {
    const cur = movements.get(jl.accountId) ?? { debit: 0, credit: 0 };
    cur.debit += Number(jl.debit);
    cur.credit += Number(jl.credit);
    movements.set(jl.accountId, cur);
  }

  const revenueAccounts: Array<{ id: number; code: string; name: string; balance: number }> = [];
  const expenseAccounts: Array<{ id: number; code: string; name: string; balance: number }> = [];

  for (const acc of accounts) {
    const type = canonicalAccountType(acc.type);
    const mov = movements.get(acc.id) ?? { debit: 0, credit: 0 };

    if (type === "income") {
      // Normal balance: Credit
      const netCredit = round(mov.credit - mov.debit);
      if (Math.abs(netCredit) >= 0.01) {
        revenueAccounts.push({ id: acc.id, code: acc.code, name: acc.name, balance: netCredit });
      }
    } else if (type === "expense") {
      // Normal balance: Debit
      const netDebit = round(mov.debit - mov.credit);
      if (Math.abs(netDebit) >= 0.01) {
        expenseAccounts.push({ id: acc.id, code: acc.code, name: acc.name, balance: netDebit });
      }
    }
  }

  const totalRevenue = round(revenueAccounts.reduce((sum, r) => sum + r.balance, 0));
  const totalExpense = round(expenseAccounts.reduce((sum, e) => sum + e.balance, 0));
  const netProfit = round(totalRevenue - totalExpense);

  const retainedEarnings = accounts.find((a) => a.code === "3100" || a.name.toLowerCase().includes("retained"));

  // Build proposed closing lines
  const proposedLines: Array<{ accountId: number; code: string; name: string; drCr: "DR" | "CR"; amount: number }> = [];

  // 1. Close Revenue accounts (Debit them)
  for (const r of revenueAccounts) {
    if (r.balance > 0) {
      proposedLines.push({ accountId: r.id, code: r.code, name: r.name, drCr: "DR", amount: r.balance });
    } else {
      proposedLines.push({ accountId: r.id, code: r.code, name: r.name, drCr: "CR", amount: Math.abs(r.balance) });
    }
  }

  // 2. Close Expense accounts (Credit them)
  for (const e of expenseAccounts) {
    if (e.balance > 0) {
      proposedLines.push({ accountId: e.id, code: e.code, name: e.name, drCr: "CR", amount: e.balance });
    } else {
      proposedLines.push({ accountId: e.id, code: e.code, name: e.name, drCr: "DR", amount: Math.abs(e.balance) });
    }
  }

  // 3. Balance transfer into Retained Earnings
  if (retainedEarnings) {
    if (netProfit > 0) {
      // Profit: Credit Retained Earnings
      proposedLines.push({
        accountId: retainedEarnings.id,
        code: retainedEarnings.code,
        name: retainedEarnings.name,
        drCr: "CR",
        amount: netProfit,
      });
    } else if (netProfit < 0) {
      // Loss: Debit Retained Earnings
      proposedLines.push({
        accountId: retainedEarnings.id,
        code: retainedEarnings.code,
        name: retainedEarnings.name,
        drCr: "DR",
        amount: Math.abs(netProfit),
      });
    }
  }

  const totalDr = round(proposedLines.filter((l) => l.drCr === "DR").reduce((sum, l) => sum + l.amount, 0));
  const totalCr = round(proposedLines.filter((l) => l.drCr === "CR").reduce((sum, l) => sum + l.amount, 0));

  return ok(res, {
    financialYear: year,
    isAlreadyClosed: Boolean(year.isClosed),
    totalRevenue,
    totalExpense,
    netProfit,
    retainedEarningsAccount: retainedEarnings,
    revenueAccounts,
    expenseAccounts,
    proposedLines,
    totalDr,
    totalCr,
    isBalanced: Math.abs(totalDr - totalCr) <= 0.01,
  });
};

export const closeFinancialYear = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);
  const id = Number(req.params.id);

  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid financial year ID");

  await ensureCompanyDefaultAccounts(companyId, actor);

  const year = await prisma.financialYear.findFirst({
    where: { id, companyId },
  });
  if (!year) return fail(res, 404, "NOT_FOUND", "Financial year not found");
  if (year.isClosed) {
    return fail(res, 400, "ALREADY_CLOSED", "This financial year is already closed");
  }

  // Get Retained Earnings account
  let retainedEarnings = await prisma.account.findFirst({
    where: {
      companyId,
      OR: [{ code: "3100" }, { name: { contains: "Retained Earnings", mode: "insensitive" } }],
    },
  });

  if (!retainedEarnings) {
    // Auto-create retained earnings account if missing
    retainedEarnings = await prisma.account.create({
      data: {
        companyId,
        code: "3100",
        name: "Retained Earnings",
        description: "Accumulated net profit or loss transferred at financial year end",
        heading: "EQUITY",
        group: "Equity",
        type: "Equity",
        openingBalance: 0,
        isControlAccount: true,
        createdBy: actor,
      },
    });
  }

  // Query all accounts
  const accounts = await prisma.account.findMany({
    where: { companyId, isActive: true },
    select: { id: true, code: true, name: true, type: true },
  });

  // Query all posted journal lines in this year's date range, excluding existing close entries
  const journalLines = await prisma.journalLine.findMany({
    where: {
      companyId,
      entry: {
        status: "POSTED",
        date: { gte: year.startDate, lte: year.endDate },
        narration: { not: { contains: "Financial Year End Closing" } },
      },
    },
    select: { accountId: true, debit: true, credit: true },
  });

  const movements = new Map<number, { debit: number; credit: number }>();
  for (const jl of journalLines) {
    const cur = movements.get(jl.accountId) ?? { debit: 0, credit: 0 };
    cur.debit += Number(jl.debit);
    cur.credit += Number(jl.credit);
    movements.set(jl.accountId, cur);
  }

  const revenueAccounts: Array<{ id: number; code: string; name: string; balance: number }> = [];
  const expenseAccounts: Array<{ id: number; code: string; name: string; balance: number }> = [];

  for (const acc of accounts) {
    const type = canonicalAccountType(acc.type);
    const mov = movements.get(acc.id) ?? { debit: 0, credit: 0 };

    if (type === "income") {
      const netCredit = round(mov.credit - mov.debit);
      if (Math.abs(netCredit) >= 0.01) {
        revenueAccounts.push({ id: acc.id, code: acc.code, name: acc.name, balance: netCredit });
      }
    } else if (type === "expense") {
      const netDebit = round(mov.debit - mov.credit);
      if (Math.abs(netDebit) >= 0.01) {
        expenseAccounts.push({ id: acc.id, code: acc.code, name: acc.name, balance: netDebit });
      }
    }
  }

  const totalRevenue = round(revenueAccounts.reduce((sum, r) => sum + r.balance, 0));
  const totalExpense = round(expenseAccounts.reduce((sum, e) => sum + e.balance, 0));
  const netProfit = round(totalRevenue - totalExpense);

  const linesToCreate: Array<{
    companyId: number;
    accountId: number;
    debit: number;
    credit: number;
    narration: string;
    createdBy: string;
  }> = [];

  // Close Revenue accounts
  for (const r of revenueAccounts) {
    if (r.balance > 0) {
      linesToCreate.push({
        companyId,
        accountId: r.id,
        debit: r.balance,
        credit: 0,
        narration: `[Year-End Close] Transfer ${r.code} - ${r.name} to Retained Earnings`,
        createdBy: actor,
      });
    } else {
      linesToCreate.push({
        companyId,
        accountId: r.id,
        debit: 0,
        credit: Math.abs(r.balance),
        narration: `[Year-End Close] Transfer ${r.code} - ${r.name} to Retained Earnings`,
        createdBy: actor,
      });
    }
  }

  // Close Expense accounts
  for (const e of expenseAccounts) {
    if (e.balance > 0) {
      linesToCreate.push({
        companyId,
        accountId: e.id,
        debit: 0,
        credit: e.balance,
        narration: `[Year-End Close] Transfer ${e.code} - ${e.name} to Retained Earnings`,
        createdBy: actor,
      });
    } else {
      linesToCreate.push({
        companyId,
        accountId: e.id,
        debit: Math.abs(e.balance),
        credit: 0,
        narration: `[Year-End Close] Transfer ${e.code} - ${e.name} to Retained Earnings`,
        createdBy: actor,
      });
    }
  }

  // Transfer Net Profit/Loss to Retained Earnings
  if (Math.abs(netProfit) >= 0.01) {
    if (netProfit > 0) {
      linesToCreate.push({
        companyId,
        accountId: retainedEarnings.id,
        debit: 0,
        credit: netProfit,
        narration: `[Year-End Close] Transfer Net Profit for ${year.label} to Retained Earnings`,
        createdBy: actor,
      });
    } else {
      linesToCreate.push({
        companyId,
        accountId: retainedEarnings.id,
        debit: Math.abs(netProfit),
        credit: 0,
        narration: `[Year-End Close] Transfer Net Loss for ${year.label} to Retained Earnings`,
        createdBy: actor,
      });
    }
  }

  const totalDr = round(linesToCreate.reduce((sum, l) => sum + l.debit, 0));
  const totalCr = round(linesToCreate.reduce((sum, l) => sum + l.credit, 0));

  if (Math.abs(totalDr - totalCr) > 0.01) {
    return fail(res, 400, "UNBALANCED_CLOSING", `Debit total (${totalDr}) does not match Credit total (${totalCr})`);
  }

  // Atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    let closingEntryId: number | null = null;

    if (linesToCreate.length >= 2) {
      const entry = await tx.journalEntry.create({
        data: {
          companyId,
          entryNo: `JNL-FYCLOSE-${year.id}-${Date.now().toString().slice(-4)}`,
          date: year.endDate,
          narration: `Financial Year End Closing Entry: ${year.label} - Net Profit of ${netProfit >= 0 ? "+" : ""}${netProfit} transferred to Retained Earnings`,
          status: "POSTED",
          postedAt: new Date(),
          postedBy: actor,
          createdBy: actor,
          lines: {
            create: linesToCreate,
          },
        },
      });
      closingEntryId = entry.id;
    }

    const updatedYear = await tx.financialYear.update({
      where: { id },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedBy: actor,
        closingEntryId,
      },
    });

    return { updatedYear, closingEntryId, netProfit, totalRevenue, totalExpense };
  });

  return ok(res, result, `Financial year ${year.label} closed successfully. Net profit of ${netProfit} transferred to Retained Earnings.`);
};

export const reopenFinancialYear = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const id = Number(req.params.id);

  if (isNaN(id)) return fail(res, 400, "INVALID_ID", "Invalid financial year ID");

  const year = await prisma.financialYear.findFirst({
    where: { id, companyId },
  });
  if (!year) return fail(res, 404, "NOT_FOUND", "Financial year not found");
  if (!year.isClosed) {
    return fail(res, 400, "NOT_CLOSED", "This financial year is not closed");
  }

  // Check if any newer financial year is closed
  const newerClosedYear = await prisma.financialYear.findFirst({
    where: {
      companyId,
      startDate: { gt: year.startDate },
      isClosed: true,
    },
  });
  if (newerClosedYear) {
    return fail(
      res,
      400,
      "CANNOT_REOPEN",
      `Cannot reopen ${year.label} because subsequent year ${newerClosedYear.label} is already closed. Please reopen newer years first.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    if (year.closingEntryId) {
      // Delete the closing lines and journal entry
      await tx.journalLine.deleteMany({
        where: { entryId: year.closingEntryId },
      });
      await tx.journalEntry.delete({
        where: { id: year.closingEntryId },
      });
    }

    await tx.financialYear.update({
      where: { id },
      data: {
        isClosed: false,
        closedAt: null,
        closedBy: null,
        closingEntryId: null,
      },
    });
  });

  return ok(res, { success: true }, `Financial year ${year.label} has been reopened successfully.`);
};
