import type { Request, Response } from "express";
import { z } from "zod";
import { created, fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId, getActor } from "../../lib/requestUtils";
import {
  evaluatePlaceOfSupply,
  computeDocumentTax,
  generateGstJournalPosting,
  validateGstin,
  SEEDED_TAX_CODES,
  STATE_NAMES,
  type GstTreatment,
} from "../../lib/gst";
import { resolveAccountingAccounts, upsertPostedJournalForSource } from "../../lib/accounting";

export const getTaxCodes = async (_req: Request, res: Response) => {
  return ok(res, SEEDED_TAX_CODES);
};

export const validateGstinApi = async (req: Request, res: Response) => {
  const gstin = String(req.body?.gstin || req.query?.gstin || "").trim();
  const result = validateGstin(gstin);
  return ok(res, result);
};

const calculateTaxSchema = z.object({
  documentType: z.enum(["INVOICE", "BILL", "EXPENSE", "CREDIT_NOTE", "DEBIT_NOTE"]).default("INVOICE"),
  documentNo: z.string().default("DRAFT"),
  supplierGstin: z.string().optional().nullable(),
  supplierState: z.string().optional().nullable(),
  recipientGstin: z.string().optional().nullable(),
  recipientState: z.string().optional().nullable(),
  placeOfSupply: z.string().optional().nullable(),
  treatment: z.string().optional().nullable(),
  isExport: z.boolean().optional().default(false),
  isLut: z.boolean().optional().default(false),
  isTaxInclusive: z.boolean().optional().default(false),
  paymentMethodAccountId: z.coerce.number().optional().nullable(),
  lines: z.array(
    z.object({
      amount: z.coerce.number().nonnegative(),
      rate: z.coerce.number().nonnegative().default(3),
      cessRate: z.coerce.number().optional().default(0),
      cessAmount: z.coerce.number().optional().default(0),
      discountPct: z.coerce.number().optional().default(0),
      isRcm: z.boolean().optional().default(false),
      itcEligibility: z.enum(["ELIGIBLE", "INELIGIBLE", "BLOCKED_17_5"]).optional().default("ELIGIBLE"),
    })
  ).min(1),
});

export const calculateTaxPreview = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  const parsed = calculateTaxSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid calculate payload", parsed.error.issues);
  }

  const {
    documentType,
    documentNo,
    supplierGstin,
    supplierState,
    recipientGstin,
    recipientState,
    placeOfSupply,
    treatment,
    isExport,
    isLut,
    isTaxInclusive,
    paymentMethodAccountId,
    lines,
  } = parsed.data;

  // Retrieve company defaults if supplier details are missing
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const effSupplierGstin = supplierGstin || company?.gstin || "";
  const effSupplierState = supplierState || company?.state || "Gujarat";

  const posResult = evaluatePlaceOfSupply({
    supplierGstin: effSupplierGstin,
    supplierState: effSupplierState,
    recipientGstin,
    recipientState,
    placeOfSupply,
    treatment: (treatment as GstTreatment) || "REGULAR",
    isExport,
    isLut,
  });

  const taxSummary = computeDocumentTax(
    lines.map((l) => ({
      amount: Number(l.amount),
      rate: Number(l.rate ?? 3),
      cessRate: Number(l.cessRate ?? 0),
      cessAmount: Number(l.cessAmount ?? 0),
      discountPct: Number(l.discountPct ?? 0),
      isRcm: Boolean(l.isRcm),
      itcEligibility: l.itcEligibility ?? "ELIGIBLE",
      isTaxInclusive,
    })),
    posResult.isInterstate,
    posResult.isZeroRated
  );

  const accounts = await resolveAccountingAccounts(prisma, companyId, actor);

  const postingLines = generateGstJournalPosting({
    documentType,
    documentNo,
    posResult,
    taxSummary,
    accounts,
    paymentMethodAccountId: paymentMethodAccountId ?? undefined,
  });

  // Fetch account names for rich preview
  const accountIds = Array.from(new Set(postingLines.map((l) => l.accountId)));
  const accountRecords = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true, type: true, group: true },
  });
  const accountMap = new Map(accountRecords.map((a) => [a.id, a]));

  const journalPreview = postingLines.map((l) => {
    const acc = accountMap.get(l.accountId);
    return {
      accountId: l.accountId,
      accountCode: acc?.code ?? "—",
      accountName: acc?.name ?? `Account #${l.accountId}`,
      accountType: acc?.type ?? "—",
      group: acc?.group ?? "—",
      debit: l.debit ?? 0,
      credit: l.credit ?? 0,
      narration: l.narration,
    };
  });

  return ok(res, {
    posResult,
    taxSummary,
    journalPreview,
    postingLines,
  });
};

