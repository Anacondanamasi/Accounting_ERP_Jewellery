const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const row = await prisma.account.create({
      data: {
        code: "9999",
        name: "Test Bank Account",
        description: "Bank Account: 123456",
        groupId: null,
        companyId: 1,
        heading: "ASSETS",
        type: "Bank",
        group: "Ungrouped",
        openingBalance: 0,
        taxCode: "Tax Exempt (0%)",
        isBankAccount: true,
        enablePayments: true,
        showOnDashboard: true,
        isActive: true,
        allowManualJournals: true,
        createdBy: "system"
      }
    });
    console.log("Success:", row);
  } catch (error) {
    console.error("Prisma Error:", error);
  }
}

main().finally(() => prisma.$disconnect());
