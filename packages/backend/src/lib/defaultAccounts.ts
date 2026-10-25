import { prisma } from "./prisma";

export interface DefaultGroupDef {
  name: string;
  heading: "ASSETS" | "LIABILITIES" | "EQUITY" | "REVENUE" | "EXPENSES";
  type: string;
  sortOrder: number;
}

export const DEFAULT_GROUPS: DefaultGroupDef[] = [
  { name: "Current Assets", heading: "ASSETS", type: "Asset", sortOrder: 1 },
  { name: "Fixed Assets", heading: "ASSETS", type: "Asset", sortOrder: 2 },
  { name: "Current Liabilities", heading: "LIABILITIES", type: "Liability", sortOrder: 3 },
  { name: "Long Term Liabilities", heading: "LIABILITIES", type: "Liability", sortOrder: 4 },
  { name: "Equity", heading: "EQUITY", type: "Equity", sortOrder: 5 },
  { name: "Revenue", heading: "REVENUE", type: "Income", sortOrder: 6 },
  { name: "Cost of Goods Sold", heading: "EXPENSES", type: "Expense", sortOrder: 7 },
  { name: "Operating Expenses", heading: "EXPENSES", type: "Expense", sortOrder: 8 },
];

export interface DefaultAccountDef {
  code: string;
  name: string;
  description: string;
  heading: "ASSETS" | "LIABILITIES" | "EQUITY" | "REVENUE" | "EXPENSES";
  group: string;
  type: string;
  isControlAccount?: boolean;
  allowManualJournals?: boolean;
}

export const DEFAULT_ACCOUNTS: DefaultAccountDef[] = [
  // Equity Accounts (Mandatory under standard accounting policy)
  {
    code: "3000",
    name: "Capital Account / Owner's Equity",
    description: "Initial and ongoing capital contributions by owners/partners/shareholders",
    heading: "EQUITY",
    group: "Equity",
    type: "Equity",
    isControlAccount: false,
    allowManualJournals: true,
  },
  {
    code: "3100",
    name: "Retained Earnings",
    description: "Accumulated net profit or loss transferred from Profit & Loss at financial year end",
    heading: "EQUITY",
    group: "Equity",
    type: "Equity",
    isControlAccount: true,
    allowManualJournals: true,
  },
  {
    code: "3200",
    name: "Drawings / Partner Distributions",
    description: "Drawings and withdrawals by owners/partners against capital and profits",
    heading: "EQUITY",
    group: "Equity",
    type: "Equity",
    isControlAccount: false,
    allowManualJournals: true,
  },
];

export const ensureCompanyDefaultAccounts = async (companyId: number, actor = "system") => {
  // 1. Ensure Equity and other default groups exist
  const existingGroups = await prisma.accountGroup.findMany({
    where: { companyId },
  });
  const groupMap = new Map<string, number>();
  for (const g of existingGroups) {
    groupMap.set(g.name.toLowerCase(), g.id);
  }

  for (const def of DEFAULT_GROUPS) {
    const key = def.name.toLowerCase();
    if (!groupMap.has(key)) {
      const created = await prisma.accountGroup.create({
        data: {
          companyId,
          name: def.name,
          heading: def.heading,
          type: def.type,
          sortOrder: def.sortOrder,
          createdBy: actor,
        },
      });
      groupMap.set(key, created.id);
    }
  }

  // 2. Ensure Equity Accounts (Capital, Retained Earnings, Drawings) exist
  const existingAccounts = await prisma.account.findMany({
    where: { companyId },
  });
  const existingCodes = new Set(existingAccounts.map((a) => a.code));

  for (const def of DEFAULT_ACCOUNTS) {
    if (!existingCodes.has(def.code)) {
      const groupId = groupMap.get(def.group.toLowerCase()) ?? null;
      await prisma.account.create({
        data: {
          companyId,
          code: def.code,
          name: def.name,
          description: def.description,
          heading: def.heading,
          group: def.group,
          groupId,
          type: def.type,
          openingBalance: 0,
          isControlAccount: def.isControlAccount ?? false,
          allowManualJournals: def.allowManualJournals ?? true,
          showOnDashboard: def.code === "3000" || def.code === "3100",
          createdBy: actor,
        },
      });
    }
  }

  // 3. Ensure Financial Years exist if none present
  await ensureCompanyFinancialYears(companyId, actor);
};

export const ensureCompanyFinancialYears = async (companyId: number, actor = "system") => {
  const existingYears = await prisma.financialYear.findMany({
    where: { companyId },
  });

  if (existingYears.length > 0) return existingYears;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { fiscalYearStartMonth: true },
  });

  const startMonth = company?.fiscalYearStartMonth || 4; // default April in India
  const currentCalendarYear = new Date().getFullYear();

  // Generate 4 years: 2 past, 1 current, 1 next
  const yearsToCreate = [
    currentCalendarYear - 2,
    currentCalendarYear - 1,
    currentCalendarYear,
    currentCalendarYear + 1,
  ];

  for (const y of yearsToCreate) {
    const isAprilCycle = startMonth === 4;
    const label = isAprilCycle
      ? `FY ${y}-${String(y + 1).slice(2)}`
      : `FY ${y}`;

    const startDate = new Date(Date.UTC(y, startMonth - 1, 1, 0, 0, 0, 0));
    const endYear = isAprilCycle ? y + 1 : y;
    const endMonth = isAprilCycle ? 3 : 12;
    // Last day of endMonth
    const endDay = new Date(endYear, endMonth, 0).getDate();
    const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

    const isCurrent = y === (isAprilCycle && new Date().getMonth() + 1 < 4 ? currentCalendarYear - 1 : currentCalendarYear);

    await prisma.financialYear.create({
      data: {
        companyId,
        label,
        startDate,
        endDate,
        isActive: isCurrent,
        isClosed: false,
        createdBy: actor,
      },
    });
  }

  return prisma.financialYear.findMany({
    where: { companyId },
    orderBy: { startDate: "desc" },
  });
};
