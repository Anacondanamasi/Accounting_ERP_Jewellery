import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.productService.count();
  console.log(`Product/Service count: ${count}`);
  const items = await prisma.productService.findMany({ take: 5 });
  console.log("Sample items:", JSON.stringify(items, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
