import { prisma } from "../../lib/prisma";
import { ensureCompanyDefaultAccounts } from "../../lib/defaultAccounts";

export interface SeedTaxBlockDef {
  name: string;
  assetClass: string;
  depreciationRate: number;
  description: string;
}

export const STATUTORY_TAX_BLOCKS: SeedTaxBlockDef[] = [
  {
    name: "Buildings (Residential)",
    assetClass: "BUILDINGS",
    depreciationRate: 5.0,
    description: "Residential buildings u/s 32 Appendix I (excluding hotels & boarding houses). Rate: 5%. (Verify with CA)",
  },
  {
    name: "Buildings (Commercial / Factory / Office)",
    assetClass: "BUILDINGS",
    depreciationRate: 10.0,
    description: "Commercial offices, godowns, factory premises and show-rooms. Rate: 10%. (Verify with CA)",
  },
  {
    name: "Furniture & Fittings",
    assetClass: "FURNITURE_AND_FITTINGS",
    depreciationRate: 10.0,
    description: "Furniture and fittings including electrical fittings u/s 32. Rate: 10%. (Verify with CA)",
  },
  {
    name: "Plant & Machinery (General)",
    assetClass: "PLANT_AND_MACHINERY",
    depreciationRate: 15.0,
    description: "General plant, jewellery manufacturing machinery, scales, tools and equipment. Rate: 15%. (Verify with CA)",
  },
  {
    name: "Motor Cars (Non-Commercial)",
    assetClass: "PLANT_AND_MACHINERY",
    depreciationRate: 15.0,
    description: "Motor cars other than those used in a business of running them on hire. Rate: 15%. (Verify with CA)",
  },
  {
    name: "Commercial Vehicles (Lorries, Vans, Hire)",
    assetClass: "PLANT_AND_MACHINERY",
    depreciationRate: 30.0,
    description: "Commercial transport vehicles, lorries, taxis used on hire. Rate: 30%. (Verify with CA)",
  },
  {
    name: "Computers, Laptops & Software",
    assetClass: "PLANT_AND_MACHINERY",
    depreciationRate: 40.0,
    description: "Computers including computer software u/s 32 Appendix I. Rate: 40%. (Verify with CA)",
  },
  {
    name: "Pollution Control & Energy Devices",
    assetClass: "PLANT_AND_MACHINERY",
    depreciationRate: 40.0,
    description: "Air pollution control, water pollution control and renewable devices. Rate: 40%. (Verify with CA)",
  },
  {
    name: "Intangible Assets",
    assetClass: "INTANGIBLE_ASSETS",
    depreciationRate: 25.0,
    description: "Know-how, patents, copyrights, trademarks, licenses, franchises. Rate: 25%. (Verify with CA)",
  },
];

export interface SeedAssetCategoryDef {
  name: string;
  code: string;
  description: string;
  scheduleIIClass: string;
  usefulLifeYears: number;
  residualPercentage: number;
  defaultMethod: "SLM" | "WDV";
  assetAccountCode: string;
  accumulatedDepAccountCode: string;
  depExpenseAccountCode: string;
  cwipAccountCode?: string;
  gainLossAccountCode?: string;
  taxBlockName: string;
}

