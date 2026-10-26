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

export interface SampleAssetDef {
  assetCode: string;
  name: string;
  categoryCode: string;
  dateOfPurchase: string;
  datePutToUse: string;
  originalCost: number;
  usefulLifeYears: number;
  depreciationMethod: "SLM" | "WDV";
  salvagePercentage: number;
  location: string;
  department: string;
  custodian: string;
  serialNo: string;
  vendorName: string;
  billInvoiceNo: string;
  status: "ACTIVE" | "CWIP" | "DISPOSED";
  isCwip?: boolean;
  isDisposed?: boolean;
  disposalDate?: string;
  disposalAmount?: number;
  disposalReason?: string;
  description: string;
}

export const SAMPLE_JEWELLERY_ASSETS: SampleAssetDef[] = [
  {
    assetCode: "PLM-2024-0001",
    name: "Fiber Laser Hallmarking & Marking Machine",
    categoryCode: "PLM",
    dateOfPurchase: "2024-05-10",
    datePutToUse: "2024-05-15",
    originalCost: 650000,
    usefulLifeYears: 15,
    depreciationMethod: "SLM",
    salvagePercentage: 5,
    location: "Manufacturing Workshop - Floor 1",
    department: "Production & Karigar",
    custodian: "Ramesh Sharma (Head Karigar)",
    serialNo: "FIBER-LSR-8821",
    vendorName: "Mehta Laser Tech Pvt Ltd",
    billInvoiceNo: "MLT/2024/049",
    status: "ACTIVE",
    description: "20W Fiber laser system for BIS hallmark engraving and barcode marking on gold and platinum jewelry.",
  },
  {
    assetCode: "PLM-2024-0002",
    name: "Gold Purity Testing XRF Spectrometer (EDXRF)",
    categoryCode: "PLM",
    dateOfPurchase: "2024-07-08",
    datePutToUse: "2024-07-12",
    originalCost: 480000,
    usefulLifeYears: 10,
    depreciationMethod: "WDV",
    salvagePercentage: 5,
    location: "Purity Testing Lab",
    department: "Quality & Hallmarking",
    custodian: "Dr. Ananya Shah (Chief Assayer)",
    serialNo: "XRF-GOLD-PRO-90",
    vendorName: "Thermo Analytical India",
    billInvoiceNo: "TAI/INV/8812",
    status: "ACTIVE",
    description: "High-precision benchtop XRF analyzer for non-destructive gold, silver and bullion karat analysis.",
  },
  {
    assetCode: "FUR-2024-0001",
    name: "Showroom Fire & Burglary Vault Door & Cash Safes",
    categoryCode: "FUR",
    dateOfPurchase: "2024-04-01",
    datePutToUse: "2024-04-05",
    originalCost: 350000,
    usefulLifeYears: 10,
    depreciationMethod: "SLM",
    salvagePercentage: 5,
    location: "Main Showroom Strong Room",
    department: "Security & Vaulting",
    custodian: "Vikram Mehta (Store General Manager)",
    serialNo: "GD-SEC-VAULT-77",
    vendorName: "Godrej Security Solutions",
    billInvoiceNo: "GSS/MH/10293",
    status: "ACTIVE",
    description: "Class C heavy-duty burglary and torch-resistant vault door with dual combination keylocks.",
  },
  {
    assetCode: "VEH-2024-0001",
    name: "Armored Bullion & Cash Escort Van",
    categoryCode: "VEH",
    dateOfPurchase: "2024-11-15",
    datePutToUse: "2024-11-20",
    originalCost: 1280000,
    usefulLifeYears: 8,
    depreciationMethod: "WDV",
    salvagePercentage: 5,
    location: "Showroom Main Parking",
    department: "Logistics & Bullion Transit",
    custodian: "Sunil Patil (Fleet Officer)",
    serialNo: "MH-01-EF-8820",
    vendorName: "Mahindra Commercial Vehicles",
    billInvoiceNo: "MHM/24/7781",
    status: "ACTIVE",
    description: "Custom reinforced cash and gold transport van with GPS tracking, panic sirens and vault compartments.",
  },
  {
    assetCode: "OFF-2024-0001",
    name: "Central 32-Channel IP CCTV Surveillance & NVR",
    categoryCode: "OFF",
    dateOfPurchase: "2024-06-15",
    datePutToUse: "2024-06-20",
    originalCost: 210000,
    usefulLifeYears: 5,
    depreciationMethod: "SLM",
    salvagePercentage: 5,
    location: "Showroom Floors 1 & 2",
    department: "Security",
    custodian: "Security Supervisor",
    serialNo: "CP-NVR-32CH-99",
    vendorName: "CP Plus Security Hub",
    billInvoiceNo: "CPS/2024/902",
    status: "ACTIVE",
    description: "32-channel 4K IP security camera system with 90-day redundant cloud and on-premise storage.",
  },
  {
    assetCode: "OFF-2025-0001",
    name: "Daikin Inverter Central VRV Air Conditioning System",
    categoryCode: "OFF",
    dateOfPurchase: "2025-04-10",
    datePutToUse: "2025-04-15",
    originalCost: 275000,
    usefulLifeYears: 5,
    depreciationMethod: "SLM",
    salvagePercentage: 5,
    location: "Bridal Jewellery Lounge",
    department: "Retail Showroom",
    custodian: "Pooja Vora (Lounge Manager)",
    serialNo: "DAIKIN-VRV-2025-01",
    vendorName: "CoolAir Technologies",
    billInvoiceNo: "CAT/25/112",
    status: "ACTIVE",
    description: "Variable refrigerant volume 4-way cassette AC unit providing climate control for showroom.",
  },
  {
    assetCode: "SRV-2025-0001",
    name: "Dell PowerEdge ERP Database Server & Rack",
    categoryCode: "SRV",
    dateOfPurchase: "2025-06-01",
    datePutToUse: "2025-06-05",
    originalCost: 320000,
    usefulLifeYears: 6,
    depreciationMethod: "SLM",
    salvagePercentage: 5,
    location: "Server Room (Restricted Access)",
    department: "Information Technology",
    custodian: "IT Systems Admin",
    serialNo: "DELL-R750-SRV-01",
    vendorName: "CompuCom Systems India",
    billInvoiceNo: "CCS/2025/334",
    status: "ACTIVE",
    description: "High-reliability dual Xeon server running on-premise jewellery ERP database and automated backups.",
  },
  {
    assetCode: "CMP-2025-0001",
    name: "POS Touch Billing Terminals & RFID Jewelry Trays",
    categoryCode: "CMP",
    dateOfPurchase: "2025-09-10",
    datePutToUse: "2025-09-15",
    originalCost: 195000,
    usefulLifeYears: 3,
    depreciationMethod: "SLM",
    salvagePercentage: 5,
    location: "Retail Billing Counters 1, 2, 3",
    department: "Sales & Billing",
    custodian: "Head Cashier",
    serialNo: "POS-RFID-TR-01-03",
    vendorName: "JewelTech POS Solutions",
    billInvoiceNo: "JT/25/098",
    status: "ACTIVE",
    description: "3 complete POS touchscreen terminals paired with UHF RFID scanning mats for instant tray tallying.",
  },
  {
    assetCode: "FUR-2026-0001",
    name: "New Heritage Bridal Lounge Expansion (CWIP)",
    categoryCode: "FUR",
    dateOfPurchase: "2026-01-10",
    datePutToUse: "2026-01-10",
    originalCost: 580000,
    usefulLifeYears: 10,
    depreciationMethod: "SLM",
    salvagePercentage: 5,
    location: "Ground Floor Annex",
    department: "Expansion & Projects",
    custodian: "Project Architect",
    serialNo: "CWIP-ANNEX-2026",
    vendorName: "DesignCraft Interiors",
    billInvoiceNo: "DCI/2026/004",
    status: "CWIP",
    isCwip: true,
    description: "Capital Work-in-Progress for custom teakwood display vitrines and chandeliers awaiting completion.",
  },
  {
    assetCode: "VEH-2023-0001",
    name: "Honda Activa 125 Delivery Scooter (Disposed)",
    categoryCode: "VEH",
    dateOfPurchase: "2023-05-10",
    datePutToUse: "2023-05-15",
    originalCost: 75000,
    usefulLifeYears: 8,
    depreciationMethod: "SLM",
    salvagePercentage: 5,
    location: "Main Branch",
    department: "Local Messenger",
    custodian: "Kishore Kumar",
    serialNo: "MH-01-CJ-4491",
    vendorName: "Automotive World",
    billInvoiceNo: "AW/2023/110",
    status: "DISPOSED",
    isDisposed: true,
    disposalDate: "2026-01-20",
    disposalAmount: 32000,
    disposalReason: "SOLD",
    description: "Old two-wheeler sold off after acquiring electric vehicle fleet.",
  },
];

