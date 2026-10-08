import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const fks = await p.$queryRawUnsafe("PRAGMA foreign_key_list('companies')");
  console.log('Companies FKs:', fks);
}
main().finally(() => p.$disconnect());