const settlementSchema = z.object({
  year: z.coerce.number().default(new Date().getFullYear()),
  month: z.coerce.number().min(1).max(12).default(new Date().getMonth() + 1),
});

export const postGstSettlementJournal = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const actor = getActor(req);

  const parsed = settlementSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid settlement period", parsed.error.issues);
  }

  const { year, month } = parsed.data;
  const fromDate = new Date(year, month - 1, 1);
  const toDate = new Date(year, month, 0, 23, 59, 59, 999);
  const periodLabel = `${String(month).padStart(2, "0")}/${year}`;

  // Fetch all outward and inward taxes for this period
  const [invoices, bills, notes] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, status: { in: ["POSTED", "PAID", "PARTIAL"] }, date: { gte: fromDate, lte: toDate } },
      select: { cgst: true, sgst: true, igst: true },
    }),
    prisma.bill.findMany({
      where: { companyId, status: { in: ["POSTED", "PAID", "PARTIAL"] }, date: { gte: fromDate, lte: toDate } },
      select: { cgst: true, sgst: true, igst: true },
    }),
    prisma.noteDocument.findMany({
      where: { companyId, status: "POSTED", date: { gte: fromDate, lte: toDate } },
      select: { type: true, taxTotal: true },
    }),
  ]);

  const outputTax = {
    cgst: invoices.reduce((sum, inv) => sum + Number(inv.cgst || 0), 0),
    sgst: invoices.reduce((sum, inv) => sum + Number(inv.sgst || 0), 0),
    igst: invoices.reduce((sum, inv) => sum + Number(inv.igst || 0), 0),
  };

  const inputTax = {
    cgst: bills.reduce((sum, b) => sum + Number(b.cgst || 0), 0),
    sgst: bills.reduce((sum, b) => sum + Number(b.sgst || 0), 0),
    igst: bills.reduce((sum, b) => sum + Number(b.igst || 0), 0),
  };

  // Adjust for Credit Notes (reverses output) & Debit Notes (reverses input)
  for (const n of notes) {
    if (n.type === "CREDIT_NOTE") {
      outputTax.cgst = Math.max(0, outputTax.cgst - Number(n.taxTotal) / 2);
      outputTax.sgst = Math.max(0, outputTax.sgst - Number(n.taxTotal) / 2);
    } else {
      inputTax.cgst = Math.max(0, inputTax.cgst - Number(n.taxTotal) / 2);
      inputTax.sgst = Math.max(0, inputTax.sgst - Number(n.taxTotal) / 2);
    }
  }

  // Calculate set-off order per Section 49 & Rule 88A
  const { calculateItcSetOff } = require("./taxController");
  const setOff = calculateItcSetOff(outputTax, inputTax);

  const accounts = await resolveAccountingAccounts(prisma, companyId, actor);
  const outCgstAcc = accounts.outputCgstId || accounts.outputGstId;
  const outSgstAcc = accounts.outputSgstId || accounts.outputGstId;
  const outIgstAcc = accounts.outputIgstId || accounts.outputGstId;

  const inCgstAcc = accounts.inputCgstId || accounts.inputGstId;
  const inSgstAcc = accounts.inputSgstId || accounts.inputGstId;
  const inIgstAcc = accounts.inputIgstId || accounts.inputGstId;

  const cashLedgerAcc = accounts.gstElectronicCashId || accounts.bankId;

  const postingLines = [];

  // Dr Output Tax Accounts (to close liability)
  if (outputTax.igst > 0) postingLines.push({ accountId: outIgstAcc, debit: outputTax.igst, credit: 0, narration: `GST Settlement IGST ${periodLabel}` });
  if (outputTax.cgst > 0) postingLines.push({ accountId: outCgstAcc, debit: outputTax.cgst, credit: 0, narration: `GST Settlement CGST ${periodLabel}` });
  if (outputTax.sgst > 0) postingLines.push({ accountId: outSgstAcc, debit: outputTax.sgst, credit: 0, narration: `GST Settlement SGST ${periodLabel}` });

  // Cr Input Tax Accounts (to offset ITC utilized)
  const itcUtilized = {
    igst: Math.min(inputTax.igst, outputTax.igst + outputTax.cgst + outputTax.sgst),
    cgst: Math.min(inputTax.cgst, outputTax.cgst + outputTax.igst),
    sgst: Math.min(inputTax.sgst, outputTax.sgst + outputTax.igst),
  };

  if (itcUtilized.igst > 0) postingLines.push({ accountId: inIgstAcc, debit: 0, credit: itcUtilized.igst, narration: `ITC Set-off IGST ${periodLabel}` });
  if (itcUtilized.cgst > 0) postingLines.push({ accountId: inCgstAcc, debit: 0, credit: itcUtilized.cgst, narration: `ITC Set-off CGST ${periodLabel}` });
  if (itcUtilized.sgst > 0) postingLines.push({ accountId: inSgstAcc, debit: 0, credit: itcUtilized.sgst, narration: `ITC Set-off SGST ${periodLabel}` });

  // Cr Electronic Cash Ledger / Bank for Net Cash Payable
  const netCashDue = Math.round(
    ((setOff.payable.igst + setOff.payable.cgst + setOff.payable.sgst) + Number.EPSILON) * 100
  ) / 100;

  if (netCashDue > 0) {
    postingLines.push({
      accountId: cashLedgerAcc,
      debit: 0,
      credit: netCashDue,
      narration: `Net GST paid in cash via Challan PMT-06 for ${periodLabel}`,
    });
  }

  // Create or update the posted settlement journal
  const journal = await upsertPostedJournalForSource(prisma, {
    companyId,
    sourceKey: `SETTLE:GST:${periodLabel}`,
    entryPrefix: "GSTS",
    date: toDate,
    narration: `GST Monthly Settlement for Period ${periodLabel}`,
    actor,
    lines: postingLines,
    forceReplace: true,
  });

  return ok(res, {
    period: periodLabel,
    outputTax,
    inputTax,
    setOff,
    journal,
  }, "GST monthly settlement posted successfully");
};

