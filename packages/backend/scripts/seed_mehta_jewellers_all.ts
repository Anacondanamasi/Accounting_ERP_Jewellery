import { prisma } from '../src/lib/prisma';

const CREATED_BY = '8b63536e-29ce-4795-aeca-d0bf2d1abc88'; // Rajesh Mehta
const COMPANY_ID = 1;

async function main() {
  console.log('--- Starting Seeding for Mehta Jewellers (Company ID: 1) ---');

  // 1. Update Company profile in Prisma Company table
  await prisma.company.update({
    where: { id: COMPANY_ID },
    data: {
      name: 'Mehta Jewellers',
      legalName: 'Mehta Jewellers Private Limited',
      gstin: '24AAACM1234A1Z1',
      pan: 'AAACM1234A',
      email: 'contact@mehtajewellers.in',
      phone: '+91 79 2658 9000',
      website: 'https://mehtajewellers.in',
      addressLine1: 'Showroom 101-104, Jewel World',
      addressLine2: 'C.G. Road, Navrangpura',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pinCode: '380009',
      country: 'India',
      currency: 'INR',
      weightUnit: 'g',
      timezone: 'Asia/Kolkata',
      fiscalYearStartMonth: 4,
    },
  });
  console.log('✓ Updated Company master record');

  // Also update raw companies table name and details if needed
  await prisma.$queryRawUnsafe(`
    UPDATE companies 
    SET name = 'Mehta Jewellers', legal_name = 'Mehta Jewellers Private Limited', tax_id = '24AAACM1234A1Z1', currency_code = 'INR', country_code = 'IN' 
    WHERE id = '04a59bb4-9556-4f62-9b5c-4c7189cce2a7' OR legacy_company_id = 1
  `);
  console.log('✓ Updated raw IAM companies table');

  // 2. Ensure Standard Chart of Accounts exists
  const accountDefinitions = [
    { code: '1001', name: 'Cash on Hand - Showroom Vault', type: 'Asset', heading: 'ASSETS', isCashAccount: true },
    { code: '1090', name: 'SBI Gold Metal Loan / CC A/c', type: 'Bank', heading: 'ASSETS', isBankAccount: true },
    { code: '1200', name: 'Finished Goods Inventory - Jewellery', type: 'Asset', heading: 'ASSETS' },
    { code: '2210', name: 'Output CGST 1.5% Payable', type: 'Liability', heading: 'LIABILITIES' },
    { code: '2220', name: 'Output SGST 1.5% Payable', type: 'Liability', heading: 'LIABILITIES' },
    { code: '2230', name: 'Input CGST Credit', type: 'Asset', heading: 'ASSETS' },
    { code: '2240', name: 'Input SGST Credit', type: 'Asset', heading: 'ASSETS' },
    { code: '4050', name: 'Making Charges Income', type: 'Income', heading: 'REVENUE' },
    { code: '5100', name: 'Karigar Labour & Making Charges', type: 'Expense', heading: 'EXPENSES' },
    { code: '6010', name: 'Showroom Rent & Property Maintenance', type: 'Expense', heading: 'EXPENSES' },
    { code: '6020', name: 'Showroom Staff Salaries', type: 'Expense', heading: 'EXPENSES' },
    { code: '6030', name: 'BIS Hallmarking & Assay Certification', type: 'Expense', heading: 'EXPENSES' },
    { code: '6040', name: 'Vault Security & Surveillance', type: 'Expense', heading: 'EXPENSES' },
  ];

  for (const acc of accountDefinitions) {
    const existing = await prisma.account.findFirst({
      where: { companyId: COMPANY_ID, code: acc.code }
    });
    if (!existing) {
      await prisma.account.create({
        data: {
          companyId: COMPANY_ID,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          heading: acc.heading,
          group: acc.heading,
          openingBalance: 0,
          isCashAccount: acc.isCashAccount || false,
          isBankAccount: acc.isBankAccount || false,
          createdBy: CREATED_BY
        }
      });
    }
  }
  console.log('✓ Ensured full Chart of Accounts');

  // Load account mappings
  const allAccounts = await prisma.account.findMany({ where: { companyId: COMPANY_ID } });
  const accMap = new Map(allAccounts.map(a => [a.code, a.id]));

  // 3. Customers (7 realistic jewellery customers)
  const customersData = [
    {
      code: 'CUST-001',
      name: 'Aarav Patel',
      type: 'INDIVIDUAL',
      category: 'RETAIL',
      mobile: '+91 98250 11223',
      email: 'aarav.patel@gmail.com',
      pan: 'ABCPP1234D',
      city: 'Ahmedabad',
      openingBalance: 0,
      creditLimit: 500000,
      creditDays: 30,
      notes: 'VIP Bridal Jewellery client, prefers 22K antique designs',
    },
    {
      code: 'CUST-002',
      name: 'Ananya Sharma',
      type: 'INDIVIDUAL',
      category: 'RETAIL',
      mobile: '+91 98240 55667',
      email: 'ananya.sharma@yahoo.co.in',
      pan: 'DEFPS5678M',
      city: 'Vadodara',
      openingBalance: 0,
      creditLimit: 300000,
      creditDays: 15,
      notes: 'Diamond solitaire and certified gemstone buyer',
    },
    {
      code: 'CUST-003',
      name: 'Kiran Jewellers & Ornaments',
      type: 'BUSINESS',
      category: 'WHOLESALE',
      mobile: '+91 98790 99881',
      email: 'orders@kiranjewellers.com',
      gstin: '24AACFK9821A1Z4',
      pan: 'AACFK9821A',
      city: 'Surat',
      openingBalance: 150000,
      creditLimit: 2500000,
      creditDays: 45,
      notes: 'Wholesale B2B client, regular buyer of 22K machine chains & kadas',
    },
    {
      code: 'CUST-004',
      name: 'Siddharth & Priya Verma',
      type: 'INDIVIDUAL',
      category: 'RETAIL',
      mobile: '+91 98980 44332',
      email: 'siddharth.verma@techcorp.in',
      pan: 'GHIJV4321K',
      city: 'Ahmedabad',
      openingBalance: 0,
      creditLimit: 400000,
      creditDays: 20,
      notes: 'Wedding collection buyer, platinum rings & 18K rose gold',
    },
    {
      code: 'CUST-005',
      name: 'Pooja Desai',
      type: 'INDIVIDUAL',
      category: 'RETAIL',
      mobile: '+91 99090 77665',
      email: 'pooja.desai@outlook.com',
      pan: 'JKLPD8765L',
      city: 'Rajkot',
      openingBalance: 0,
      creditLimit: 350000,
      creditDays: 30,
      notes: 'Dhanteras gold scheme member and festival jewelry shopper',
    },
    {
      code: 'CUST-006',
      name: 'Mahalaxmi Bullion & Ornaments',
      type: 'BUSINESS',
      category: 'WHOLESALE',
      mobile: '+91 98251 33445',
      email: 'contact@mahalaxmibullion.in',
      gstin: '24AABCM8877B1Z8',
      pan: 'AABCM8877B',
      city: 'Mumbai',
      openingBalance: 450000,
      creditLimit: 5000000,
      creditDays: 60,
      notes: 'Interstate institutional buyer of certified 24K bars and casted jewelry',
    },
    {
      code: 'CUST-007',
      name: 'Vikramaditya Singhania',
      type: 'INDIVIDUAL',
      category: 'RETAIL',
      mobile: '+91 98255 88990',
      email: 'v.singhania@heritageholdings.com',
      pan: 'MNVPS9911Z',
      city: 'Jaipur',
      openingBalance: 0,
      creditLimit: 1000000,
      creditDays: 30,
      notes: 'Royal heritage Polki & uncut diamond necklace collector',
    },
  ];

  const createdCustomers: any[] = [];
  for (const c of customersData) {
    const cust = await prisma.customer.upsert({
      where: { companyId_code: { companyId: COMPANY_ID, code: c.code } },
      update: { ...c, updatedAt: new Date() },
      create: { ...c, companyId: COMPANY_ID, status: 'ACTIVE', createdBy: CREATED_BY },
    });
    createdCustomers.push(cust);
  }
  console.log(`✓ Seeded ${createdCustomers.length} Customers`);

  // 4. Suppliers / Bullion Dealers (7 realistic suppliers)
  const suppliersData = [
    {
      code: 'SUP-001',
      name: 'Zaveri Bullion Mart Pvt. Ltd.',
      category: 'BULLION',
      mobile: '+91 98200 44556',
      email: 'trading@zaveribullion.in',
      gstin: '24AAACZ4567B1Z2',
      city: 'Ahmedabad',
      openingBalance: 0,
      creditLimit: 10000000,
      creditDays: 15,
      notes: 'Primary supplier for 999.9 Fine Gold bars and London Good Delivery silver kilo bars',
    },
    {
      code: 'SUP-002',
      name: 'Surat Diamond Cutting & Co.',
      category: 'DIAMONDS',
      mobile: '+91 98241 88992',
      email: 'sales@suratdiamondco.com',
      gstin: '24AABCS9912C1Z6',
      city: 'Surat',
      openingBalance: 0,
      creditLimit: 5000000,
      creditDays: 45,
      notes: 'GIA & IGI certified natural diamonds, VVS-VS clarity round brilliants',
    },
    {
      code: 'SUP-003',
      name: 'Royal Chains & Casting Works',
      category: 'CHAINS',
      mobile: '+91 98795 22114',
      email: 'orders@royalchains.in',
      gstin: '24AACCR1122D1Z9',
      city: 'Rajkot',
      openingBalance: 0,
      creditLimit: 3000000,
      creditDays: 30,
      notes: 'Hollow, machine-made 22K chains, rope chains, and Italian links',
    },
    {
      code: 'SUP-004',
      name: 'Shreeji Jewellery Findings & Clasps',
      category: 'FINDINGS',
      mobile: '+91 99092 66778',
      email: 'support@shreejifindings.com',
      gstin: '24AADCS3344E1Z1',
      city: 'Ahmedabad',
      openingBalance: 0,
      creditLimit: 1000000,
      creditDays: 30,
      notes: 'S-hooks, lobster clasps, earring backs, bangle screws in 18K and 22K',
    },
    {
      code: 'SUP-005',
      name: 'Kundan Gems & Polki Merchant',
      category: 'GEMSTONES',
      mobile: '+91 98290 77112',
      email: 'info@kundangems.com',
      gstin: '08AAFCK5566F1Z3',
      city: 'Jaipur',
      openingBalance: 0,
      creditLimit: 4000000,
      creditDays: 60,
      notes: 'Emerald beads, syndicate uncut diamonds (Polki), rubies, and South Sea pearls',
    },
    {
      code: 'SUP-006',
      name: 'Gujarat Bullion Refinery Ltd.',
      category: 'REFINERY',
      mobile: '+91 98254 33221',
      email: 'ops@gujaratrefinery.in',
      gstin: '24AAACG7788G1Z7',
      city: 'Ahmedabad',
      openingBalance: 0,
      creditLimit: 8000000,
      creditDays: 20,
      notes: 'NABL accredited refiner for old gold conversion into 995 pure grains',
    },
    {
      code: 'SUP-007',
      name: 'Navkar Sterling Silver Mart',
      category: 'SILVER',
      mobile: '+91 98791 44556',
      email: 'navkar@sterlingsilver.com',
      gstin: '24AAEEN8899H1Z0',
      city: 'Surat',
      openingBalance: 0,
      creditLimit: 2000000,
      creditDays: 30,
      notes: '92.5 Sterling silver dinnerware, puja articles, and silver bars',
    },
  ];

  const createdSuppliers: any[] = [];
  for (const s of suppliersData) {
    const supp = await prisma.supplier.upsert({
      where: { companyId_code: { companyId: COMPANY_ID, code: s.code } },
      update: { ...s, updatedAt: new Date() },
      create: { ...s, companyId: COMPANY_ID, status: 'ACTIVE', createdBy: CREATED_BY },
    });
    createdSuppliers.push(supp);
  }
  console.log(`✓ Seeded ${createdSuppliers.length} Suppliers`);

  // 5. Karigars (Artisans & Goldsmiths - 6 records)
  const karigarsData = [
    {
      code: 'KRG-001',
      name: 'Rameshwar Soni',
      specialization: 'Antique Jadau & Temple Jewellery',
      mobile: '+91 98241 12001',
      pan: 'ABCPS1001A',
      goldInHand: 45.5,
      makingDue: 28400,
      isActive: true,
    },
    {
      code: 'KRG-002',
      name: 'Babulal Swarnakar',
      specialization: 'Filigree & Handmade Gold Chains',
      mobile: '+91 98241 12002',
      pan: 'DCEPS1002B',
      goldInHand: 32.8,
      makingDue: 19200,
      isActive: true,
    },
    {
      code: 'KRG-003',
      name: 'Dipen Varma',
      specialization: 'Micro-Pave Diamond Setting & Casting',
      mobile: '+91 98241 12003',
      pan: 'EFEPS1003C',
      goldInHand: 18.2,
      makingDue: 35600,
      isActive: true,
    },
    {
      code: 'KRG-004',
      name: 'Kishanlal Bengali',
      specialization: 'Lightweight Die-Struck Bangles & Kadas',
      mobile: '+91 98241 12004',
      pan: 'GHEPS1004D',
      goldInHand: 64.0,
      makingDue: 42000,
      isActive: true,
    },
    {
      code: 'KRG-005',
      name: 'Mukeshbhai Soni',
      specialization: 'Handmade Mangalsutra & Black Bead Stringing',
      mobile: '+91 98241 12005',
      pan: 'IJEPS1005E',
      goldInHand: 12.5,
      makingDue: 9800,
      isActive: true,
    },
    {
      code: 'KRG-006',
      name: 'Shankar Silversmith',
      specialization: 'Sterling Silver Utensils & Idols',
      mobile: '+91 98241 12006',
      pan: 'KLEPS1006F',
      goldInHand: 0.0,
      makingDue: 14500,
      isActive: true,
    },
  ];

  const createdKarigars: any[] = [];
  for (const k of karigarsData) {
    const existing = await prisma.karigar.findFirst({
      where: { companyId: COMPANY_ID, code: k.code }
    });
    if (existing) {
      const updated = await prisma.karigar.update({
        where: { id: existing.id },
        data: { ...k, updatedAt: new Date() }
      });
      createdKarigars.push(updated);
    } else {
      const created = await prisma.karigar.create({
        data: { ...k, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
      createdKarigars.push(created);
    }
  }
  console.log(`✓ Seeded ${createdKarigars.length} Karigars`);

  // 6. Job Work Orders (6 orders for karigars)
  const jwoData = [
    {
      jwoNo: 'JWO-2026-001',
      karigarId: createdKarigars[0].id,
      issueDate: new Date('2026-10-01'),
      expectedDate: new Date('2026-10-15'),
      description: 'Manufacture of 22K Antique Temple Choker with Nakshi peacocks',
      goldIssuedG: 52.0,
      goldReturnedG: 50.8,
      allowedLossPct: 1.2,
      makingCharges: 32500,
      status: 'COMPLETED',
    },
    {
      jwoNo: 'JWO-2026-002',
      karigarId: createdKarigars[1].id,
      issueDate: new Date('2026-10-05'),
      expectedDate: new Date('2026-10-20'),
      description: 'Handmade 22K Royal Calcutta Link Chains (3 pcs)',
      goldIssuedG: 45.0,
      goldReturnedG: 44.1,
      allowedLossPct: 1.0,
      makingCharges: 21000,
      status: 'COMPLETED',
    },
    {
      jwoNo: 'JWO-2026-003',
      karigarId: createdKarigars[2].id,
      issueDate: new Date('2026-10-12'),
      expectedDate: new Date('2026-10-28'),
      description: '18K White Gold Solitaire Ring diamond prong setting (1.50 ct)',
      goldIssuedG: 6.5,
      goldReturnedG: 0.0,
      allowedLossPct: 0.8,
      makingCharges: 8500,
      status: 'IN_PROGRESS',
    },
    {
      jwoNo: 'JWO-2026-004',
      karigarId: createdKarigars[3].id,
      issueDate: new Date('2026-10-15'),
      expectedDate: new Date('2026-10-30'),
      description: '22K Traditional Broad Bangles Set (2 pairs)',
      goldIssuedG: 82.0,
      goldReturnedG: 0.0,
      allowedLossPct: 1.5,
      makingCharges: 38000,
      status: 'IN_PROGRESS',
    },
    {
      jwoNo: 'JWO-2026-005',
      karigarId: createdKarigars[4].id,
      issueDate: new Date('2026-10-18'),
      expectedDate: new Date('2026-11-02'),
      description: 'Custom 22K Traditional Gujarati Mangalsutra with black onyx beads',
      goldIssuedG: 16.0,
      goldReturnedG: 15.6,
      allowedLossPct: 1.0,
      makingCharges: 11200,
      status: 'COMPLETED',
    },
    {
      jwoNo: 'JWO-2026-006',
      karigarId: createdKarigars[5].id,
      issueDate: new Date('2026-10-20'),
      expectedDate: new Date('2026-11-05'),
      description: 'Silver 925 Puja Thali with carved Gayatri Mantra',
      goldIssuedG: 0.0,
      goldReturnedG: 0.0,
      allowedLossPct: 2.0,
      makingCharges: 14500,
      status: 'IN_PROGRESS',
    },
  ];

  for (const jwo of jwoData) {
    const existing = await prisma.jobWorkOrder.findFirst({
      where: { companyId: COMPANY_ID, jwoNo: jwo.jwoNo }
    });
    if (!existing) {
      await prisma.jobWorkOrder.create({
        data: { ...jwo, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
    }
  }
  console.log(`✓ Seeded ${jwoData.length} Job Work Orders`);

  // 7. Inventory Items (Item Master - 7 authentic jewellery items)
  const itemsData = [
    {
      sku: 'JW-NECK-22K-001',
      name: '22K Royal Bridal Choker Necklace',
      category: 'Gold',
      subCategory: 'Necklace',
      collection: 'Bridal Heritage 2026',
      metalType: 'GOLD',
      karat: '22K',
      grossWt: 48.65,
      netWt: 45.20,
      stoneWt: 3.45,
      wastagePct: 3.5,
      costingMethod: 'WEIGHT_BASED',
      makingType: 'PER_GRAM',
      makingRate: 650,
      costPrice: 312000,
      mrp: 358000,
      reorderLevel: 2,
    },
    {
      sku: 'JW-RING-18K-002',
      name: '18K Diamond Solitaire Engagement Ring',
      category: 'Diamond',
      subCategory: 'Ring',
      collection: 'Forever Love',
      metalType: 'DIAMOND',
      karat: '18K',
      grossWt: 4.80,
      netWt: 4.10,
      stoneWt: 0.70, // 0.70 ct diamond
      wastagePct: 2.0,
      costingMethod: 'WEIGHT_BASED',
      makingType: 'FIXED',
      makingRate: 8500,
      costPrice: 125000,
      mrp: 148000,
      reorderLevel: 3,
    },
    {
      sku: 'JW-BAR-24K-003',
      name: '24K 999.9 Fine Gold Bullion Bar (100g)',
      category: 'Bullion',
      subCategory: 'Gold Bar',
      collection: 'Investment Bullion',
      metalType: 'GOLD',
      karat: '24K',
      grossWt: 100.0,
      netWt: 100.0,
      stoneWt: 0.0,
      wastagePct: 0.0,
      costingMethod: 'WEIGHT_BASED',
      makingType: 'PER_GRAM',
      makingRate: 80,
      costPrice: 745000,
      mrp: 760000,
      reorderLevel: 5,
    },
    {
      sku: 'JW-BANG-22K-004',
      name: '22K Antique Broad Kada Bangles (Pair)',
      category: 'Gold',
      subCategory: 'Bangles',
      collection: 'Rajputana Royal',
      metalType: 'GOLD',
      karat: '22K',
      grossWt: 65.40,
      netWt: 62.80,
      stoneWt: 2.60,
      wastagePct: 4.0,
      costingMethod: 'WEIGHT_BASED',
      makingType: 'PER_GRAM',
      makingRate: 720,
      costPrice: 435000,
      mrp: 498000,
      reorderLevel: 2,
    },
    {
      sku: 'JW-EARR-18K-005',
      name: '18K Rose Gold Floral Diamond Jhumkas',
      category: 'Diamond',
      subCategory: 'Earrings',
      collection: 'Contemporary Elegance',
      metalType: 'DIAMOND',
      karat: '18K',
      grossWt: 12.40,
      netWt: 10.80,
      stoneWt: 1.60,
      wastagePct: 2.5,
      costingMethod: 'WEIGHT_BASED',
      makingType: 'FIXED',
      makingRate: 14000,
      costPrice: 168000,
      mrp: 195000,
      reorderLevel: 4,
    },
    {
      sku: 'JW-MANG-22K-006',
      name: '22K Traditional Gujarati Mangalsutra 30"',
      category: 'Gold',
      subCategory: 'Mangalsutra',
      collection: 'Vivah Sanskar',
      metalType: 'GOLD',
      karat: '22K',
      grossWt: 24.50,
      netWt: 22.10,
      stoneWt: 2.40,
      wastagePct: 3.0,
      costingMethod: 'WEIGHT_BASED',
      makingType: 'PER_GRAM',
      makingRate: 580,
      costPrice: 154000,
      mrp: 178000,
      reorderLevel: 3,
    },
    {
      sku: 'JW-SILV-925-007',
      name: 'Silver 925 Royal Puja Thali Set (250g)',
      category: 'Silver',
      subCategory: 'Utensils',
      collection: 'Divine Grace',
      metalType: 'SILVER',
      karat: 'SILVER',
      grossWt: 250.0,
      netWt: 250.0,
      stoneWt: 0.0,
      wastagePct: 2.0,
      costingMethod: 'WEIGHT_BASED',
      makingType: 'PER_GRAM',
      makingRate: 25,
      costPrice: 24000,
      mrp: 29500,
      reorderLevel: 5,
    },
  ];

  const createdItems: any[] = [];
  for (const item of itemsData) {
    const itm = await prisma.item.upsert({
      where: { companyId_sku: { companyId: COMPANY_ID, sku: item.sku } },
      update: { ...item, updatedAt: new Date() },
      create: { ...item, companyId: COMPANY_ID, isActive: true, createdBy: CREATED_BY },
    });
    createdItems.push(itm);
  }
  console.log(`✓ Seeded ${createdItems.length} Inventory Items in Item Master`);

  // 8. Products & Services (ProductService - 7 items)
  const productsData = [
    {
      code: 'PROD-NECK-001',
      name: '22K Royal Bridal Choker Necklace',
      description: 'Hallmarked 22K 916 gold bridal necklace with handcrafted Nakshi antique polish',
      type: 'PRODUCT',
      isTracked: true,
      salesPrice: 358000,
      salesTaxRate: 3.0,
      purchasePrice: 312000,
      purchaseTaxRate: 3.0,
      openingQuantity: 4,
      quantityOnHand: 4,
      unit: 'pcs',
    },
    {
      code: 'PROD-RING-002',
      name: '18K Diamond Solitaire Engagement Ring',
      description: '18K White gold ring studded with GIA certified 0.70ct VVS-VS natural diamond',
      type: 'PRODUCT',
      isTracked: true,
      salesPrice: 148000,
      salesTaxRate: 3.0,
      purchasePrice: 125000,
      purchaseTaxRate: 3.0,
      openingQuantity: 6,
      quantityOnHand: 6,
      unit: 'pcs',
    },
    {
      code: 'PROD-BAR-003',
      name: '24K 999.9 Fine Gold Bullion Bar (100g)',
      description: 'LBMA accredited 999.9 purity minted investment bar with tamperproof assay pack',
      type: 'PRODUCT',
      isTracked: true,
      salesPrice: 760000,
      salesTaxRate: 3.0,
      purchasePrice: 745000,
      purchaseTaxRate: 3.0,
      openingQuantity: 12,
      quantityOnHand: 12,
      unit: 'pcs',
    },
    {
      code: 'PROD-BANG-004',
      name: '22K Antique Broad Kada Bangles (Pair)',
      description: 'Exquisite 22K handcrafted peacock motif kadas with screw lock',
      type: 'PRODUCT',
      isTracked: true,
      salesPrice: 498000,
      salesTaxRate: 3.0,
      purchasePrice: 435000,
      purchaseTaxRate: 3.0,
      openingQuantity: 5,
      quantityOnHand: 5,
      unit: 'pcs',
    },
    {
      code: 'PROD-EARR-005',
      name: '18K Rose Gold Floral Diamond Jhumkas',
      description: '18K hallmarked diamond drops with detachable pearl hangings',
      type: 'PRODUCT',
      isTracked: true,
      salesPrice: 195000,
      salesTaxRate: 3.0,
      purchasePrice: 168000,
      purchaseTaxRate: 3.0,
      openingQuantity: 8,
      quantityOnHand: 8,
      unit: 'pcs',
    },
    {
      code: 'SERV-REPAIR-006',
      name: 'Custom Jewelry Remodelling & Laser Soldering Service',
      description: 'Professional jewellery restoration, resizing, rhodium plating, and stone setting',
      type: 'SERVICE',
      isTracked: false,
      salesPrice: 2500,
      salesTaxRate: 5.0,
      purchasePrice: 1200,
      purchaseTaxRate: 5.0,
      openingQuantity: 0,
      quantityOnHand: 0,
      unit: 'job',
    },
    {
      code: 'SERV-VALUATION-007',
      name: 'Gemological Appraisal & BIS Hallmarking Certification',
      description: 'Insurance valuation and XRF metal purity testing certificate',
      type: 'SERVICE',
      isTracked: false,
      salesPrice: 1500,
      salesTaxRate: 18.0,
      purchasePrice: 500,
      purchaseTaxRate: 18.0,
      openingQuantity: 0,
      quantityOnHand: 0,
      unit: 'cert',
    },
  ];

  for (const p of productsData) {
    await prisma.productService.upsert({
      where: { companyId_code: { companyId: COMPANY_ID, code: p.code } },
      update: { ...p, updatedAt: new Date() },
      create: { ...p, companyId: COMPANY_ID, status: 'ACTIVE', createdBy: CREATED_BY },
    });
  }
  console.log(`✓ Seeded ${productsData.length} Products and Services`);

  // 9. Stock Ledger Entries (Initial Stock for all 7 items)
  for (let i = 0; i < createdItems.length; i++) {
    const item = createdItems[i];
    const qty = 5 + (i * 2);
    const totalWt = item.grossWt * qty;
    const value = item.costPrice * qty;

    const existingLedger = await prisma.stockLedger.findFirst({
      where: { companyId: COMPANY_ID, itemId: item.id, transactionType: 'OPENING' }
    });
    if (!existingLedger) {
      await prisma.stockLedger.create({
        data: {
          companyId: COMPANY_ID,
          itemId: item.id,
          transactionType: 'OPENING',
          referenceType: 'OPENING_STOCK',
          referenceId: item.id,
          issuedQty: 0,
          issuedWt: 0,
          receivedQty: qty,
          receivedWt: totalWt,
          balanceQty: qty,
          balanceWt: totalWt,
          rate: item.costPrice,
          value: value,
          narration: `Opening physical vault audit stock balance for ${item.name}`,
          createdBy: CREATED_BY,
        }
      });
    }
  }
  console.log('✓ Seeded Stock Ledger opening records');

  // 10. Daily Metal Rates
  const metalRatesData = [
    {
      date: new Date('2026-10-24'),
      karat24: 74850,
      karat22: 68610,
      karat18: 56140,
      karat14: 43660,
      silver: 92400,
      source: 'IBJA (India Bullion and Jewellers Association)',
      overrideReason: 'Official closing benchmark rate',
    },
    {
      date: new Date('2026-10-25'),
      karat24: 75200,
      karat22: 68930,
      karat18: 56400,
      karat14: 43870,
      silver: 93100,
      source: 'IBJA (India Bullion and Jewellers Association)',
      overrideReason: 'Morning spot opening fixing rate',
    },
  ];

  for (const mr of metalRatesData) {
    const existing = await prisma.metalRate.findFirst({
      where: { companyId: COMPANY_ID, date: mr.date }
    });
    if (!existing) {
      await prisma.metalRate.create({
        data: { ...mr, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
    }
  }
  console.log('✓ Seeded daily Metal Rates');

  // 11. Bank Accounts (3 verified business accounts)
  const bankAccountsData = [
    {
      id: 1, // existing bank 1
      bankName: 'HDFC Bank',
      accountName: 'Mehta Jewellers - Current A/c',
      accountNo: '50200084729112',
      accountNoMasked: '5020...9112',
      ifsc: 'HDFC0000060',
      accountType: 'CURRENT',
      openingBalance: 500000,
      currentBalance: 1285000,
      bookBalance: 1285000,
      bankBalance: 1285000,
      accountId: accMap.get('1002'),
      isActive: true,
    },
    {
      id: 2, // existing bank 2
      bankName: 'ICICI Bank',
      accountName: 'Mehta Jewellers - Bullion Trading A/c',
      accountNo: '401201509988',
      accountNoMasked: '4012...9988',
      ifsc: 'ICIC0000012',
      accountType: 'CURRENT',
      openingBalance: 1000000,
      currentBalance: 2450000,
      bookBalance: 2450000,
      bankBalance: 2450000,
      accountId: accMap.get('1088'),
      isActive: true,
    },
    {
      bankName: 'State Bank of India',
      accountName: 'Mehta Jewellers - Gold Metal Loan CC',
      accountNo: '30819920145',
      accountNoMasked: '3081...0145',
      ifsc: 'SBIN0002632',
      accountType: 'CASH_CREDIT',
      openingBalance: 1500000,
      currentBalance: 1840000,
      bookBalance: 1840000,
      bankBalance: 1840000,
      accountId: accMap.get('1090'),
      isActive: true,
    },
  ];

  const createdBanks: any[] = [];
  for (const b of bankAccountsData) {
    if (b.id) {
      const updated = await prisma.bankAccount.update({
        where: { id: b.id },
        data: {
          bankName: b.bankName,
          accountName: b.accountName,
          accountNo: b.accountNo,
          accountNoMasked: b.accountNoMasked,
          ifsc: b.ifsc,
          accountType: b.accountType,
          currentBalance: b.currentBalance,
          bookBalance: b.bookBalance,
          bankBalance: b.bankBalance,
          accountId: b.accountId,
          isActive: true,
        }
      });
      createdBanks.push(updated);
    } else {
      const existing = await prisma.bankAccount.findFirst({
        where: { companyId: COMPANY_ID, accountNo: b.accountNo }
      });
      if (existing) {
        const updated = await prisma.bankAccount.update({
          where: { id: existing.id },
          data: { ...b }
        });
        createdBanks.push(updated);
      } else {
        const created = await prisma.bankAccount.create({
          data: { ...b, companyId: COMPANY_ID, createdBy: CREATED_BY }
        });
        createdBanks.push(created);
      }
    }
  }
  console.log(`✓ Configured ${createdBanks.length} Bank Accounts`);

  // 12. Bank Transactions (8 realistic transactions)
  const bankTxnsData = [
    {
      bankAccountId: createdBanks[0].id,
      date: new Date('2026-10-10'),
      narration: 'NEFT CR: RTGS/AARAV PATEL/BRIDAL CHOKER INVOICE',
      reference: 'NEFT-AXIS-20261010-0921',
      debit: 0,
      credit: 350000,
      balance: 850000,
      isReconciled: true,
    },
    {
      bankAccountId: createdBanks[0].id,
      date: new Date('2026-10-12'),
      narration: 'UPI CR: UPI/ANANYA SHARMA/ENGAGEMENT RING ADVANCE',
      reference: 'UPI-ICIC-99281203',
      debit: 0,
      credit: 148000,
      balance: 998000,
      isReconciled: true,
    },
    {
      bankAccountId: createdBanks[1].id,
      date: new Date('2026-10-14'),
      narration: 'RTGS DR: ZAVERI BULLION MART / 500G 999.9 BULLION DELIVERY',
      reference: 'RTGS-HDFC-991208',
      debit: 3725000,
      credit: 0,
      balance: 1450000,
      isReconciled: true,
    },
    {
      bankAccountId: createdBanks[1].id,
      date: new Date('2026-10-16'),
      narration: 'RTGS CR: MAHALAXMI BULLION / INTERSTATE GOLD SETTLEMENT',
      reference: 'RTGS-SBIN-882910',
      debit: 0,
      credit: 1500000,
      balance: 2950000,
      isReconciled: true,
    },
    {
      bankAccountId: createdBanks[0].id,
      date: new Date('2026-10-18'),
      narration: 'IMPS DR: MAKING CHARGES TO KARIGAR RAMESHWAR SONI',
      reference: 'IMPS-20261018-4491',
      debit: 32500,
      credit: 0,
      balance: 965500,
      isReconciled: true,
    },
    {
      bankAccountId: createdBanks[0].id,
      date: new Date('2026-10-20'),
      narration: 'NEFT DR: GST REVENUE DEPT / CGST+SGST SEPTEMBER TAX RETURN',
      reference: 'GSTN-20261020-0012',
      debit: 112000,
      credit: 0,
      balance: 853500,
      isReconciled: false,
    },
    {
      bankAccountId: createdBanks[0].id,
      date: new Date('2026-10-22'),
      narration: 'CHEQUE CR: CHQ #441098 / KIRAN JEWELLERS SURAT WHOLESALE PAYMENT',
      reference: 'CHQ-441098',
      debit: 0,
      credit: 450000,
      balance: 1303500,
      isReconciled: false,
    },
    {
      bankAccountId: createdBanks[2].id,
      date: new Date('2026-10-24'),
      narration: 'SBI INTEREST DEBIT / MONTHLY GOLD METAL LOAN CONCESSIONAL CHARGE',
      reference: 'SBI-INT-OCT2026',
      debit: 18500,
      credit: 0,
      balance: 1821500,
      isReconciled: false,
    },
  ];

  for (const txn of bankTxnsData) {
    const existing = await prisma.bankTransaction.findFirst({
      where: { companyId: COMPANY_ID, reference: txn.reference }
    });
    if (!existing) {
      await prisma.bankTransaction.create({
        data: {
          ...txn,
          companyId: COMPANY_ID,
          source: 'BANK_STATEMENT',
          createdBy: CREATED_BY
        }
      });
    }
  }
  console.log(`✓ Seeded ${bankTxnsData.length} Bank Transactions`);

  // 13. Sales Invoices (7 authentic jewellery tax invoices)
  const invoicesData = [
    {
      invoiceNo: 'INV-2026-001',
      date: new Date('2026-10-05'),
      dueDate: new Date('2026-10-20'),
      customerId: createdCustomers[0].id, // Aarav Patel
      status: 'PAID',
      goldRate22k: 68610,
      goldRate18k: 56140,
      goldRate24k: 74850,
      subTotal: 348000,
      discount: 3000,
      taxableAmount: 345000,
      cgst: 5175,
      sgst: 5175,
      igst: 0,
      grandTotal: 355350,
      paidAmount: 355350,
      balanceDue: 0,
      notes: 'Bridal jewellery collection. Hallmarked BIS 916.',
      terms: '7 days exchange policy. 100% buyback on gold weight at prevailing market rate.',
      lines: [
        {
          itemId: createdItems[0].id,
          sku: createdItems[0].sku,
          description: '22K Royal Bridal Choker Necklace (HUID: AB9821)',
          karat: '22K',
          grossWt: 48.65,
          netWt: 45.20,
          stoneWt: 3.45,
          makingType: 'PER_GRAM',
          makingRate: 650,
          makingAmount: 29380,
          ratePerGram: 6861,
          amount: 310117,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7113',
          huid: 'AB9821',
          total: 349480,
        }
      ]
    },
    {
      invoiceNo: 'INV-2026-002',
      date: new Date('2026-10-08'),
      dueDate: new Date('2026-10-23'),
      customerId: createdCustomers[1].id, // Ananya Sharma
      status: 'PAID',
      goldRate22k: 68610,
      goldRate18k: 56140,
      goldRate24k: 74850,
      subTotal: 145000,
      discount: 2000,
      taxableAmount: 143000,
      cgst: 2145,
      sgst: 2145,
      igst: 0,
      grandTotal: 147290,
      paidAmount: 147290,
      balanceDue: 0,
      notes: 'Certified diamond solitaire engagement ring. GIA Report included.',
      terms: 'Lifetime free prong cleaning & rhodium plating.',
      lines: [
        {
          itemId: createdItems[1].id,
          sku: createdItems[1].sku,
          description: '18K Diamond Solitaire Engagement Ring (0.70 ct VVS)',
          karat: '18K',
          grossWt: 4.80,
          netWt: 4.10,
          stoneWt: 0.70,
          makingType: 'FIXED',
          makingRate: 8500,
          makingAmount: 8500,
          ratePerGram: 5614,
          amount: 23017,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7113',
          huid: 'DM7712',
          total: 145000,
        }
      ]
    },
    {
      invoiceNo: 'INV-2026-003',
      date: new Date('2026-10-12'),
      dueDate: new Date('2026-11-12'),
      customerId: createdCustomers[2].id, // Kiran Jewellers (Wholesale)
      status: 'PARTIAL',
      goldRate22k: 68610,
      goldRate18k: 56140,
      goldRate24k: 74850,
      subTotal: 980000,
      discount: 10000,
      taxableAmount: 970000,
      cgst: 14550,
      sgst: 14550,
      igst: 0,
      grandTotal: 999100,
      paidAmount: 450000,
      balanceDue: 549100,
      notes: 'B2B Wholesale supply of 22K Broad Kadas and traditional bangles.',
      terms: 'Payment due within 30 days. 18% p.a. interest applicable after due date.',
      lines: [
        {
          itemId: createdItems[3].id,
          sku: createdItems[3].sku,
          description: '22K Antique Broad Kada Bangles (2 Pairs - 125.6g net)',
          karat: '22K',
          grossWt: 130.80,
          netWt: 125.60,
          stoneWt: 5.20,
          makingType: 'PER_GRAM',
          makingRate: 680,
          makingAmount: 85408,
          ratePerGram: 6861,
          amount: 861741,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7113',
          huid: 'KD9901',
          total: 980000,
        }
      ]
    },
    {
      invoiceNo: 'INV-2026-004',
      date: new Date('2026-10-15'),
      dueDate: new Date('2026-10-30'),
      customerId: createdCustomers[3].id, // Siddharth & Priya Verma
      status: 'POSTED',
      goldRate22k: 68930,
      goldRate18k: 56400,
      goldRate24k: 75200,
      subTotal: 192000,
      discount: 2000,
      taxableAmount: 190000,
      cgst: 2850,
      sgst: 2850,
      igst: 0,
      grandTotal: 195700,
      paidAmount: 0,
      balanceDue: 195700,
      notes: 'Festive Dhanteras purchase - 18K Rose Gold Diamond Jhumkas.',
      terms: '30-day return policy with original tag & invoice.',
      lines: [
        {
          itemId: createdItems[4].id,
          sku: createdItems[4].sku,
          description: '18K Rose Gold Floral Diamond Jhumkas with pearls',
          karat: '18K',
          grossWt: 12.40,
          netWt: 10.80,
          stoneWt: 1.60,
          makingType: 'FIXED',
          makingRate: 14000,
          makingAmount: 14000,
          ratePerGram: 5640,
          amount: 60912,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7113',
          huid: 'JH4432',
          total: 192000,
        }
      ]
    },
    {
      invoiceNo: 'INV-2026-005',
      date: new Date('2026-10-18'),
      dueDate: new Date('2026-10-25'),
      customerId: createdCustomers[4].id, // Pooja Desai
      status: 'PAID',
      goldRate22k: 68930,
      goldRate18k: 56400,
      goldRate24k: 75200,
      subTotal: 175000,
      discount: 1500,
      taxableAmount: 173500,
      cgst: 2602.5,
      sgst: 2602.5,
      igst: 0,
      grandTotal: 178705,
      paidAmount: 178705,
      balanceDue: 0,
      notes: '22K Traditional Mangalsutra with black onyx beads.',
      terms: 'Complimentary restringing for 3 years.',
      lines: [
        {
          itemId: createdItems[5].id,
          sku: createdItems[5].sku,
          description: '22K Traditional Gujarati Mangalsutra 30"',
          karat: '22K',
          grossWt: 24.50,
          netWt: 22.10,
          stoneWt: 2.40,
          makingType: 'PER_GRAM',
          makingRate: 580,
          makingAmount: 12818,
          ratePerGram: 6893,
          amount: 152335,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7113',
          huid: 'MS8810',
          total: 175000,
        }
      ]
    },
    {
      invoiceNo: 'INV-2026-006',
      date: new Date('2026-10-21'),
      dueDate: new Date('2026-11-20'),
      customerId: createdCustomers[5].id, // Mahalaxmi Bullion (Interstate IGST)
      status: 'PARTIAL',
      goldRate22k: 68930,
      goldRate18k: 56400,
      goldRate24k: 75200,
      subTotal: 1515000,
      discount: 5000,
      taxableAmount: 1510000,
      cgst: 0,
      sgst: 0,
      igst: 45300, // 3% IGST for interstate (Gujarat to Maharashtra)
      grandTotal: 1555300,
      paidAmount: 1000000,
      balanceDue: 555300,
      notes: 'Interstate supply of 2 x 100g 24K Bullion bars.',
      terms: 'Delivery against safe vault transfer. Insured transit.',
      lines: [
        {
          itemId: createdItems[2].id,
          sku: createdItems[2].sku,
          description: '24K 999.9 Fine Gold Bullion Bar (100g x 2 pcs)',
          karat: '24K',
          grossWt: 200.0,
          netWt: 200.0,
          stoneWt: 0.0,
          makingType: 'PER_GRAM',
          makingRate: 80,
          makingAmount: 16000,
          ratePerGram: 7520,
          amount: 1504000,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7108',
          huid: 'BAR999A',
          total: 1515000,
        }
      ]
    },
    {
      invoiceNo: 'INV-2026-007',
      date: new Date('2026-10-23'),
      dueDate: new Date('2026-11-05'),
      customerId: createdCustomers[6].id, // Vikramaditya Singhania
      status: 'POSTED',
      goldRate22k: 68930,
      goldRate18k: 56400,
      goldRate24k: 75200,
      subTotal: 29500,
      discount: 500,
      taxableAmount: 29000,
      cgst: 435,
      sgst: 435,
      igst: 0,
      grandTotal: 29870,
      paidAmount: 0,
      balanceDue: 29870,
      notes: 'Silver 925 Royal Puja Thali with carved Gayatri Mantra.',
      terms: 'Gift packaging provided.',
      lines: [
        {
          itemId: createdItems[6].id,
          sku: createdItems[6].sku,
          description: 'Silver 925 Royal Puja Thali Set (250g)',
          karat: 'SILVER',
          grossWt: 250.0,
          netWt: 250.0,
          stoneWt: 0.0,
          makingType: 'PER_GRAM',
          makingRate: 25,
          makingAmount: 6250,
          ratePerGram: 93.1,
          amount: 23275,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7106',
          huid: 'SLV1102',
          total: 29500,
        }
      ]
    },
  ];

  const createdInvoices: any[] = [];
  for (const inv of invoicesData) {
    const lines = inv.lines;
    const invDataNoLines = { ...inv };
    delete (invDataNoLines as any).lines;

    const existing = await prisma.invoice.findFirst({
      where: { companyId: COMPANY_ID, invoiceNo: inv.invoiceNo }
    });

    let invId = existing?.id;
    if (existing) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });
      const updated = await prisma.invoice.update({
        where: { id: existing.id },
        data: { ...invDataNoLines, updatedAt: new Date() }
      });
      invId = updated.id;
      createdInvoices.push(updated);
    } else {
      const created = await prisma.invoice.create({
        data: { ...invDataNoLines, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
      invId = created.id;
      createdInvoices.push(created);
    }

    // Insert invoice lines
    for (const line of lines) {
      await prisma.invoiceItem.create({
        data: {
          ...line,
          companyId: COMPANY_ID,
          invoiceId: invId!,
          createdBy: CREATED_BY
        }
      });
    }
  }
  console.log(`✓ Seeded ${createdInvoices.length} Sales Invoices with line items`);

  // 14. Purchase Bills (7 authentic purchase bills)
  const billsData = [
    {
      billNo: 'BILL-2026-001',
      date: new Date('2026-10-02'),
      dueDate: new Date('2026-10-17'),
      supplierId: createdSuppliers[0].id, // Zaveri Bullion Mart
      status: 'PAID',
      subTotal: 3725000,
      taxableAmount: 3725000,
      cgst: 55875,
      sgst: 55875,
      igst: 0,
      taxTotal: 111750,
      grandTotal: 3836750,
      paidAmount: 3836750,
      balanceDue: 0,
      lines: [
        {
          itemId: createdItems[2].id,
          sku: createdItems[2].sku,
          description: '500g 999.9 Fine Gold Bullion Grains for casting',
          karat: '24K',
          grossWt: 500.0,
          netWt: 500.0,
          stoneWt: 0.0,
          makingType: 'PER_GRAM',
          makingRate: 0,
          makingAmount: 0,
          ratePerGram: 7450,
          amount: 3725000,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7108',
          total: 3725000,
        }
      ]
    },
    {
      billNo: 'BILL-2026-002',
      date: new Date('2026-10-06'),
      dueDate: new Date('2026-11-20'),
      supplierId: createdSuppliers[1].id, // Surat Diamond Co.
      status: 'PARTIAL',
      subTotal: 840000,
      taxableAmount: 840000,
      cgst: 6300,
      sgst: 6300,
      igst: 0,
      taxTotal: 12600, // 1.5% GST on cut & polished diamonds
      grandTotal: 852600,
      paidAmount: 400000,
      balanceDue: 452600,
      lines: [
        {
          itemId: createdItems[1].id,
          sku: createdItems[1].sku,
          description: 'Parcel of 10 Round Brilliant Cut Diamonds (VVS-VS 0.50-0.75ct)',
          karat: '18K',
          grossWt: 1.2,
          netWt: 1.2,
          stoneWt: 6.0,
          makingType: 'FIXED',
          makingRate: 0,
          makingAmount: 0,
          ratePerGram: 0,
          amount: 840000,
          discountPct: 0,
          gstPct: 1.5,
          hsnCode: '7102',
          total: 840000,
        }
      ]
    },
    {
      billNo: 'BILL-2026-003',
      date: new Date('2026-10-10'),
      dueDate: new Date('2026-11-09'),
      supplierId: createdSuppliers[2].id, // Royal Chains
      status: 'POSTED',
      subTotal: 485000,
      taxableAmount: 485000,
      cgst: 7275,
      sgst: 7275,
      igst: 0,
      taxTotal: 14550,
      grandTotal: 499550,
      paidAmount: 0,
      balanceDue: 499550,
      lines: [
        {
          itemId: createdItems[0].id,
          sku: 'CH-MACH-22K',
          description: '22K Machine-made Rope Chains (72.5g total)',
          karat: '22K',
          grossWt: 72.5,
          netWt: 72.5,
          stoneWt: 0.0,
          makingType: 'PER_GRAM',
          makingRate: 220,
          makingAmount: 15950,
          ratePerGram: 6470,
          amount: 469075,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7113',
          total: 485000,
        }
      ]
    },
    {
      billNo: 'BILL-2026-004',
      date: new Date('2026-10-14'),
      dueDate: new Date('2026-11-13'),
      supplierId: createdSuppliers[3].id, // Shreeji Findings
      status: 'PAID',
      subTotal: 65000,
      taxableAmount: 65000,
      cgst: 975,
      sgst: 975,
      igst: 0,
      taxTotal: 1950,
      grandTotal: 66950,
      paidAmount: 66950,
      balanceDue: 0,
      lines: [
        {
          itemId: createdItems[0].id,
          sku: 'FND-S-HOOK-22K',
          description: '22K S-hooks, Lobster clasps, and butterfly push-backs (9.5g)',
          karat: '22K',
          grossWt: 9.5,
          netWt: 9.5,
          stoneWt: 0.0,
          makingType: 'FIXED',
          makingRate: 0,
          makingAmount: 0,
          ratePerGram: 6842,
          amount: 65000,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7113',
          total: 65000,
        }
      ]
    },
    {
      billNo: 'BILL-2026-005',
      date: new Date('2026-10-18'),
      dueDate: new Date('2026-12-17'),
      supplierId: createdSuppliers[4].id, // Kundan Gems & Polki (Interstate Rajasthan)
      status: 'PARTIAL',
      subTotal: 320000,
      taxableAmount: 320000,
      cgst: 0,
      sgst: 0,
      igst: 9600,
      taxTotal: 9600,
      grandTotal: 329600,
      paidAmount: 150000,
      balanceDue: 179600,
      lines: [
        {
          itemId: createdItems[0].id,
          sku: 'GEM-POLKI-SYND',
          description: 'Syndicate Uncut Polki Diamonds and Natural Zambian Emerald beads',
          karat: '18K',
          grossWt: 28.0,
          netWt: 0.0,
          stoneWt: 28.0,
          makingType: 'FIXED',
          makingRate: 0,
          makingAmount: 0,
          ratePerGram: 0,
          amount: 320000,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7103',
          total: 320000,
        }
      ]
    },
    {
      billNo: 'BILL-2026-006',
      date: new Date('2026-10-21'),
      dueDate: new Date('2026-11-10'),
      supplierId: createdSuppliers[5].id, // Gujarat Refinery
      status: 'POSTED',
      subTotal: 185000,
      taxableAmount: 185000,
      cgst: 2775,
      sgst: 2775,
      igst: 0,
      taxTotal: 5550,
      grandTotal: 190550,
      paidAmount: 0,
      balanceDue: 190550,
      lines: [
        {
          itemId: createdItems[2].id,
          sku: 'REF-OLD-GOLD',
          description: 'Refinery assaying and converting 250g old gold ornaments into 995 bullion',
          karat: '24K',
          grossWt: 250.0,
          netWt: 236.2,
          stoneWt: 13.8,
          makingType: 'PER_GRAM',
          makingRate: 0,
          makingAmount: 0,
          ratePerGram: 783,
          amount: 185000,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '9988',
          total: 185000,
        }
      ]
    },
    {
      billNo: 'BILL-2026-007',
      date: new Date('2026-10-23'),
      dueDate: new Date('2026-11-22'),
      supplierId: createdSuppliers[6].id, // Navkar Sterling Silver
      status: 'PAID',
      subTotal: 92000,
      taxableAmount: 92000,
      cgst: 1380,
      sgst: 1380,
      igst: 0,
      taxTotal: 2760,
      grandTotal: 94760,
      paidAmount: 94760,
      balanceDue: 0,
      lines: [
        {
          itemId: createdItems[6].id,
          sku: createdItems[6].sku,
          description: '1kg 999 Fine Silver Bar and stamped 925 silverware',
          karat: 'SILVER',
          grossWt: 1000.0,
          netWt: 1000.0,
          stoneWt: 0.0,
          makingType: 'PER_GRAM',
          makingRate: 0,
          makingAmount: 0,
          ratePerGram: 92,
          amount: 92000,
          discountPct: 0,
          gstPct: 3.0,
          hsnCode: '7106',
          total: 92000,
        }
      ]
    },
  ];

  const createdBills: any[] = [];
  for (const bill of billsData) {
    const lines = bill.lines;
    const billDataNoLines = { ...bill };
    delete (billDataNoLines as any).lines;

    const existing = await prisma.bill.findFirst({
      where: { companyId: COMPANY_ID, billNo: bill.billNo }
    });

    let billId = existing?.id;
    if (existing) {
      await prisma.billItem.deleteMany({ where: { billId: existing.id } });
      const updated = await prisma.bill.update({
        where: { id: existing.id },
        data: { ...billDataNoLines, updatedAt: new Date() }
      });
      billId = updated.id;
      createdBills.push(updated);
    } else {
      const created = await prisma.bill.create({
        data: { ...billDataNoLines, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
      billId = created.id;
      createdBills.push(created);
    }

    for (const line of lines) {
      await prisma.billItem.create({
        data: {
          ...line,
          companyId: COMPANY_ID,
          billId: billId!,
          createdBy: CREATED_BY
        }
      });
    }
  }
  console.log(`✓ Seeded ${createdBills.length} Purchase Bills with line items`);

  // 15. Payments & Document Settlements (Receipts & Disbursements)
  const paymentsData = [
    {
      customerId: createdCustomers[0].id,
      invoiceId: createdInvoices[0].id,
      type: 'RECEIPT',
      date: new Date('2026-10-06'),
      mode: 'NEFT',
      amount: 355350,
      reference: 'NEFT-AXIS-20261010-0921',
      receivedBy: 'Rajesh Mehta',
      notes: 'Full payment received against INV-2026-001',
      settleToInvoiceId: createdInvoices[0].id,
    },
    {
      customerId: createdCustomers[1].id,
      invoiceId: createdInvoices[1].id,
      type: 'RECEIPT',
      date: new Date('2026-10-09'),
      mode: 'UPI',
      amount: 147290,
      reference: 'UPI-ICIC-99281203',
      receivedBy: 'Rajesh Mehta',
      notes: 'Full payment received against INV-2026-002',
      settleToInvoiceId: createdInvoices[1].id,
    },
    {
      customerId: createdCustomers[2].id,
      invoiceId: createdInvoices[2].id,
      type: 'RECEIPT',
      date: new Date('2026-10-14'),
      mode: 'CHEQUE',
      amount: 450000,
      reference: 'CHQ-441098',
      receivedBy: 'Rajesh Mehta',
      notes: 'Part payment received against INV-2026-003',
      settleToInvoiceId: createdInvoices[2].id,
    },
    {
      customerId: createdCustomers[4].id,
      invoiceId: createdInvoices[4].id,
      type: 'RECEIPT',
      date: new Date('2026-10-19'),
      mode: 'BANK_TRANSFER',
      amount: 178705,
      reference: 'IMPS-HDFC-991122',
      receivedBy: 'Rajesh Mehta',
      notes: 'Full payment received against INV-2026-005',
      settleToInvoiceId: createdInvoices[4].id,
    },
    {
      customerId: createdCustomers[5].id,
      invoiceId: createdInvoices[5].id,
      type: 'RECEIPT',
      date: new Date('2026-10-22'),
      mode: 'RTGS',
      amount: 1000000,
      reference: 'RTGS-SBIN-882910',
      receivedBy: 'Rajesh Mehta',
      notes: 'Interstate gold advance received against INV-2026-006',
      settleToInvoiceId: createdInvoices[5].id,
    },
    {
      supplierId: createdSuppliers[0].id,
      billId: createdBills[0].id,
      type: 'PAYMENT',
      date: new Date('2026-10-04'),
      mode: 'RTGS',
      amount: 3836750,
      reference: 'RTGS-HDFC-991208',
      receivedBy: 'Zaveri Accounts',
      notes: 'Bullion clearance RTGS against BILL-2026-001',
      settleToBillId: createdBills[0].id,
    },
    {
      supplierId: createdSuppliers[1].id,
      billId: createdBills[1].id,
      type: 'PAYMENT',
      date: new Date('2026-10-08'),
      mode: 'NEFT',
      amount: 400000,
      reference: 'NEFT-ICIC-771122',
      receivedBy: 'Surat Diamond Desk',
      notes: 'Diamond parcel advance against BILL-2026-002',
      settleToBillId: createdBills[1].id,
    },
  ];

  for (const p of paymentsData) {
    const settleInv = p.settleToInvoiceId;
    const settleBill = p.settleToBillId;
    const pData = { ...p };
    delete (pData as any).settleToInvoiceId;
    delete (pData as any).settleToBillId;

    const existing = await prisma.payment.findFirst({
      where: { companyId: COMPANY_ID, reference: p.reference }
    });

    let paymentId = existing?.id;
    if (!existing) {
      const created = await prisma.payment.create({
        data: { ...pData, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
      paymentId = created.id;
    }

    if (settleInv && paymentId) {
      const existingSettlement = await prisma.documentSettlement.findFirst({
        where: { companyId: COMPANY_ID, sourcePaymentId: paymentId, targetInvoiceId: settleInv }
      });
      if (!existingSettlement) {
        await prisma.documentSettlement.create({
          data: {
            companyId: COMPANY_ID,
            sourceType: 'PAYMENT',
            sourcePaymentId: paymentId,
            targetType: 'INVOICE',
            targetInvoiceId: settleInv,
            amount: p.amount,
            status: 'ACTIVE',
            createdBy: CREATED_BY
          }
        });
      }
    } else if (settleBill && paymentId) {
      const existingSettlement = await prisma.documentSettlement.findFirst({
        where: { companyId: COMPANY_ID, sourcePaymentId: paymentId, targetBillId: settleBill }
      });
      if (!existingSettlement) {
        await prisma.documentSettlement.create({
          data: {
            companyId: COMPANY_ID,
            sourceType: 'PAYMENT',
            sourcePaymentId: paymentId,
            targetType: 'BILL',
            targetBillId: settleBill,
            amount: p.amount,
            status: 'ACTIVE',
            createdBy: CREATED_BY
          }
        });
      }
    }
  }
  console.log('✓ Seeded Payments & Document Settlements');

  // 16. Credit Notes & Debit Notes (NoteDocument & NoteLine)
  const notesData = [
    {
      noteNo: 'CN-2026-001',
      type: 'CREDIT_NOTE',
      date: new Date('2026-10-16'),
      partyType: 'CUSTOMER',
      customerId: createdCustomers[2].id,
      referenceNo: 'INV-2026-003',
      reason: 'Weight variance concession on Kada pair after assay hallmarking (0.42g)',
      status: 'POSTED',
      subTotal: 2880,
      taxTotal: 86.4,
      grandTotal: 2966.4,
      usedAmount: 2966.4,
      lines: [
        {
          description: '0.42g Net weight tolerance credit @ 6861/g',
          quantity: 0.42,
          rate: 6861,
          gstPct: 3.0,
          amount: 2881.62,
          taxAmount: 86.45,
          total: 2968.07,
        }
      ]
    },
    {
      noteNo: 'DN-2026-001',
      type: 'DEBIT_NOTE',
      date: new Date('2026-10-18'),
      partyType: 'SUPPLIER',
      supplierId: createdSuppliers[2].id,
      referenceNo: 'BILL-2026-003',
      reason: 'Return of 1 defective Italian link chain with faulty solder joint',
      status: 'POSTED',
      subTotal: 15400,
      taxTotal: 462,
      grandTotal: 15862,
      usedAmount: 0,
      lines: [
        {
          description: 'Rejection debit: 22K Italian Link chain 2.38g returned',
          quantity: 1,
          rate: 15400,
          gstPct: 3.0,
          amount: 15400,
          taxAmount: 462,
          total: 15862,
        }
      ]
    },
  ];

  for (const nd of notesData) {
    const lines = nd.lines;
    const noteNoLines = { ...nd };
    delete (noteNoLines as any).lines;

    const existing = await prisma.noteDocument.findFirst({
      where: { companyId: COMPANY_ID, noteNo: nd.noteNo }
    });

    let nId = existing?.id;
    if (existing) {
      await prisma.noteLine.deleteMany({ where: { noteId: existing.id } });
      const updated = await prisma.noteDocument.update({
        where: { id: existing.id },
        data: { ...noteNoLines, updatedAt: new Date() }
      });
      nId = updated.id;
    } else {
      const created = await prisma.noteDocument.create({
        data: { ...noteNoLines, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
      nId = created.id;
    }

    for (const line of lines) {
      await prisma.noteLine.create({
        data: {
          ...line,
          companyId: COMPANY_ID,
          noteId: nId!,
          createdBy: CREATED_BY
        }
      });
    }
  }
  console.log('✓ Seeded Credit and Debit Notes');

  // 17. Double-Entry Journal Entries (6 balanced manual journals)
  const journalsData = [
    {
      entryNo: 'JV-2026-1001',
      date: new Date('2026-10-01'),
      narration: 'Monthly showroom rent and common maintenance charges for C.G. Road premises',
      status: 'POSTED',
      postedAt: new Date('2026-10-01'),
      postedBy: CREATED_BY,
      lines: [
        { accountId: accMap.get('6010')!, debit: 120000, credit: 0, narration: 'Showroom Lease Rent Oct 2026' },
        { accountId: accMap.get('1002')!, debit: 0, credit: 120000, narration: 'Paid via HDFC Bank A/c' },
      ]
    },
    {
      entryNo: 'JV-2026-1002',
      date: new Date('2026-10-05'),
      narration: 'Showroom staff monthly salaries and festive performance bonuses',
      status: 'POSTED',
      postedAt: new Date('2026-10-05'),
      postedBy: CREATED_BY,
      lines: [
        { accountId: accMap.get('6020')!, debit: 285000, credit: 0, narration: 'Salaries for 6 staff members' },
        { accountId: accMap.get('1002')!, debit: 0, credit: 285000, narration: 'Disbursed via HDFC NetBanking' },
      ]
    },
    {
      entryNo: 'JV-2026-1010',
      date: new Date('2026-10-10'),
      narration: 'BIS Hallmarking & laser assay center testing fees batch #OCT-01',
      status: 'POSTED',
      postedAt: new Date('2026-10-10'),
      postedBy: CREATED_BY,
      lines: [
        { accountId: accMap.get('6030')!, debit: 14200, credit: 0, narration: 'Hallmarking 312 gold articles @ 45/pc' },
        { accountId: accMap.get('1002')!, debit: 0, credit: 14200, narration: 'Paid via HDFC Bank A/c' },
      ]
    },
    {
      entryNo: 'JV-2026-1015',
      date: new Date('2026-10-15'),
      narration: 'Karigar labour making charges settlement for completed temple choker order',
      status: 'POSTED',
      postedAt: new Date('2026-10-15'),
      postedBy: CREATED_BY,
      lines: [
        { accountId: accMap.get('5100')!, debit: 32500, credit: 0, narration: 'Artisan making charges Rameshwar Soni' },
        { accountId: accMap.get('1002')!, debit: 0, credit: 32500, narration: 'Paid via HDFC Bank IMPS' },
      ]
    },
    {
      entryNo: 'JV-2026-1020',
      date: new Date('2026-10-20'),
      narration: 'Monthly vault electronic security, CCTV surveillance, and armed guard services',
      status: 'POSTED',
      postedAt: new Date('2026-10-20'),
      postedBy: CREATED_BY,
      lines: [
        { accountId: accMap.get('6040')!, debit: 45000, credit: 0, narration: 'Security agency monthly retainer' },
        { accountId: accMap.get('1002')!, debit: 0, credit: 45000, narration: 'Paid via HDFC Bank NEFT' },
      ]
    },
    {
      entryNo: 'JV-2026-1024',
      date: new Date('2026-10-24'),
      narration: 'Cash deposit from retail showroom counter vault into HDFC Current A/c',
      status: 'POSTED',
      postedAt: new Date('2026-10-24'),
      postedBy: CREATED_BY,
      lines: [
        { accountId: accMap.get('1002')!, debit: 250000, credit: 0, narration: 'Cash remittance to HDFC branch' },
        { accountId: accMap.get('1001')!, debit: 0, credit: 250000, narration: 'Vault cash drawer withdrawn' },
      ]
    },
  ];

  for (const jv of journalsData) {
    const lines = jv.lines;
    const jvNoLines = { ...jv };
    delete (jvNoLines as any).lines;

    const existing = await prisma.journalEntry.findFirst({
      where: { companyId: COMPANY_ID, entryNo: jv.entryNo }
    });

    let jId = existing?.id;
    if (existing) {
      await prisma.journalLine.deleteMany({ where: { entryId: existing.id } });
      const updated = await prisma.journalEntry.update({
        where: { id: existing.id },
        data: { ...jvNoLines, updatedAt: new Date() }
      });
      jId = updated.id;
    } else {
      const created = await prisma.journalEntry.create({
        data: { ...jvNoLines, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
      jId = created.id;
    }

    for (const line of lines) {
      await prisma.journalLine.create({
        data: {
          ...line,
          companyId: COMPANY_ID,
          entryId: jId!,
          createdBy: CREATED_BY
        }
      });
    }
  }
  console.log(`✓ Seeded ${journalsData.length} balanced Journal Entries`);

  // 18. Gold Schemes & Scheme Members (2 schemes, 6 members)
  const schemesData = [
    {
      name: 'Swarna Vriddhi 11-Month Gold Accumulation Scheme',
      monthlyMin: 5000,
      monthlyMax: 50000,
      durationMonths: 11,
      bonusType: 'DISCOUNT',
      bonusValue: 100, // 100% of 1 month contribution as bonus discount on making charges
      isActive: true,
    },
    {
      name: 'Dhanteras Shubh Sanchay Plan',
      monthlyMin: 10000,
      monthlyMax: 100000,
      durationMonths: 12,
      bonusType: 'FIXED_AMOUNT',
      bonusValue: 12000,
      isActive: true,
    },
  ];

  const createdSchemes: any[] = [];
  for (const s of schemesData) {
    const existing = await prisma.goldScheme.findFirst({
      where: { companyId: COMPANY_ID, name: s.name }
    });
    if (existing) {
      const updated = await prisma.goldScheme.update({
        where: { id: existing.id },
        data: { ...s, updatedAt: new Date() }
      });
      createdSchemes.push(updated);
    } else {
      const created = await prisma.goldScheme.create({
        data: { ...s, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
      createdSchemes.push(created);
    }
  }
  console.log(`✓ Seeded ${createdSchemes.length} Gold Schemes`);

  const schemeMembersData = [
    {
      schemeId: createdSchemes[0].id,
      customerId: createdCustomers[0].id, // Aarav Patel
      enrollDate: new Date('2026-01-10'),
      monthlyAmt: 10000,
      totalInstallments: 11,
      paidInstallments: 9,
      totalDeposited: 90000,
      bonusAmount: 10000,
      maturityDate: new Date('2026-12-10'),
      status: 'ACTIVE',
    },
    {
      schemeId: createdSchemes[0].id,
      customerId: createdCustomers[1].id, // Ananya Sharma
      enrollDate: new Date('2026-02-15'),
      monthlyAmt: 15000,
      totalInstallments: 11,
      paidInstallments: 8,
      totalDeposited: 120000,
      bonusAmount: 15000,
      maturityDate: new Date('2027-01-15'),
      status: 'ACTIVE',
    },
    {
      schemeId: createdSchemes[0].id,
      customerId: createdCustomers[4].id, // Pooja Desai
      enrollDate: new Date('2026-03-01'),
      monthlyAmt: 20000,
      totalInstallments: 11,
      paidInstallments: 7,
      totalDeposited: 140000,
      bonusAmount: 20000,
      maturityDate: new Date('2027-02-01'),
      status: 'ACTIVE',
    },
    {
      schemeId: createdSchemes[1].id,
      customerId: createdCustomers[3].id, // Siddharth Verma
      enrollDate: new Date('2025-11-01'),
      monthlyAmt: 25000,
      totalInstallments: 12,
      paidInstallments: 11,
      totalDeposited: 275000,
      bonusAmount: 12000,
      maturityDate: new Date('2026-11-01'),
      status: 'ACTIVE',
    },
    {
      schemeId: createdSchemes[1].id,
      customerId: createdCustomers[6].id, // Vikramaditya Singhania
      enrollDate: new Date('2026-04-10'),
      monthlyAmt: 50000,
      totalInstallments: 12,
      paidInstallments: 6,
      totalDeposited: 300000,
      bonusAmount: 12000,
      maturityDate: new Date('2027-04-10'),
      status: 'ACTIVE',
    },
    {
      schemeId: createdSchemes[0].id,
      customerId: createdCustomers[2].id, // Kiran Jewellers
      enrollDate: new Date('2025-10-01'),
      monthlyAmt: 50000,
      totalInstallments: 11,
      paidInstallments: 11,
      totalDeposited: 550000,
      bonusAmount: 50000,
      maturityDate: new Date('2026-09-01'),
      status: 'MATURED',
    },
  ];

  for (const sm of schemeMembersData) {
    const existing = await prisma.schemeMember.findFirst({
      where: { companyId: COMPANY_ID, schemeId: sm.schemeId, customerId: sm.customerId }
    });
    if (existing) {
      await prisma.schemeMember.update({
        where: { id: existing.id },
        data: { ...sm, updatedAt: new Date() }
      });
    } else {
      await prisma.schemeMember.create({
        data: { ...sm, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
    }
  }
  console.log(`✓ Seeded ${schemeMembersData.length} Gold Scheme Members`);

  // 19. Employees & Salary Records (6 employees + records)
  const employeesData = [
    {
      code: 'EMP-001',
      name: 'Nilesh V. Mehta',
      designation: 'General Manager - Showroom Operations',
      department: 'Management',
      dateOfJoin: new Date('2020-04-01'),
      pan: 'ABCDE1234F',
      basicSalary: 65000,
      hra: 25000,
      otherAllowances: 15000,
      pfApplicable: true,
      esiApplicable: false,
      bankName: 'HDFC Bank',
      accountNo: '50100234567891',
      ifsc: 'HDFC0000060',
      isActive: true,
    },
    {
      code: 'EMP-002',
      name: 'Priyanka Shah',
      designation: 'Senior Jewellery Designer & CAD Specialist',
      department: 'Design Studio',
      dateOfJoin: new Date('2021-08-15'),
      pan: 'BCDEF2345G',
      basicSalary: 45000,
      hra: 18000,
      otherAllowances: 10000,
      pfApplicable: true,
      esiApplicable: false,
      bankName: 'ICICI Bank',
      accountNo: '002401567890',
      ifsc: 'ICIC0000024',
      isActive: true,
    },
    {
      code: 'EMP-003',
      name: 'Gaurang Trivedi',
      designation: 'Senior Gemologist & Certified Diamond Appraiser',
      department: 'Quality Assurance',
      dateOfJoin: new Date('2022-01-10'),
      pan: 'CDEFG3456H',
      basicSalary: 42000,
      hra: 16000,
      otherAllowances: 8000,
      pfApplicable: true,
      esiApplicable: false,
      bankName: 'State Bank of India',
      accountNo: '30992384756',
      ifsc: 'SBIN0002632',
      isActive: true,
    },
    {
      code: 'EMP-004',
      name: 'Hetalben Solanki',
      designation: 'Chief Cashier & Bullion Counter Officer',
      department: 'Accounts & Cash',
      dateOfJoin: new Date('2021-11-01'),
      pan: 'DEFGH4567I',
      basicSalary: 32000,
      hra: 12000,
      otherAllowances: 5000,
      pfApplicable: true,
      esiApplicable: true,
      bankName: 'HDFC Bank',
      accountNo: '50100456789123',
      ifsc: 'HDFC0000060',
      isActive: true,
    },
    {
      code: 'EMP-005',
      name: 'Krunal Bhavsar',
      designation: 'Senior Sales Executive - Bridal Lounge',
      department: 'Sales',
      dateOfJoin: new Date('2023-03-01'),
      pan: 'EFGHI5678J',
      basicSalary: 28000,
      hra: 10000,
      otherAllowances: 6000,
      pfApplicable: true,
      esiApplicable: true,
      bankName: 'Axis Bank',
      accountNo: '912010045678901',
      ifsc: 'UTIB0000045',
      isActive: true,
    },
    {
      code: 'EMP-006',
      name: 'Ramsingh Yadav',
      designation: 'Chief Security Officer & Vault Custodian',
      department: 'Security',
      dateOfJoin: new Date('2020-01-15'),
      pan: 'FGHIJ6789K',
      basicSalary: 25000,
      hra: 8000,
      otherAllowances: 5000,
      pfApplicable: true,
      esiApplicable: true,
      bankName: 'State Bank of India',
      accountNo: '20199485721',
      ifsc: 'SBIN0002632',
      isActive: true,
    },
  ];

  const createdEmployees: any[] = [];
  for (const emp of employeesData) {
    const existing = await prisma.employee.findFirst({
      where: { companyId: COMPANY_ID, code: emp.code }
    });
    if (existing) {
      const updated = await prisma.employee.update({
        where: { id: existing.id },
        data: { ...emp, updatedAt: new Date() }
      });
      createdEmployees.push(updated);
    } else {
      const created = await prisma.employee.create({
        data: { ...emp, companyId: COMPANY_ID, createdBy: CREATED_BY }
      });
      createdEmployees.push(created);
    }
  }
  console.log(`✓ Seeded ${createdEmployees.length} Employees`);

  // Salary Records for September 2026
  for (const emp of createdEmployees) {
    const existing = await prisma.salaryRecord.findFirst({
      where: { companyId: COMPANY_ID, employeeId: emp.id, month: 9, year: 2026 }
    });
    const pf = emp.pfApplicable ? Math.round(emp.basicSalary * 0.12) : 0;
    const esi = emp.esiApplicable ? Math.round((emp.basicSalary + emp.hra + emp.otherAllowances) * 0.0075) : 0;
    const tds = emp.basicSalary > 50000 ? 3500 : 0;
    const netPay = (emp.basicSalary + emp.hra + emp.otherAllowances) - (pf + esi + tds);

    if (!existing) {
      await prisma.salaryRecord.create({
        data: {
          companyId: COMPANY_ID,
          employeeId: emp.id,
          month: 9,
          year: 2026,
          daysWorked: 30,
          basicEarned: emp.basicSalary,
          hra: emp.hra,
          allowances: emp.otherAllowances,
          pfDeduction: pf,
          esiDeduction: esi,
          tdsDeduction: tds,
          netPay: netPay,
          status: 'PAID',
          createdBy: CREATED_BY
        }
      });
    }
  }
  console.log('✓ Seeded Monthly Salary Records');

  // 20. HSN Master records
  const hsnData = [
    { code: '7113', description: 'Articles of jewellery and parts thereof, of precious metal or metals clad with precious metal', gstRate: 3.0, cessRate: 0 },
    { code: '7108', description: 'Gold (including gold plated with platinum) unwrought or in semi-manufactured forms, or in powder form', gstRate: 3.0, cessRate: 0 },
    { code: '7102', description: 'Diamonds, whether or not worked, but not mounted or set', gstRate: 1.5, cessRate: 0 },
    { code: '7106', description: 'Silver (including silver plated with gold or platinum), unwrought or in semi-manufactured forms', gstRate: 3.0, cessRate: 0 },
    { code: '9988', description: 'Manufacturing services on physical inputs (goods) owned by others / Karigar job work', gstRate: 5.0, cessRate: 0 },
  ];

  for (const h of hsnData) {
    const existing = await prisma.hSNMaster.findFirst({
      where: { companyId: COMPANY_ID, code: h.code }
    });
    if (!existing) {
      await prisma.hSNMaster.create({
        data: { ...h, companyId: COMPANY_ID, isActive: true, createdBy: CREATED_BY }
      });
    }
  }
  console.log(`✓ Seeded ${hsnData.length} Jewellery HSN codes`);

  console.log('--- ALL SAMPLE DATA SUCCESSFULLY SEEDED FOR MEHTA JEWELLERS ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
