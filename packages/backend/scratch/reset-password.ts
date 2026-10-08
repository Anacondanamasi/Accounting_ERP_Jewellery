import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function reset() {
  try {
    const hashedPassword = await bcrypt.hash("Password@123", 10);
    const user = await prisma.user.update({
      where: { email: "rajesh@mehtajewellers.in" },
      data: { password: hashedPassword }
    });
    console.log("Password reset successful for:", user.email);
  } catch (e) {
    console.error("Error resetting password:", e);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
