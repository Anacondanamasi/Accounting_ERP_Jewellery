import { PrismaClient } from "@prisma/client";

const testUrl = "postgresql://postgres.rltziejqazaaojztyfan:Hiren%40123%21%40%23@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?connect_timeout=15";

async function main() {
  const p = new PrismaClient({
    datasources: { db: { url: testUrl } }
  });
  try {
    const res = await p.$queryRawUnsafe("SELECT 1 as connected");
    console.log("Connection via IPv4 pooler succeeded!", res);
  } catch (err) {
    console.error("Pooler connection failed:", err);
  } finally {
    await p.$disconnect();
  }
}

main();
