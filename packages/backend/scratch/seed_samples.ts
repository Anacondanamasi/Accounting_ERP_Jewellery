import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();
const uuid = () => crypto.randomUUID();

async function main() {
  console.log("Cleaning up previous sample data...");
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`);

  const sampleEmails = ["admin@jewelledger.com", "accountant@jewelledger.com", "viewer@jewelledger.com"];
  for (const email of sampleEmails) {
    const user = (await prisma.$queryRawUnsafe(`SELECT id FROM users WHERE email = ?`, email)) as any[];
    if (user[0]) {
      await prisma.$executeRawUnsafe(`DELETE FROM user_company_memberships WHERE user_id = ?`, user[0].id);
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = ?`, user[0].id);
    }
  }
  
  const sampleCompanyNames = ["JewelLedger Pro India", "D&D Silver Exports"];
  for (const name of sampleCompanyNames) {
    const comp = (await prisma.$queryRawUnsafe(`SELECT id FROM companies WHERE name = ?`, name)) as any[];
    if (comp[0]) {
      await prisma.$executeRawUnsafe(`DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE company_id = ?)`, comp[0].id);
      await prisma.$executeRawUnsafe(`DELETE FROM roles WHERE company_id = ?`, comp[0].id);
      await prisma.$executeRawUnsafe(`DELETE FROM user_company_memberships WHERE company_id = ?`, comp[0].id);
      await prisma.$executeRawUnsafe(`DELETE FROM companies WHERE id = ?`, comp[0].id);
    }
    await prisma.company.deleteMany({ where: { name } });
  }

  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
  console.log("Starting sample data seed (Raw SQL mode)...");

  // password: Password123!
  const passwordHash = "$2b$12$VV0BaSyqZnmbAQE5qGIPPO4uqGdiTy2VnhZRfgt28HeJNLTzfVuTq"; 

  // 1. Create a Professional Plan
  const planId = uuid();
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO subscription_plans (id, name, max_users, max_companies_per_user, features, price_monthly)
     VALUES (?, ?, 20, 5, ?, 49)`,
    planId, "Enterprise Pro", JSON.stringify({ journal: true, reports: true, inventory: true, banking: true })
  );

  // 2. Create Users
  const adminId = uuid();
  const accId = uuid();
  const viewId = uuid();

  const users = [
    { id: adminId, email: "admin@jewelledger.com", name: "System Admin" },
    { id: accId, email: "accountant@jewelledger.com", name: "Senior Accountant" },
    { id: viewId, email: "viewer@jewelledger.com", name: "Guest Viewer" }
  ];

  for (const u of users) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO users (id, email, password_hash, full_name, is_email_verified, is_active)
       VALUES (?, ?, ?, ?, 1, 1)`,
      u.id, u.email, passwordHash, u.name
    );
  }

  // 3. Create Legacy Companies (using Prisma model as it's in the client)
  console.log("Creating legacy company records...");
  const legacyCo1 = await prisma.company.create({
    data: {
      name: "JewelLedger Pro India",
      gstin: "27AAAAA0000A1Z5",
      city: "Mumbai",
      state: "Maharashtra",
      createdBy: "system"
    }
  });

  const legacyCo2 = await prisma.company.create({
    data: {
      name: "D&D Silver Exports",
      gstin: "08BBBBB1111B1Z2",
      city: "Jaipur",
      state: "Rajasthan",
      createdBy: "system"
    }
  });

  // 4. Create Tenant Companies
  const tenantCo1Id = uuid();
  const tenantCo2Id = uuid();

  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO companies 
     (id, name, legal_name, tax_id, currency_code, fiscal_year_start, country_code, timezone, plan_id, status, owner_id, legacy_company_id)
     VALUES (?, ?, ?, ?, 'INR', '04-01', 'IN', 'Asia/Kolkata', ?, 'active', ?, ?)`,
    tenantCo1Id, "JewelLedger Pro India", "JewelLedger Solutions Pvt Ltd", "27AAAAA0000A1Z5", planId, adminId, legacyCo1.id
  );

  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO companies 
     (id, name, legal_name, tax_id, currency_code, fiscal_year_start, country_code, timezone, plan_id, status, owner_id, legacy_company_id)
     VALUES (?, ?, ?, ?, 'INR', '04-01', 'IN', 'Asia/Kolkata', ?, 'trial', ?, ?)`,
    tenantCo2Id, "D&D Silver Exports", "D&D Silver LLP", "08BBBBB1111B1Z2", planId, adminId, legacyCo2.id
  );

  // 5. Get System Roles
  const roles = (await prisma.$queryRawUnsafe(`SELECT id, name FROM roles WHERE company_id IS NULL`)) as any[];
  const ownerRole = roles.find(r => r.name === 'owner')?.id;
  const adminRole = roles.find(r => r.name === 'admin')?.id;
  const accountantRole = roles.find(r => r.name === 'accountant')?.id;
  const viewerRole = roles.find(r => r.name === 'viewer')?.id;

  // 6. Create Memberships
  console.log("Creating memberships...");
  // Admin is Owner of both
  const memberships = [
    { id: uuid(), uid: adminId, cid: tenantCo1Id, rid: ownerRole },
    { id: uuid(), uid: adminId, cid: tenantCo2Id, rid: ownerRole },
    { id: uuid(), uid: accId, cid: tenantCo1Id, rid: accountantRole },
    { id: uuid(), uid: viewId, cid: tenantCo2Id, rid: viewerRole },
  ];

  for (const m of memberships) {
    if (!m.rid) continue;
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO user_company_memberships (id, user_id, company_id, role_id, status, joined_at)
       VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`,
      m.id, m.uid, m.cid, m.rid
    );
  }

  // 7. Seed some Accounts for JewelLedger Pro India
  console.log("Seeding accounts...");
  const cashAcc = await prisma.account.create({
    data: { companyId: legacyCo1.id, code: "1001", name: "Cash in Hand", group: "Cash", type: "ASSET", openingBalance: 50000, createdBy: "system" }
  });
  const bankAcc = await prisma.account.create({
    data: { companyId: legacyCo1.id, code: "1002", name: "HDFC Bank", group: "Bank", type: "ASSET", openingBalance: 1250000, createdBy: "system" }
  });
  const capitalAcc = await prisma.account.create({
    data: { companyId: legacyCo1.id, code: "3001", name: "Owner Capital", group: "Capital", type: "LIABILITY", openingBalance: 1300000, createdBy: "system" }
  });

  // 8. Seed a Journal Entry
  console.log("Seeding journal entry...");
  await prisma.journalEntry.create({
    data: {
      companyId: legacyCo1.id,
      entryNo: "JV-2025-001",
      date: new Date(),
      narration: "Initial Setup",
      status: "POSTED",
      postedAt: new Date(),
      postedBy: adminId,
      createdBy: adminId,
      lines: {
        create: [
          { companyId: legacyCo1.id, accountId: bankAcc.id, debit: 100000, credit: 0, createdBy: adminId },
          { companyId: legacyCo1.id, accountId: capitalAcc.id, debit: 0, credit: 100000, createdBy: adminId }
        ]
      }
    }
  });

  console.log("\nSeed completed successfully!");
  console.log("--------------------------------------------------");
  console.log("TEST ACCOUNTS (Password for all: Password123!)");
  console.log("1. admin@jewelledger.com      (Owner of 2 companies)");
  console.log("2. accountant@jewelledger.com (Accountant in JewelLedger)");
  console.log("3. viewer@jewelledger.com     (Viewer in D&D Silver)");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
