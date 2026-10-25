import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.$queryRawUnsafe('SELECT id, email, full_name, is_active FROM users');
  console.log('Users in DB:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
