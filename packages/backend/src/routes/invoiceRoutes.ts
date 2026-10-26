import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/companyContext";
import {
  createInvoice,
  duplicateInvoice,
  getInvoiceById,
  getInvoicePdf,
  getNextInvoiceNo,
  listInvoices,
  postInvoice,
  recordPayment,
  sendInvoiceEmail,
  updateInvoice,
  voidInvoice,
  deleteInvoice,
} from "../controllers/invoices/invoiceController";

export const invoiceRoutes = Router();
invoiceRoutes.use(authMiddleware);

invoiceRoutes.get("/", listInvoices);
invoiceRoutes.get("/next-number", getNextInvoiceNo);
invoiceRoutes.get("/:id", getInvoiceById);
invoiceRoutes.post("/", requirePermission("invoice.create"), createInvoice);
invoiceRoutes.put("/:id", requirePermission("invoice.create"), updateInvoice);
invoiceRoutes.delete("/:id", requirePermission("invoice.create"), deleteInvoice);
invoiceRoutes.post("/:id/post", postInvoice);
invoiceRoutes.post("/:id/void", requirePermission("invoice.approve"), voidInvoice);
invoiceRoutes.post("/:id/duplicate", requirePermission("invoice.create"), duplicateInvoice);
invoiceRoutes.post("/:id/record-payment", requirePermission("payment.create"), recordPayment);
invoiceRoutes.get("/:id/pdf", getInvoicePdf);
invoiceRoutes.post("/:id/send-email", requirePermission("invoice.approve"), sendInvoiceEmail);
