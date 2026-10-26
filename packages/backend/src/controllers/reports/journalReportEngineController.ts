import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { ok, created, fail } from "../../lib/apiResponse";
import { getCompanyId, getUserId } from "../../lib/requestUtils";
import { JournalReportEngineService } from "../../services/reports/engine/journalReportEngineService";
import { JOURNAL_FIELD_CATALOG } from "../../services/reports/engine/reportFieldCatalog";
import { CustomReportService } from "../../services/reports/customReportService";
import {
  generateCsv,
  generateExcel,
  generatePdf,
  getCompanyInfo,
  type ExportDataPayload,
} from "../../services/reportExportService";
import { AuditService } from "../../services/audit/auditService";

export const runJournalReport = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const payload = { ...req.body, companyId };
    const result = await JournalReportEngineService.runReport(payload);
    return ok(res, result);
  } catch (error: any) {
    return fail(res, 400, "REPORT_EXECUTION_ERROR", error.message || "Failed to execute journal report");
  }
};

export const getJournalFieldCatalog = async (_req: Request, res: Response) => {
  return ok(res, Object.values(JOURNAL_FIELD_CATALOG));
};

export const exportJournalReport = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const format = String(req.body.format || "excel").toLowerCase();
    const payload = { ...req.body, companyId, limit: 1000 };

    const data = await JournalReportEngineService.runReport(payload);
    const companyInfo = await getCompanyInfo(companyId);

    // Audit export
    await AuditService.recordEvent(prisma, {
      companyId,
      actor: { id: userId, name: userId, type: "USER" },
      eventType: "REPORT_EXPORTED",
      entityType: "REPORT",
      entityId: "transaction-journal",
      summary: `Exported Transaction Journal report (${format.toUpperCase()}) for period ${data.periodLabel}`,
      after: { format, periodLabel: data.periodLabel, rowsCount: data.grandTotals.lineCount },
    });

    const headers = [
      "Date",
      "Voucher No",
      "Type",
      "Narration",
      "Account Code",
      "Account Name",
      "Debit",
      "Credit",
      "Status",
    ];

    const rows: Array<Array<string | number>> = [];
    if (data.blocks) {
      for (const block of data.blocks) {
        for (const line of block.lines) {
          rows.push([
            line.date,
            line.entryNo,
            line.displayVoucherType,
            line.narration || "",
            line.accountCode,
            line.accountName,
            line.debit,
            line.credit,
            line.status,
          ]);
        }
      }
    } else if (data.flatLines) {
      for (const line of data.flatLines) {
        rows.push([
          line.date,
          line.entryNo,
          line.displayVoucherType,
          line.narration || "",
          line.accountCode,
          line.accountName,
          line.debit,
          line.credit,
          line.status,
        ]);
      }
    }

    const exportPayload: ExportDataPayload = {
      company: companyInfo,
      meta: {
        title: data.title,
        periodLabel: data.periodLabel,
        filenamePeriod: `${data.from}_to_${data.to}`,
        generatedAt: new Date(),
      },
      headers,
      alignments: ["left", "left", "left", "left", "left", "left", "right", "right", "center"],
      rows,
      summaryRows: [
        [
          "Grand Total",
          "",
          "",
          "",
          "",
          "",
          data.grandTotals.totalDebit,
          data.grandTotals.totalCredit,
          data.grandTotals.isBalanced ? "Balanced ✓" : "Imbalance ⚠",
        ],
      ],
      note: data.grandTotals.isBalanced ? "Balanced Double-Entry Books" : "Imbalance detected",
    };

    if (format === "csv") {
      const buffer = generateCsv(exportPayload);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="journal_${data.from}_${data.to}.csv"`);
      return res.send(buffer);
    }

    if (format === "pdf") {
      const buffer = await generatePdf(exportPayload);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="journal_${data.from}_${data.to}.pdf"`);
      return res.send(buffer);
    }

    // Default: Excel
    const buffer = await generateExcel(exportPayload);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="journal_${data.from}_${data.to}.xlsx"`);
    return res.send(buffer);
  } catch (error: any) {
    return fail(res, 500, "EXPORT_ERROR", error.message || "Failed to generate report export");
  }
};

export const listCustomReports = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const reports = await CustomReportService.listCustomReports(companyId, userId);
    return ok(res, reports);
  } catch (error: any) {
    return fail(res, 500, "FETCH_ERROR", error.message);
  }
};

export const saveCustomReport = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const result = await CustomReportService.saveReport(companyId, userId, req.body);
    return created(res, result, "Custom report saved");
  } catch (error: any) {
    return fail(res, 400, "SAVE_ERROR", error.message);
  }
};

export const updateCustomReport = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const reportId = Number(req.params.id);
    const result = await CustomReportService.updateReport(companyId, reportId, userId, req.body);
    return ok(res, result, "Custom report updated");
  } catch (error: any) {
    return fail(res, 400, "UPDATE_ERROR", error.message);
  }
};

export const deleteCustomReport = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const reportId = Number(req.params.id);
    await CustomReportService.deleteReport(companyId, reportId);
    return ok(res, null, "Custom report deleted");
  } catch (error: any) {
    return fail(res, 400, "DELETE_ERROR", error.message);
  }
};

export const listReportFolders = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const folders = await CustomReportService.listFolders(companyId);
    return ok(res, folders);
  } catch (error: any) {
    return fail(res, 500, "FETCH_ERROR", error.message);
  }
};

export const createReportFolder = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const folder = await CustomReportService.createFolder(companyId, userId, req.body.name);
    return created(res, folder, "Report folder created");
  } catch (error: any) {
    return fail(res, 400, "CREATE_ERROR", error.message);
  }
};
