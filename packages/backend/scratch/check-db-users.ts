import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function check() {
  try {
    // Check User model
    const legacyUsers = await prisma.user.findMany();
    console.log("Legacy User table entries:");
    console.log(legacyUsers.map(u => ({ id: u.id, email: u.email, password: u.password, isActive: u.isActive })));

    // Check raw users table
    const rawUsers = await prisma.$queryRawUnsafe("SELECT * FROM users") as any[];
    console.log("\nRaw users table entries:");
    console.log(rawUsers.map(u => ({ id: u.id, email: u.email, password_hash: u.password_hash, is_active: u.is_active })));

    // Try verifying password for rajesh@mehtajewellers.in
    const rajeshRaw = rawUsers.find(u => u.email === "rajesh@mehtajewellers.in");
    if (rajeshRaw) {
      const match = await bcrypt.compare("Password@123", rajeshRaw.password_hash);
      console.log(`\nbcrypt.compare("Password@123", "${rajeshRaw.password_hash}"):`, match);
    }
  } catch (e) {
    console.error("Error checking db:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
