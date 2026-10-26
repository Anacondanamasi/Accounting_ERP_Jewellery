import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fixedAssetService, FixedAssetItem } from "@/services/fixedAssetService";
import { DisposalWizardModal } from "./DisposalWizardModal";
import { EntityHistoryDrawer } from "@/components/shared/EntityHistoryDrawer";
import { TransactionJournalModal } from "@/components/shared/TransactionJournalModal";

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<FixedAssetItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "COMPONENTS" | "DEPRECIATION" | "EVENTS" | "VERIFICATION"
  >("OVERVIEW");

  // Modals
  const [isDisposalOpen, setIsDisposalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [journalTarget, setJournalTarget] = useState<{ type: string; id: number | string }>({
    type: "JOURNAL",
    id: 0,
  });

  // Physical Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifiedBy, setVerifiedBy] = useState("");
  const [verifyStatus, setVerifyStatus] = useState("FOUND_VERIFIED");
  const [locationObserved, setLocationObserved] = useState("");
  const [conditionScore, setConditionScore] = useState(5);
  const [verifyRemarks, setVerifyRemarks] = useState("");
  const [savingVerify, setSavingVerify] = useState(false);

  useEffect(() => {
    if (id) {
      loadAsset();
    }
  }, [id]);

  // Global keyboard shortcuts (Ctrl+J for journal, Alt+H for history)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setIsHistoryOpen(true);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "j" && asset?.disposalJournalId) {
        e.preventDefault();
        setJournalTarget({ type: "JOURNAL", id: asset.disposalJournalId });
        setIsJournalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset]);

  const loadAsset = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fixedAssetService.getById(id!);
      setAsset(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load asset details");
    } finally {
      setLoading(false);
    }
  };

  const handleCwipCapitalize = async () => {
    if (!asset || !window.confirm("Capitalize this CWIP asset to Active status?")) return;
    try {
      await fixedAssetService.capitalizeCwip(asset.id);
      loadAsset();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to capitalize");
    }
  };

  const handleUndoDisposal = async () => {
    if (!asset || !window.confirm("Undo disposal and restore asset to Active status?")) return;
    try {
      await fixedAssetService.undoDisposal(asset.id);
      loadAsset();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to undo disposal");
    }
  };

  const handleRecordVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !verifiedBy.trim()) return;
    setSavingVerify(true);
    try {
      await fixedAssetService.recordVerification(asset.id, {
        verificationDate: new Date(),
        verifiedBy: verifiedBy.trim(),
        status: verifyStatus,
        locationObserved: locationObserved.trim() || undefined,
        conditionScore: Number(conditionScore),
        remarks: verifyRemarks.trim() || undefined,
      });
      setIsVerifyModalOpen(false);
      setVerifiedBy("");
      setVerifyRemarks("");
      loadAsset();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to save verification");
    } finally {
      setSavingVerify(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">Loading asset details...</div>
    );
  }

  if (error || !asset) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
          <h2 className="text-lg font-bold">Error Loading Fixed Asset</h2>
          <p className="mt-1 text-sm">{error || "Asset not found"}</p>
          <button
            onClick={() => navigate("/assets")}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
          >
            ← Back to Asset Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <Link to="/assets" className="hover:text-indigo-600 transition">
          Fixed Assets
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-800 font-semibold">{asset.assetCode}</span>
      </div>

      {/* Asset Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900">{asset.name}</h1>
              {asset.status === "ACTIVE" && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active
                </span>
              )}
              {asset.status === "CWIP" && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  CWIP
                </span>
              )}
              {asset.status === "DISPOSED" && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                  Disposed ({asset.disposalReason})
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>
                Code: <strong className="font-mono text-slate-700">{asset.assetCode}</strong>
              </span>
              <span>•</span>
              <span>
                Category: <strong className="text-slate-700">{asset.category?.name}</strong>
              </span>
              <span>•</span>
              <span>
                Statutory Block:{" "}
                <strong className="text-slate-700">
                  {asset.taxBlock?.name || "General (15%)"}
                </strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition flex items-center space-x-1"
              title="Audit History (Alt+H)"
            >
              <span>🕒 History</span>
              <kbd className="hidden md:inline px-1 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded font-mono">
                Alt+H
              </kbd>
            </button>

            {asset.disposalJournalId && (
              <button
                onClick={() => {
                  setJournalTarget({ type: "JOURNAL", id: asset.disposalJournalId! });
                  setIsJournalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm hover:bg-indigo-100 transition flex items-center space-x-1"
                title="Transaction Journal (Ctrl+J)"
              >
                <span>📖 Journal</span>
                <kbd className="hidden md:inline px-1 py-0.5 text-[9px] bg-indigo-200/60 text-indigo-800 rounded font-mono">
                  Ctrl+J
                </kbd>
              </button>
            )}

            {asset.supplierBillId && (
              <button
                onClick={() => {
                  setJournalTarget({ type: "BILL", id: asset.supplierBillId! });
                  setIsJournalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
              >
                🧾 Supplier Bill Journal
              </button>
            )}

            <button
              onClick={() => setIsVerifyModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
            >
              🔍 Verify
            </button>

            {asset.status === "CWIP" && (
              <button
                onClick={handleCwipCapitalize}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg shadow hover:bg-amber-700 transition"
              >
                ⚡ Capitalize to Active
              </button>
            )}

            {asset.status === "ACTIVE" && (
              <button
                onClick={() => setIsDisposalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-lg shadow hover:bg-rose-700 transition"
              >
                Dispose / Sell
              </button>
            )}

            {asset.status === "DISPOSED" && (
              <button
                onClick={handleUndoDisposal}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
              >
                ↺ Undo Disposal
              </button>
            )}
          </div>
        </div>

        {/* 5 Financial Metric Blocks */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 border-t pt-4">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">
              Capitalized Cost
            </span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              ₹{asset.originalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">
              Accumulated Depr.
            </span>
            <span className="text-lg font-bold text-indigo-600 font-mono">
              ₹{asset.accumulatedDep.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-emerald-700 uppercase">
              Net Book Value (NBV)
            </span>
            <span className="text-lg font-black text-emerald-800 font-mono">
              ₹{asset.currentBookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">
              Residual Floor (5%)
            </span>
            <span className="text-lg font-bold text-slate-700 font-mono">
              ₹{asset.salvageValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">
              Life / Method
            </span>
            <span className="text-base font-bold text-slate-800">
              {asset.usefulLifeYears}y • {asset.depreciationMethod}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-xs font-semibold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "OVERVIEW"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Overview & Masters
          </button>
          <button
            onClick={() => setActiveTab("COMPONENTS")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "COMPONENTS"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Components & GST ({asset.costComponents?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("DEPRECIATION")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "DEPRECIATION"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Depreciation Schedule ({asset.depreciationLines?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("EVENTS")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "EVENTS"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Lifecycle Events ({asset.events?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("VERIFICATION")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "VERIFICATION"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Physical Verification ({asset.verifications?.length || 0})
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Asset Attributes & Tracking
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="text-slate-500">Location / Branch:</div>
              <div className="font-semibold text-slate-800">{asset.location || "—"}</div>

              <div className="text-slate-500">Department:</div>
              <div className="font-semibold text-slate-800">{asset.department || "—"}</div>

              <div className="text-slate-500">Custodian / Owner:</div>
              <div className="font-semibold text-slate-800">{asset.custodian || "—"}</div>

              <div className="text-slate-500">Serial No / Model:</div>
              <div className="font-mono text-slate-800">{asset.serialNo || "—"}</div>

              <div className="text-slate-500">Barcode / RFID Tag:</div>
              <div className="font-mono text-slate-800">{asset.barcodeOrTag || "—"}</div>

              <div className="text-slate-500">Date of Purchase:</div>
              <div className="font-semibold text-slate-800">
                {new Date(asset.dateOfPurchase).toLocaleDateString("en-IN")}
              </div>

              <div className="text-slate-500">Date Put to Use:</div>
              <div className="font-semibold text-slate-800">
                {new Date(asset.datePutToUse).toLocaleDateString("en-IN")}
              </div>

              {asset.capitalizedAt && (
                <>
                  <div className="text-slate-500">Capitalized from CWIP on:</div>
                  <div className="font-semibold text-slate-800">
                    {new Date(asset.capitalizedAt).toLocaleDateString("en-IN")}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Statutory & General Ledger Mapping
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="text-slate-500">Schedule II Class:</div>
              <div className="font-semibold text-slate-800">
                {asset.category?.scheduleIIClass || "General Class"}
              </div>

              <div className="text-slate-500">Tax Block (Income-tax Act):</div>
              <div className="font-semibold text-slate-800">
                {asset.taxBlock?.name || "Plant & Machinery (15%)"}
              </div>

              <div className="text-slate-500">Statutory Tax Rate:</div>
              <div className="font-semibold text-slate-800">
                {asset.taxBlock?.depreciationRate || 15}% u/s 32
              </div>

              <div className="text-slate-500">Asset GL Account ID:</div>
              <div className="font-mono text-slate-800">#{asset.category?.assetAccountId}</div>

              <div className="text-slate-500">Accumulated Depr. Account:</div>
              <div className="font-mono text-slate-800">
                #{asset.category?.accumulatedDepAccountId}
              </div>

              <div className="text-slate-500">Depreciation Expense Account:</div>
              <div className="font-mono text-slate-800">
                #{asset.category?.depExpenseAccountId}
              </div>

              {asset.isDisposed && (
                <>
                  <div className="text-rose-600 font-bold">Disposal Date:</div>
                  <div className="font-semibold text-rose-800">
                    {new Date(asset.disposalDate!).toLocaleDateString("en-IN")}
                  </div>

                  <div className="text-rose-600 font-bold">Disposal Gain / Loss:</div>
                  <div className="font-black text-rose-800">
                    ₹{asset.disposalGainLoss?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "COMPONENTS" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Cost & Capital Goods GST Breakdown (Ind AS 16 / AS 10)
            </h3>
            <span className="text-xs text-slate-500">
              Eligible ITC:{" "}
              <strong className="text-emerald-700 font-mono">
                ₹{asset.eligibleItcGst.toLocaleString("en-IN")}
              </strong>{" "}
              • Blocked ITC u/s 17(5):{" "}
              <strong className="text-amber-700 font-mono">
                ₹{asset.blockedItcGst.toLocaleString("en-IN")}
              </strong>
            </span>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-100 font-semibold text-slate-700 uppercase">
              <tr>
                <th className="px-4 py-2.5">Component</th>
                <th className="px-4 py-2.5 text-right">Cost (₹)</th>
                <th className="px-4 py-2.5 text-right">Eligible ITC (₹)</th>
                <th className="px-4 py-2.5 text-right">Blocked ITC (₹)</th>
                <th className="px-4 py-2.5 text-right">Capitalized Base (₹)</th>
                <th className="px-4 py-2.5 text-center">Life</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {asset.costComponents?.map((comp: any) => (
                <tr key={comp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{comp.componentName}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    ₹{comp.cost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700">
                    ₹{comp.eligibleGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-700">
                    ₹{comp.blockedGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    ₹{comp.capitalizedCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">
                    {comp.usefulLifeYears || asset.usefulLifeYears}y
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "DEPRECIATION" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Depreciation Run History (Companies Act 2013)
            </h3>
          </div>
          {(!asset.depreciationLines || asset.depreciationLines.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No depreciation runs have been posted for this asset yet.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Run Number</th>
                  <th className="px-4 py-2.5">Period End</th>
                  <th className="px-4 py-2.5 text-right">Opening Book Value</th>
                  <th className="px-4 py-2.5 text-right">Depreciation Amount</th>
                  <th className="px-4 py-2.5 text-right">Closing Book Value</th>
                  <th className="px-4 py-2.5 text-center">Days</th>
                  <th className="px-4 py-2.5">Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asset.depreciationLines.map((line: any) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {line.depreciationRun?.runNumber || "DEPR"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(line.depreciationRun?.periodEndDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      ₹{line.openingBookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-indigo-700">
                      ₹{line.depreciationAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      ₹{line.closingBookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{line.daysDepreciated}</td>
                    <td className="px-4 py-3">
                      {line.depreciationRun?.journalId ? (
                        <button
                          onClick={() => {
                            setJournalTarget({
                              type: "JOURNAL",
                              id: line.depreciationRun.journalId,
                            });
                            setIsJournalOpen(true);
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          View Journal
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "EVENTS" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Lifecycle Audit Timeline
          </h3>
          <div className="relative border-l-2 border-indigo-200 pl-4 space-y-6 ml-2">
            {asset.events?.map((ev: any) => (
              <div key={ev.id} className="relative">
                <div className="absolute -left-6 top-0 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white"></div>
                <div className="text-xs text-slate-500">
                  {new Date(ev.eventDate).toLocaleDateString("en-IN")} • by {ev.createdBy || "System"}
                </div>
                <div className="font-semibold text-sm text-slate-800 mt-0.5">
                  {ev.eventType} • ₹{ev.amount.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-slate-600 mt-1">{ev.remarks}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "VERIFICATION" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Physical Verification History (Companies Auditor's Report Order - CARO)
            </h3>
            <button
              onClick={() => setIsVerifyModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
            >
              + Record Physical Verification
            </button>
          </div>
          {(!asset.verifications || asset.verifications.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No physical verifications recorded for this asset.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Verified By</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Location Observed</th>
                  <th className="px-4 py-2.5 text-center">Score (1-5)</th>
                  <th className="px-4 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asset.verifications.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(v.verificationDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{v.verifiedBy}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{v.locationObserved || "—"}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {v.conditionScore ? `★ ${v.conditionScore}/5` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{v.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Verification Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              Record Physical Verification
            </h3>
            <form onSubmit={handleRecordVerification} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verified By *</label>
                <input
                  type="text"
                  required
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  placeholder="e.g. Internal Auditor / Inventory Manager"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="FOUND_VERIFIED">Found & Verified (Good Condition)</option>
                  <option value="FOUND_DAMAGED">Found but Damaged / Requires Repair</option>
                  <option value="RELOCATED">Relocated to New Branch</option>
                  <option value="MISSING">Missing / Not Located</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observed Location
                </label>
                <input
                  type="text"
                  value={locationObserved}
                  onChange={(e) => setLocationObserved(e.target.value)}
                  placeholder="e.g. Main Vault 2nd Floor"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Condition Score (1 = Scrapped, 5 = Like New)
                </label>
                <select
                  value={conditionScore}
                  onChange={(e) => setConditionScore(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="5">5 - Excellent (Like New)</option>
                  <option value="4">4 - Good (Normal Wear)</option>
                  <option value="3">3 - Fair (Usable)</option>
                  <option value="2">2 - Poor (Needs Overhaul)</option>
                  <option value="1">1 - Defective (Scrap candidate)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={verifyRemarks}
                  onChange={(e) => setVerifyRemarks(e.target.value)}
                  placeholder="Notes on tag condition, serial match, etc..."
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVerify}
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700"
                >
                  {savingVerify ? "Saving..." : "Save Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disposal Modal */}
      <DisposalWizardModal
        isOpen={isDisposalOpen}
        asset={asset}
        onClose={() => setIsDisposalOpen(false)}
        onSuccess={loadAsset}
      />

      {/* Tamper-evident Audit History Drawer */}
      <EntityHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        entityType="FixedAsset"
        entityId={asset.id}
        entityNumber={asset.assetCode}
      />

      {/* Transaction Journal Modal */}
      <TransactionJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        type={journalTarget.type}
        id={journalTarget.id}
      />
    </div>
  );
};
