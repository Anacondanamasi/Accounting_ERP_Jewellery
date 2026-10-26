import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import {
  FileText,
  Printer,
  Download,
  Search,
  SlidersHorizontal,
  BookmarkPlus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  BookOpen,
  Lock,
  Clock,
  Edit3,
  Copy,
  FolderOpen,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  journalReportService,
  type JournalReportResponse,
  type JournalReportBlock,
  type JournalReportLine,
  type CustomReportItem,
  type FieldCatalogItem,
} from "@/services/journalReportService";
import { TransactionJournalModal } from "@/components/shared/TransactionJournalModal";
import {
  CustomizeReportDrawer,
  type ReportConfig,
} from "./journal/CustomizeReportDrawer";
import {
  AdvancedFilterBuilderModal,
  type FilterRow,
} from "./journal/AdvancedFilterBuilderModal";
import { SaveCustomReportModal } from "./journal/SaveCustomReportModal";
import { toast } from "sonner";

export const JournalReportPage: React.FC = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Configuration State
  const [config, setConfig] = useState<ReportConfig>({
    period: "this_month",
    from: (() => {
      const d = new Date();
      d.setDate(1);
      return d.toISOString().slice(0, 10);
    })(),
    to: new Date().toISOString().slice(0, 10),
    dateField: "date",
    filterMode: "match_transactions",
    layout: "blocks",
    voucherProfile: false,
    scale: "actual",
    columns: ["date", "entryNo", "voucherType", "partyName", "narration", "accountCode", "accountName", "debit", "credit"],
    title: "Transaction Journal",
    subtitle: "",
    showSignatureBlock: false,
    showFiltersSummary: true,
    customNotes: "",
    watermark: "",
    highlightBackdated: true,
    highlightEdited: true,
  });

  // Filters State
  const [inReportSearch, setInReportSearch] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<{
    logic: "AND" | "OR";
    rows: FilterRow[];
  }>({ logic: "AND", rows: [] });

  // Modals & Drawers State
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);

  // Inspection Drawer State
  const [journalModal, setJournalModal] = useState<{
    isOpen: boolean;
    type: string;
    id: number;
  }>({
    isOpen: false,
    type: "JOURNAL",
    id: 0,
  });

  // Query Field Catalog
  const { data: fieldCatalog = [] } = useQuery<FieldCatalogItem[]>({
    queryKey: ["journal-field-catalog"],
    queryFn: () => journalReportService.getFieldCatalog(),
  });

  // Query Custom Reports & Folders
  const { data: customReports = [], refetch: refetchCustomReports } = useQuery<CustomReportItem[]>({
    queryKey: ["custom-reports-list"],
    queryFn: () => journalReportService.listCustomReports(),
  });

  const { data: folders = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["report-folders-list"],
    queryFn: () => journalReportService.listFolders(),
  });

  // Build Payload for Backend Report Engine
  const reportPayload = useMemo(() => {
    return {
      period: config.period,
      from: config.from,
      to: config.to,
      dateField: config.dateField,
      filterMode: config.filterMode,
      layout: config.layout,
      voucherProfile: config.voucherProfile,
      columns: config.columns,
      filters:
        advancedFilters.rows.length > 0
          ? {
              logic: advancedFilters.logic,
              conditions: advancedFilters.rows.map((r) => ({
                field: r.field,
                operator: r.operator,
                value: r.value,
              })),
            }
          : undefined,
    };
  }, [config, advancedFilters]);

  // Main Report Query
  const { data, isLoading, isFetching, refetch } = useQuery<JournalReportResponse>({
    queryKey: ["journal-report-run", reportPayload],
    queryFn: () => journalReportService.runReport(reportPayload),
  });

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setIsCustomizeOpen((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setIsSaveModalOpen(true);
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        refetch();
        toast.info("Refreshing journal report...");
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [refetch]);

  // Export Trigger Handler
  const handleExport = async (format: "excel" | "pdf" | "csv") => {
    try {
      toast.info(`Generating ${format.toUpperCase()} export...`);
      const blob = await journalReportService.exportReport(reportPayload, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Journal_Report_${config.from}_to_${config.to}.${
        format === "excel" ? "xlsx" : format
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} export downloaded`);
    } catch (e: any) {
      toast.error(e.message || "Failed to download export");
    }
  };

  // Filter blocks by search term in memory for fast feedback
  const filteredBlocks = useMemo(() => {
    if (!data?.blocks) return [];
    if (!inReportSearch.trim()) return data.blocks;

    const query = inReportSearch.toLowerCase();
    return data.blocks.filter(
      (b) =>
        b.entryNo.toLowerCase().includes(query) ||
        b.narration?.toLowerCase().includes(query) ||
        b.partyName?.toLowerCase().includes(query) ||
        b.voucherType.toLowerCase().includes(query) ||
        b.lines.some(
          (l) =>
            l.accountCode.toLowerCase().includes(query) ||
            l.accountName.toLowerCase().includes(query) ||
            l.narration?.toLowerCase().includes(query)
        )
    );
  }, [data?.blocks, inReportSearch]);

  // Selected Lines Totals
  const selectedTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    if (!data) return { debit: 0, credit: 0, count: 0, isBalanced: true };

    const allLines: JournalReportLine[] = data.blocks
      ? data.blocks.flatMap((b) => b.lines)
      : data.flatLines || [];

    for (const l of allLines) {
      if (selectedLines.includes(l.id)) {
        debit += l.debit;
        credit += l.credit;
      }
    }

    return {
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
      count: selectedLines.length,
      isBalanced: Math.abs(debit - credit) < 0.01,
    };
  }, [selectedLines, data]);

  const toggleSelectLine = (id: number) => {
    setSelectedLines((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectBlock = (block: JournalReportBlock) => {
    const lineIds = block.lines.map((l) => l.id);
    const allSelected = lineIds.every((id) => selectedLines.includes(id));
    if (allSelected) {
      setSelectedLines((prev) => prev.filter((id) => !lineIds.includes(id)));
    } else {
      setSelectedLines((prev) => Array.from(new Set([...prev, ...lineIds])));
    }
  };

  const handleCopyTSV = () => {
    if (!data) return;
    const allLines = data.blocks ? data.blocks.flatMap((b) => b.lines) : data.flatLines || [];
    const linesToCopy = allLines.filter((l) => selectedLines.includes(l.id));
    if (linesToCopy.length === 0) return;

    const tsv = [
      "Date\tEntry No\tType\tAccount Code\tAccount Name\tDebit\tCredit\tNarration",
      ...linesToCopy.map(
        (l) =>
          `${l.date}\t${l.entryNo}\t${l.displayVoucherType}\t${l.accountCode}\t${l.accountName}\t${l.debit}\t${l.credit}\t${l.narration || ""}`
      ),
    ].join("\n");

    navigator.clipboard.writeText(tsv);
    toast.success(`${linesToCopy.length} lines copied to clipboard (TSV format)`);
  };

  const handleLoadCustomReport = (cr: CustomReportItem) => {
    try {
      const def = JSON.parse(cr.definition);
      setConfig((prev) => ({
        ...prev,
        ...def.general,
        columns: def.columns?.map((c: any) => c.field || c) || prev.columns,
        title: cr.name,
      }));
      toast.success(`Loaded report '${cr.name}'`);
    } catch (e) {
      toast.error("Failed to parse custom report definition");
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header Card */}
      <section className="rounded-card border border-border bg-card p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <span>Reports</span>
              <span>/</span>
              <span>Accountant</span>
              <span>/</span>
              <span className="text-charcoal font-bold">{config.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-charcoal">
                {config.title}
              </h1>
              {config.voucherProfile && (
                <span className="inline-flex items-center rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold-dark border border-gold/30">
                  Voucher Profile (Tally Day Book)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              {data?.periodLabel || "Period"} &bull; Real-time double-entry ledger facts &bull;{" "}
              {config.filterMode === "match_transactions" ? (
                <span className="text-emerald-700 font-semibold">
                  Match Transactions (Balanced ✓)
                </span>
              ) : (
                <span className="text-amber-700 font-semibold">
                  Match Lines Only (Partial View)
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizeOpen(true)}
              title="Customize Columns & Settings (Alt+C)"
              className="bg-white font-semibold"
            >
              <SlidersHorizontal className="mr-1.5 h-4 w-4 text-gold" />
              Customize
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaveModalOpen(true)}
              title="Save As Custom Report (Ctrl+Shift+S)"
              className="bg-white font-semibold"
            >
              <BookmarkPlus className="mr-1.5 h-4 w-4 text-sapphire" />
              Save As
            </Button>

            {/* Presets & Custom Reports Menu */}
            {customReports.length > 0 && (
              <div className="relative group">
                <Button variant="outline" size="sm" className="bg-white font-semibold">
                  <FolderOpen className="mr-1.5 h-4 w-4 text-purple-600" />
                  Custom ({customReports.length})
                  <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted" />
                </Button>
                <div className="absolute right-0 top-full mt-1 hidden w-64 rounded-card border border-border bg-white p-1.5 shadow-modal group-hover:block z-30">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                    Saved Reports
                  </div>
                  {customReports.map((cr) => (
                    <button
                      key={cr.id}
                      onClick={() => handleLoadCustomReport(cr)}
                      className="w-full text-left rounded-btn px-2.5 py-1.5 text-xs text-charcoal hover:bg-canvas font-medium flex items-center justify-between"
                    >
                      <span className="truncate">{cr.name}</span>
                      <span className="text-[10px] text-muted">{cr.visibility}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Export Menu */}
            <div className="relative group">
              <Button variant="outline" size="sm" className="bg-white font-semibold">
                <Download className="mr-1.5 h-4 w-4 text-emerald" />
                Export
                <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted" />
              </Button>
              <div className="absolute right-0 top-full mt-1 hidden w-44 rounded-card border border-border bg-white p-1 shadow-modal group-hover:block z-30">
                <button
                  onClick={() => handleExport("excel")}
                  className="w-full text-left rounded-btn px-3 py-2 text-xs font-semibold text-charcoal hover:bg-canvas"
                >
                  Excel Spreadsheet (.xlsx)
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full text-left rounded-btn px-3 py-2 text-xs font-semibold text-charcoal hover:bg-canvas"
                >
                  Printable Document (.pdf)
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full text-left rounded-btn px-3 py-2 text-xs font-semibold text-charcoal hover:bg-canvas"
                >
                  Comma Separated (.csv)
                </button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              title="Print View (Ctrl+P)"
              className="bg-white"
            >
              <Printer className="mr-1.5 h-4 w-4 text-charcoal" />
              Print
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              title="Refresh Data (R)"
              className="text-muted hover:text-charcoal"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-gold" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Quick Filters & Layout Switcher Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Quick Presets */}
            {[
              { id: "today", label: "Today" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "this_fy", label: "This FY" },
              { id: "last_fy", label: "Last FY" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setConfig({ ...config, period: p.id })}
                className={`rounded-btn px-3 py-1.5 text-xs font-semibold transition-colors ${
                  config.period === p.id
                    ? "bg-gold text-white shadow-xs"
                    : "border border-border bg-white text-muted hover:bg-canvas hover:text-charcoal"
                }`}
              >
                {p.label}
              </button>
            ))}

            {/* Layout Toggle Pills */}
            <div className="ml-2 inline-flex rounded-btn border border-border bg-canvas/60 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setConfig({ ...config, layout: "blocks" })}
                className={`rounded-btn px-2.5 py-1 transition-colors ${
                  config.layout === "blocks" ? "bg-white text-gold font-bold shadow-xs" : "text-muted"
                }`}
              >
                Blocks
              </button>
              <button
                onClick={() => setConfig({ ...config, layout: "flat" })}
                className={`rounded-btn px-2.5 py-1 transition-colors ${
                  config.layout === "flat" ? "bg-white text-gold font-bold shadow-xs" : "text-muted"
                }`}
              >
                Flat
              </button>
            </div>

            {/* Advanced Filters Button Pill */}
            <button
              onClick={() => setIsAdvancedFilterOpen(true)}
              className={`inline-flex items-center gap-1 rounded-btn px-3 py-1.5 text-xs font-semibold border transition-colors ${
                advancedFilters.rows.length > 0
                  ? "bg-sapphire/10 border-sapphire text-sapphire"
                  : "border-border bg-white text-muted hover:bg-canvas"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>
                {advancedFilters.rows.length > 0
                  ? `${advancedFilters.rows.length} Rules Active`
                  : "Filter Rules"}
              </span>
            </button>
          </div>

          {/* In-Report Quick Search */}
          <div className="relative min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search in report (Ctrl+F or /)..."
              value={inReportSearch}
              onChange={(e) => setInReportSearch(e.target.value)}
              className="h-9 w-full rounded-btn border border-border bg-white pl-9 pr-3 text-xs outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
            />
          </div>
        </div>
      </section>

      {/* Grand Totals Overview Bar */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 rounded-card border border-border bg-white p-3 shadow-xs">
          <div className="p-1">
            <span className="text-[11px] font-semibold text-muted block">Total Debits</span>
            <span className="font-mono text-base font-bold text-charcoal">
              {formatCurrency(data.grandTotals.totalDebit)}
            </span>
          </div>
          <div className="p-1">
            <span className="text-[11px] font-semibold text-muted block">Total Credits</span>
            <span className="font-mono text-base font-bold text-charcoal">
              {formatCurrency(data.grandTotals.totalCredit)}
            </span>
          </div>
          <div className="p-1">
            <span className="text-[11px] font-semibold text-muted block">Accounting Balance</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {data.grandTotals.isBalanced ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Balanced ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-ruby">
                  <AlertCircle className="h-4 w-4" /> Imbalance: {formatCurrency(data.grandTotals.netAmount)}
                </span>
              )}
            </div>
          </div>
          <div className="p-1">
            <span className="text-[11px] font-semibold text-muted block">Transactions</span>
            <span className="text-base font-bold text-charcoal">
              {data.grandTotals.transactionCount}
            </span>
          </div>
          <div className="p-1">
            <span className="text-[11px] font-semibold text-muted block">Total Ledger Lines</span>
            <span className="text-base font-bold text-charcoal">
              {data.grandTotals.lineCount}
            </span>
          </div>
          <div className="p-1">
            <span className="text-[11px] font-semibold text-muted block">Query Latency</span>
            <span className="text-xs font-mono font-medium text-muted block mt-1">
              {data.meta.serverTimeMs} ms
            </span>
          </div>
        </div>
      )}

      {/* Main Journal Data Grid */}
      <section className="rounded-card border border-border bg-card shadow-card overflow-hidden">
        {isLoading && (
          <div className="py-20 text-center text-muted">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-sm font-semibold">Running journal report engine...</p>
          </div>
        )}

        {!isLoading && filteredBlocks.length === 0 && (
          <div className="py-16 text-center text-muted">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-gold/60" />
            <p className="font-semibold text-charcoal">No journal entries match these filters</p>
            <p className="text-xs text-muted mt-1">
              Try widening the date range or clicking "Clear All Rules" in the filter builder.
            </p>
          </div>
        )}

        {!isLoading && filteredBlocks.length > 0 && config.layout === "blocks" && (
          <div className="divide-y divide-border/80">
            {filteredBlocks.map((block) => {
              const allBlockLinesSelected = block.lines.every((l) =>
                selectedLines.includes(l.id)
              );

              return (
                <div key={block.id} className="transition-colors hover:bg-canvas/20">
                  {/* Transaction Block Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas/40 px-4 py-2.5 text-xs border-b border-border/40">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allBlockLinesSelected}
                        onChange={() => toggleSelectBlock(block)}
                        className="h-3.5 w-3.5 rounded text-gold focus:ring-gold"
                      />
                      <span className="font-semibold text-muted">{formatDate(block.date)}</span>
                      <button
                        onClick={() => {
                          if (block.voucherType === "INVOICE") navigate(`/invoices/${block.sourceId}/edit`);
                          else if (block.voucherType === "BILL") navigate(`/bills/${block.sourceId}/edit`);
                          else setJournalModal({ isOpen: true, type: block.voucherType, id: block.sourceId });
                        }}
                        className="font-mono font-bold text-sapphire hover:text-gold hover:underline flex items-center gap-1"
                      >
                        {block.entryNo}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </button>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-[11px] text-slate-700">
                        {block.displayVoucherType}
                      </span>
                      {block.partyName && (
                        <span className="font-semibold text-charcoal">{block.partyName}</span>
                      )}
                      {block.narration && block.narration !== block.partyName && (
                        <span className="truncate max-w-[280px] text-muted italic">
                          "{block.narration}"
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {block.isBalanced ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Balanced ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <AlertCircle className="h-3.5 w-3.5" /> Partial View
                        </span>
                      )}
                      <button
                        onClick={() =>
                          setJournalModal({
                            isOpen: true,
                            type: block.voucherType,
                            id: block.sourceId,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-semibold text-charcoal border border-border hover:bg-canvas"
                      >
                        <BookOpen className="h-3 w-3 text-gold" />
                        Journal Fact
                      </button>
                    </div>
                  </div>

                  {/* Transaction Ledger Lines Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-canvas/20 text-muted uppercase text-[10px] tracking-wider border-b border-border/40">
                        <tr>
                          <th className="w-8 px-4 py-1.5 text-left">#</th>
                          <th className="px-4 py-1.5 text-left">Account</th>
                          <th className="px-4 py-1.5 text-left">Description</th>
                          <th className="px-4 py-1.5 text-right">Debit</th>
                          <th className="px-4 py-1.5 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {block.lines.map((line) => {
                          const isLineSelected = selectedLines.includes(line.id);
                          return (
                            <tr
                              key={line.id}
                              onClick={() => toggleSelectLine(line.id)}
                              className={`cursor-pointer transition-colors ${
                                isLineSelected ? "bg-amber-50/60" : "hover:bg-amber-50/30"
                              }`}
                            >
                              <td className="px-4 py-2 text-muted font-mono">{line.lineNo}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <Link
                                    to={`/ledger/${line.accountId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-mono font-bold text-sapphire hover:text-gold hover:underline"
                                  >
                                    {line.accountCode}
                                  </Link>
                                  <span className="font-semibold text-charcoal">{line.accountName}</span>
                                  {line.isControlAccount && (
                                    <span title="Control Account">
                                      <Lock className="h-3 w-3 text-muted" />
                                    </span>
                                  )}
                                  {config.highlightBackdated && line.isBackdated && (
                                    <span
                                      className="inline-block h-2 w-2 rounded-full bg-amber-500"
                                      title="Backdated entry"
                                    />
                                  )}
                                  {config.highlightEdited && line.isEditedAfterPosting && (
                                    <span
                                      className="inline-block h-2 w-2 rounded-full bg-blue-500"
                                      title="Edited after posting"
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-muted truncate max-w-[320px]">
                                {line.narration || "-"}
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-semibold text-charcoal">
                                {line.debit > 0 ? formatCurrency(line.debit) : ""}
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-semibold text-charcoal">
                                {line.credit > 0 ? formatCurrency(line.credit) : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Subtotal Row */}
                      <tfoot className="border-t border-border/40 bg-canvas/20 font-mono font-bold text-charcoal">
                        <tr>
                          <td colSpan={3} className="px-4 py-1.5 text-right text-[11px] uppercase tracking-wider text-muted">
                            Total {block.entryNo}:
                          </td>
                          <td className="px-4 py-1.5 text-right">{formatCurrency(block.totalDebit)}</td>
                          <td className="px-4 py-1.5 text-right">{formatCurrency(block.totalCredit)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Selected Lines Summary Footer Bar */}
      {selectedLines.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-full border border-border bg-charcoal px-6 py-3 text-white shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-semibold text-gold">
            {selectedTotals.count} lines selected
          </span>
          <div className="h-4 w-px bg-white/20" />
          <div className="text-xs font-mono">
            <span className="text-white/60 mr-1">Dr:</span>
            <span className="font-bold text-white">{formatCurrency(selectedTotals.debit)}</span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-white/60 mr-1">Cr:</span>
            <span className="font-bold text-white">{formatCurrency(selectedTotals.credit)}</span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <button
            onClick={handleCopyTSV}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline"
          >
            <Copy className="h-3.5 w-3.5" /> Copy TSV
          </button>
          <button
            onClick={() => setSelectedLines([])}
            className="text-xs text-white/60 hover:text-white"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Auditor Signature Block for print & export */}
      {config.showSignatureBlock && (
        <div className="mt-8 border-t-2 border-dashed border-border pt-6 grid grid-cols-3 gap-6 text-center text-xs text-muted">
          <div>
            <div className="h-10 border-b border-border" />
            <p className="mt-1.5 font-bold text-charcoal">Prepared By</p>
            <p className="text-[10px]">Accountant / Data Operator</p>
          </div>
          <div>
            <div className="h-10 border-b border-border" />
            <p className="mt-1.5 font-bold text-charcoal">Reviewed By</p>
            <p className="text-[10px]">Senior Financial Controller</p>
          </div>
          <div>
            <div className="h-10 border-b border-border" />
            <p className="mt-1.5 font-bold text-charcoal">Approved / Audited By</p>
            <p className="text-[10px]">Chartered Accountant / Partner</p>
          </div>
        </div>
      )}

      {/* Slide-over Customize Drawer */}
      <CustomizeReportDrawer
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        config={config}
        onApply={(newConfig) => setConfig(newConfig)}
        onOpenAdvancedFilter={() => {
          setIsCustomizeOpen(false);
          setIsAdvancedFilterOpen(true);
        }}
        fieldCatalog={fieldCatalog}
      />

      {/* Advanced Filter Builder Modal */}
      <AdvancedFilterBuilderModal
        isOpen={isAdvancedFilterOpen}
        onClose={() => setIsAdvancedFilterOpen(false)}
        fieldCatalog={fieldCatalog}
        initialRows={advancedFilters.rows}
        initialLogic={advancedFilters.logic}
        onApplyFilters={(logic, rows) => {
          setAdvancedFilters({ logic, rows });
          toast.success(`${rows.length} filter rules applied`);
        }}
      />

      {/* Save Custom Report Modal */}
      <SaveCustomReportModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        reportDefinition={reportPayload}
        folders={folders}
        onSaved={() => refetchCustomReports()}
      />

      {/* Single Transaction Journal Modal */}
      <TransactionJournalModal
        isOpen={journalModal.isOpen}
        onClose={() => setJournalModal({ ...journalModal, isOpen: false })}
        type={journalModal.type}
        id={journalModal.id}
      />
    </div>
  );
};
