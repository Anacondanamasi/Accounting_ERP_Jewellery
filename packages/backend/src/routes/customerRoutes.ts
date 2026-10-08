import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createCustomer,
  deleteCustomer,
  exportCustomers,
  getCustomerAdvances,
  getCustomerById,
  getCustomerInvoices,
  getCustomerLedger,
  importCustomers,
  listCustomers,
  sendCustomerStatement,
  updateCustomer,
} from "../controllers/customers/customerController";

export const customerRoutes = Router();
customerRoutes.use(authMiddleware);

customerRoutes.get("/", listCustomers);
customerRoutes.get("/export", exportCustomers);
customerRoutes.post("/import", importCustomers);
customerRoutes.get("/:id", getCustomerById);
customerRoutes.get("/:id/ledger", getCustomerLedger);
customerRoutes.get("/:id/invoices", getCustomerInvoices);
customerRoutes.get("/:id/advances", getCustomerAdvances);
customerRoutes.post("/:id/send-statement", sendCustomerStatement);
customerRoutes.post("/", createCustomer);
customerRoutes.put("/:id", updateCustomer);
customerRoutes.delete("/:id", deleteCustomer);
