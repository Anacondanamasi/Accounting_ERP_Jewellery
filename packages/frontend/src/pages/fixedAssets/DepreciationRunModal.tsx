import React, { useState, useEffect } from "react";
import { fixedAssetService } from "@/services/fixedAssetService";

interface DepreciationRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DepreciationRunModal: React.FC<DepreciationRunModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Default to current month start and end
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [periodStartDate, setPeriodStartDate] = useState(startOfMonth);
  const [periodEndDate, setPeriodEndDate] = useState(endOfMonth);
  const [frequency, setFrequency] = useState<"MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [remarks, setRemarks] = useState("");

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPreview(null);
      setError(null);
      fetchPreview();
    }
  }, [isOpen, periodStartDate, periodEndDate]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const data = await fixedAssetService.previewDepreciation({
        periodStartDate,
        periodEndDate,
        frequency,
      });
      setPreview(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to calculate depreciation preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePost = async () => {
    if (!preview || preview.lines.length === 0) {
      setError("No valid assets to depreciate");
      return;
    }

    setPosting(true);
    setError(null);
    try {
      await fixedAssetService.postDepreciation({
        periodStartDate,
        periodEndDate,
        frequency,
        remarks: remarks.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to post depreciation run");
    } finally {
      setPosting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Periodic Depreciation Run</h2>
            <p className="text-xs text-slate-500">
              Companies Act 2013 Schedule II • Automatic General Ledger Journal Posting
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {preview?.hasOverlapWarning && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              ⚠️ <strong>Warning:</strong> A depreciation run (
              <span className="font-mono">{preview.overlapRunNumber}</span>) already covers part of this
              period. Proceeding will post an additional run for the overlapping period.
            </div>
          )}

          {/* Period Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Period Start</label>
              <input
                type="date"
                value={periodStartDate}
                onChange={(e) => setPeriodStartDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Period End</label>
              <input
                type="date"
                value={periodEndDate}
                onChange={(e) => setPeriodEndDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Financial Year</label>
              <div className="py-1.5 px-3 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700">
                {preview?.financialYear || "..."}
              </div>
            </div>
          </div>

          {/* Summary KPIs */}
          {preview && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 text-center">
                <span className="block text-xs font-semibold text-indigo-600 uppercase">
                  Total Depreciation
                </span>
                <span className="text-2xl font-black text-indigo-900">
                  ₹{preview.totalDepreciation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 text-center">
                <span className="block text-xs font-semibold text-emerald-600 uppercase">
                  Assets to Depreciate
                </span>
                <span className="text-2xl font-black text-emerald-900">{preview.assetCount}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <span className="block text-xs font-semibold text-slate-500 uppercase">
                  Excluded / At Floor
                </span>
                <span className="text-2xl font-black text-slate-600">{preview.excludedCount}</span>
              </div>
            </div>
          )}

          {/* Asset Lines Table */}
          {preview && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Assets Included in Run ({preview.lines.length})
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-56">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100 font-semibold text-slate-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Asset Name</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Opening (₹)</th>
                      <th className="px-3 py-2 text-right">Depreciation (₹)</th>
                      <th className="px-3 py-2 text-right">Closing (₹)</th>
                      <th className="px-3 py-2 text-center">Days</th>
                      <th className="px-3 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {preview.lines.map((l: any, i: number) => (
                      <tr
                        key={i}
                        className={l.status === "EXCLUDED" ? "bg-slate-50 opacity-60" : "hover:bg-slate-50"}
                      >
                        <td className="px-3 py-2 font-mono font-medium text-slate-800">
                          {l.assetCode}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{l.assetName}</td>
                        <td className="px-3 py-2 text-slate-500">{l.categoryName}</td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          ₹{l.openingBookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-indigo-700">
                          ₹{l.depreciationAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          ₹{l.closingBookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500">{l.daysDepreciated}</td>
                        <td className="px-3 py-2 text-slate-400 text-[11px] truncate max-w-xs">
                          {l.remarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* General Ledger Journal Preview */}
          {preview && preview.journalPreview && preview.journalPreview.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                General Ledger Journal Preview (Balanced Entry)
              </h3>
              <div className="space-y-1">
                {preview.journalPreview.map((jp: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200"
                  >
                    <div>
                      <span className="font-semibold text-slate-700">Dr</span> Depreciation Expense (
                      {jp.categoryName}) &nbsp;•&nbsp;
                      <span className="font-semibold text-slate-700">Cr</span> Accumulated Depreciation
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      ₹{jp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Run Remarks / Narration
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Monthly books depreciation as per Companies Act 2013"
              className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Posting will atomically create the journal entry & update asset book values.
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={posting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePost}
              disabled={posting || loadingPreview || !preview || preview.lines.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition disabled:opacity-50"
            >
              {posting ? "Posting Journal..." : "Post Depreciation Run"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
