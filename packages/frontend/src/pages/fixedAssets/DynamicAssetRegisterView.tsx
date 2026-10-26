import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  fixedAssetService,
  DynamicRegisterResponse,
  AssetCategory,
  TaxBlock,
  FixedAssetItem,
} from "@/services/fixedAssetService";

interface DynamicAssetRegisterViewProps {
  onEditAsset: (asset: FixedAssetItem) => void;
  onRunDepreciationForPeriod: (startDate: string, endDate: string) => void;
}

export const DynamicAssetRegisterView: React.FC<DynamicAssetRegisterViewProps> = ({
  onEditAsset,
  onRunDepreciationForPeriod,
}) => {
  const [data, setData] = useState<DynamicRegisterResponse | null>(null);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [taxBlocks, setTaxBlocks] = useState<TaxBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period state
  const [financialYear, setFinancialYear] = useState<string>("2025-2026");
  const [periodType, setPeriodType] = useState<
    "FY" | "H1" | "H2" | "Q1" | "Q2" | "Q3" | "Q4" | "MONTH" | "CUSTOM"
  >("FY");
  const [month, setMonth] = useState<number>(4); // April
  const [customStartDate, setCustomStartDate] = useState<string>("2025-04-01");
  const [customEndDate, setCustomEndDate] = useState<string>("2026-03-31");

  // Advanced filters state
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [taxBlockFilter, setTaxBlockFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Sub-view mode
  const [viewMode, setViewMode] = useState<"ITEMIZED" | "CATEGORY_SUMMARY" | "TAX_BLOCKS">("ITEMIZED");

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    loadRegister();
  }, [
    financialYear,
    periodType,
    month,
    customStartDate,
    customEndDate,
    categoryFilter,
    taxBlockFilter,
    statusFilter,
    methodFilter,
    locationFilter,
  ]);

  const loadMasters = async () => {
    try {
      const [cats, blocks] = await Promise.all([
        fixedAssetService.listCategories(),
        fixedAssetService.listTaxBlocks(),
      ]);
      setCategories(cats);
      setTaxBlocks(blocks);
    } catch (err) {
      console.error("Failed to load register masters", err);
    }
  };

  const loadRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fixedAssetService.getDynamicRegister({
        financialYear,
        periodType,
        month: periodType === "MONTH" ? month : undefined,
        startDate: periodType === "CUSTOM" ? customStartDate : undefined,
        endDate: periodType === "CUSTOM" ? customEndDate : undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
        taxBlockId: taxBlockFilter ? Number(taxBlockFilter) : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        depreciationMethod: methodFilter !== "ALL" ? methodFilter : undefined,
        location: locationFilter.trim() || undefined,
        search: search.trim() || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to calculate dynamic register");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRegister();
  };

  // Export dynamically calculated register to CSV
  const handleExportCsv = () => {
    if (!data || data.itemized.length === 0) return;

    const headers = [
      "Asset Code",
      "Asset Name",
      "Category",
      "Tax Block",
      "Method",
      "Useful Life (Yrs)",
      "Put To Use",
      "Disposal Date",
      "Status",
      "Gross Opening (INR)",
      "Additions in Period (INR)",
      "Deductions in Period (INR)",
      "Gross Closing (INR)",
      "Depreciation Opening (INR)",
      "Depreciation for Period (INR)",
      "Depreciation on Deductions (INR)",
      "Depreciation Closing (INR)",
      "Net Opening (INR)",
      "Net Closing (INR)",
      "Location",
      "Custodian",
      "Serial No",
    ];

    const rows = data.itemized.map((r) => [
      `"${r.assetCode}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.categoryName}"`,
      `"${r.taxBlockName || ""}"`,
      `"${r.depreciationMethod}"`,
      r.usefulLifeYears,
      `"${r.datePutToUse}"`,
      `"${r.disposalDate || ""}"`,
      `"${r.status}"`,
      r.grossOpening,
      r.additions,
      r.deductions,
      r.grossClosing,
      r.depreciationOpening,
      r.depreciationForPeriod,
      r.depreciationOnDeductions,
      r.depreciationClosing,
      r.netOpening,
      r.netClosing,
      `"${r.location || ""}"`,
      `"${r.custodian || ""}"`,
      `"${r.serialNo || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [`# Fixed Asset Register - ${data.metadata.periodLabel}`, headers.join(",")]
        .concat(rows.map((e) => e.join(",")))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Fixed_Asset_Register_${data.metadata.financialYear}_${data.metadata.periodType}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return "₹" + val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const grandTotals = data?.grandTotals || {
    grossOpening: 0,
    additions: 0,
    deductions: 0,
    grossClosing: 0,
    depreciationOpening: 0,
    depreciationForPeriod: 0,
    depreciationOnDeductions: 0,
    depreciationClosing: 0,
    netOpening: 0,
    netClosing: 0,
    totalAssets: 0,
    activeCount: 0,
    cwipCount: 0,
    disposedCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* ── Control Bar: Dates, FY & Period Engine ────────────────────────── */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* FY & Period Type Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                Financial Year (FY)
              </label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-950 focus:border-indigo-600 focus:outline-none shadow-xs"
              >
                <option value="2026-2027">FY 2026-2027 (Current)</option>
                <option value="2025-2026">FY 2025-2026</option>
                <option value="2024-2025">FY 2024-2025</option>
                <option value="2023-2024">FY 2023-2024</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                Period Calculation
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as any)}
                className="rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none shadow-xs"
              >
                <option value="FY">Full Financial Year (1 Apr - 31 Mar)</option>
                <option value="H1">H1 First Half (Apr - Sep)</option>
                <option value="H2">H2 Second Half (Oct - Mar)</option>
                <option value="Q1">Q1 (1 Apr - 30 Jun)</option>
                <option value="Q2">Q2 (1 Jul - 30 Sep)</option>
                <option value="Q3">Q3 (1 Oct - 31 Dec)</option>
                <option value="Q4">Q4 (1 Jan - 31 Mar)</option>
                <option value="MONTH">By Specific Month</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>
            </div>

            {/* Sub-selectors depending on periodType */}
            {periodType === "MONTH" && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                  Select Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none shadow-xs"
                >
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                </select>
              </div>
            )}

            {periodType === "CUSTOM" && (
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="rounded-xl border border-indigo-300 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-600 focus:outline-none shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="rounded-xl border border-indigo-300 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-600 focus:outline-none shadow-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (data?.metadata) {
                  onRunDepreciationForPeriod(data.metadata.startDate, data.metadata.endDate);
                }
              }}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition flex items-center gap-1.5"
              title="Post the exact dynamic depreciation for this period to GL"
            >
              <span>⚡ Post Depreciation for Period</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={!data || data.itemized.length === 0}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>📥 Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition"
            >
              <span>🖨️ Print</span>
            </button>
          </div>
        </div>

        {/* Dynamic Period Banner */}
        {data && (
          <div className="mt-4 pt-3 border-t border-indigo-100 flex flex-wrap items-center justify-between text-xs text-indigo-950">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">{data.metadata.periodLabel}</span>
              <span className="text-slate-400">•</span>
              <span className="font-mono text-[11px] text-slate-600">
                {data.metadata.startDate} to {data.metadata.endDate}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Calculation Standard: <span className="font-medium text-slate-700">Schedule II & CARO 2020</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Dynamic Period KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Opening Gross Block</span>
          <div className="mt-1 text-base font-bold font-mono text-slate-900">
            {formatCurrency(grandTotals.grossOpening)}
          </div>
          <span className="text-[10px] text-slate-400">As of period start</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">+ Period Additions</span>
          <div className="mt-1 text-base font-bold font-mono text-emerald-800">
            {formatCurrency(grandTotals.additions)}
          </div>
          <span className="text-[10px] text-emerald-600">Acquired in window</span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">- Period Deductions</span>
          <div className="mt-1 text-base font-bold font-mono text-rose-800">
            {formatCurrency(grandTotals.deductions)}
          </div>
          <span className="text-[10px] text-rose-600">Disposed in window</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">= Closing Gross Block</span>
          <div className="mt-1 text-base font-bold font-mono text-slate-900">
            {formatCurrency(grandTotals.grossClosing)}
          </div>
          <span className="text-[10px] text-slate-400">As of period end</span>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">⚡ Period Depreciation</span>
          <div className="mt-1 text-base font-bold font-mono text-indigo-900">
            {formatCurrency(grandTotals.depreciationForPeriod)}
          </div>
          <span className="text-[10px] text-indigo-500">Calculated on-the-fly</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Closing Net Book Value</span>
          <div className="mt-1 text-base font-bold font-mono text-emerald-900">
            {formatCurrency(grandTotals.netClosing)}
          </div>
          <span className="text-[10px] text-emerald-600">{grandTotals.totalAssets} assets in register</span>
        </div>
      </div>

      {/* ── View Mode Switcher & Advanced Filters ─────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* View Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/60 px-4 pt-2">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("ITEMIZED")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                viewMode === "ITEMIZED"
                  ? "border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-xs"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📋 Itemized Asset Register ({data?.itemized.length || 0})</span>
            </button>

            <button
              onClick={() => setViewMode("CATEGORY_SUMMARY")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                viewMode === "CATEGORY_SUMMARY"
                  ? "border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-xs"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🏛️ Schedule III Category Note ({data?.categories.length || 0})</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 pb-2">
            Showing computed movement for {data?.metadata.periodLabel}
          </span>
        </div>

        {/* Advanced Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/20">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, name, serial no, location, or custodian..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={taxBlockFilter}
                onChange={(e) => setTaxBlockFilter(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Tax Blocks</option>
                {taxBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.depreciationRate}%)
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="CWIP">CWIP</option>
                <option value="DISPOSED">Disposed</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Methods</option>
                <option value="SLM">SLM (Straight Line)</option>
                <option value="WDV">WDV (Written Down)</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* ── Table Area ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Calculating dynamic fixed asset register for {data?.metadata.periodLabel || "selected period"}...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs">{error}</div>
        ) : viewMode === "ITEMIZED" ? (
          /* VIEW 1: Itemized Detailed Register */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-100/80 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-3 w-28">Asset Code</th>
                  <th className="px-3 py-3 min-w-[180px]">Asset Name & Details</th>
                  <th className="px-3 py-3 w-24">Method / Life</th>
                  <th className="px-3 py-3 w-24">Put To Use</th>
                  <th className="px-3 py-3 text-right bg-slate-50 font-mono">Opening Gross</th>
                  <th className="px-3 py-3 text-right text-emerald-800 bg-emerald-50/30 font-mono">+ Additions</th>
                  <th className="px-3 py-3 text-right text-rose-800 bg-rose-50/30 font-mono">- Deductions</th>
                  <th className="px-3 py-3 text-right bg-slate-50 font-mono font-bold">Closing Gross</th>
                  <th className="px-3 py-3 text-right bg-slate-50 font-mono">Opening Depr</th>
                  <th className="px-3 py-3 text-right text-indigo-900 bg-indigo-50/50 font-mono font-bold">
                    Period Depr
                  </th>
                  <th className="px-3 py-3 text-right bg-slate-50 font-mono font-bold">Closing Depr</th>
                  <th className="px-3 py-3 text-right text-emerald-900 bg-emerald-50/50 font-mono font-extrabold">
                    Closing NBV
                  </th>
                  <th className="px-3 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data?.itemized.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-xs text-slate-500">
                      No assets found in register for this period. Try adjusting filters or select another financial year.
                    </td>
                  </tr>
                ) : (
                  data?.itemized.map((row) => (
                    <tr key={row.assetId} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-2.5 font-mono font-bold">
                        <Link
                          to={`/assets/${row.assetId}`}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {row.assetCode}
                        </Link>
                        {row.status === "CWIP" && (
                          <span className="block mt-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 rounded px-1 w-max">
                            CWIP
                          </span>
                        )}
                        {row.status === "DISPOSED" && (
                          <span className="block mt-0.5 text-[9px] font-bold text-rose-700 bg-rose-100 rounded px-1 w-max">
                            DISPOSED
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{row.categoryName}</span>
                          {row.location && <span>• 📍 {row.location}</span>}
                          {row.custodian && <span>• 👤 {row.custodian}</span>}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 font-medium text-slate-600">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
                          {row.depreciationMethod}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{row.usefulLifeYears} Years</div>
                      </td>

                      <td className="px-3 py-2.5 font-mono text-slate-600 text-[11px]">
                        {row.datePutToUse}
                        {row.isLessThan180DaysAddition && (
                          <span
                            className="block text-[9px] font-bold text-amber-700 bg-amber-100 rounded px-1 mt-0.5 w-max"
                            title="Put to use in second half of FY (<180 days)"
                          >
                            &lt; 180 Days
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 bg-slate-50/50">
                        {row.grossOpening > 0 ? formatCurrency(row.grossOpening) : "—"}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono text-emerald-800 bg-emerald-50/20 font-medium">
                        {row.additions > 0 ? formatCurrency(row.additions) : "—"}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono text-rose-800 bg-rose-50/20 font-medium">
                        {row.deductions > 0 ? formatCurrency(row.deductions) : "—"}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                        {formatCurrency(row.grossClosing)}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono text-slate-600 bg-slate-50/50">
                        {row.depreciationOpening > 0 ? formatCurrency(row.depreciationOpening) : "—"}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30">
                        {row.depreciationForPeriod > 0 ? formatCurrency(row.depreciationForPeriod) : "—"}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800 bg-slate-50/50">
                        {formatCurrency(row.depreciationClosing)}
                      </td>

                      <td className="px-3 py-2.5 text-right font-mono font-extrabold text-emerald-900 bg-emerald-50/40">
                        {formatCurrency(row.netClosing)}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => {
                            // Find matching asset object to pass to modal
                            const assetItem: any = {
                              id: row.assetId,
                              assetCode: row.assetCode,
                              name: row.name,
                              assetCategoryId: 0,
                              dateOfPurchase: row.datePutToUse,
                              datePutToUse: row.datePutToUse,
                              originalCost: row.grossClosing || row.grossOpening,
                              salvageValue: row.salvageValue,
                              usefulLifeYears: row.usefulLifeYears,
                              depreciationMethod: row.depreciationMethod,
                              status: row.status as any,
                              location: row.location,
                              department: row.department,
                              custodian: row.custodian,
                              serialNo: row.serialNo,
                            };
                            onEditAsset(assetItem);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          title="Edit Asset Details"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Grand Total Footer */}
              {data && data.itemized.length > 0 && (
                <tfoot className="bg-slate-100 font-bold font-mono text-xs border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-left uppercase text-slate-800 font-sans">
                      Grand Totals ({data.grandTotals.totalAssets} Assets in Register)
                    </td>
                    <td className="px-3 py-3 text-right text-slate-800">
                      {formatCurrency(data.grandTotals.grossOpening)}
                    </td>
                    <td className="px-3 py-3 text-right text-emerald-800">
                      {formatCurrency(data.grandTotals.additions)}
                    </td>
                    <td className="px-3 py-3 text-right text-rose-800">
                      {formatCurrency(data.grandTotals.deductions)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-900 font-extrabold">
                      {formatCurrency(data.grandTotals.grossClosing)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {formatCurrency(data.grandTotals.depreciationOpening)}
                    </td>
                    <td className="px-3 py-3 text-right text-indigo-900 font-extrabold">
                      {formatCurrency(data.grandTotals.depreciationForPeriod)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-900">
                      {formatCurrency(data.grandTotals.depreciationClosing)}
                    </td>
                    <td className="px-3 py-3 text-right text-emerald-950 font-black">
                      {formatCurrency(data.grandTotals.netClosing)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          /* VIEW 2: Schedule III PPE Category Summary */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-100/80 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 min-w-[200px]">Asset Category (Schedule II)</th>
                  <th className="px-4 py-3 text-center">Count</th>
                  <th className="px-4 py-3 text-right bg-slate-50 font-mono">Opening Gross</th>
                  <th className="px-4 py-3 text-right text-emerald-800 bg-emerald-50/30 font-mono">+ Additions</th>
                  <th className="px-4 py-3 text-right text-rose-800 bg-rose-50/30 font-mono">- Deductions</th>
                  <th className="px-4 py-3 text-right bg-slate-50 font-mono font-bold">Closing Gross</th>
                  <th className="px-4 py-3 text-right bg-slate-50 font-mono">Opening Depr</th>
                  <th className="px-4 py-3 text-right text-indigo-900 bg-indigo-50/50 font-mono font-bold">
                    Period Depr
                  </th>
                  <th className="px-4 py-3 text-right bg-slate-50 font-mono font-bold">Closing Depr</th>
                  <th className="px-4 py-3 text-right text-emerald-900 bg-emerald-50/50 font-mono font-extrabold">
                    Closing Net Block
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data?.categories.map((cat) => (
                  <tr key={cat.categoryId} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{cat.categoryName}</div>
                      <div className="text-[11px] text-slate-400">
                        Code: {cat.categoryCode} • Useful Life: {cat.usefulLifeYears}y • Method: {cat.defaultMethod}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {cat.assetCount}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-slate-700 bg-slate-50/50">
                      {formatCurrency(cat.grossOpening)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-emerald-800 bg-emerald-50/20 font-medium">
                      {cat.additions > 0 ? formatCurrency(cat.additions) : "—"}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-rose-800 bg-rose-50/20 font-medium">
                      {cat.deductions > 0 ? formatCurrency(cat.deductions) : "—"}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                      {formatCurrency(cat.grossClosing)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-slate-600 bg-slate-50/50">
                      {formatCurrency(cat.depreciationOpening)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30">
                      {formatCurrency(cat.depreciationForPeriod)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 bg-slate-50/50">
                      {formatCurrency(cat.depreciationClosing)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-extrabold text-emerald-900 bg-emerald-50/40">
                      {formatCurrency(cat.netClosing)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {data && data.categories.length > 0 && (
                <tfoot className="bg-slate-100 font-bold font-mono text-xs border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-left uppercase text-slate-800 font-sans">
                      Balance Sheet Schedule III Total
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800">
                      {formatCurrency(data.grandTotals.grossOpening)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-800">
                      {formatCurrency(data.grandTotals.additions)}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-800">
                      {formatCurrency(data.grandTotals.deductions)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 font-extrabold">
                      {formatCurrency(data.grandTotals.grossClosing)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatCurrency(data.grandTotals.depreciationOpening)}
                    </td>
                    <td className="px-4 py-3 text-right text-indigo-900 font-extrabold">
                      {formatCurrency(data.grandTotals.depreciationForPeriod)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {formatCurrency(data.grandTotals.depreciationClosing)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-950 font-black">
                      {formatCurrency(data.grandTotals.netClosing)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
