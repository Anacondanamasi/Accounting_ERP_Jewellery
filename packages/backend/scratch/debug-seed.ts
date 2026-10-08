import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

const SYSTEM_ROLES = ["owner", "admin", "accountant", "auditor", "viewer"] as const;

const PERMISSIONS = [
  { code: "journal.create", module: "journal", description: "Create journal entries" },
  { code: "journal.view", module: "journal", description: "View journal entries" },
  { code: "journal.update", module: "journal", description: "Edit journal entries" },
  { code: "journal.post", module: "journal", description: "Post journal entries" },
  { code: "invoice.create", module: "invoice", description: "Create invoices" },
  { code: "invoice.approve", module: "invoice", description: "Approve invoices" },
  { code: "invoice.view", module: "invoice", description: "View invoices" },
  { code: "bill.create", module: "bill", description: "Create bills" },
  { code: "bill.approve", module: "bill", description: "Approve bills" },
  { code: "bill.view", module: "bill", description: "View bills" },
  { code: "payment.create", module: "payment", description: "Create payments" },
  { code: "payment.view", module: "payment", description: "View payments" },
  { code: "bank.reconcile", module: "bank", description: "Reconcile bank statements" },
  { code: "bank.view", module: "bank", description: "View bank data" },
  { code: "report.view", module: "report", description: "View reports" },
  { code: "report.export", module: "report", description: "Export reports" },
  { code: "payroll.create", module: "payroll", description: "Create payroll records" },
  { code: "payroll.approve", module: "payroll", description: "Approve payroll" },
  { code: "payroll.view", module: "payroll", description: "View payroll" },
  { code: "settings.company.update", module: "settings", description: "Edit company settings" },
  { code: "settings.integration.manage", module: "settings", description: "Manage integrations" },
  { code: "user_management.invite", module: "user_management", description: "Invite members" },
  { code: "user_management.view", module: "user_management", description: "View members" },
  { code: "user_management.manage_roles", module: "user_management", description: "Manage roles" },
  { code: "user_management.remove", module: "user_management", description: "Remove members" },
];

const ROLE_PERMISSION_MAP: Record<(typeof SYSTEM_ROLES)[number], string[]> = {
  owner: PERMISSIONS.map((permission) => permission.code),
  admin: PERMISSIONS.map((permission) => permission.code),
  accountant: [
    "journal.create",
    "journal.view",
    "journal.update",
    "invoice.create",
    "invoice.view",
    "bill.create",
    "bill.view",
    "payment.create",
    "payment.view",
    "bank.view",
    "report.view",
    "report.export",
    "payroll.view",
  ],
  auditor: ["journal.view", "invoice.view", "bill.view", "payment.view", "bank.view", "report.view", "report.export"],
  viewer: ["journal.view", "invoice.view", "bill.view", "payment.view", "bank.view", "report.view"],
};

const uuid = () => crypto.randomUUID();

async function seedLegacyData() {
  try {
    await prisma.company.create({
      data: {
        id: 1,
        name: "Mehta Jewellers Pvt. Ltd.",
        gstin: "24AAACM1234A1Z1",
        city: "Ahmedabad",
        state: "Gujarat",
        createdBy: "system",
      },
    });
    console.log("Legacy Company seeded");
  } catch (err) {
    console.error("seedLegacyData Company Error:", err);
  }

  try {
    await prisma.user.createMany({
      data: [
        {
          id: 1,
          companyId: 1,
          email: "rajesh@mehtajewellers.in",
          fullName: "Rajesh Mehta",
          password: await bcrypt.hash("Password@123", 12),
          role: "ADMIN",
          createdBy: "system",
        },
        {
          id: 2,
          companyId: 1,
          email: "priya@mehtajewellers.in",
          fullName: "Priya Shah",
          password: await bcrypt.hash("Password@123", 12),
          role: "ACCOUNTANT",
          createdBy: "system",
        },
      ],
      skipDuplicates: true,
    });
    console.log("Legacy Users seeded");
  } catch (err) {
    console.error("seedLegacyData User Error:", err);
  }
}

async function main() {
  await seedLegacyData();
}

main().finally(() => prisma.$disconnect());
