import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fixedAssetService } from "@/services/fixedAssetService";

export const FixedAssetReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"PPE" | "TAX_BLOCK" | "BOOKS_VS_TAX">("PPE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ppeReport, setPpeReport] = useState<any | null>(null);
  const [taxReport, setTaxReport] = useState<any | null>(null);
  const [comparisonReport, setComparisonReport] = useState<any | null>(null);

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "PPE") {
        const data = await fixedAssetService.getPpeReport();
        setPpeReport(data);
      } else if (activeTab === "TAX_BLOCK") {
        const data = await fixedAssetService.getTaxBlockReport();
        setTaxReport(data);
      } else {
        const data = await fixedAssetService.getBooksVsTaxReport();
        setComparisonReport(data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <Link to="/assets" className="hover:text-indigo-600 transition">
          Fixed Assets
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Statutory Reports</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Fixed Asset Statutory Reports
          </h1>
          <p className="text-sm text-slate-500">
            Companies Act 2013 Schedule III • Income-tax Act Section 32 • Ind AS 12 Deferred Tax
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-xs font-semibold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("PPE")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "PPE"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Schedule III PPE Movement (Books)
          </button>
          <button
            onClick={() => setActiveTab("TAX_BLOCK")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "TAX_BLOCK"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Income-tax Block of Assets (Form 3CD)
          </button>
          <button
            onClick={() => setActiveTab("BOOKS_VS_TAX")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "BOOKS_VS_TAX"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Books vs Tax Reconciliation (Ind AS 12)
          </button>
        </nav>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Loading statutory report...</div>
      ) : (
        <>
          {/* TAB 1: Schedule III PPE Report */}
          {activeTab === "PPE" && ppeReport && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Schedule III Property, Plant and Equipment (PPE) Schedule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gross Block, Accumulated Depreciation and Net Block Movement (Companies Act 2013)
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-semibold text-slate-700">Period: </span>
                  <span className="font-mono text-indigo-600 font-bold">{ppeReport.financialYear}</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100 font-semibold text-slate-700 text-center">
                    <tr>
                      <th rowSpan={2} className="px-3 py-2 text-left border-r">
                        Asset Category
                      </th>
                      <th colSpan={4} className="px-3 py-1.5 border-r bg-indigo-50/50">
                        Gross Block (₹)
                      </th>
                      <th colSpan={4} className="px-3 py-1.5 border-r bg-amber-50/50">
                        Depreciation (₹)
                      </th>
                      <th colSpan={2} className="px-3 py-1.5 bg-emerald-50/50">
                        Net Book Value (₹)
                      </th>
                    </tr>
                    <tr className="text-[11px] uppercase tracking-wider text-slate-600">
                      <th className="px-2 py-1">Opening</th>
                      <th className="px-2 py-1">Additions</th>
                      <th className="px-2 py-1">Deductions</th>
                      <th className="px-2 py-1 border-r font-bold">Closing</th>

                      <th className="px-2 py-1">Opening</th>
                      <th className="px-2 py-1">For Year</th>
                      <th className="px-2 py-1">Deductions</th>
                      <th className="px-2 py-1 border-r font-bold">Closing</th>

                      <th className="px-2 py-1">Opening</th>
                      <th className="px-2 py-1 font-bold">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {ppeReport.categories.map((cat: any) => (
                      <tr key={cat.categoryId} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-semibold text-slate-800 border-r">
                          {cat.categoryName}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({cat.usefulLifeYears}y, {cat.method})
                          </span>
                        </td>
                        {/* Gross */}
                        <td className="px-2 py-2.5 text-right font-mono text-slate-600">
                          ₹{cat.grossBlock.opening.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-600">
                          ₹{cat.grossBlock.additions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-rose-600">
                          ₹{cat.grossBlock.deductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono font-bold text-slate-900 border-r bg-indigo-50/20">
                          ₹{cat.grossBlock.closing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        {/* Depreciation */}
                        <td className="px-2 py-2.5 text-right font-mono text-slate-600">
                          ₹{cat.depreciation.opening.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-600">
                          ₹{cat.depreciation.forTheYear.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-rose-600">
                          ₹{cat.depreciation.onDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono font-bold text-indigo-700 border-r bg-amber-50/20">
                          ₹{cat.depreciation.closing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        {/* Net */}
                        <td className="px-2 py-2.5 text-right font-mono text-slate-600">
                          ₹{cat.netBlock.opening.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono font-black text-emerald-800 bg-emerald-50/20">
                          ₹{cat.netBlock.closing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td className="px-3 py-3 border-r">Grand Total</td>
                      <td colSpan={3} className="text-center text-slate-500"></td>
                      <td className="px-2 py-3 text-right font-mono font-black border-r bg-indigo-50/50">
                        ₹{ppeReport.grandTotal.grossClosing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={3} className="text-center text-slate-500"></td>
                      <td className="px-2 py-3 text-right font-mono font-black border-r bg-amber-50/50">
                        ₹{ppeReport.grandTotal.depClosing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                      <td className="px-2 py-3 text-right font-mono font-black text-emerald-900 bg-emerald-50/50">
                        ₹{ppeReport.grandTotal.netClosing.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Income-tax Section 32 Report */}
          {activeTab === "TAX_BLOCK" && taxReport && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Income-tax Act Section 32 Block of Assets Schedule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Statutory Memo Schedule for ITR & Tax Audit Form 3CD Annexure (Not posted to GL)
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-semibold text-slate-700">Financial Year: </span>
                  <span className="font-mono text-indigo-600 font-bold">{taxReport.financialYear}</span>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-start space-x-2">
                <span>ℹ️</span>
                <div>
                  <strong>Tax Audit Rule:</strong> Half-rate (50% of statutory rate) is applied automatically
                  on additions put to use for less than 180 days in the financial year. If block value
                  becomes negative upon sale, Short-Term Capital Gain (STCG) u/s 50 is reported.
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100 font-semibold text-slate-700 uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Tax Block Name</th>
                      <th className="px-3 py-2.5 text-center">Rate</th>
                      <th className="px-3 py-2.5 text-right">Opening WDV</th>
                      <th className="px-3 py-2.5 text-right">Additions (≥180d)</th>
                      <th className="px-3 py-2.5 text-right">Additions (&lt;180d)</th>
                      <th className="px-3 py-2.5 text-right">Deductions</th>
                      <th className="px-3 py-2.5 text-right font-bold text-indigo-700">Tax Depr.</th>
                      <th className="px-3 py-2.5 text-right font-bold text-emerald-800">Closing WDV</th>
                      <th className="px-3 py-2.5 text-right">STCG / STCL u/s 50</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {taxReport.blocks.map((b: any) => (
                      <tr key={b.blockId} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {b.blockName}
                          {b.verifyWithCa && (
                            <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                              Verify CA
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-700">
                          {b.statutoryRate}%
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-600">
                          ₹{b.openingWdv.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-600">
                          ₹{b.additionsMoreThan180Days.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-amber-700">
                          ₹{b.additionsLessThan180Days.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-rose-600">
                          ₹{b.deductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                          ₹{b.depreciationAllowed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/20">
                          ₹{b.closingWdv.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold">
                          {b.capitalGainOrLoss !== 0 ? (
                            <span
                              className={
                                b.capitalGainOrLoss > 0 ? "text-rose-600" : "text-blue-600"
                              }
                            >
                              ₹{Math.abs(b.capitalGainOrLoss).toLocaleString("en-IN")}{" "}
                              {b.capitalGainOrLoss > 0 ? "(STCG)" : "(STCL)"}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-right">
                        Total Statutory Tax Depreciation:
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black text-indigo-800">
                        ₹{taxReport.grandTotal.depreciationAllowed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black text-emerald-900">
                        ₹{taxReport.grandTotal.closingWdv.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Books vs Tax Timing Differences Report */}
          {activeTab === "BOOKS_VS_TAX" && comparisonReport && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-6 p-5">
              <div className="border-b pb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Books vs Tax Timing Difference Reconciliation (Ind AS 12 / AS 22)
                </h3>
                <p className="text-xs text-slate-500">
                  Computation of timing differences between Financial Statements and Income-tax Act Section 32
                </p>
              </div>

              {/* Big Comparison KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <span className="block text-xs font-semibold text-slate-500 uppercase">
                    Books Depreciation (P&L)
                  </span>
                  <span className="text-2xl font-black text-slate-800 font-mono">
                    ₹{comparisonReport.booksDepreciationTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-1">Companies Act 2013</span>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-center">
                  <span className="block text-xs font-semibold text-indigo-600 uppercase">
                    Tax Depreciation (ITR)
                  </span>
                  <span className="text-2xl font-black text-indigo-900 font-mono">
                    ₹{comparisonReport.taxDepreciationTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[11px] text-indigo-400 mt-1">Section 32 Appendix I</span>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-center">
                  <span className="block text-xs font-semibold text-amber-700 uppercase">
                    Timing Difference
                  </span>
                  <span className="text-2xl font-black text-amber-900 font-mono">
                    ₹{Math.abs(comparisonReport.timingDifference).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[11px] text-amber-700 font-medium mt-1">
                    {comparisonReport.timingDifferenceNature}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
                <strong>Accounting Guidance for CA / Tax Auditor:</strong>
                <p className="mt-1">
                  In accordance with <em>Ind AS 12 / AS 22 (Accounting for Taxes on Income)</em>, when Books
                  Depreciation exceeds Tax Depreciation, a <strong>Deferred Tax Asset (DTA)</strong> may arise
                  subject to reasonable certainty. Conversely, where Tax Depreciation exceeds Books Depreciation,
                  a <strong>Deferred Tax Liability (DTL)</strong> is created in the books.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
