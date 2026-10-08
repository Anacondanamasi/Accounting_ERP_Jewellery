import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany();
    console.log("Users in DB:", users.map(u => u.email));
  } catch (e) {
    console.error("DB Connection Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
