import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findUnique({ where: { email: "rajesh@mehtajewellers.in" } });
    console.log("User found:", !!user);
    if (user) {
      console.log("Password in DB matches 'Password@123':", user.password === "Password@123");
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