export const getItcRegister = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();

  const bills = await prisma.bill.findMany({
    where: { companyId, date: { gte: from, lte: to }, status: { in: ["POSTED", "PAID", "PARTIAL"] } },
    include: { supplier: true, lines: true },
    orderBy: { date: "desc" },
  });

  const rows = bills.map((b) => {
    const isRcm = b.lines.some((l) => (l as any).isRcm);
    return {
      billId: b.id,
      billNo: b.billNo,
      billDate: b.date,
      supplierName: b.supplier?.name,
      supplierGstin: b.supplier?.gstin,
      taxableAmount: b.taxableAmount,
      cgst: b.cgst,
      sgst: b.sgst,
      igst: b.igst,
      taxTotal: b.taxTotal,
      grandTotal: b.grandTotal,
      itcEligibility: isRcm ? "RCM" : "ELIGIBLE",
    };
  });

  const totals = {
    taxableAmount: rows.reduce((s, r) => s + Number(r.taxableAmount || 0), 0),
    cgst: rows.reduce((s, r) => s + Number(r.cgst || 0), 0),
    sgst: rows.reduce((s, r) => s + Number(r.sgst || 0), 0),
    igst: rows.reduce((s, r) => s + Number(r.igst || 0), 0),
    taxTotal: rows.reduce((s, r) => s + Number(r.taxTotal || 0), 0),
  };

  return ok(res, { rows, totals });
};
