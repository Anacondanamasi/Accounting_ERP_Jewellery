import { prisma } from "../../lib/prisma";

export interface JournalLineView {
  lineNo: number;
  id: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  role: string;
  narration?: string;
  partyName?: string;
  taxCode?: string;
  debit: number;
  credit: number;
  isReconciled: boolean;
  clearedAt?: string;
  costCentre?: string;
}

export interface TransactionJournalResult {
  transaction: {
    type: string;
    id: number;
    documentNo: string;
    date: string;
    partyName?: string;
    partyGstin?: string;
    placeOfSupply?: string;
    status: string;
    totalAmount: number;
    currentRevision: number;
    selectedRevision: number;
  };
  isPostingDocument: boolean;
  nonPostingReason?: string;
  revisions: Array<{
    revision: number;
    date: string;
    postedBy: string;
    status: string;
    journalEntryId: number;
  }>;
  activeJournalEntry?: {
    id: number;
    entryNo: string;
    date: string;
    narration: string;
    status: string;
    isReversal: boolean;
    reversalOf?: number | null;
  };
  lines: JournalLineView[];
  reversalLines?: JournalLineView[];
  totals: {
    debit: number;
    credit: number;
    isBalanced: boolean;
    difference: number;
  };
  relatedTransactions?: Array<{
    type: string;
    id: number;
    documentNo: string;
    date: string;
    amount: number;
    status: string;
  }>;
}

const classifyLineRole = (accountName: string, accountGroup: string, debit: number, credit: number): string => {
  const norm = `${accountName} ${accountGroup}`.toLowerCase();
  if (norm.includes("receivable") || norm.includes("debtor")) return "ACCOUNTS_RECEIVABLE";
  if (norm.includes("payable") || norm.includes("creditor")) return "ACCOUNTS_PAYABLE";
  if (norm.includes("output cgst") || norm.includes("cgst payable")) return "CGST_OUTPUT";
  if (norm.includes("output sgst") || norm.includes("sgst payable")) return "SGST_OUTPUT";
  if (norm.includes("output igst") || norm.includes("igst payable")) return "IGST_OUTPUT";
  if (norm.includes("input cgst") || norm.includes("cgst receivable")) return "CGST_INPUT";
  if (norm.includes("input sgst") || norm.includes("sgst receivable")) return "SGST_INPUT";
  if (norm.includes("input igst") || norm.includes("igst receivable")) return "IGST_INPUT";
  if (norm.includes("rcm")) return "RCM_TAX";
  if (norm.includes("cess")) return "GST_CESS";
  if (norm.includes("sales") || norm.includes("revenue")) return "SALES_REVENUE";
  if (norm.includes("cost of goods") || norm.includes("cogs") || norm.includes("purchase")) return "COGS";
  if (norm.includes("round off") || norm.includes("round-off")) return "ROUND_OFF";
  if (norm.includes("bank") || norm.includes("cash")) return "CASH_OR_BANK";
  if (debit > 0) return "EXPENSE_OR_ASSET";
  return "INCOME_OR_LIABILITY";
};

