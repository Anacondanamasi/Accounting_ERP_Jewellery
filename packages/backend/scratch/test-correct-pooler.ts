import { PrismaClient } from "@prisma/client";

// Try ap-northeast-2 with fully encoded password
const url = "postgresql://postgres.rltziejqazaaojztyfan:Hiren%40123%21%40%23@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&connect_timeout=10";

async function test() {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    console.log("Testing connection...");
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("Success! Pooler connection works:", JSON.stringify(result));
  } catch (e: any) {
    console.error("Connection failed:", e.message ?? e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
