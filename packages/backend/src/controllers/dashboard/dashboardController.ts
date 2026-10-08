import type { Request, Response } from "express";
import { fail, ok } from "../../lib/apiResponse";
import { prisma } from "../../lib/prisma";
import { getCompanyId } from "../../lib/requestUtils";

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const getDashboardSummary = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const now = new Date();
  const start = monthStart(now);

  const [
    revenue,
    receivables,
    payables,
    banks,
    stock,
    invoices,
    bills,
    bankTransactions,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, status: { not: "VOID" }, date: { gte: start, lte: now } },
      _sum: { grandTotal: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: { not: "VOID" } },
      _sum: { balanceDue: true },
    }),
    prisma.bill.aggregate({
      where: { companyId, status: { not: "VOID" } },
      _sum: { balanceDue: true },
    }),
    prisma.bankAccount.aggregate({
      where: { companyId, isActive: true },
      _sum: { bookBalance: true },
    }),
    prisma.item.aggregate({
      where: { companyId, isActive: true },
      _sum: { costPrice: true },
    }),
    prisma.invoice.findMany({
      where: { companyId, status: { not: "VOID" } },
      include: { customer: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.bill.findMany({
      where: { companyId, status: { not: "VOID" } },
      include: { supplier: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.bankTransaction.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);

  const categoryRows = await prisma.item.groupBy({
    by: ["category"],
    where: { companyId, isActive: true },
    _sum: { costPrice: true },
  });

  const recentTransactions = [
    ...invoices.map((invoice) => ({
      id: invoice.id,
      date: invoice.date,
      type: "Sales",
      narration: `${invoice.invoiceNo} ${invoice.customer?.name ?? ""}`.trim(),
      amount: Number(invoice.grandTotal),
      balance: Number(invoice.balanceDue),
    })),
    ...bills.map((bill) => ({
      id: bill.id,
      date: bill.date,
      type: "Purchase",
      narration: `${bill.billNo} ${bill.supplier?.name ?? ""}`.trim(),
      amount: -Number(bill.grandTotal),
      balance: Number(bill.balanceDue),
    })),
    ...bankTransactions.map((txn) => ({
      id: txn.id,
      date: txn.date,
      type: "Bank",
      narration: txn.narration,
      amount: Number(txn.credit) - Number(txn.debit),
      balance: Number(txn.balance),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return ok(res, {
    revenueMtd: Number(revenue._sum?.grandTotal || 0),
    receivables: Number(receivables._sum?.balanceDue || 0),
    payables: Number(payables._sum?.balanceDue || 0),
    bankBalance: Number(banks._sum?.bookBalance || 0),
    stockValue: Number(stock._sum?.costPrice || 0),
    revenueChart: [],
    categoryChart: categoryRows.map((row) => ({
      category: row.category,
      value: Number(row._sum?.costPrice || 0),
    })),
    recentTransactions,
    alerts: [
      { id: "receivables", message: `${await prisma.invoice.count({ where: { companyId, balanceDue: { gt: 0 }, status: { not: "VOID" } } })} invoices pending`, type: "warn" },
      { id: "payables", message: `${await prisma.bill.count({ where: { companyId, balanceDue: { gt: 0 }, status: { not: "VOID" } } })} bills pending`, type: "info" },
    ],
  });
};

