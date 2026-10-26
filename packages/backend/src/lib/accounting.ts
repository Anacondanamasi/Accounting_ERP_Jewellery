import { Prisma } from "@prisma/client";
import { makeDocumentNumber, roundMoney } from "./documents";

type TxClient = Prisma.TransactionClient;
type CanonicalAccountType = "asset" | "liability" | "equity" | "income" | "expense";

type AccountLite = {
  id: number;
  code: string;
  name: string;
  group: string;
  type: string;
  isActive: boolean;
};

type GroupLite = {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
};

type AccountMatcher = {
  type: CanonicalAccountType;
  keywords: string[];
  preferredName: string;
  preferredGroup: string;
  preferredCode: string;
};

type AccountCache = {
  accounts: AccountLite[];
  groups: GroupLite[];
};

export type PostingLine = {
  accountId: number;
  debit?: number;
  credit?: number;
  narration?: string;
  costCentreId?: number;
};

export const canonicalAccountType = (value: string | null | undefined): CanonicalAccountType => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "asset" || normalized === "assets") return "asset";
  if (normalized === "liability" || normalized === "liabilities") return "liability";
  if (normalized === "equity" || normalized === "capital") return "equity";
  if (normalized === "income" || normalized === "revenue" || normalized === "sales") return "income";
  if (normalized === "expense" || normalized === "expenses" || normalized === "cogs") return "expense";
  return "asset";
};

const displayAccountType = (type: CanonicalAccountType): "Asset" | "Liability" | "Equity" | "Income" | "Expense" => {
  if (type === "asset") return "Asset";
  if (type === "liability") return "Liability";
  if (type === "equity") return "Equity";
  if (type === "income") return "Income";
  return "Expense";
};

const isDebitNature = (type: CanonicalAccountType) => type === "asset" || type === "expense";

const normalizeText = (value: string | null | undefined) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toMoney = (value: number | null | undefined) => roundMoney(Number(value ?? 0));

const loadAccountCache = async (tx: TxClient, companyId: number): Promise<AccountCache> => {
  const [accounts, groups] = await Promise.all([
    tx.account.findMany({
      where: { companyId },
      select: { id: true, code: true, name: true, group: true, type: true, isActive: true },
    }),
    tx.accountGroup.findMany({
      where: { companyId },
      select: { id: true, name: true, type: true, isActive: true },
    }),
  ]);
  return { accounts, groups };
};

const scoreAccount = (account: AccountLite, matcher: AccountMatcher): number => {
  if (!account.isActive) return -1;
  const accountType = canonicalAccountType(account.type);
  if (accountType !== matcher.type) return -1;

  const haystack = normalizeText(`${account.code} ${account.name} ${account.group}`);
  const preferredName = normalizeText(matcher.preferredName);
  let score = 0;

  if (normalizeText(account.name) === preferredName) score += 10;
  if (normalizeText(account.group) === normalizeText(matcher.preferredGroup)) score += 5;

  score += matcher.keywords.reduce((sum, keyword) => {
    return sum + (haystack.includes(normalizeText(keyword)) ? 2 : 0);
  }, 0);

  if (account.code === matcher.preferredCode) score += 3;
  return score;
};

const findMatchingAccount = (cache: AccountCache, matcher: AccountMatcher): AccountLite | null => {
  let best: AccountLite | null = null;
  let bestScore = 0;
  for (const account of cache.accounts) {
    const score = scoreAccount(account, matcher);
    if (score > bestScore) {
      bestScore = score;
      best = account;
    }
  }
  return best;
};

const ensureGroup = async (
  tx: TxClient,
  cache: AccountCache,
  companyId: number,
  actor: string,
  name: string,
  type: CanonicalAccountType,
): Promise<GroupLite> => {
  const existing = cache.groups.find(
    (group) =>
      normalizeText(group.name) === normalizeText(name) &&
      canonicalAccountType(group.type) === type &&
      group.isActive,
  );
  if (existing) return existing;

  const created = await tx.accountGroup.create({
    data: {
      companyId,
      name,
      type: displayAccountType(type),
      isActive: true,
      createdBy: actor,
    },
    select: { id: true, name: true, type: true, isActive: true },
  });
  cache.groups.push(created);
  return created;
};

const nextAvailableCode = (cache: AccountCache, preferredCode: string) => {
  const used = new Set(cache.accounts.map((account) => account.code));
  if (!used.has(preferredCode)) return preferredCode;

  const numeric = Number(preferredCode);
  if (Number.isFinite(numeric)) {
    let code = numeric + 1;
    while (used.has(String(code))) {
      code += 1;
    }
    return String(code);
  }

  let i = 1;
  while (used.has(`${preferredCode}-${i}`)) {
    i += 1;
  }
  return `${preferredCode}-${i}`;
};

