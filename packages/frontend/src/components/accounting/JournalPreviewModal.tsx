import React from "react";
import { formatCurrency } from "@/lib/formatters";
import { CheckCircle2, AlertCircle, FileText, X } from "lucide-react";

export interface JournalPreviewLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  group: string;
  debit: number;
  credit: number;
  narration?: string;
}

export interface JournalPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: string;
  documentNo: string;
  posDescription?: string;
  supplyType?: string;
  lines: JournalPreviewLine[];
  taxSummary?: {
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    taxTotal: number;
    roundOff: number;
    grandTotal: number;
  };
}

export const JournalPreviewModal: React.FC<JournalPreviewModalProps> = ({
  isOpen,
  onClose,
  documentType,
  documentNo,
  posDescription,
  supplyType,
  lines,
  taxSummary,
}) => {
  if (!isOpen) return null;

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.05;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-xl border border-white/10 bg-[#161a23] p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Live Accounting Journal Preview ({documentType})
              </h2>
              <p className="text-xs text-white/60">
                Double-entry GST effect for document #{documentNo || "DRAFT"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status bar */}
        <div className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white/70">Place of Supply:</span>
            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-sky-400">
              {posDescription || "Intra-State (CGST + SGST)"}
            </span>
            {supplyType && (
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-purple-400">
                {supplyType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <span className="flex items-center gap-1 font-medium text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Balanced: Debits = Credits
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-rose-400">
                <AlertCircle className="h-4 w-4" /> Discrepancy: Diff ={" "}
                {formatCurrency(Math.abs(totalDebit - totalCredit))}
              </span>
            )}
          </div>
        </div>

        {/* Journal Lines Table */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#1e2430] text-xs font-semibold uppercase tracking-wider text-white/60">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Account / Ledger</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5 text-right">Debit (₹)</th>
                <th className="px-4 py-2.5 text-right">Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {lines.map((l, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2 font-medium text-gold">{l.accountCode}</td>
                  <td className="px-4 py-2 font-sans text-white">
                    <div>{l.accountName}</div>
                    {l.narration && (
                      <div className="text-[11px] text-white/40">{l.narration}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-sans text-white/50">{l.group}</td>
                  <td className="px-4 py-2 text-right font-medium text-emerald-400">
                    {l.debit > 0 ? formatCurrency(l.debit) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-sky-400">
                    {l.credit > 0 ? formatCurrency(l.credit) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-white/20 bg-[#1e2430] font-mono text-xs font-bold text-white">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 font-sans uppercase">
                  Total
                </td>
                <td className="px-4 py-2.5 text-right text-emerald-400">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-4 py-2.5 text-right text-sky-400">
                  {formatCurrency(totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Tax Summary Breakdown */}
        {taxSummary && (
          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs md:grid-cols-4">
            <div>
              <span className="text-white/50">Taxable Value:</span>
              <div className="font-mono font-semibold text-white">
                {formatCurrency(taxSummary.taxableAmount)}
              </div>
            </div>
            <div>
              <span className="text-white/50">CGST + SGST:</span>
              <div className="font-mono font-semibold text-white">
                {formatCurrency(taxSummary.cgst + taxSummary.sgst)}
              </div>
            </div>
            <div>
              <span className="text-white/50">IGST:</span>
              <div className="font-mono font-semibold text-white">
                {formatCurrency(taxSummary.igst)}
              </div>
            </div>
            <div>
              <span className="text-white/50">Total Invoice Value:</span>
              <div className="font-mono font-bold text-gold">
                {formatCurrency(taxSummary.grandTotal)}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/20"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