/**
 * Seed realistic jewellery fixed assets for sample testing and review
 */
export async function seedSampleJewelleryAssets(companyId: number, actor = "system") {
  // Ensure masters exist first
  await ensureFixedAssetSeedData(companyId, actor);

  const categories = await prisma.assetCategory.findMany({ where: { companyId } });
  const categoryByCode = new Map<string, typeof categories[0]>();
  for (const c of categories) {
    if (c.code) {
      categoryByCode.set(c.code, c);
    }
  }

  let seededCount = 0;

  for (const item of SAMPLE_JEWELLERY_ASSETS) {
    const existing = await prisma.fixedAsset.findFirst({
      where: { companyId, assetCode: item.assetCode },
    });

    if (!existing) {
      const category = categoryByCode.get(item.categoryCode) || categories[0];
      if (!category) continue;

      const ptu = new Date(item.datePutToUse);
      const pur = new Date(item.dateOfPurchase);
      const dispDate = item.disposalDate ? new Date(item.disposalDate) : null;
      const salvageValue = Math.round(((item.originalCost * item.salvagePercentage) / 100) * 100) / 100;

      // Approximate accumulated depreciation up to now
      const msElapsed = Math.max(0, (dispDate ? dispDate.getTime() : Date.now()) - ptu.getTime());
      const yearsElapsed = msElapsed / (365.25 * 24 * 3600 * 1000);
      let initialAccumDep = 0;
      if (!item.isCwip) {
        if (item.depreciationMethod === "SLM") {
          const annual = (item.originalCost - salvageValue) / item.usefulLifeYears;
          initialAccumDep = Math.min(item.originalCost - salvageValue, annual * yearsElapsed);
        } else {
          // WDV
          const rate = 1 - Math.pow(salvageValue / item.originalCost, 1 / item.usefulLifeYears);
          const remaining = item.originalCost * Math.pow(1 - rate, yearsElapsed);
          initialAccumDep = Math.min(item.originalCost - salvageValue, item.originalCost - remaining);
        }
      }
      initialAccumDep = Math.round(initialAccumDep * 100) / 100;
      const currentBookValue = Math.round((item.originalCost - initialAccumDep) * 100) / 100;

      await prisma.fixedAsset.create({
        data: {
          companyId,
          assetCode: item.assetCode,
          name: item.name,
          description: item.description,
          assetCategoryId: category.id,
          taxBlockId: category.taxBlockId,
          serialNo: item.serialNo,
          location: item.location,
          department: item.department,
          custodian: item.custodian,
          dateOfPurchase: pur,
          datePutToUse: ptu,
          originalCost: item.originalCost,
          salvageValue,
          usefulLifeYears: item.usefulLifeYears,
          depreciationMethod: item.depreciationMethod,
          currentBookValue,
          accumulatedDep: initialAccumDep,
          status: item.status,
          isCwip: Boolean(item.isCwip),
          isDisposed: Boolean(item.isDisposed),
          disposalDate: dispDate,
          disposalAmount: item.disposalAmount ?? null,
          disposalReason: item.disposalReason ?? null,
          billInvoiceNo: item.billInvoiceNo,
          billDate: pur,
          createdBy: actor,
        },
      });

      seededCount++;
    }
  }

  return seededCount;
}

