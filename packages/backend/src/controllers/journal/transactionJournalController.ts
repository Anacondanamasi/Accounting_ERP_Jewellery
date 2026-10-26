import type { Request, Response } from "express";
import { ok, fail } from "../../lib/apiResponse";
import { getCompanyId } from "../../lib/requestUtils";
import { TransactionJournalService } from "../../services/journal/transactionJournalService";
import { BulkJournalReportService } from "../../services/journal/bulkJournalReportService";

export const getTransactionJournal = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  const { type, id } = req.params;
  const revision = req.query.revision ? Number(req.query.revision) : undefined;

  const numId = Number(id);
  if (isNaN(numId)) {
    return fail(res, 400, "INVALID_ID", "Transaction ID must be a number");
  }

  try {
    const journal = await TransactionJournalService.getTransactionJournal(
      companyId,
      type,
      numId,
      revision
    );
    return ok(res, journal);
  } catch (err: any) {
    return fail(res, 404, "JOURNAL_NOT_FOUND", err.message || "Failed to load transaction journal");
  }
};

export const getBulkJournalReport = async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);

  const { from, to, types, accountId, partyName, status, cursor, limit } = req.query;

  try {
    const report = await BulkJournalReportService.getJournalReport(companyId, {
      from: from ? String(from) : undefined,
      to: to ? String(to) : undefined,
      types: types ? String(types).split(",") : undefined,
      accountId: accountId ? Number(accountId) : undefined,
      partyName: partyName ? String(partyName) : undefined,
      status: status ? String(status) : undefined,
      cursor: cursor ? Number(cursor) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return ok(res, report);
  } catch (err: any) {
    return fail(res, 500, "REPORT_ERROR", err.message || "Failed to generate journal report");
  }
};