const getOrCreateAccount = async (
  tx: TxClient,
  cache: AccountCache,
  companyId: number,
  actor: string,
  matcher: AccountMatcher,
) => {
  const existing = findMatchingAccount(cache, matcher);
  if (existing) return existing;

  const group = await ensureGroup(tx, cache, companyId, actor, matcher.preferredGroup, matcher.type);
  const code = nextAvailableCode(cache, matcher.preferredCode);
  const created = await tx.account.create({
    data: {
      companyId,
      code,
      name: matcher.preferredName,
      group: group.name,
      groupId: group.id,
      type: displayAccountType(matcher.type),
      openingBalance: 0,
      isActive: true,
      createdBy: actor,
    },
    select: { id: true, code: true, name: true, group: true, type: true, isActive: true },
  });
  cache.accounts.push(created);
  return created;
};

const sanitizePostingLines = (lines: PostingLine[]) =>
  lines
    .map((line) => ({
      ...line,
      debit: toMoney(line.debit),
      credit: toMoney(line.credit),
    }))
    .filter((line) => Number(line.debit) > 0 || Number(line.credit) > 0);

const generateJournalNumber = (prefix: string) => makeDocumentNumber(prefix);

const reverseExistingPostedEntry = async (
  tx: TxClient,
  entry: {
    id: number;
    companyId: number;
    entryNo: string;
    date: Date;
    narration: string;
    lines: Array<{
      accountId: number;
      debit: number;
      credit: number;
      costCentreId: number | null;
      narration: string | null;
    }>;
  },
  actor: string,
  date: Date,
  narrationPrefix = "Auto reversal",
) => {
  await tx.journalEntry.create({
    data: {
      companyId: entry.companyId,
      entryNo: generateJournalNumber("REV"),
      date,
      narration: `${narrationPrefix} of ${entry.entryNo}`,
      type: `${entry.id}:REVERSAL`,
      status: "POSTED",
      postedAt: new Date(),
      postedBy: actor,
      reversalOf: entry.id,
      createdBy: actor,
      lines: {
        create: entry.lines.map((line) => ({
          companyId: entry.companyId,
          accountId: line.accountId,
          debit: toMoney(line.credit),
          credit: toMoney(line.debit),
          costCentreId: line.costCentreId ?? undefined,
          narration: line.narration ?? undefined,
          createdBy: actor,
        })),
      },
    },
  });

  await tx.journalEntry.update({
    where: { id: entry.id },
    data: { status: "VOID" },
  });
};

export const upsertPostedJournalForSource = async (
  tx: TxClient,
  params: {
    companyId: number;
    sourceKey: string;
    entryPrefix: string;
    date: Date;
    narration: string;
    actor: string;
    lines: PostingLine[];
    forceReplace?: boolean;
  },
) => {
  const lines = sanitizePostingLines(params.lines);
  const existing = await tx.journalEntry.findMany({
    where: {
      companyId: params.companyId,
      type: params.sourceKey,
      status: { in: ["DRAFT", "POSTED"] },
    },
    include: { lines: true },
    orderBy: { id: "asc" },
  });

  if (!lines.length) {
    if (params.forceReplace) {
      for (const entry of existing) {
        if (entry.status === "POSTED") {
          await reverseExistingPostedEntry(tx, entry, params.actor, params.date);
          continue;
        }
        await tx.journalLine.deleteMany({ where: { entryId: entry.id } });
        await tx.journalEntry.delete({ where: { id: entry.id } });
      }
    }
    return null;
  }

  const debitTotal = toMoney(lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0));
  const creditTotal = toMoney(lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0));
  if (Math.abs(debitTotal - creditTotal) > 0.01) {
    throw new Error(`Unbalanced posting for ${params.sourceKey}: debit ${debitTotal}, credit ${creditTotal}`);
  }

  const postedExisting = existing.find((entry) => entry.status === "POSTED");
  if (postedExisting && !params.forceReplace) {
    return postedExisting;
  }

  for (const entry of existing) {
    if (entry.status === "POSTED") {
      await reverseExistingPostedEntry(tx, entry, params.actor, params.date);
      continue;
    }
    await tx.journalLine.deleteMany({ where: { entryId: entry.id } });
    await tx.journalEntry.delete({ where: { id: entry.id } });
  }

  return tx.journalEntry.create({
    data: {
      companyId: params.companyId,
      entryNo: generateJournalNumber(params.entryPrefix),
      date: params.date,
      narration: params.narration,
      type: params.sourceKey,
      status: "POSTED",
      postedAt: new Date(),
      postedBy: params.actor,
      createdBy: params.actor,
      lines: {
        create: lines.map((line) => ({
          companyId: params.companyId,
          accountId: line.accountId,
          debit: toMoney(line.debit),
          credit: toMoney(line.credit),
          costCentreId: line.costCentreId ?? undefined,
          narration: line.narration,
          createdBy: params.actor,
        })),
      },
    },
    include: { lines: true },
  });
};

