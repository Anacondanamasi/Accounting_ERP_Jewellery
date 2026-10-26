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
  { name: "Duties & Taxes", heading: "LIABILITIES", type: "Liability", sortOrder: 4 },
  { name: "Long Term Liabilities", heading: "LIABILITIES", type: "Liability", sortOrder: 5 },
  { name: "Equity", heading: "EQUITY", type: "Equity", sortOrder: 6 },
  { name: "Revenue", heading: "REVENUE", type: "Income", sortOrder: 7 },
  { name: "Cost of Goods Sold", heading: "EXPENSES", type: "Expense", sortOrder: 8 },
  { name: "Operating Expenses", heading: "EXPENSES", type: "Expense", sortOrder: 9 },
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
  // Equity Accounts
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

  // Core Working Accounts
  {
    code: "1100",
    name: "Accounts Receivable",
    description: "Trade receivables / sundry debtors",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "2100",
    name: "Accounts Payable",
    description: "Trade payables / sundry creditors",
    heading: "LIABILITIES",
    group: "Current Liabilities",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "4000",
    name: "Sales Revenue",
    description: "Primary sales income",
    heading: "REVENUE",
    group: "Revenue",
    type: "Income",
    isControlAccount: false,
    allowManualJournals: true,
  },
  {
    code: "5000",
    name: "Cost of Goods Sold",
    description: "Direct cost / purchases",
    heading: "EXPENSES",
    group: "Cost of Goods Sold",
    type: "Expense",
    isControlAccount: false,
    allowManualJournals: true,
  },
  {
    code: "1001",
    name: "Cash in Hand",
    description: "Physical cash in register / petty cash",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: false,
    allowManualJournals: true,
  },
  {
    code: "1002",
    name: "Bank Account",
    description: "Primary current account",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: false,
    allowManualJournals: true,
  },

  // Indian GST Control Accounts - Duties & Taxes (Liabilities)
  {
    code: "2201",
    name: "Output CGST Payable",
    description: "Central GST liability on intra-state outward supplies",
    heading: "LIABILITIES",
    group: "Duties & Taxes",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "2202",
    name: "Output SGST/UTGST Payable",
    description: "State/UT GST liability on intra-state outward supplies",
    heading: "LIABILITIES",
    group: "Duties & Taxes",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "2203",
    name: "Output IGST Payable",
    description: "Integrated GST liability on inter-state outward supplies",
    heading: "LIABILITIES",
    group: "Duties & Taxes",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "2204",
    name: "Output Cess Payable",
    description: "GST compensation cess liability on outward supplies",
    heading: "LIABILITIES",
    group: "Duties & Taxes",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "2211",
    name: "RCM Output CGST Payable",
    description: "RCM CGST payable in cash under Sec 9(3)/9(4)",
    heading: "LIABILITIES",
    group: "Duties & Taxes",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "2212",
    name: "RCM Output SGST Payable",
    description: "RCM SGST payable in cash under Sec 9(3)/9(4)",
    heading: "LIABILITIES",
    group: "Duties & Taxes",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "2213",
    name: "RCM Output IGST Payable",
    description: "RCM IGST payable in cash on inter-state/import services",
    heading: "LIABILITIES",
    group: "Duties & Taxes",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "2251",
    name: "GST Electronic Liability Ledger",
    description: "Statutory tax liability tracking mirror account",
    heading: "LIABILITIES",
    group: "Duties & Taxes",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "2310",
    name: "GST Advance Received",
    description: "Tax liability recognized on customer advances before invoice generation",
    heading: "LIABILITIES",
    group: "Current Liabilities",
    type: "Liability",
    isControlAccount: true,
    allowManualJournals: false,
  },

  // Indian GST Control Accounts - Input Tax Credit (Assets)
  {
    code: "1201",
    name: "Input CGST Receivable",
    description: "Central GST input tax credit on purchases / inward supplies",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1202",
    name: "Input SGST/UTGST Receivable",
    description: "State/UT GST input tax credit on purchases / inward supplies",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1203",
    name: "Input IGST Receivable",
    description: "Integrated GST input tax credit on inter-state purchases / imports",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1204",
    name: "Input Cess Receivable",
    description: "GST compensation cess input credit",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1211",
    name: "Input ITC on RCM (CGST)",
    description: "Provisional RCM ITC claimed after payment",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1212",
    name: "Input ITC on RCM (SGST)",
    description: "Provisional RCM ITC claimed after payment",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1213",
    name: "Input ITC on RCM (IGST)",
    description: "Provisional RCM ITC claimed on import of services",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1251",
    name: "GST Electronic Cash Ledger",
    description: "Mirror of cash deposits in GST portal (Challan PMT-06)",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1252",
    name: "GST Electronic Credit Ledger",
    description: "Mirror of eligible ITC available in GST portal",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1261",
    name: "GST TDS Receivable",
    description: "TDS deducted by government customers under Section 51",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1262",
    name: "GST TCS Receivable",
    description: "TCS collected by e-commerce operators under Section 52",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },
  {
    code: "1310",
    name: "GST Advance Paid",
    description: "Asset tracking GST paid on advances to suppliers",
    heading: "ASSETS",
    group: "Current Assets",
    type: "Asset",
    isControlAccount: true,
    allowManualJournals: false,
  },

  // Expenses & Adjustments
  {
    code: "5100",
    name: "Ineligible / Blocked ITC u/s 17(5)",
    description: "Expense account for GST on items blocked from ITC claim",
    heading: "EXPENSES",
    group: "Operating Expenses",
    type: "Expense",
    isControlAccount: false,
    allowManualJournals: true,
  },
  {
    code: "5999",
    name: "Round Off / Cash Discount Adjustment",
    description: "Rounding off fractions and petty transaction adjustments",
    heading: "EXPENSES",
    group: "Operating Expenses",
    type: "Expense",
    isControlAccount: false,
    allowManualJournals: true,
  },
];

export const ensureCompanyDefaultAccounts = async (companyId: number, actor = "system") => {
  // 1. Ensure Equity, Duties & Taxes and other default groups exist
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

  // 2. Ensure all default accounts exist
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
          showOnDashboard: def.code === "3000" || def.code === "3100" || def.code === "2201" || def.code === "1201",
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
