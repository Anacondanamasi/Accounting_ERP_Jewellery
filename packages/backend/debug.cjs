const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const customers = await prisma.customer.findMany({ include: { invoices: true } });
  console.log('\nCustomers:', JSON.stringify(customers.map(c => ({ id: c.id, companyId: c.companyId, name: c.name, openingBalance: c.openingBalance, invoices: c.invoices.length, status: c.status })), null, 2));
  
  const invoices = await prisma.invoice.findMany();
  console.log('\nInvoices:', JSON.stringify(invoices.map(i => ({ id: i.id, companyId: i.companyId, customerId: i.customerId, status: i.status, date: i.date, balanceDue: i.balanceDue })), null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
