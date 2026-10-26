import ExcelJS from "exceljs";
import { prisma } from "../../lib/prisma";

export class BankTemplateService {
  /**
   * Generates a fully styled and validated Excel (.xlsx) workbook for Bank Import Template v1
   */
  static async generateExcelTemplate(companyId: number, bankAccountId?: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HKS Jewellery Accounting ERP";
    workbook.lastModifiedBy = "HKS Banking System";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Fetch accounts and tax rates for the "Lists" sheet
    const accounts = await prisma.account.findMany({
      where: { companyId, isActive: true },
      select: { code: true, name: true, type: true },
      orderBy: { code: "asc" },
    });

    const bankAccount = bankAccountId
      ? await prisma.bankAccount.findFirst({ where: { id: bankAccountId, companyId } })
      : null;

    // -------------------------------------------------------------------------
    // SHEET 1: Instructions
    // -------------------------------------------------------------------------
    const instSheet = workbook.addWorksheet("Instructions", {
      properties: { tabColor: { argb: "FFC9922A" } },
      views: [{ showGridLines: true }],
    });

    instSheet.columns = [
      { width: 4 },
      { width: 28 },
      { width: 65 },
    ];

    instSheet.mergeCells("B2:C2");
    const titleCell = instSheet.getCell("B2");
    titleCell.value = "HKS Accounting — Bank Statement Import Template (v1.0)";
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1A1D23" } };

    instSheet.mergeCells("B3:C3");
    const subCell = instSheet.getCell("B3");
    subCell.value = bankAccount
      ? `Configured for: ${bankAccount.bankName} - ${bankAccount.accountName} (${bankAccount.accountNoMasked || bankAccount.ifsc})`
      : "Standard Bank Feed & Reconciliation Import Format";
    subCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF6B7280" } };

    const instructions = [
      ["1. Target Sheet", "Switch to the 'Transactions' sheet tab at the bottom to enter or paste your statement lines."],
      ["2. Column Headers", "Do NOT rename, reorder, or delete the column headers in Row 1 of the 'Transactions' sheet."],
      ["3. Dates", "Accepted formats: DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD. Dates must not be far in the future."],
      ["4. Debit vs Credit", "Enter positive values in 'Debit (Money Out)' OR 'Credit (Money In)'. Do not put negative numbers."],
      ["5. Signed Amount", "Alternatively, you can leave Debit/Credit empty and use the 'Amount' column (negative for Money Out, positive for Money In)."],
      ["6. Description", "Keep the exact bank narration text (UPI reference, NEFT/RTGS sender, ATM/POS remark, Cheque clearing)."],
      ["7. UTR / Cheque Ref", "Providing the UTR / Cheque reference ensures 100% duplicate protection and 1-click automatic matching."],
      ["8. Indian NetBanking Tips", "You can directly export Excel/CSV from HDFC, ICICI, SBI, Axis, or Kotak and paste relevant columns here."],
      ["9. Sample Data", "Rows 2 to 4 in the 'Transactions' sheet are sample rows. Please delete them before uploading."],
    ];

    let rowIdx = 5;
    for (const [step, desc] of instructions) {
      const stepCell = instSheet.getCell(`B${rowIdx}`);
      stepCell.value = step;
      stepCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFC9922A" } };

      const descCell = instSheet.getCell(`C${rowIdx}`);
      descCell.value = desc;
      descCell.font = { name: "Arial", size: 10, color: { argb: "FF374151" } };
      descCell.alignment = { wrapText: true };
      rowIdx += 1;
    }

    // -------------------------------------------------------------------------
    // SHEET 2: Transactions
    // -------------------------------------------------------------------------
    const txnSheet = workbook.addWorksheet("Transactions", {
      properties: { tabColor: { argb: "FF1E7B5E" } },
      views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
    });

    const headers = [
      { header: "Date", key: "date", width: 14 },
      { header: "Description", key: "description", width: 38 },
      { header: "Reference / UTR / Cheque No.", key: "reference", width: 26 },
      { header: "Debit (Money Out)", key: "debit", width: 18 },
      { header: "Credit (Money In)", key: "credit", width: 18 },
      { header: "Amount (Signed: -Out / +In)", key: "amount", width: 24 },
      { header: "Balance", key: "balance", width: 16 },
      { header: "Payee / Party Name", key: "payee", width: 22 },
      { header: "Value Date", key: "valueDate", width: 14 },
      { header: "Category / Account", key: "category", width: 24 },
      { header: "Tax Code / GST %", key: "taxRate", width: 16 },
      { header: "Memo / Notes", key: "memo", width: 28 },
    ];

    txnSheet.columns = headers;

    // Style the header row
    const headerRow = txnSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1A1D23" }, // Charcoal
      };
      cell.font = {
        name: "Arial",
        size: 10,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "medium", color: { argb: "FFC9922A" } },
      };
    });

    // 3 Sample Rows (clearly marked)
    const samples = [
      {
        date: "15/04/2025",
        description: "UPI/510523891045/Chai and Refreshment/paytm@icici [SAMPLE - DELETE]",
        reference: "UPI510523891045",
        debit: 150.0,
        credit: null,
        amount: -150.0,
        balance: 499850.0,
        payee: "Chai Point",
        valueDate: "15/04/2025",
        category: "Office Expenses",
        taxRate: "0%",
        memo: "Tea and snacks for client meeting",
      },
      {
        date: "16/04/2025",
        description: "NEFT-INW-AXISN09871234-SHREE JEWELLERS [SAMPLE - DELETE]",
        reference: "AXISN09871234",
        debit: null,
        credit: 75000.0,
        amount: 75000.0,
        balance: 574850.0,
        payee: "Shree Jewellers",
        valueDate: "16/04/2025",
        category: "Accounts Receivable",
        taxRate: "3%",
        memo: "Part payment for Invoice INV-2025-0012",
      },
      {
        date: "17/04/2025",
        description: "CONSOLIDATED CHRG INCL GST 18PCT CHG-APR25 [SAMPLE - DELETE]",
        reference: "CHG20250417",
        debit: 413.0,
        credit: null,
        amount: -413.0,
        balance: 574437.0,
        payee: "HDFC Bank",
        valueDate: "17/04/2025",
        category: "Bank Charges",
        taxRate: "18%",
        memo: "Monthly ledger folio charges with GST",
      },
    ];

    samples.forEach((sample) => {
      const row = txnSheet.addRow(sample);
      row.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF6B7280" } };
    });

    // Number formatting on amounts
    txnSheet.getColumn("debit").numFmt = "₹#,##0.00;[Red]-₹#,##0.00";
    txnSheet.getColumn("credit").numFmt = "₹#,##0.00;[Red]-₹#,##0.00";
    txnSheet.getColumn("amount").numFmt = "₹#,##0.00;[Red]-₹#,##0.00";
    txnSheet.getColumn("balance").numFmt = "₹#,##0.00;[Red]-₹#,##0.00";

    // -------------------------------------------------------------------------
    // SHEET 3: Lists (Dropdown references)
    // -------------------------------------------------------------------------
    const listSheet = workbook.addWorksheet("Lists", {
      properties: { tabColor: { argb: "FF64748B" } },
    });

    listSheet.columns = [
      { header: "Account Code", key: "code", width: 14 },
      { header: "Account Name", key: "name", width: 30 },
      { header: "GST Tax Code", key: "taxCode", width: 18 },
    ];

    const taxRates = [
      "No Tax (0%)",
      "GST 0.25%",
      "GST 3% (Jewellery)",
      "GST 5%",
      "GST 12%",
      "GST 18% (Services/Charges)",
      "GST 28%",
    ];

    accounts.forEach((acc, i) => {
      listSheet.addRow({
        code: acc.code,
        name: acc.name,
        taxCode: taxRates[i] || "",
      });
    });

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /**
   * Generates a plain CSV template matching the exact Transactions format
   */
  static generateCsvTemplate(): string {
    const headers = [
      "Date",
      "Description",
      "Reference / UTR / Cheque No.",
      "Debit (Money Out)",
      "Credit (Money In)",
      "Amount (Signed: -Out / +In)",
      "Balance",
      "Payee / Party Name",
      "Value Date",
      "Category / Account",
      "Tax Code / GST %",
      "Memo / Notes",
    ];

    const sampleRow1 = [
      "15/04/2025",
      "UPI/510523891045/Chai and Refreshment/paytm@icici [SAMPLE - DELETE]",
      "UPI510523891045",
      "150.00",
      "",
      "-150.00",
      "499850.00",
      "Chai Point",
      "15/04/2025",
      "Office Expenses",
      "0%",
      "Tea and snacks for client meeting",
    ];

    const sampleRow2 = [
      "16/04/2025",
      "NEFT-INW-AXISN09871234-SHREE JEWELLERS [SAMPLE - DELETE]",
      "AXISN09871234",
      "",
      "75000.00",
      "75000.00",
      "574850.00",
      "Shree Jewellers",
      "16/04/2025",
      "Accounts Receivable",
      "3%",
      "Part payment for Invoice INV-2025-0012",
    ];

    const escapeCsv = (val: string) => (val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val);

    return [
      headers.map(escapeCsv).join(","),
      sampleRow1.map(escapeCsv).join(","),
      sampleRow2.map(escapeCsv).join(","),
    ].join("\r\n");
  }
}
