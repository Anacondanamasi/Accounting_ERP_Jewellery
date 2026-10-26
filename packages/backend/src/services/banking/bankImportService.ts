import ExcelJS from "exceljs";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { BankFormatDetector, type NormalizedBankRow } from "./bankFormatDetector";
import { BankRulesEngine } from "./bankRulesEngine";
import { BankMatchingEngine } from "./bankMatchingEngine";
import type { BankFeedSource, BankFeedSourceResult } from "./bankFeedSource";

export class BankImportService implements BankFeedSource {
  readonly sourceName = "TemplateImportSource";

  /**
   * Parse workbook or CSV into array of raw object rows
   */
  static async parseBufferToRows(buffer: Buffer, originalName: string): Promise<Record<string, any>[]> {
    const isCsv = originalName.toLowerCase().endsWith(".csv");

    if (isCsv) {
      const text = buffer.toString("utf8");
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return [];

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const rows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx] !== undefined ? cols[idx] : "";
        });
        rows.push(row);
      }
      return rows;
    }

    // Excel workbook parsing
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    // Prefer "Transactions" worksheet if available, else first worksheet
    const worksheet = workbook.getWorksheet("Transactions") || workbook.worksheets[0];
    if (!worksheet) return [];

    const rows: Record<string, any>[] = [];
    let headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      const values = (row.values as any[]).slice(1); // ExcelJS values are 1-indexed
      if (rowNumber === 1) {
        headers = values.map((v) => (v ? String(v).trim() : ""));
      } else {
        // Skip sample rows marked with [SAMPLE - DELETE]
        const rowObj: Record<string, any> = {};
        let isSample = false;
        headers.forEach((h, idx) => {
          const val = values[idx];
          if (typeof val === "string" && val.includes("[SAMPLE")) {
            isSample = true;
          }
          rowObj[h] = val !== undefined && val !== null ? val : "";
        });

        if (!isSample && Object.values(rowObj).some((v) => v !== "")) {
          rows.push(rowObj);
        }
      }
    });

    return rows;
  }

  /**
   * Main import pipeline conforming to BankFeedSource
   */
  async fetchOrImport(
    companyId: number,
    bankAccountId: number,
    payload: { buffer: Buffer; fileName: string; forceImportDuplicates?: boolean },
    actor: string
  ): Promise<BankFeedSourceResult> {
    const { buffer, fileName, forceImportDuplicates } = payload;
    const fileChecksum = crypto.createHash("sha256").update(buffer).digest("hex");

    const rawRows = await BankImportService.parseBufferToRows(buffer, fileName);
    if (!rawRows.length) {
      throw new Error("No data rows found in the uploaded statement file.");
    }

    const headers = Object.keys(rawRows[0] || {});
    const mapping = BankFormatDetector.detectMapping(headers);

    // Track occurrence of identical lines within the same uploaded statement
    const occurrenceTracker = new Map<string, number>();

    const normalizedRows: NormalizedBankRow[] = [];
    const errors: Array<{ row: number; error: string; raw: any }> = [];

    rawRows.forEach((raw, idx) => {
      const rowNum = idx + 2; // Row number in file
      try {
        const norm = BankFormatDetector.normalizeRow(raw, mapping);
        if (!norm) {
          errors.push({ row: rowNum, error: "Invalid date or missing amount/description", raw });
          return;
        }
        normalizedRows.push(norm);
      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || "Parse error", raw });
      }
    });

    if (!normalizedRows.length) {
      throw new Error(`Failed to parse transactions. ${errors.length} rows contained validation errors.`);
    }

    // Check running balance continuity if balance column is present
    let openingBal: number | undefined;
    let closingBal: number | undefined;

    const rowsWithBalance = normalizedRows.filter((r) => r.balance !== undefined);
    if (rowsWithBalance.length > 1) {
      openingBal = rowsWithBalance[0].balance! - rowsWithBalance[0].credit + rowsWithBalance[0].debit;
      closingBal = rowsWithBalance[rowsWithBalance.length - 1].balance;
    }

    // Process transactions & persist batch in database
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.bankImportBatch.create({
        data: {
          companyId,
          bankAccountId,
          fileName,
          fileChecksum,
          templateVersion: "v1",
          totalRows: rawRows.length,
          importedRows: 0,
          duplicateRows: 0,
          errorRows: errors.length,
          openingBalance: openingBal,
          closingBalance: closingBal,
          status: "COMPLETED",
          errorReportJson: errors.length ? JSON.stringify(errors) : null,
          importedBy: actor,
        },
      });

      let importedCount = 0;
      let duplicateCount = 0;

      for (const row of normalizedRows) {
        // Occurrence tracking for identical same-day lines
        const baseKey = `${row.date.toISOString().slice(0, 10)}:${row.amount}:${row.description.slice(0, 30)}`;
        const occurrences = occurrenceTracker.get(baseKey) || 0;
        occurrenceTracker.set(baseKey, occurrences + 1);

        const hash = BankFormatDetector.generateDedupeHash(
          companyId,
          bankAccountId,
          row.date,
          row.description,
          row.amount,
          row.reference,
          occurrences
        );

        // Check if line already exists
        const existing = await tx.bankFeedLine.findFirst({
          where: { companyId, bankAccountId, dedupeHash: hash },
        });

        if (existing && !forceImportDuplicates) {
          duplicateCount += 1;
          continue;
        }

        // Apply rules engine
        const ruleMatch = await BankRulesEngine.evaluateRules(
          companyId,
          bankAccountId,
          row.description,
          row.amount,
          row.reference
        );

        // Feed line lifecycle status
        let status = "FOR_REVIEW";
        let linkedTransactionId: number | undefined;
        let linkedTransactionType: string | undefined;

        // Create feed line
        const feedLine = await tx.bankFeedLine.create({
          data: {
            companyId,
            bankAccountId,
            batchId: batch.id,
            txnDate: row.date,
            valueDate: row.valueDate,
            descriptionRaw: row.description,
            descriptionNormalized: row.description.toLowerCase().trim(),
            reference: row.reference,
            payeeHint: row.payeeHint || ruleMatch?.targetPayee,
            debit: row.debit,
            credit: row.credit,
            amount: row.amount,
            runningBalance: row.balance,
            currency: "INR",
            dedupeHash: hash,
            status,
            source: "TEMPLATE_IMPORT",
            ruleId: ruleMatch?.ruleId || undefined,
            suggestedType: ruleMatch?.targetType || (row.amount > 0 ? "DEPOSIT" : "EXPENSE"),
            suggestedPayeeId: undefined,
            suggestedAccountId: ruleMatch?.targetAccountId || undefined,
            suggestedTaxRate: ruleMatch?.targetTaxRate !== undefined ? ruleMatch.targetTaxRate : row.taxRateHint,
            suggestedConfidence: ruleMatch ? 90 : 50,
            linkedTransactionId,
            linkedTransactionType,
            rawRowJson: JSON.stringify(row.raw),
            notes: row.memo || ruleMatch?.targetMemo,
          },
        });

        // Compute candidate matches in background/on-demand
        importedCount += 1;
      }

      await tx.bankImportBatch.update({
        where: { id: batch.id },
        data: {
          importedRows: importedCount,
          duplicateRows: duplicateCount,
        },
      });

      // Update bank account unreconciled count
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          unreconciledCount: { increment: importedCount },
          bankBalance: closingBal !== undefined ? closingBal : undefined,
        },
      });

      return {
        batchId: batch.id,
        totalRows: rawRows.length,
        importedRows: importedCount,
        duplicateRows: duplicateCount,
        errorRows: errors.length,
        openingBalance: openingBal,
        closingBalance: closingBal,
        errors,
      };
    });

    return result;
  }

  /**
   * Undoes an entire import batch if none of its lines are categorized/reconciled
   */
  static async undoImportBatch(companyId: number, batchId: number, actor: string): Promise<{ deletedLines: number }> {
    return prisma.$transaction(async (tx) => {
      const batch = await tx.bankImportBatch.findFirst({
        where: { id: batchId, companyId },
      });
      if (!batch) throw new Error("Import batch not found");

      // Verify no lines in batch have been categorized, reconciled, or matched
      const nonReviewCount = await tx.bankFeedLine.count({
        where: {
          batchId,
          status: { not: "FOR_REVIEW" },
        },
      });

      if (nonReviewCount > 0) {
        throw new Error(
          `Cannot undo batch: ${nonReviewCount} line(s) have already been categorized, matched, or reconciled. Undo those first.`
        );
      }

      const deleted = await tx.bankFeedLine.deleteMany({
        where: { batchId, companyId },
      });

      await tx.bankImportBatch.update({
        where: { id: batchId },
        data: { status: "UNDONE" },
      });

      await tx.bankAccount.update({
        where: { id: batch.bankAccountId },
        data: { unreconciledCount: { decrement: deleted.count } },
      });

      return { deletedLines: deleted.count };
    });
  }
}
