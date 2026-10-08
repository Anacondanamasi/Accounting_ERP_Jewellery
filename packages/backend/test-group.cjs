const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const row = await prisma.accountGroup.create({
      data: {
        companyId: 1,
        heading: "ASSETS",
        name: "Test Group " + Date.now(),
        type: "Bank",
        createdBy: "system"
      }
    });
    console.log("Success:", row);
  } catch (error) {
    console.error("Prisma Error:", error);
  }
}

main().finally(() => prisma.$disconnect());