export const reversePostedJournalsForSource = async (
  tx: TxClient,
  params: {
    companyId: number;
    sourceKey: string;
    actor: string;
    date: Date;
    narrationPrefix?: string;
  },
) => {
  const rows = await tx.journalEntry.findMany({
    where: { companyId: params.companyId, type: params.sourceKey, status: "POSTED" },
    include: { lines: true },
  });

  for (const row of rows) {
    await reverseExistingPostedEntry(
      tx,
      row,
      params.actor,
      params.date,
      params.narrationPrefix ?? "Auto reversal",
    );
  }
  return rows.length;
};

export const resolveAccountingAccounts = async (
  tx: TxClient,
  companyId: number,
  actor: string,
) => {
  const cache = await loadAccountCache(tx, companyId);

  const resolve = (matcher: AccountMatcher) =>
    getOrCreateAccount(tx, cache, companyId, actor, matcher).then((account) => account.id);

  const receivableId = await resolve({
    type: "asset",
    preferredName: "Accounts Receivable",
    preferredGroup: "Current Assets",
    preferredCode: "1100",
    keywords: ["accounts receivable", "sundry debtors", "customer receivable", "debtor", "receivable"],
  });
  const payableId = await resolve({
    type: "liability",
    preferredName: "Accounts Payable",
    preferredGroup: "Current Liabilities",
    preferredCode: "2100",
    keywords: ["accounts payable", "sundry creditors", "supplier payable", "creditor", "payable"],
  });
  const salesId = await resolve({
    type: "income",
    preferredName: "Sales Revenue",
    preferredGroup: "Income",
    preferredCode: "4000",
    keywords: ["sales", "revenue", "sale"],
  });
  const purchaseId = await resolve({
    type: "expense",
    preferredName: "Cost of Goods Sold",
    preferredGroup: "Expenses",
    preferredCode: "5000",
    keywords: ["purchase", "cogs", "cost of goods", "direct expense", "purchases"],
  });
  const outputGstId = await resolve({
    type: "liability",
    preferredName: "Output GST",
    preferredGroup: "Current Liabilities",
    preferredCode: "2200",
    keywords: ["output gst", "gst payable", "output tax"],
  });
  const inputGstId = await resolve({
    type: "asset",
    preferredName: "Input GST",
    preferredGroup: "Current Assets",
    preferredCode: "1200",
    keywords: ["input gst", "gst receivable", "input tax"],
  });
  const cashId = await resolve({
    type: "asset",
    preferredName: "Cash in Hand",
    preferredGroup: "Current Assets",
    preferredCode: "1001",
    keywords: ["cash in hand", "cash"],
  });
  const bankId = await resolve({
    type: "asset",
    preferredName: "Bank Account",
    preferredGroup: "Current Assets",
    preferredCode: "1002",
    keywords: ["bank", "current account", "bank account"],
  });
  const customerAdvanceId = await resolve({
    type: "liability",
    preferredName: "Customer Advances",
    preferredGroup: "Current Liabilities",
    preferredCode: "2300",
    keywords: ["customer advance", "advance from customer", "unearned revenue"],
  });
  const supplierAdvanceId = await resolve({
    type: "asset",
    preferredName: "Advance to Suppliers",
    preferredGroup: "Current Assets",
    preferredCode: "1300",
    keywords: ["advance to supplier", "supplier advance", "advances recoverable"],
  });

  const outputCgstId = await resolve({
    type: "liability",
    preferredName: "Output CGST Payable",
    preferredGroup: "Duties & Taxes",
    preferredCode: "2201",
    keywords: ["output cgst", "cgst payable", "output central gst"],
  });
  const outputSgstId = await resolve({
    type: "liability",
    preferredName: "Output SGST/UTGST Payable",
    preferredGroup: "Duties & Taxes",
    preferredCode: "2202",
    keywords: ["output sgst", "output utgst", "sgst payable", "output state gst"],
  });
  const outputIgstId = await resolve({
    type: "liability",
    preferredName: "Output IGST Payable",
    preferredGroup: "Duties & Taxes",
    preferredCode: "2203",
    keywords: ["output igst", "igst payable", "output integrated gst"],
  });
  const outputCessId = await resolve({
    type: "liability",
    preferredName: "Output Cess Payable",
    preferredGroup: "Duties & Taxes",
    preferredCode: "2204",
    keywords: ["output cess", "cess payable", "gst cess"],
  });
  const rcmOutputCgstId = await resolve({
    type: "liability",
    preferredName: "RCM Output CGST Payable",
    preferredGroup: "Duties & Taxes",
    preferredCode: "2211",
    keywords: ["rcm output cgst", "rcm cgst payable"],
  });
  const rcmOutputSgstId = await resolve({
    type: "liability",
    preferredName: "RCM Output SGST Payable",
    preferredGroup: "Duties & Taxes",
    preferredCode: "2212",
    keywords: ["rcm output sgst", "rcm sgst payable"],
  });
  const rcmOutputIgstId = await resolve({
    type: "liability",
    preferredName: "RCM Output IGST Payable",
    preferredGroup: "Duties & Taxes",
    preferredCode: "2213",
    keywords: ["rcm output igst", "rcm igst payable"],
  });

  const inputCgstId = await resolve({
    type: "asset",
    preferredName: "Input CGST Receivable",
    preferredGroup: "Current Assets",
    preferredCode: "1201",
    keywords: ["input cgst", "cgst receivable", "input central gst", "cgst itc"],
  });
  const inputSgstId = await resolve({
    type: "asset",
    preferredName: "Input SGST/UTGST Receivable",
    preferredGroup: "Current Assets",
    preferredCode: "1202",
    keywords: ["input sgst", "input utgst", "sgst receivable", "input state gst", "sgst itc"],
  });
  const inputIgstId = await resolve({
    type: "asset",
    preferredName: "Input IGST Receivable",
    preferredGroup: "Current Assets",
    preferredCode: "1203",
    keywords: ["input igst", "igst receivable", "input integrated gst", "igst itc"],
  });
  const inputCessId = await resolve({
    type: "asset",
    preferredName: "Input Cess Receivable",
    preferredGroup: "Current Assets",
    preferredCode: "1204",
    keywords: ["input cess", "cess receivable", "input cess itc"],
  });
  const inputRcmCgstId = await resolve({
    type: "asset",
    preferredName: "Input ITC on RCM (CGST)",
    preferredGroup: "Current Assets",
    preferredCode: "1211",
    keywords: ["input rcm cgst", "itc on rcm cgst"],
  });
  const inputRcmSgstId = await resolve({
    type: "asset",
    preferredName: "Input ITC on RCM (SGST)",
    preferredGroup: "Current Assets",
    preferredCode: "1212",
    keywords: ["input rcm sgst", "itc on rcm sgst"],
  });
  const inputRcmIgstId = await resolve({
    type: "asset",
    preferredName: "Input ITC on RCM (IGST)",
    preferredGroup: "Current Assets",
    preferredCode: "1213",
    keywords: ["input rcm igst", "itc on rcm igst"],
  });

  const itcBlockedId = await resolve({
    type: "expense",
    preferredName: "Ineligible / Blocked ITC u/s 17(5)",
    preferredGroup: "Operating Expenses",
    preferredCode: "5100",
    keywords: ["blocked itc", "ineligible itc", "itc 17(5)", "17(5)"],
  });

  const gstElectronicCashId = await resolve({
    type: "asset",
    preferredName: "GST Electronic Cash Ledger",
    preferredGroup: "Current Assets",
    preferredCode: "1251",
    keywords: ["electronic cash ledger", "gst cash ledger", "pmt-06"],
  });
  const gstElectronicCreditId = await resolve({
    type: "asset",
    preferredName: "GST Electronic Credit Ledger",
    preferredGroup: "Current Assets",
    preferredCode: "1252",
    keywords: ["electronic credit ledger", "gst credit ledger"],
  });

  const roundOffId = await resolve({
    type: "expense",
    preferredName: "Round Off / Cash Discount Adjustment",
    preferredGroup: "Operating Expenses",
    preferredCode: "5999",
    keywords: ["round off", "rounding", "discount adjustment"],
  });

  return {
    receivableId,
    payableId,
    salesId,
    purchaseId,
    outputGstId,
    inputGstId,
    outputCgstId,
    outputSgstId,
    outputIgstId,
    outputCessId,
    rcmOutputCgstId,
    rcmOutputSgstId,
    rcmOutputIgstId,
    inputCgstId,
    inputSgstId,
    inputIgstId,
    inputCessId,
    inputRcmCgstId,
    inputRcmSgstId,
    inputRcmIgstId,
    itcBlockedId,
    gstElectronicCashId,
    gstElectronicCreditId,
    roundOffId,
    cashId,
    bankId,
    customerAdvanceId,
    supplierAdvanceId,
  };
};

export const accountClosingBalance = (
  accountType: string,
  openingBalance: number,
  debit: number,
  credit: number,
) => {
  const type = canonicalAccountType(accountType);
  const opening = toMoney(openingBalance);
  const movement = isDebitNature(type) ? toMoney(debit - credit) : toMoney(credit - debit);
  return toMoney(opening + movement);
};

export const accountPeriodAmount = (
  accountType: string,
  debit: number,
  credit: number,
) => {
  const type = canonicalAccountType(accountType);
  if (type === "income") return toMoney(credit - debit);
  if (type === "expense") return toMoney(debit - credit);
  return 0;
};
