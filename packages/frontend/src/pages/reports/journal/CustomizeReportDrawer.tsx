import React, { useState } from "react";
import {
  X,
  SlidersHorizontal,
  Columns,
  Filter,
  FileSpreadsheet,
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { FieldCatalogItem } from "@/services/journalReportService";

export interface ReportConfig {
  period: string;
  from: string;
  to: string;
  dateField: "date" | "postedAt" | "createdAt" | "updatedAt";
  filterMode: "match_transactions" | "match_lines_only";
  layout: "blocks" | "flat" | "summary";
  voucherProfile: boolean;
  scale: "actual" | "thousand" | "lakh" | "crore";
  columns: string[];
  title: string;
  subtitle: string;
  showSignatureBlock: boolean;
  showFiltersSummary: boolean;
  customNotes: string;
  watermark: string;
  highlightBackdated: boolean;
  highlightEdited: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: ReportConfig;
  onApply: (newConfig: ReportConfig) => void;
  onOpenAdvancedFilter: () => void;
  fieldCatalog: FieldCatalogItem[];
}

export const CustomizeReportDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  onApply,
  onOpenAdvancedFilter,
  fieldCatalog,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "columns" | "filter" | "header" | "highlighting">("general");
  const [localConfig, setLocalConfig] = useState<ReportConfig>(config);
  const [columnSearch, setColumnSearch] = useState("");

  if (!isOpen) return null;

  const handleToggleColumn = (fieldId: string) => {
    setLocalConfig((prev) => {
      const exists = prev.columns.includes(fieldId);
      const nextCols = exists
        ? prev.columns.filter((c) => c !== fieldId)
        : [...prev.columns, fieldId];
      return { ...prev, columns: nextCols };
    });
  };

  const handleReset = () => {
    setLocalConfig(config);
  };

  const handleSaveAndRun = () => {
    onApply(localConfig);
    onClose();
  };

  const filteredFields = fieldCatalog.filter(
    (f) =>
      f.label.toLowerCase().includes(columnSearch.toLowerCase()) ||
      f.id.toLowerCase().includes(columnSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(columnSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-charcoal/40 backdrop-blur-xs transition-opacity">
      <div className="flex h-full w-full max-w-xl flex-col bg-card shadow-2xl border-l border-border animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-canvas/30">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-gold" />
            <div>
              <h2 className="font-display text-lg font-bold text-charcoal">Customize Report</h2>
              <p className="text-xs text-muted">QuickBooks-style flexible report customization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} title="Reset Changes">
              <RotateCcw className="h-4 w-4 mr-1 text-muted" />
              Reset
            </Button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-muted hover:bg-canvas hover:text-charcoal transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-canvas/50 px-4 text-xs font-semibold overflow-x-auto">
          {[
            { id: "general", label: "General", icon: SlidersHorizontal },
            { id: "columns", label: "Rows / Columns", icon: Columns },
            { id: "filter", label: "Filters", icon: Filter },
            { id: "header", label: "Header & Footer", icon: FileSpreadsheet },
            { id: "highlighting", label: "Highlighting", icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-3 whitespace-nowrap transition-colors ${
                  active
                    ? "border-gold text-gold font-bold bg-white"
                    : "border-transparent text-muted hover:text-charcoal"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "general" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-charcoal mb-1.5">Reporting Period</label>
                <select
                  value={localConfig.period}
                  onChange={(e) => setLocalConfig({ ...localConfig, period: e.target.value })}
                  className="h-10 w-full rounded-btn border border-border bg-white px-3 text-sm focus:border-gold outline-none"
                >
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_fy">This Financial Year (Apr - Mar)</option>
                  <option value="last_fy">Last Financial Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">From Date</label>
                  <Input
                    type="date"
                    value={localConfig.from}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, from: e.target.value, period: "custom" })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">To Date</label>
                  <Input
                    type="date"
                    value={localConfig.to}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, to: e.target.value, period: "custom" })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal mb-1.5">Date Basis Driving Report</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "date", label: "Transaction Date" },
                    { id: "postedAt", label: "Ledger Posting Date" },
                    { id: "createdAt", label: "System Creation Date" },
                    { id: "updatedAt", label: "Last Modified Date" },
                  ].map((db) => (
                    <label
                      key={db.id}
                      className={`flex items-center gap-2 p-2.5 rounded-btn border cursor-pointer transition-colors ${
                        localConfig.dateField === db.id
                          ? "border-gold bg-gold-tint font-bold text-gold-dark"
                          : "border-border hover:bg-canvas"
                      }`}
                    >
                      <input
                        type="radio"
                        name="dateField"
                        checked={localConfig.dateField === db.id}
                        onChange={() => setLocalConfig({ ...localConfig, dateField: db.id as any })}
                        className="text-gold focus:ring-gold"
                      />
                      <span>{db.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-xs font-bold text-charcoal mb-1.5">Accounting Balancing Filter Mode</label>
                <div className="space-y-2 text-xs">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-card border cursor-pointer ${
                      localConfig.filterMode === "match_transactions"
                        ? "border-emerald-600 bg-emerald-50/50"
                        : "border-border hover:bg-canvas"
                    }`}
                  >
                    <input
                      type="radio"
                      name="filterMode"
                      checked={localConfig.filterMode === "match_transactions"}
                      onChange={() =>
                        setLocalConfig({ ...localConfig, filterMode: "match_transactions" })
                      }
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-charcoal">Match Transactions (Default / Balanced)</span>
                      <p className="text-muted mt-0.5">
                        If any line matches criteria, the report retrieves all balancing debits and credits of that transaction. Guaranteed Total Debit = Total Credit.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-card border cursor-pointer ${
                      localConfig.filterMode === "match_lines_only"
                        ? "border-amber-600 bg-amber-50/50"
                        : "border-border hover:bg-canvas"
                    }`}
                  >
                    <input
                      type="radio"
                      name="filterMode"
                      checked={localConfig.filterMode === "match_lines_only"}
                      onChange={() =>
                        setLocalConfig({ ...localConfig, filterMode: "match_lines_only" })
                      }
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-charcoal">Match Lines Only (Partial Ledger View)</span>
                      <p className="text-muted mt-0.5">
                        Shows only individual lines that satisfy the filter (e.g. Sales lines only). Transactions are marked as partial view.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-xs font-bold text-charcoal mb-1.5">Presentation Profile</label>
                <label className="flex items-center gap-3 p-3 rounded-btn border border-border hover:bg-canvas cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.voucherProfile}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, voucherProfile: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-gold focus:ring-gold"
                  />
                  <div>
                    <span className="font-bold text-charcoal text-xs">Voucher-Style Profile (Tally Day Book)</span>
                    <p className="text-[11px] text-muted">
                      Uses traditional Indian voucher naming (Sales, Purchase, Payment, Receipt, Contra, Journal) and Dr/Cr suffixes.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal mb-1.5">Number Scaling</label>
                <select
                  value={localConfig.scale}
                  onChange={(e) => setLocalConfig({ ...localConfig, scale: e.target.value as any })}
                  className="h-10 w-full rounded-btn border border-border bg-white px-3 text-sm focus:border-gold outline-none"
                >
                  <option value="actual">Actual Amounts (₹)</option>
                  <option value="thousand">In Thousands (₹ '000)</option>
                  <option value="lakh">In Lakhs (₹ Lakh)</option>
                  <option value="crore">In Crores (₹ Cr)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "columns" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-charcoal">Select & Reorder Columns</h3>
                  <p className="text-[11px] text-muted">
                    {localConfig.columns.length} columns active out of {fieldCatalog.length} available
                  </p>
                </div>
                <Input
                  type="text"
                  placeholder="Search columns..."
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  className="h-8 max-w-[180px] text-xs"
                />
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-1 rounded-card border border-border p-2 bg-canvas/30">
                {filteredFields.map((field) => {
                  const isChecked = localConfig.columns.includes(field.id);
                  return (
                    <label
                      key={field.id}
                      className={`flex items-center justify-between p-2 rounded-btn text-xs cursor-pointer transition-colors ${
                        isChecked ? "bg-white shadow-xs font-semibold text-charcoal" : "hover:bg-canvas text-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleColumn(field.id)}
                          className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
                        />
                        <span>{field.label}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-muted font-mono">
                        {field.category}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "filter" && (
            <div className="space-y-5">
              <div className="rounded-card border border-border bg-canvas/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-charcoal">Visual Filter Builder</h3>
                    <p className="text-[11px] text-muted">Build multi-level nested AND/OR/NOT criteria</p>
                  </div>
                  <Button size="sm" onClick={onOpenAdvancedFilter} className="bg-gold text-white hover:bg-gold/90">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    Open Filter Builder
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-xs font-bold text-charcoal">Audit Integrity Filters</h4>
                <p className="text-[11px] text-muted">Run one-click forensic filters for audit & compliance</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalConfig({ ...localConfig, highlightBackdated: true });
                    }}
                    className="p-2.5 rounded-btn border border-border text-left hover:bg-canvas"
                  >
                    <span className="font-semibold block text-charcoal">Backdated Entries</span>
                    <span className="text-[10px] text-muted">Entries dated 3+ days before input</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalConfig({ ...localConfig, highlightEdited: true });
                    }}
                    className="p-2.5 rounded-btn border border-border text-left hover:bg-canvas"
                  >
                    <span className="font-semibold block text-charcoal">Edited After Posting</span>
                    <span className="text-[10px] text-muted">Entries updated post lock-in</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "header" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal mb-1">Report Title</label>
                <Input
                  type="text"
                  value={localConfig.title}
                  onChange={(e) => setLocalConfig({ ...localConfig, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal mb-1">Subtitle / Sub-heading</label>
                <Input
                  type="text"
                  value={localConfig.subtitle}
                  onChange={(e) => setLocalConfig({ ...localConfig, subtitle: e.target.value })}
                  placeholder="e.g. For statutory audit review"
                />
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <label className="flex items-center gap-2 text-xs text-charcoal font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.showSignatureBlock}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, showSignatureBlock: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-gold focus:ring-gold"
                  />
                  <span>Show Auditor Signature Block (Prepared / Reviewed / Approved By)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-charcoal font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.showFiltersSummary}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, showFiltersSummary: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-gold focus:ring-gold"
                  />
                  <span>Show Applied Filters Summary in Header / PDF</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal mb-1">Custom Notes / Disclaimer</label>
                <textarea
                  rows={3}
                  value={localConfig.customNotes}
                  onChange={(e) => setLocalConfig({ ...localConfig, customNotes: e.target.value })}
                  placeholder="Printed on the bottom of every exported page..."
                  className="w-full rounded-btn border border-border p-2 text-xs outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal mb-1">Watermark (Optional)</label>
                <Input
                  type="text"
                  value={localConfig.watermark}
                  onChange={(e) => setLocalConfig({ ...localConfig, watermark: e.target.value })}
                  placeholder="e.g. DRAFT, AUDITED, CONFIDENTIAL"
                />
              </div>
            </div>
          )}

          {activeTab === "highlighting" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-charcoal">Conditional Highlight Rules</h3>
                <p className="text-[11px] text-muted">Visually highlight critical accounting anomalies</p>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-center justify-between p-3 rounded-card border border-border hover:bg-canvas cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <div>
                      <span className="text-xs font-bold text-charcoal block">Backdated Entries</span>
                      <span className="text-[11px] text-muted">Created &gt; 3 days after document date</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localConfig.highlightBackdated}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, highlightBackdated: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-gold focus:ring-gold"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-card border border-border hover:bg-canvas cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <div>
                      <span className="text-xs font-bold text-charcoal block">Edited After Posting</span>
                      <span className="text-[11px] text-muted">Modified after ledger entry was posted</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localConfig.highlightEdited}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, highlightEdited: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-gold focus:ring-gold"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-canvas/30 px-6 py-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveAndRun} className="bg-gold text-white hover:bg-gold/90">
            <Check className="h-4 w-4 mr-1.5" />
            Apply & Run Report
          </Button>
        </div>
      </div>
    </div>
  );
};
