import { PrismaClient } from "@prisma/client";

const regions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2",
  "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3",
  "sa-east-1"
];

async function testRegions() {
  for (const region of regions) {
    const url = `postgresql://postgres.rltziejqazaaojztyfan:Hiren%40123!%40%23@aws-0-${region}.pooler.supabase.com:6543/postgres?sslmode=require&connect_timeout=5`;
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      console.log(`Testing ${region}...`);
      await prisma.$queryRaw`SELECT 1`;
      console.log(`\nSUCCESS! Region is ${region}`);
      console.log(`URL: ${url}`);
      await prisma.$disconnect();
      process.exit(0);
    } catch (e: any) {
      console.log(`Failed for ${region}: ${e.message ?? e}`);
      await prisma.$disconnect();
    }
  }
  console.log("\nAll regions failed.");
}

testRegions();
