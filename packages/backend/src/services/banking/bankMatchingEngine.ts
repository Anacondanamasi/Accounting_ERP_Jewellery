import { prisma } from "../../lib/prisma";

export interface MatchCandidate {
  documentType: "INVOICE" | "BILL" | "PAYMENT" | "JOURNAL" | "CONTRA_TRANSFER";
  documentId: number;
  documentNumber: string;
  partyName?: string;
  date: string;
  totalAmount: number;
  openBalance: number;
  confidence: number; // 0 to 100
  matchReason: string;
}

export class BankMatchingEngine {
  /**
   * Finds matching candidate transactions for a bank feed line
   */
  static async findMatches(
    companyId: number,
    bankAccountId: number,
    txnDate: Date,
    amount: number, // Signed: positive = Money In, negative = Money Out
    description: string,
    reference?: string
  ): Promise<MatchCandidate[]> {
    const candidates: MatchCandidate[] = [];
    const isMoneyIn = amount > 0;
    const absAmount = Math.abs(amount);
    const dateWindowMs = 7 * 24 * 60 * 60 * 1000; // ±7 days

    const maxDate = new Date(txnDate.getTime() + dateWindowMs);

    // 1. If Money In -> Match Open Invoices (Receivables)
    if (isMoneyIn) {
      const invoices = await prisma.invoice.findMany({
        where: {
          companyId,
          balanceDue: { gt: 0 },
          date: { lte: maxDate },
        },
        take: 30,
      });

      const customerIds = Array.from(new Set(invoices.map((i) => i.customerId)));
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      });
      const customerMap = new Map(customers.map((c) => [c.id, c.name]));

      for (const inv of invoices) {
        let score = 0;
        const reasons: string[] = [];
        const customerName = customerMap.get(inv.customerId) || "";

        // Exact balance match
        if (Math.abs(Number(inv.balanceDue) - absAmount) < 0.05) {
          score += 55;
          reasons.push("Exact invoice balance match");
        } else if (absAmount < Number(inv.balanceDue)) {
          // Partial payment match
          score += 25;
          reasons.push("Partial invoice amount");
        }

        // Customer name in description
        if (customerName && description.toLowerCase().includes(customerName.toLowerCase().slice(0, 8))) {
          score += 25;
          reasons.push(`Customer '${customerName}' found in narration`);
        }

        // Invoice number in narration or reference
        if (description.includes(inv.invoiceNo) || (reference && reference.includes(inv.invoiceNo))) {
          score += 30;
          reasons.push(`Invoice #${inv.invoiceNo} cited in reference`);
        }

        // Date proximity
        const daysDiff = Math.abs((txnDate.getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24));
        if (daysDiff <= 5) {
          score += 15;
          reasons.push(`Date within ${Math.round(daysDiff)} days`);
        }

        if (score >= 40) {
          candidates.push({
            documentType: "INVOICE",
            documentId: inv.id,
            documentNumber: inv.invoiceNo,
            partyName: customerName || undefined,
            date: new Date(inv.date).toISOString().slice(0, 10),
            totalAmount: Number(inv.grandTotal),
            openBalance: Number(inv.balanceDue),
            confidence: Math.min(100, score),
            matchReason: reasons.join(" · "),
          });
        }
      }
    }

    // 2. If Money Out -> Match Open Bills (Payables)
    if (!isMoneyIn) {
      const bills = await prisma.bill.findMany({
        where: {
          companyId,
          balanceDue: { gt: 0 },
          date: { lte: maxDate },
        },
        take: 30,
      });

      const supplierIds = Array.from(new Set(bills.map((b) => b.supplierId)));
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { id: true, name: true },
      });
      const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

      for (const bill of bills) {
        let score = 0;
        const reasons: string[] = [];
        const supplierName = supplierMap.get(bill.supplierId) || "";

        if (Math.abs(Number(bill.balanceDue) - absAmount) < 0.05) {
          score += 55;
          reasons.push("Exact bill balance match");
        } else if (absAmount < Number(bill.balanceDue)) {
          score += 25;
          reasons.push("Partial bill amount");
        }

        if (supplierName && description.toLowerCase().includes(supplierName.toLowerCase().slice(0, 8))) {
          score += 25;
          reasons.push(`Supplier '${supplierName}' found in narration`);
        }

        if (description.includes(bill.billNo) || (reference && reference.includes(bill.billNo))) {
          score += 30;
          reasons.push(`Bill #${bill.billNo} cited in reference`);
        }

        const daysDiff = Math.abs((txnDate.getTime() - new Date(bill.date).getTime()) / (1000 * 3600 * 24));
        if (daysDiff <= 5) {
          score += 15;
          reasons.push(`Date within ${Math.round(daysDiff)} days`);
        }

        if (score >= 40) {
          candidates.push({
            documentType: "BILL",
            documentId: bill.id,
            documentNumber: bill.billNo,
            partyName: supplierName || undefined,
            date: new Date(bill.date).toISOString().slice(0, 10),
            totalAmount: Number(bill.grandTotal),
            openBalance: Number(bill.balanceDue),
            confidence: Math.min(100, score),
            matchReason: reasons.join(" · "),
          });
        }
      }
    }

    // 3. Own Contra Bank Transfer Detection
    const transferMirror = await prisma.bankFeedLine.findFirst({
      where: {
        companyId,
        bankAccountId: { not: bankAccountId },
        debit: isMoneyIn ? absAmount : 0,
        credit: isMoneyIn ? 0 : absAmount,
        txnDate: {
          gte: new Date(txnDate.getTime() - 3 * 86400 * 1000),
          lte: new Date(txnDate.getTime() + 3 * 86400 * 1000),
        },
      },
      include: { bankAccount: true },
    });

    if (transferMirror) {
      candidates.push({
        documentType: "CONTRA_TRANSFER",
        documentId: transferMirror.id,
        documentNumber: `XFER-${transferMirror.bankAccount.bankName}`,
        partyName: transferMirror.bankAccount.accountName || transferMirror.bankAccount.bankName,
        date: new Date(transferMirror.txnDate).toISOString().slice(0, 10),
        totalAmount: absAmount,
        openBalance: 0,
        confidence: 95,
        matchReason: `Paired transfer with ${transferMirror.bankAccount.bankName} (${transferMirror.bankAccount.accountNoMasked || ""})`,
      });
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }
}
