import React, { useState, useEffect } from "react";
import { fixedAssetService, FixedAssetItem } from "@/services/fixedAssetService";

interface DisposalWizardModalProps {
  isOpen: boolean;
  asset: FixedAssetItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DisposalWizardModal: React.FC<DisposalWizardModalProps> = ({
  isOpen,
  asset,
  onClose,
  onSuccess,
}) => {
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().slice(0, 10));
  const [disposalAmount, setDisposalAmount] = useState<number | "">(0);
  const [disposalReason, setDisposalReason] = useState<"SOLD" | "SCRAPPED" | "DESTROYED" | "DONATED">("SOLD");
  const [gstRate, setGstRate] = useState<number>(18);
  const [buyerPartyName, setBuyerPartyName] = useState("");
  const [disposalInvoiceNo, setDisposalInvoiceNo] = useState("");
  const [depreciateUpToDate, setDepreciateUpToDate] = useState(true);

  const [preview, setPreview] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && asset) {
      fetchPreview();
    }
  }, [isOpen, asset, disposalDate, disposalAmount, gstRate, depreciateUpToDate]);

  const fetchPreview = async () => {
    if (!asset) return;
    setLoadingPreview(true);
    setError(null);
    try {
      const data = await fixedAssetService.previewDisposal(asset.id, {
        disposalDate,
        disposalAmount: Number(disposalAmount) || 0,
        disposalReason,
        gstRate,
        depreciateUpToDate,
      });
      setPreview(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to calculate disposal preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmDisposal = async () => {
    if (!asset) return;
    setSaving(true);
    setError(null);
    try {
      await fixedAssetService.disposeAsset(asset.id, {
        disposalDate,
        disposalAmount: Number(disposalAmount) || 0,
        disposalReason,
        gstRate,
        buyerPartyName: buyerPartyName.trim() || undefined,
        disposalInvoiceNo: disposalInvoiceNo.trim() || undefined,
        depreciateUpToDate,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to dispose asset");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Dispose / Sell Asset ({asset.assetCode})
            </h2>
            <p className="text-xs text-slate-500">
              {asset.name} • Net Book Value: ₹{asset.currentBookValue.toLocaleString("en-IN")}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disposal Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={disposalReason}
                onChange={(e) => setDisposalReason(e.target.value as any)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="SOLD">Sold to Customer / Third Party</option>
                <option value="SCRAPPED">Scrapped (End of Life)</option>
                <option value="DESTROYED">Destroyed / Damaged</option>
                <option value="DONATED">Donated / Transferred</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disposal Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={disposalDate}
                onChange={(e) => setDisposalDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Realization / Sale Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={disposalAmount}
                onChange={(e) => setDisposalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GST Rate on Sale (%)
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="18">18% (Standard GST)</option>
                <option value="12">12%</option>
                <option value="5">5%</option>
                <option value="3">3% (Precious Metals)</option>
                <option value="0">0% (Nil / Exempt)</option>
              </select>
            </div>
          </div>

          {disposalReason === "SOLD" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Buyer Party Name
                </label>
                <input
                  type="text"
                  value={buyerPartyName}
                  onChange={(e) => setBuyerPartyName(e.target.value)}
                  placeholder="e.g. Scrap Buyer Ltd"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tax Invoice Number
                </label>
                <input
                  type="text"
                  value={disposalInvoiceNo}
                  onChange={(e) => setDisposalInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-DISP-001"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 text-xs text-slate-700">
            <input
              type="checkbox"
              id="interimDepr"
              checked={depreciateUpToDate}
              onChange={(e) => setDepreciateUpToDate(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="interimDepr" className="cursor-pointer">
              Automatically calculate pro-rata depreciation up to the disposal date
            </label>
          </div>

          {/* Financial Preview Card */}
          {preview && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Disposal Accounting & GST Impact
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">Net Book Value at Disposal:</div>
                <div className="text-right font-semibold text-slate-800">
                  ₹{preview.netBookValueAtDisposal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>

                <div className="text-slate-500">Sale Proceeds:</div>
                <div className="text-right font-semibold text-slate-800">
                  ₹{preview.disposalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>

                <div className="text-slate-500">GST on Sale ({preview.gstRate}%):</div>
                <div className="text-right font-semibold text-slate-800">
                  ₹{preview.gstOnSale.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>

                {preview.rule43ReversalAmount > 0 && (
                  <>
                    <div className="text-amber-700 font-medium">
                      Rule 43 ITC Reversal ({preview.rule43MonthsRemaining}m remaining):
                    </div>
                    <div className="text-right font-bold text-amber-700">
                      ₹{preview.rule43ReversalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </>
                )}

                <div className="border-t pt-2 text-slate-700 font-bold">
                  {preview.isProfit ? "Net Profit on Sale:" : "Net Loss on Disposal:"}
                </div>
                <div
                  className={`border-t pt-2 text-right font-black ${
                    preview.isProfit ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  ₹{Math.abs(preview.gainLoss).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-slate-50 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDisposal}
            disabled={saving || loadingPreview}
            className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm transition disabled:opacity-50"
          >
            {saving ? "Processing Disposal..." : "Confirm Disposal & Derecognize"}
          </button>
        </div>
      </div>
    </div>
  );
};
