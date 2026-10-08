const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const p = await prisma.payment.findMany({ select: { type: true } });
  const types = new Set(p.map(x => x.type));
  console.log('Payment types:', Array.from(types));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
