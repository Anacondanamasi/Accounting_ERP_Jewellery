import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  transactionJournalService,
  type BulkJournalEntry,
} from "@/services/transactionJournalService";
import { TransactionJournalModal } from "@/components/shared/TransactionJournalModal";

export const JournalReportPage = () => {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("POSTED");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Inspection Modal State
  const [journalModal, setJournalModal] = useState<{
    isOpen: boolean;
    type: string;
    id: number;
  }>({
    isOpen: false,
    type: "INVOICE",
    id: 0,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["journal-report", from, to, search, status, typeFilter],
    queryFn: () =>
      transactionJournalService.getJournalReport({
        from,
        to,
        partyName: search || undefined,
        status: status !== "ALL" ? status : undefined,
        types: typeFilter !== "ALL" ? [typeFilter] : undefined,
      }),
  });

  const entries = data?.entries || [];

  const exportCSV = () => {
    if (!entries.length) return;
    const headers = "Date,Entry No,Type,Source ID,Narration,Account Code,Account Name,Debit,Credit\n";
    const rows = entries.flatMap((e) =>
      e.lines.map(
        (l) =>
          `"${e.date}","${e.entryNo}","${e.sourceType}",${e.sourceId},"${e.narration}","${l.accountCode}","${l.accountName}",${l.debit},${l.credit}`
      )
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `journal_report_${from}_to_${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Journal Report"
        subtitle="Chronological General Ledger journal entries across all business transactions"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!entries.length}>
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!entries.length}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
          </div>
        }
      />

      {/* FILTER TOOLBAR */}
      <div className="rounded-card border border-border bg-card p-4 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted">From:</label>
            <Input
              type="date"
              className="h-9 w-38 text-xs"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted">To:</label>
            <Input
              type="date"
              className="h-9 w-38 text-xs"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted">Type:</label>
            <select
              className="h-9 rounded-btn border border-border bg-white px-2.5 text-xs font-semibold text-charcoal outline-none"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="INVOICE">Invoices</option>
              <option value="BILL">Bills</option>
              <option value="EXPENSE">Expenses</option>
              <option value="NOTE">Credit / Debit Notes</option>
              <option value="PAYMENT">Payments</option>
              <option value="JOURNAL">Manual Journals</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted">Status:</label>
            <select
              className="h-9 rounded-btn border border-border bg-white px-2.5 text-xs font-semibold text-charcoal outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="POSTED">Posted Only</option>
              <option value="VOID">Void Only</option>
            </select>
          </div>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <Input
            placeholder="Search narration / party..."
            className="h-9 pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* SUMMARY STRIP */}
      {data && (
        <div className="rounded-card border border-border bg-card p-4 shadow-card grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="px-2">
            <span className="text-xs font-semibold text-muted uppercase">Transactions</span>
            <div className="mt-1 text-2xl font-bold text-charcoal">{entries.length}</div>
            <p className="text-[11px] text-muted">Journal vouchers in period</p>
          </div>

          <div className="px-4">
            <span className="text-xs font-semibold text-muted uppercase">Total Debits</span>
            <div className="mt-1 text-2xl font-bold font-mono text-charcoal">
              {formatCurrency(data.totalDebit)}
            </div>
            <p className="text-[11px] text-muted">Sum of all debit lines</p>
          </div>

          <div className="px-4">
            <span className="text-xs font-semibold text-muted uppercase">Total Credits</span>
            <div className="mt-1 text-2xl font-bold font-mono text-charcoal">
              {formatCurrency(data.totalCredit)}
            </div>
            <p className="text-[11px] text-muted">Sum of all credit lines</p>
          </div>

          <div className="px-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-muted uppercase">Trial Balance Tie-Back</span>
            <div className="mt-1 flex items-center gap-1.5">
              {data.isBalanced ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-base font-bold text-emerald-800">Balanced ✓</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-crimson" />
                  <span className="text-base font-bold text-crimson">Unbalanced Diff</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted">Debits equal Credits perfectly</p>
          </div>
        </div>
      )}

      {/* JOURNAL ENTRIES LIST */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-card border border-border bg-card p-12 text-center text-sm text-muted">
            Generating Journal Report...
          </div>
        ) : isError ? (
          <div className="rounded-card border border-crimson/20 bg-crimson/5 p-4 text-center text-sm text-crimson">
            Failed to load journal report.
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-card border border-border bg-card p-12 text-center text-sm text-muted">
            No journal entries found for the selected dates and filters.
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="overflow-hidden rounded-card border border-border bg-card shadow-card"
            >
              {/* ENTRY HEADER */}
              <div className="flex flex-wrap items-center justify-between border-b border-border bg-slate-50 px-4 py-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-charcoal">{formatDate(entry.date)}</span>
                  <span className="font-mono font-bold text-sapphire">{entry.entryNo}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-charcoal">
                    {entry.sourceType}
                  </span>
                  <span className="text-muted line-clamp-1 max-w-md">{entry.narration}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted">
                    Dr {formatCurrency(entry.debitTotal)} · Cr {formatCurrency(entry.creditTotal)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 text-sapphire hover:bg-sapphire/10"
                    onClick={() =>
                      setJournalModal({
                        isOpen: true,
                        type: entry.sourceType,
                        id: entry.sourceId,
                      })
                    }
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Transaction Journal
                  </Button>
                </div>
              </div>

              {/* ENTRY LINES TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-slate-100/50 text-[11px] uppercase font-semibold text-muted">
                    <tr>
                      <th className="w-10 px-4 py-2 text-center">#</th>
                      <th className="px-4 py-2">Account</th>
                      <th className="px-4 py-2">Description / Memo</th>
                      <th className="px-4 py-2 text-right">Debit (₹)</th>
                      <th className="px-4 py-2 text-right">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entry.lines.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-center font-mono text-muted">{l.lineNo}</td>
                        <td className="px-4 py-2">
                          <Link
                            to={`/ledger/${l.accountId}`}
                            className="font-medium text-sapphire hover:underline"
                          >
                            {l.accountCode} · {l.accountName}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-muted">{l.narration || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-mono font-medium">
                          {l.debit > 0 ? formatCurrency(l.debit) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-mono font-medium">
                          {l.credit > 0 ? formatCurrency(l.credit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* TRANSACTION JOURNAL MODAL */}
      <TransactionJournalModal
        isOpen={journalModal.isOpen}
        onClose={() => setJournalModal((prev) => ({ ...prev, isOpen: false }))}
        type={journalModal.type}
        id={journalModal.id}
      />
    </div>
  );
};
