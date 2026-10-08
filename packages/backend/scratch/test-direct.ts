import { PrismaClient } from "@prisma/client";

const url = "postgresql://postgres:Hiren%40123%21%40%23@db.rltziejqazaaojztyfan.supabase.co:5432/postgres?sslmode=require&connect_timeout=10";

async function test() {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    console.log("Testing direct connection...");
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("Success! Direct connection works:", JSON.stringify(result));
  } catch (e: any) {
    console.error("Direct connection failed:", e.message ?? e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
