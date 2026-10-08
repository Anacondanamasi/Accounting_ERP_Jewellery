
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany();
  console.log('Customers in DB:', customers.length);
  if (customers.length > 0) {
    console.log('First customer:', customers[0]);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
