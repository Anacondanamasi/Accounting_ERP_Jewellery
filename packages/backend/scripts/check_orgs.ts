import { prisma } from '../src/lib/prisma';

async function main() {
  const prismaCompanies = await prisma.company.findMany();
  console.log('Prisma Company table:', prismaCompanies);

  const rawCompanies = await prisma.$queryRawUnsafe('SELECT id, name, owner_id, legacy_company_id FROM companies');
  console.log('Raw companies table:', rawCompanies);

  const memberships = await prisma.$queryRawUnsafe('SELECT user_id, company_id, role_id, status FROM user_company_memberships');
  console.log('Memberships:', memberships);
}

main().catch(console.error).finally(() => prisma.$disconnect());
