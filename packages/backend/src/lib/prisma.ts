import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// Intercept and wrap $transaction to set default interactive/batch transaction timeouts (60s),
// preventing P2028 timeout errors on high-latency cloud database connections.
const originalTransaction = prisma.$transaction.bind(prisma);
Object.defineProperty(prisma, "$transaction", {
  value: function (args: any, options?: any) {
    const opt = { maxWait: 30000, timeout: 60000, ...options };
    return originalTransaction(args, opt);
  },
  writable: true,
  configurable: true,
});