export class TransactionJournalService {
  static async getTransactionJournal(
    companyId: number,
    rawType: string,
    id: number,
    requestedRevision?: number
  ): Promise<TransactionJournalResult> {
    const type = rawType.toUpperCase().replace(/-/g, "_");

    // 1. Non-posting documents check
    if (type === "QUOTE" || type === "ESTIMATE") {
      return {
        transaction: {
          type,
          id,
          documentNo: `EST-${id}`,
          date: new Date().toISOString().slice(0, 10),
          status: "PENDING",
          totalAmount: 0,
          currentRevision: 1,
          selectedRevision: 1,
        },
        isPostingDocument: false,
        nonPostingReason: "Quotations/Estimates are non-posting planning documents. They have no accounting effect until converted into a Tax Invoice.",
        revisions: [],
        lines: [],
        totals: { debit: 0, credit: 0, isBalanced: true, difference: 0 },
      };
    }

    if (type === "PURCHASE_ORDER") {
      return {
        transaction: {
          type,
          id,
          documentNo: `PO-${id}`,
          date: new Date().toISOString().slice(0, 10),
          status: "PENDING",
          totalAmount: 0,
          currentRevision: 1,
          selectedRevision: 1,
        },
        isPostingDocument: false,
        nonPostingReason: "Purchase Orders are non-posting commitments. They have no accounting effect until converted into a Purchase Bill.",
        revisions: [],
        lines: [],
        totals: { debit: 0, credit: 0, isBalanced: true, difference: 0 },
      };
    }

    if (type === "DELIVERY_CHALLAN") {
      return {
        transaction: {
          type,
          id,
          documentNo: `DC-${id}`,
          date: new Date().toISOString().slice(0, 10),
          status: "DELIVERED",
          totalAmount: 0,
          currentRevision: 1,
          selectedRevision: 1,
        },
        isPostingDocument: false,
        nonPostingReason: "Delivery Challans track physical custody movement and do not create General Ledger entries.",
        revisions: [],
        lines: [],
        totals: { debit: 0, credit: 0, isBalanced: true, difference: 0 },
      };
    }

    // 2. Resolve sourceKey and fetch source entity details
    let sourceKey = `${type}:${id}`;
    let documentNo = `${type}-${id}`;
    let dateStr = new Date().toISOString().slice(0, 10);
    let partyName = "";
    let partyGstin = "";
    let placeOfSupply = "";
    let status = "POSTED";
    let totalAmount = 0;
    const relatedTransactions: TransactionJournalResult["relatedTransactions"] = [];

    if (type === "INVOICE") {
      const inv = await prisma.invoice.findFirst({
        where: { id, companyId },
        include: { customer: true, payments: true },
      });
      if (!inv) throw new Error("Invoice not found");
      documentNo = inv.invoiceNo;
      dateStr = new Date(inv.date).toISOString().slice(0, 10);
      partyName = inv.customer?.name || "";
      partyGstin = inv.customer?.gstin || "";
      placeOfSupply = (inv as any).placeOfSupply || inv.customer?.city || "";
      status = inv.status;
      totalAmount = Number(inv.grandTotal);

      for (const p of inv.payments) {
        relatedTransactions.push({
          type: "PAYMENT",
          id: p.id,
          documentNo: p.reference || `REC-${p.id}`,
          date: new Date(p.date).toISOString().slice(0, 10),
          amount: Number(p.amount),
          status: "APPLIED",
        });
      }
    } else if (type === "BILL") {
      const bill = await prisma.bill.findFirst({
        where: { id, companyId },
        include: { supplier: true },
      });
      if (!bill) throw new Error("Bill not found");
      documentNo = bill.billNo;
      dateStr = new Date(bill.date).toISOString().slice(0, 10);
      partyName = bill.supplier?.name || "";
      partyGstin = bill.supplier?.gstin || "";
      placeOfSupply = bill.supplier?.city || "";
      status = bill.status;
      totalAmount = Number(bill.grandTotal);
    } else if (type === "EXPENSE") {
      const exp = await prisma.journalEntry.findFirst({
        where: { id, companyId, type: { startsWith: "EXPENSE:" } },
      });
      if (exp) {
        sourceKey = exp.type!;
        documentNo = exp.entryNo;
        dateStr = new Date(exp.date).toISOString().slice(0, 10);
        status = exp.status;
      }
    } else if (type === "CREDIT_NOTE" || type === "DEBIT_NOTE" || type === "NOTE") {
      const note = await prisma.noteDocument.findFirst({
        where: { id, companyId },
        include: { customer: true, supplier: true },
      });
      if (!note) throw new Error("Note not found");
      sourceKey = `NOTE:${note.id}`;
      documentNo = note.noteNo;
      dateStr = new Date(note.date).toISOString().slice(0, 10);
      partyName = note.customer?.name || note.supplier?.name || "";
      partyGstin = note.customer?.gstin || note.supplier?.gstin || "";
      status = note.status;
      totalAmount = Number(note.grandTotal);
    } else if (type === "JOURNAL") {
      sourceKey = "MANUAL";
      const manual = await prisma.journalEntry.findFirst({
        where: { id, companyId },
      });
      if (!manual) throw new Error("Journal entry not found");
      documentNo = manual.entryNo;
      dateStr = new Date(manual.date).toISOString().slice(0, 10);
      status = manual.status;
    }

    // 3. Find matching JournalEntries
    let journalEntries = await prisma.journalEntry.findMany({
      where: {
        companyId,
        type: type === "JOURNAL" ? (null as any) : sourceKey,
        ...(type === "JOURNAL" ? { id } : {}),
      },
      include: {
        lines: {
          include: { entry: true },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });

    if (journalEntries.length === 0 && type === "JOURNAL") {
      journalEntries = await prisma.journalEntry.findMany({
        where: { id, companyId },
        include: { lines: { include: { entry: true }, orderBy: { id: "asc" } } },
      });
    }

    // If still no journal entry found, check if it's a new or unposted transaction
    if (journalEntries.length === 0) {
      return {
        transaction: {
          type,
          id,
          documentNo,
          date: dateStr,
          partyName,
          partyGstin,
          placeOfSupply,
          status,
          totalAmount,
          currentRevision: 1,
          selectedRevision: 1,
        },
        isPostingDocument: true,
        revisions: [],
        lines: [],
        totals: { debit: 0, credit: 0, isBalanced: true, difference: 0 },
      };
    }

    // 4. Map Revisions
    // Non-reversal entries form the revisions
    const revisionEntries = journalEntries.filter((je) => !je.reversalOf);
    const revisions = revisionEntries.map((je, idx) => ({
      revision: idx + 1,
      date: new Date(je.createdAt).toISOString(),
      postedBy: je.postedBy || je.createdBy || "System",
      status: je.status,
      journalEntryId: je.id,
    }));

    const currentRevision = revisions.length || 1;
    const selectedRev = requestedRevision && requestedRevision <= currentRevision ? requestedRevision : currentRevision;

    // Selected entry
    const activeEntry = revisionEntries[selectedRev - 1] || journalEntries[journalEntries.length - 1];

    // Find any reversal entry associated with activeEntry
    const reversalEntry = journalEntries.find((je) => je.reversalOf === activeEntry.id);

    // Fetch accounts metadata for all lines
    const accountIds = Array.from(
      new Set([
        ...activeEntry.lines.map((l) => l.accountId),
        ...(reversalEntry?.lines.map((l) => l.accountId) || []),
      ])
    );

    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds }, companyId },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Format active lines
    const lines: JournalLineView[] = activeEntry.lines.map((l, idx) => {
      const acc = accountMap.get(l.accountId);
      const accName = acc?.name || "General Ledger";
      const accGroup = acc?.group || "";
      const role = classifyLineRole(accName, accGroup, l.debit, l.credit);

      return {
        lineNo: idx + 1,
        id: l.id,
        accountId: l.accountId,
        accountCode: acc?.code || `${l.accountId}`,
        accountName: accName,
        accountType: acc?.type || "Asset",
        role,
        narration: l.narration || undefined,
        partyName: partyName || undefined,
        debit: Number(l.debit),
        credit: Number(l.credit),
        isReconciled: Boolean(l.reconciliationId),
        clearedAt: l.clearedAt ? new Date(l.clearedAt).toISOString().slice(0, 10) : undefined,
      };
    });

    // Format reversal lines if voided/reversed
    let reversalLines: JournalLineView[] | undefined = undefined;
    if (reversalEntry) {
      reversalLines = reversalEntry.lines.map((l, idx) => {
        const acc = accountMap.get(l.accountId);
        return {
          lineNo: idx + 1,
          id: l.id,
          accountId: l.accountId,
          accountCode: acc?.code || `${l.accountId}`,
          accountName: acc?.name || "General Ledger",
          accountType: acc?.type || "Asset",
          role: "REVERSAL",
          narration: l.narration || "Reversal entry",
          debit: Number(l.debit),
          credit: Number(l.credit),
          isReconciled: false,
        };
      });
    }

    // Totals calculation
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    const diff = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;

    return {
      transaction: {
        type,
        id,
        documentNo,
        date: dateStr,
        partyName,
        partyGstin,
        placeOfSupply,
        status,
        totalAmount,
        currentRevision,
        selectedRevision: selectedRev,
      },
      isPostingDocument: true,
      revisions,
      activeJournalEntry: {
        id: activeEntry.id,
        entryNo: activeEntry.entryNo,
        date: new Date(activeEntry.date).toISOString().slice(0, 10),
        narration: activeEntry.narration,
        status: activeEntry.status,
        isReversal: Boolean(activeEntry.reversalOf),
        reversalOf: activeEntry.reversalOf,
      },
      lines,
      reversalLines,
      totals: {
        debit: Math.round(totalDebit * 100) / 100,
        credit: Math.round(totalCredit * 100) / 100,
        isBalanced: diff < 0.01,
        difference: diff,
      },
      relatedTransactions,
    };
  }
}
