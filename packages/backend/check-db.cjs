const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.accountGroup.findMany();
  console.log(groups);
}

main().finally(() => prisma.$disconnect());
