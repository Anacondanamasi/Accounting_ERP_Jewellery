import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/authRoutes";
import { advanceRoutes } from "./routes/advanceRoutes";
import { bankingRoutes } from "./routes/bankingRoutes";
import { billRoutes } from "./routes/billRoutes";
import { customerRoutes } from "./routes/customerRoutes";
import { dashboardRoutes } from "./routes/dashboardRoutes";
import { invoiceRoutes } from "./routes/invoiceRoutes";
import { journalRoutes } from "./routes/journalRoutes";
import { expenseRoutes } from "./routes/expenseRoutes";
import { jobWorkRoutes } from "./routes/jobWorkRoutes";
import { karigarRoutes } from "./routes/karigarRoutes";
import { ledgerRoutes } from "./routes/ledgerRoutes";
import { itemRoutes } from "./routes/itemRoutes";
import { inventoryRoutes } from "./routes/inventoryRoutes";
import { metalRateRoutes } from "./routes/metalRateRoutes";
import { accountRoutes } from "./routes/accountRoutes";
import { employeeRoutes } from "./routes/employeeRoutes";
import { noteRoutes } from "./routes/noteRoutes";
import { payrollRoutes } from "./routes/payrollRoutes";
import { schemeRoutes } from "./routes/schemeRoutes";
import { searchRoutes } from "./routes/searchRoutes";
import { reportRoutes } from "./routes/reportRoutes";
import { supplierRoutes } from "./routes/supplierRoutes";
import { systemRoutes } from "./routes/systemRoutes";
import { taxRoutes } from "./routes/taxRoutes";
import { settingsRoutes } from "./routes/settingsRoutes";
import { companyRoutes, invitationRoutes } from "./routes/companyRoutes";
import { productServiceRoutes } from "./routes/productServiceRoutes";
import { settlementRoutes } from "./routes/settlementRoutes";
import { authMiddleware } from "./middleware/authMiddleware";
import { requireCompanyContext } from "./middleware/companyContext";
import { writeAuditMiddleware } from "./middleware/writeAuditMiddleware";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const defaultAllowed = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];
      const allowedOrigins = [...defaultAllowed, ...configuredOrigins];

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "4mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", companyRoutes);
app.use("/api/v1", invitationRoutes);

app.use("/api/v1/dashboard", authMiddleware, requireCompanyContext, writeAuditMiddleware, dashboardRoutes);
app.use("/api/v1/invoices", authMiddleware, requireCompanyContext, writeAuditMiddleware, invoiceRoutes);
app.use("/api/v1/journal", authMiddleware, requireCompanyContext, writeAuditMiddleware, journalRoutes);
app.use("/api/v1/expenses", authMiddleware, requireCompanyContext, writeAuditMiddleware, expenseRoutes);
app.use("/api/v1/ledger", authMiddleware, requireCompanyContext, writeAuditMiddleware, ledgerRoutes);
app.use("/api/v1/customers", authMiddleware, requireCompanyContext, writeAuditMiddleware, customerRoutes);
app.use("/api/v1/advances", authMiddleware, requireCompanyContext, writeAuditMiddleware, advanceRoutes);
app.use("/api/v1/suppliers", authMiddleware, requireCompanyContext, writeAuditMiddleware, supplierRoutes);
app.use("/api/v1/bills", authMiddleware, requireCompanyContext, writeAuditMiddleware, billRoutes);
app.use("/api/v1/bank-accounts", authMiddleware, requireCompanyContext, writeAuditMiddleware, bankingRoutes);
app.use("/api/v1/reports", authMiddleware, requireCompanyContext, writeAuditMiddleware, reportRoutes);
app.use("/api/v1/tax", authMiddleware, requireCompanyContext, writeAuditMiddleware, taxRoutes);
app.use("/api/v1/settings", authMiddleware, requireCompanyContext, writeAuditMiddleware, settingsRoutes);
app.use("/api/v1/items", authMiddleware, requireCompanyContext, writeAuditMiddleware, itemRoutes);
app.use("/api/v1/inventory", authMiddleware, requireCompanyContext, writeAuditMiddleware, inventoryRoutes);
app.use("/api/v1/metal-rates", authMiddleware, requireCompanyContext, writeAuditMiddleware, metalRateRoutes);
app.use("/api/v1/karigar", authMiddleware, requireCompanyContext, writeAuditMiddleware, karigarRoutes);
app.use("/api/v1/job-work", authMiddleware, requireCompanyContext, writeAuditMiddleware, jobWorkRoutes);
app.use("/api/v1/accounts", authMiddleware, requireCompanyContext, writeAuditMiddleware, accountRoutes);
app.use("/api/v1/search", authMiddleware, requireCompanyContext, writeAuditMiddleware, searchRoutes);
app.use("/api/v1/schemes", authMiddleware, requireCompanyContext, writeAuditMiddleware, schemeRoutes);
app.use("/api/v1/employees", authMiddleware, requireCompanyContext, writeAuditMiddleware, employeeRoutes);
app.use("/api/v1/payroll", authMiddleware, requireCompanyContext, writeAuditMiddleware, payrollRoutes);
app.use("/api/v1", authMiddleware, requireCompanyContext, writeAuditMiddleware, noteRoutes);
app.use("/api/v1", authMiddleware, requireCompanyContext, writeAuditMiddleware, systemRoutes);
app.use("/api/v1/product-services", authMiddleware, requireCompanyContext, writeAuditMiddleware, productServiceRoutes);
app.use("/api/v1", settlementRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// Prevent server crash on unhandled promise rejections (e.g. DB connection issues)
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Promise Rejection: ${reason}`);
  console.error(reason, promise);
});

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  console.error(error);
});

app.listen(env.PORT, () => {
  logger.info(`JewelLedger API running on http://localhost:${env.PORT}`);
});
