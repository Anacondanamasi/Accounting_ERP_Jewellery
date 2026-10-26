import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Printer,
  Copy,
  Download,
  ExternalLink,
  X,
  History,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  transactionJournalService,
  type TransactionJournalResult,
} from "@/services/transactionJournalService";

interface TransactionJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string; // "INVOICE", "BILL", "EXPENSE", "NOTE", "PAYMENT", "JOURNAL", "FEED_LINE"
  id: number | string;
  onOpenHistory?: () => void;
}

export const TransactionJournalModal = ({
  isOpen,
  onClose,
  type,
  id,
  onOpenHistory,
}: TransactionJournalModalProps) => {
  const navigate = useNavigate();
  const [selectedRevision, setSelectedRevision] = useState<number | undefined>(undefined);

  // Reset selected revision when id or type changes
  useEffect(() => {
    setSelectedRevision(undefined);
  }, [type, id]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["transaction-journal", type, id, selectedRevision],
    queryFn: () => transactionJournalService.getTransactionJournal(type, id, selectedRevision),
    enabled: isOpen && Boolean(id),
  });

  // Global keydown shortcut: Escape closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const copyAsText = () => {
    if (!data) return;
    const header = `Transaction Journal: ${data.transaction.type} ${data.transaction.documentNo}\nDate: ${formatDate(data.transaction.date)}\nParty: ${data.transaction.partyName || "—"}\n\n`;
    const rows = data.lines
      .map(
        (l) =>
          `Line ${l.lineNo}: [${l.accountCode}] ${l.accountName} | ${l.role} | Debit: ₹${l.debit.toFixed(2)} | Credit: ₹${l.credit.toFixed(2)}`
      )
      .join("\n");
    const totals = `\nTotal Debit: ₹${data.totals.debit.toFixed(2)} | Total Credit: ₹${data.totals.credit.toFixed(2)} (Balanced: ${data.totals.isBalanced ? "Yes" : "No"})`;

    navigator.clipboard.writeText(header + rows + totals);
    toast.success("Transaction journal copied to clipboard");
  };

  const exportCSV = () => {
    if (!data) return;
    const headers = "Line No,Account Code,Account Name,Role,Description,Party,Debit,Credit,Reconciled\n";
    const rows = data.lines
      .map(
        (l) =>
          `${l.lineNo},"${l.accountCode}","${l.accountName}","${l.role}","${l.narration || ""}","${l.partyName || ""}",${l.debit},${l.credit},${l.isReconciled ? "Yes" : "No"}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `journal_${data.transaction.type}_${data.transaction.documentNo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col rounded-card border border-border bg-card shadow-elevated animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-border bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sapphire/10 p-2 text-sapphire">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-charcoal">Transaction Journal</h2>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold uppercase text-charcoal">
                  {data?.transaction.type || type}
                </span>
                <span className="font-mono text-sm font-semibold text-sapphire">
                  {data?.transaction.documentNo || `#${id}`}
                </span>
              </div>
              <p className="text-xs text-muted">
                Stored double-entry General Ledger fact lines created by this transaction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenHistory();
                }}
              >
                <History className="mr-1.5 h-3.5 w-3.5" />
                Audit History
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded-btn p-1.5 text-muted hover:bg-slate-200 hover:text-charcoal transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* METADATA BAR & REVISION SELECTOR */}
        {data && (
          <div className="border-b border-border bg-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <div>
                <span className="text-muted">Date:</span>{" "}
                <strong className="text-charcoal">{formatDate(data.transaction.date)}</strong>
              </div>
              {data.transaction.partyName && (
                <div>
                  <span className="text-muted">Party:</span>{" "}
                  <strong className="text-charcoal">{data.transaction.partyName}</strong>
                  {data.transaction.partyGstin && (
                    <span className="ml-1 font-mono text-[11px] text-muted">
                      ({data.transaction.partyGstin})
                    </span>
                  )}
                </div>
              )}
              {data.transaction.placeOfSupply && (
                <div>
                  <span className="text-muted">POS:</span>{" "}
                  <strong className="text-charcoal">{data.transaction.placeOfSupply}</strong>
                </div>
              )}
              <div>
                <span className="text-muted">Status:</span>{" "}
                <span className="font-bold text-emerald-700">{data.transaction.status}</span>
              </div>
            </div>

            {/* REVISION SELECTOR */}
            {data.revisions.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted">Revision:</span>
                <select
                  className="rounded-input border border-border bg-white px-2 py-1 text-xs font-semibold text-charcoal outline-none focus:border-gold"
                  value={data.transaction.selectedRevision}
                  onChange={(e) => setSelectedRevision(Number(e.target.value))}
                >
                  {data.revisions.map((rev) => (
                    <option key={rev.revision} value={rev.revision}>
                      Rev {rev.revision} {rev.revision === data.transaction.currentRevision ? "(Current)" : "(Historical)"} - {formatDate(rev.date)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted">Loading stored ledger facts...</div>
          ) : isError || !data ? (
            <div className="rounded-card border border-crimson/20 bg-crimson/5 p-4 text-center text-sm text-crimson">
              Unable to load transaction journal.
            </div>
          ) : !data.isPostingDocument ? (
            /* NON-POSTING DOCUMENT BANNER */
            <div className="rounded-card border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-amber-900">No Accounting Effect</h3>
              <p className="max-w-md mx-auto text-sm text-amber-800">
                {data.nonPostingReason ||
                  "This is a non-posting document and does not generate double-entry General Ledger lines."}
              </p>
            </div>
          ) : (
            <>
              {/* JOURNAL LINES TABLE */}
              <div className="overflow-hidden rounded-card border border-border shadow-xs">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase text-muted">
                    <tr>
                      <th className="w-12 px-4 py-3 text-center">#</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Description / Narration</th>
                      <th className="px-4 py-3 text-right">Debit (₹)</th>
                      <th className="px-4 py-3 text-right">Credit (₹)</th>
                      <th className="w-20 px-4 py-3 text-center">Reconciled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {data.lines.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center font-mono text-xs text-muted">{l.lineNo}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/ledger/${l.accountId}`}
                            className="font-semibold text-sapphire hover:underline"
                            onClick={onClose}
                          >
                            {l.accountCode} · {l.accountName}
                          </Link>
                          <div className="text-[11px] text-muted">{l.accountType}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-charcoal">
                            {l.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-charcoal">
                          {l.narration || data.activeJournalEntry?.narration || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold">
                          {l.debit > 0 ? (
                            <span className="text-charcoal">{formatCurrency(l.debit)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold">
                          {l.credit > 0 ? (
                            <span className="text-charcoal">{formatCurrency(l.credit)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          {l.isReconciled ? (
                            <span
                              className="inline-flex items-center text-emerald-600 font-bold text-xs"
                              title={l.clearedAt ? `Cleared on ${formatDate(l.clearedAt)}` : "Reconciled"}
                            >
                              ✓
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* TOTALS FOOTER ROW */}
                  <tfoot className="border-t-2 border-border bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase text-muted">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-base text-charcoal">
                        {formatCurrency(data.totals.debit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-base text-charcoal">
                        {formatCurrency(data.totals.credit)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {data.totals.isBalanced ? (
                          <span className="text-emerald-600 text-xs font-bold">✓ Balanced</span>
                        ) : (
                          <span className="text-crimson text-xs font-bold">Diff!</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* BALANCE & INTEGRITY STRIP */}
              <div
                className={`flex items-center justify-between rounded-card border p-3.5 ${
                  data.totals.isBalanced
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-crimson/30 bg-crimson/10 text-crimson"
                }`}
              >
                <div className="flex items-center gap-2">
                  {data.totals.isBalanced ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-crimson" />
                  )}
                  <span className="text-sm font-semibold">
                    {data.totals.isBalanced
                      ? "Double-entry verified: Total debits equal total credits."
                      : `CRITICAL INTEGRITY WARNING: Entry is unbalanced by ${formatCurrency(data.totals.difference)}!`}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold">
                  Σ Dr {formatCurrency(data.totals.debit)} = Σ Cr {formatCurrency(data.totals.credit)}
                </div>
              </div>

              {/* REVERSAL ENTRIES (IF VOIDED) */}
              {data.reversalLines && data.reversalLines.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-crimson">
                    Void Reversal Entries
                  </h4>
                  <div className="overflow-hidden rounded-card border border-crimson/20 bg-crimson/5">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-crimson/10 text-crimson font-semibold">
                        <tr>
                          <th className="px-3 py-2">Account</th>
                          <th className="px-3 py-2">Role</th>
                          <th className="px-3 py-2 text-right">Debit (₹)</th>
                          <th className="px-3 py-2 text-right">Credit (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-crimson/10">
                        {data.reversalLines.map((rl) => (
                          <tr key={rl.id}>
                            <td className="px-3 py-2 font-medium">
                              {rl.accountCode} · {rl.accountName}
                            </td>
                            <td className="px-3 py-2 text-crimson font-bold">REVERSAL</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {rl.debit > 0 ? formatCurrency(rl.debit) : "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {rl.credit > 0 ? formatCurrency(rl.credit) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* RELATED TRANSACTIONS */}
              {data.relatedTransactions && data.relatedTransactions.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Related Transactions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.relatedTransactions.map((rt) => (
                      <div
                        key={rt.id}
                        className="flex items-center justify-between rounded-card border border-border p-2.5 bg-slate-50 text-xs"
                      >
                        <div>
                          <strong className="text-charcoal">{rt.type}: {rt.documentNo}</strong>
                          <div className="text-muted">{formatDate(rt.date)}</div>
                        </div>
                        <div className="text-right">
                          <strong className="text-sapphire font-mono">{formatCurrency(rt.amount)}</strong>
                          <div className="text-[11px] text-emerald-700">{rt.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between border-t border-border bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyAsText} disabled={!data?.isPostingDocument}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy Text
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data?.isPostingDocument}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!data?.isPostingDocument}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {data?.isPostingDocument && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/reports/journal?search=${data.transaction.documentNo}`);
                }}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open in Journal Report
              </Button>
            )}
            <Button onClick={onClose} size="sm" className="bg-sapphire text-white hover:bg-sapphire-dark">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