export const STATUTORY_ASSET_CATEGORIES: SeedAssetCategoryDef[] = [
  {
    name: "Plant & Machinery",
    code: "PLM",
    description: "General plant and machinery used in jewellery manufacturing and operations (Schedule II: 15 Years)",
    scheduleIIClass: "Part C - General Plant & Machinery",
    usefulLifeYears: 15,
    residualPercentage: 5.0,
    defaultMethod: "SLM",
    assetAccountCode: "1501",
    accumulatedDepAccountCode: "1599",
    depExpenseAccountCode: "5200",
    cwipAccountCode: "1509",
    gainLossAccountCode: "5201",
    taxBlockName: "Plant & Machinery (General)",
  },
  {
    name: "Furniture & Fixtures",
    code: "FUR",
    description: "Showroom display counters, secure safes, desks, customer seating and fixtures (Schedule II: 10 Years)",
    scheduleIIClass: "Part C - Furniture & Fittings",
    usefulLifeYears: 10,
    residualPercentage: 5.0,
    defaultMethod: "SLM",
    assetAccountCode: "1502",
    accumulatedDepAccountCode: "1599",
    depExpenseAccountCode: "5200",
    cwipAccountCode: "1509",
    gainLossAccountCode: "5201",
    taxBlockName: "Furniture & Fittings",
  },
  {
    name: "Computers & Laptops",
    code: "CMP",
    description: "Desktops, laptops, bill counters, barcode printers and POS terminals (Schedule II: 3 Years)",
    scheduleIIClass: "Part C - Computers (End User Devices)",
    usefulLifeYears: 3,
    residualPercentage: 5.0,
    defaultMethod: "SLM",
    assetAccountCode: "1503",
    accumulatedDepAccountCode: "1599",
    depExpenseAccountCode: "5200",
    cwipAccountCode: "1509",
    gainLossAccountCode: "5201",
    taxBlockName: "Computers, Laptops & Software",
  },
  {
    name: "Servers & Networks",
    code: "SRV",
    description: "Central servers, network switches, routers, firewall appliances (Schedule II: 6 Years)",
    scheduleIIClass: "Part C - Computers (Servers & Networks)",
    usefulLifeYears: 6,
    residualPercentage: 5.0,
    defaultMethod: "SLM",
    assetAccountCode: "1503",
    accumulatedDepAccountCode: "1599",
    depExpenseAccountCode: "5200",
    cwipAccountCode: "1509",
    gainLossAccountCode: "5201",
    taxBlockName: "Computers, Laptops & Software",
  },
  {
    name: "Office Equipment",
    code: "OFF",
    description: "Air conditioners, CCTV cameras, biometric security systems, copiers (Schedule II: 5 Years)",
    scheduleIIClass: "Part C - Office Equipment",
    usefulLifeYears: 5,
    residualPercentage: 5.0,
    defaultMethod: "SLM",
    assetAccountCode: "1504",
    accumulatedDepAccountCode: "1599",
    depExpenseAccountCode: "5200",
    cwipAccountCode: "1509",
    gainLossAccountCode: "5201",
    taxBlockName: "Plant & Machinery (General)",
  },
  {
    name: "Motor Vehicles",
    code: "VEH",
    description: "Company motor cars and two-wheelers used for operations (Schedule II: 8 Years)",
    scheduleIIClass: "Part C - Motor Vehicles (Motor Cars)",
    usefulLifeYears: 8,
    residualPercentage: 5.0,
    defaultMethod: "SLM",
    assetAccountCode: "1505",
    accumulatedDepAccountCode: "1599",
    depExpenseAccountCode: "5200",
    cwipAccountCode: "1509",
    gainLossAccountCode: "5201",
    taxBlockName: "Motor Cars (Non-Commercial)",
  },
];

export async function ensureFixedAssetSeedData(companyId: number, actor = "system") {
  // 1. Ensure accounts exist
  await ensureCompanyDefaultAccounts(companyId, actor);

  // Load account mappings
  const accounts = await prisma.account.findMany({
    where: { companyId },
  });
  const accountByCode = new Map<string, number>();
  for (const acc of accounts) {
    accountByCode.set(acc.code, acc.id);
  }

  // 2. Ensure Statutory Tax Blocks exist
  const existingBlocks = await prisma.taxBlock.findMany({
    where: { companyId },
  });
  const blockMap = new Map<string, number>();
  for (const b of existingBlocks) {
    blockMap.set(b.name, b.id);
  }

  for (const blockDef of STATUTORY_TAX_BLOCKS) {
    if (!blockMap.has(blockDef.name)) {
      const created = await prisma.taxBlock.create({
        data: {
          companyId,
          name: blockDef.name,
          assetClass: blockDef.assetClass,
          depreciationRate: blockDef.depreciationRate,
          description: blockDef.description,
          verifyWithCa: true,
        },
      });
      blockMap.set(blockDef.name, created.id);
    }
  }

  // 3. Ensure Schedule II Asset Categories exist
  const existingCategories = await prisma.assetCategory.findMany({
    where: { companyId },
  });
  const catMap = new Set(existingCategories.map((c) => c.name));

  for (const catDef of STATUTORY_ASSET_CATEGORIES) {
    if (!catMap.has(catDef.name)) {
      const assetAccountId = accountByCode.get(catDef.assetAccountCode);
      const accumDepAccountId = accountByCode.get(catDef.accumulatedDepAccountCode);
      const depExpenseAccountId = accountByCode.get(catDef.depExpenseAccountCode);
      const cwipAccountId = catDef.cwipAccountCode ? accountByCode.get(catDef.cwipAccountCode) : null;
      const gainLossAccountId = catDef.gainLossAccountCode ? accountByCode.get(catDef.gainLossAccountCode) : null;
      const taxBlockId = blockMap.get(catDef.taxBlockName) ?? null;

      if (assetAccountId && accumDepAccountId && depExpenseAccountId) {
        await prisma.assetCategory.create({
          data: {
            companyId,
            name: catDef.name,
            code: catDef.code,
            description: catDef.description,
            scheduleIIClass: catDef.scheduleIIClass,
            usefulLifeYears: catDef.usefulLifeYears,
            residualPercentage: catDef.residualPercentage,
            defaultMethod: catDef.defaultMethod,
            taxBlockId,
            assetAccountId,
            accumulatedDepAccountId: accumDepAccountId,
            depExpenseAccountId,
            cwipAccountId,
            gainLossAccountId,
          },
        });
      }
    }
  }
}
