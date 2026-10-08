import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { authMiddleware } from "../middleware/authMiddleware";

export const searchRoutes = Router();
searchRoutes.use(authMiddleware);

const company = (req: any) => req.auth?.companyId as number;

searchRoutes.get("/", async (req, res) => {
  const companyId = company(req);
  const q = req.query.q ? String(req.query.q) : req.query.search ? String(req.query.search) : "";
  const take = Math.min(Number(req.query.limit ?? 20), 50);
  const contains = q ? { contains: q } : undefined;

  const [customers, suppliers, items, accounts, bankAccounts, karigars, invoices, bills] =
    await Promise.all([
      prisma.customer.findMany({
        where: { companyId, status: "ACTIVE", ...(contains ? { name: contains } : {}) },
        take,
        orderBy: { name: "asc" },
      }),
      prisma.supplier.findMany({
        where: { companyId, status: "ACTIVE", ...(contains ? { name: contains } : {}) },
        take,
        orderBy: { name: "asc" },
      }),
      prisma.item.findMany({
        where: {
          companyId,
          isActive: true,
          ...(contains ? { OR: [{ sku: contains }, { name: contains }] } : {}),
        },
        take,
        orderBy: { sku: "asc" },
      }),
      prisma.account.findMany({
        where: { companyId, isActive: true, ...(contains ? { OR: [{ code: contains }, { name: contains }] } : {}) },
        take,
        orderBy: { code: "asc" },
      }),
      prisma.bankAccount.findMany({
        where: { companyId, isActive: true, ...(contains ? { bankName: contains } : {}) },
        take,
        orderBy: { bankName: "asc" },
      }),
      prisma.karigar.findMany({
        where: { companyId, isActive: true, ...(contains ? { name: contains } : {}) },
        take,
        orderBy: { name: "asc" },
      }),
      prisma.invoice.findMany({
        where: { companyId, ...(contains ? { invoiceNo: contains } : {}) },
        take,
        orderBy: { date: "desc" },
      }),
      prisma.bill.findMany({
        where: { companyId, ...(contains ? { billNo: contains } : {}) },
        take,
        orderBy: { date: "desc" },
      }),
    ]);

  const rows = [
    ...customers.map((row) => ({ id: row.id, type: "customer", label: row.name, value: row.id, meta: row.mobile })),
    ...suppliers.map((row) => ({ id: row.id, type: "supplier", label: row.name, value: row.id, meta: row.mobile })),
    ...items.map((row) => ({ id: row.id, type: "item", label: `${row.sku} - ${row.name}`, value: row.id, meta: row.karat })),
    ...accounts.map((row) => ({ id: row.id, type: "account", label: `${row.code} - ${row.name}`, value: row.id, meta: row.group })),
    ...bankAccounts.map((row) => ({ id: row.id, type: "bankAccount", label: row.bankName, value: row.id, meta: row.accountNoMasked })),
    ...karigars.map((row) => ({ id: row.id, type: "karigar", label: row.name, value: row.id, meta: row.specialization })),
    ...invoices.map((row) => ({ id: row.id, type: "invoice", label: row.invoiceNo, value: row.id, meta: row.status })),
    ...bills.map((row) => ({ id: row.id, type: "bill", label: row.billNo, value: row.id, meta: row.status })),
  ];

  return ok(res, rows.slice(0, take));
});
