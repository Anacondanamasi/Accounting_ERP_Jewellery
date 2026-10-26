import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  fixedAssetService,
  FixedAssetItem,
  AssetCategory,
} from "@/services/fixedAssetService";
import { AddAssetModal } from "./AddAssetModal";
import { AddMultipleAssetsModal } from "./AddMultipleAssetsModal";
import { DepreciationRunModal } from "./DepreciationRunModal";
import { DisposalWizardModal } from "./DisposalWizardModal";
import { DynamicAssetRegisterView } from "./DynamicAssetRegisterView";

export const FixedAssetListPage: React.FC = () => {
  const [pageTab, setPageTab] = useState<"REGISTER" | "INVENTORY">("REGISTER");

  const [assets, setAssets] = useState<FixedAssetItem[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [kpis, setKpis] = useState<any>({
    totalGrossBlock: 0,
    totalAccumulatedDep: 0,
    totalNetBookValue: 0,
    totalCwip: 0,
    activeCount: 0,
    disposedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<FixedAssetItem | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDeprRunOpen, setIsDeprRunOpen] = useState(false);
  const [deprRunPeriod, setDeprRunPeriod] = useState<{ start?: string; end?: string }>({});
  const [isDisposalOpen, setIsDisposalOpen] = useState(false);
  const [selectedAssetForDisposal, setSelectedAssetForDisposal] = useState<FixedAssetItem | null>(null);

  useEffect(() => {
    loadData();
    loadCategories();
  }, [statusFilter, categoryFilter]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D: Depreciation Run
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsDeprRunOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, kpisRes] = await Promise.all([
        fixedAssetService.list({
          status: statusFilter,
          categoryId: categoryFilter ? Number(categoryFilter) : undefined,
          search: search.trim() || undefined,
        }),
        fixedAssetService.getKpis(),
      ]);
      setAssets(listRes.assets);
      setKpis(kpisRes);
    } catch (err) {
      console.error("Failed to load fixed assets", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await fixedAssetService.listCategories();
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openDisposal = (asset: FixedAssetItem) => {
    setSelectedAssetForDisposal(asset);
    setIsDisposalOpen(true);
  };

  const handleEditAsset = (asset: FixedAssetItem) => {
    setSelectedAssetForEdit(asset);
    setIsAddOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAssetForEdit(null);
    setIsAddOpen(true);
  };

  const handleSeedSamples = async () => {
    if (!window.confirm("Seed realistic sample jewellery fixed assets (Laser machine, Gold spectrometer, Safes, Delivery van, etc.) into this company?")) {
      return;
    }
    setSeeding(true);
    try {
      const res = await fixedAssetService.seedSampleAssets();
      alert(`Successfully seeded ${res.seededCount} sample fixed assets!`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to seed sample assets");
    } finally {
      setSeeding(false);
    }
  };

  const handleCwipCapitalize = async (assetId: number) => {
    if (!window.confirm("Capitalize this CWIP asset to Active Fixed Asset status?")) return;
    try {
      await fixedAssetService.capitalizeCwip(assetId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to capitalize CWIP");
    }
  };

  const handleRunDepreciationForPeriod = (startDate: string, endDate: string) => {
    setDeprRunPeriod({ start: startDate, end: endDate });
    setIsDeprRunOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── Top Header & Actions ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fixed Assets Register</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Companies Act 2013 (Schedule II & III Part I) & Income-tax Act (Section 32) Statutory Register
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seed Sample Assets Button */}
          <button
            onClick={handleSeedSamples}
            disabled={seeding}
            className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-xl shadow-xs transition flex items-center gap-1.5"
            title="Seed sample jewellery machinery, spectrometers, safes and equipment"
          >
            <span>✨ {seeding ? "Seeding Assets..." : "Seed Sample Assets"}</span>
          </button>

          <Link
            to="/assets/reports"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl shadow-xs hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <span>📊 Statutory Reports</span>
          </Link>

          <button
            onClick={() => {
              setDeprRunPeriod({});
              setIsDeprRunOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl shadow-xs hover:bg-indigo-100 transition flex items-center space-x-1.5"
            title="Periodic Depreciation Run (Ctrl+Shift+D)"
          >
            <span>⚡ Run Depreciation</span>
            <kbd className="hidden md:inline px-1 py-0.5 text-[10px] bg-indigo-200/60 text-indigo-800 rounded font-mono">
              Ctrl+Shift+D
            </kbd>
          </button>

          <button
            onClick={() => setIsBulkOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl shadow-xs hover:bg-slate-50 transition"
          >
            📋 Bulk Paste / Import
          </button>

          <button
            onClick={handleAddNew}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition"
          >
            + Add Asset
          </button>
        </div>
      </div>

      {/* ── Main Tab Navigation Switcher ─────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setPageTab("REGISTER")}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              pageTab === "REGISTER"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📊 Auto-Generated Dynamic Register</span>
            <span className="rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5">
              Live Engine
            </span>
          </button>

          <button
            onClick={() => setPageTab("INVENTORY")}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              pageTab === "INVENTORY"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🏛️ Asset Master Directory</span>
            <span className="rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5">
              {assets.length}
            </span>
          </button>
        </nav>
      </div>

      {/* ── TAB 1: Auto-Generated Dynamic Fixed Asset Register ───────────── */}
      {pageTab === "REGISTER" && (
        <DynamicAssetRegisterView
          onEditAsset={handleEditAsset}
          onRunDepreciationForPeriod={handleRunDepreciationForPeriod}
        />
      )}

      {/* ── TAB 2: Asset Master Directory (Inventory Table) ───────────────── */}
      {pageTab === "INVENTORY" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Gross Block
              </span>
              <div className="mt-1 text-xl font-bold text-slate-900">
                ₹{kpis.totalGrossBlock.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400">Total Capital Cost</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Accumulated Depr.
              </span>
              <div className="mt-1 text-xl font-bold text-indigo-600">
                ₹{kpis.totalAccumulatedDep.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-indigo-400">Companies Act 2013</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Net Book Value (NBV)
              </span>
              <div className="mt-1 text-xl font-bold text-emerald-800">
                ₹{kpis.totalNetBookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-emerald-600">Balance Sheet Value</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                CWIP Value
              </span>
              <div className="mt-1 text-xl font-bold text-amber-800">
                ₹{kpis.totalCwip.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-amber-600">Pending Capitalization</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Assets
              </span>
              <div className="mt-1 text-xl font-bold text-slate-900">{kpis.activeCount}</div>
              <span className="text-[11px] text-slate-400">{kpis.disposedCount} Disposed / Retired</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by asset code, name, serial no, location, custodian..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CWIP">Capital Work-in-Progress (CWIP)</option>
                  <option value="DISPOSED">Disposed / Scrapped</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Filter
                </button>
              </div>
            </form>
          </div>

          {/* Assets Directory Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading asset directory...</div>
            ) : assets.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl font-bold mb-3">
                  🏛️
                </div>
                <h3 className="text-base font-semibold text-slate-800">No fixed assets found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Add your first fixed asset or seed sample jewellery assets to explore calculations.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleSeedSamples}
                    className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                  >
                    ✨ Seed Sample Assets
                  </button>
                  <button
                    onClick={handleAddNew}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow hover:bg-indigo-700 transition"
                  >
                    + Add Asset
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700 uppercase">
                    <tr>
                      <th className="px-4 py-3">Asset Code</th>
                      <th className="px-4 py-3">Asset Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Put To Use</th>
                      <th className="px-4 py-3 text-right">Gross Cost</th>
                      <th className="px-4 py-3 text-right">Accum. Depr</th>
                      <th className="px-4 py-3 text-right">Net Book Value</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <Link
                            to={`/assets/${asset.id}`}
                            className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            {asset.assetCode}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div>{asset.name}</div>
                          {asset.location && (
                            <span className="text-[11px] text-slate-400">📍 {asset.location}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div>{asset.category?.name || "General"}</div>
                          <span className="text-[10px] text-slate-400">
                            {asset.depreciationMethod} • {asset.usefulLifeYears}y
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(asset.datePutToUse).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-800">
                          ₹{asset.originalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-indigo-600">
                          ₹{asset.accumulatedDep.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          ₹{asset.currentBookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {asset.status === "ACTIVE" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}
                          {asset.status === "CWIP" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              CWIP
                            </span>
                          )}
                          {asset.status === "DISPOSED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              Disposed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleEditAsset(asset)}
                            className="px-2.5 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition"
                          >
                            Edit
                          </button>
                          <Link
                            to={`/assets/${asset.id}`}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded transition"
                          >
                            View
                          </Link>
                          {asset.status === "CWIP" && (
                            <button
                              onClick={() => handleCwipCapitalize(asset.id)}
                              className="px-2.5 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition"
                            >
                              Capitalize
                            </button>
                          )}
                          {asset.status === "ACTIVE" && (
                            <button
                              onClick={() => openDisposal(asset)}
                              className="px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition"
                            >
                              Dispose
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <AddAssetModal
        isOpen={isAddOpen}
        assetToEdit={selectedAssetForEdit}
        onClose={() => {
          setIsAddOpen(false);
          setSelectedAssetForEdit(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />
      <AddMultipleAssetsModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={loadData}
      />
      <DepreciationRunModal
        isOpen={isDeprRunOpen}
        onClose={() => {
          setIsDeprRunOpen(false);
          setDeprRunPeriod({});
        }}
        onSuccess={loadData}
      />
      <DisposalWizardModal
        isOpen={isDisposalOpen}
        asset={selectedAssetForDisposal}
        onClose={() => setIsDisposalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
