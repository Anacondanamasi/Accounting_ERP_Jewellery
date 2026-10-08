import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

const uuid = () => crypto.randomUUID();

async function checkIam() {
  try {
    const hash = await bcrypt.hash("Password@123", 12);
    const userId = uuid();
    const userResult = await prisma.$executeRawUnsafe(
      `INSERT INTO users
      (id, email, password_hash, full_name, is_email_verified, legacy_user_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      userId,
      "rajesh@mehtajewellers.in",
      hash,
      "Rajesh Mehta",
      1,
      1
    );
    console.log("User insert result:", userResult);
  } catch (err) {
    console.error("Error in normal INSERT:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkIam();
