import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const users = await p.$queryRawUnsafe('SELECT id, email FROM users');
  console.log('Users in TenantUser table:', users);
}
main().finally(() => p.$disconnect());
