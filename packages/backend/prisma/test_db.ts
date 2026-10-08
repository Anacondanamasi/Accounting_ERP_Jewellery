import { PrismaClient } from "@prisma/client";

const urls = [
  // Direct with SSL
  "postgresql://postgres:Hiren%40123!%40%23@db.rltziejqazaaojztyfan.supabase.co:5432/postgres?sslmode=require&connect_timeout=20",
  // Session pooler ap-south-1 port 5432
  "postgresql://postgres.rltziejqazaaojztyfan:Hiren%40123!%40%23@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=20",
  // Transaction pooler ap-south-1 port 6543
  "postgresql://postgres.rltziejqazaaojztyfan:Hiren%40123!%40%23@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&connect_timeout=20",
  // Session pooler ap-southeast-1 port 5432
  "postgresql://postgres.rltziejqazaaojztyfan:Hiren%40123!%40%23@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=20",
];

for (const url of urls) {
  const host = url.match(/@([^?]+)/)?.[1];
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    console.log(`\nTrying: ${host}`);
    const count = await p.$queryRaw`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log(`SUCCESS! Tables: ${JSON.stringify(count)}`);
    console.log(`\nWorking URL: ${url}`);
    await p.$disconnect();
    process.exit(0);
  } catch (e: any) {
    console.log(`FAILED: ${e.message ?? e}`);
    await p.$disconnect();
  }
}
console.log("\nAll URLs failed.");
process.exit(1);

