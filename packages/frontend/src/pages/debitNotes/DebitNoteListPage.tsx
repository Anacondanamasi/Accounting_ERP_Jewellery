import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  X,
  Pencil,
  FileText,
  TrendingDown,
  Building,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { noteService } from "@/services/noteService";
import { supplierService } from "@/services/supplierService";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { PERIOD_PRESETS, getDatesForPeriod } from "@/lib/periodUtils";
import { toast } from "sonner";

export const DebitNoteListPage = () => {
  const navigate = useNavigate();

  // Filters state
  const initialDates = getDatesForPeriod("all_time");
  const [period, setPeriod] = useState("all_time");
  const [range, setRange] = useState(initialDates);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["debit-notes"],
    queryFn: () => noteService.debit.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-for-debit-notes"],
    queryFn: () => supplierService.list({}),
  });

  // Filter handlers
  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (val !== "custom") {
      const dates = getDatesForPeriod(val);
      setRange(dates);
    }
  };

  const clearFilters = () => {
    setPeriod("all_time");
    setRange(getDatesForPeriod("all_time"));
    setSelectedSupplierId("");
    setSelectedStatus("ALL");
    setSearchQuery("");
  };

  const hasActiveFilters =
    period !== "all_time" ||
    Boolean(selectedSupplierId) ||
    selectedStatus !== "ALL" ||
    Boolean(searchQuery);

  // Client-side filtering
  const displayNotes = useMemo(() => {
    return (data || []).filter((note: any) => {
      // Date filter
      if (range.from) {
        const d = new Date(note.date).toISOString().slice(0, 10);
        if (d < range.from) return false;
      }
      if (range.to) {
        const d = new Date(note.date).toISOString().slice(0, 10);
        if (d > range.to) return false;
      }

      // Supplier filter
      if (selectedSupplierId && String(note.supplierId) !== String(selectedSupplierId)) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "ALL") {
        const noteStatus = (note.status || "POSTED").toUpperCase();
        if (noteStatus !== selectedStatus.toUpperCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const noteNo = (note.noteNo || "").toLowerCase();
        const supplierName = (note.supplier?.name || "").toLowerCase();
        const supplierCode = (note.supplier?.code || "").toLowerCase();
        const refNo = (note.referenceNo || "").toLowerCase();
        const reason = (note.reason || "").toLowerCase();

        return (
          noteNo.includes(q) ||
          supplierName.includes(q) ||
          supplierCode.includes(q) ||
          refNo.includes(q) ||
          reason.includes(q)
        );
      }

      return true;
    });
  }, [data, range, selectedSupplierId, selectedStatus, searchQuery]);

  // KPI Calculations
  const totalNotesCount = displayNotes.length;
  const totalDebitAmount = useMemo(
    () => displayNotes.reduce((sum: number, n: any) => sum + Number(n.grandTotal || 0), 0),
    [displayNotes],
  );

  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return displayNotes
      .filter((n: any) => {
        const d = new Date(n.date);
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      })
      .reduce((sum: number, n: any) => sum + Number(n.grandTotal || 0), 0);
  }, [displayNotes]);

  const totalSubtotal = useMemo(
    () => displayNotes.reduce((sum: number, n: any) => sum + Number(n.subTotal || 0), 0),
    [displayNotes],
  );

  const totalTax = useMemo(
    () => displayNotes.reduce((sum: number, n: any) => sum + Number(n.taxTotal || 0), 0),
    [displayNotes],
  );

  // CSV Export
  const handleExportCSV = () => {
    if (displayNotes.length === 0) {
      toast.info("No debit notes to export");
      return;
    }
    const headers = [
      "Note No",
      "Date",
      "Supplier Code",
      "Supplier Name",
      "Ref Bill",
      "Reason",
      "Subtotal",
      "Tax Amount",
      "Grand Total",
      "Status",
    ];
    const rows = displayNotes.map((n: any) => [
      n.noteNo || "",
      formatDate(n.date),
      n.supplier?.code || "",
      `"${n.supplier?.name || "Direct Supplier"}"`,
      n.referenceNo || "-",
      `"${n.reason || ""}"`,
      Number(n.subTotal || 0).toFixed(2),
      Number(n.taxTotal || 0).toFixed(2),
      Number(n.grandTotal || 0).toFixed(2),
      n.status || "POSTED",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: string[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Debit_Notes_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Debit notes exported successfully");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Page Header ────────────────────────────────────────── */}
      <PageHeader
        title="Debit Notes"
        subtitle="Manage purchase returns, rate revisions, and supplier debits"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-card px-3 text-xs font-semibold text-charcoal shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-muted" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-card px-3 text-xs font-semibold text-charcoal shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-muted" />
              Print
            </button>
            <button
              onClick={() => navigate("/debit-notes/new")}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-gold px-4 text-xs font-bold text-white shadow-sm hover:bg-gold-dark transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Debit Note
            </button>
          </div>
        }
      />

      {/* ── KPI Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Notes */}
        <div className="rounded-card border-t-2 border-t-gold bg-card p-4 shadow-card">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Debit Notes</span>
            <FileText className="h-4 w-4 text-gold" />
          </div>
          <div className="mt-2 text-2xl font-bold text-charcoal font-mono">
            {totalNotesCount}
          </div>
          <div className="mt-1 text-[11px] text-muted">Total records in active filter</div>
        </div>

        {/* Total Debit Amount */}
        <div className="rounded-card border-t-2 border-t-emerald-500 bg-card p-4 shadow-card">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Debits</span>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            {formatCurrency(totalDebitAmount)}
          </div>
          <div className="mt-1 text-[11px] text-muted">Cumulative supplier debits</div>
        </div>

        {/* This Month */}
        <div className="rounded-card border-t-2 border-t-sapphire bg-card p-4 shadow-card">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
            <Building className="h-4 w-4 text-sapphire" />
          </div>
          <div className="mt-2 text-2xl font-bold text-charcoal font-mono">
            {formatCurrency(thisMonthTotal)}
          </div>
          <div className="mt-1 text-[11px] text-muted">Debits issued this calendar month</div>
        </div>

        {/* Average Note Amount */}
        <div className="rounded-card border-t-2 border-t-amber-500 bg-card p-4 shadow-card">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Debit Note</span>
            <CheckCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-charcoal font-mono">
            {formatCurrency(totalNotesCount > 0 ? totalDebitAmount / totalNotesCount : 0)}
          </div>
          <div className="mt-1 text-[11px] text-muted">Mean value per debit voucher</div>
        </div>
      </div>

      {/* ── Filters & Controls Bar ─────────────────────────────── */}
      <div className="rounded-card border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search by Note #, Supplier, Bill #, Reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-border bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-charcoal focus:border-gold focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Period Preset Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted">Period:</span>
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="rounded border border-border bg-white px-2.5 py-1.5 text-xs text-charcoal focus:border-gold focus:outline-none"
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Pickers */}
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={range.from}
                onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
                className="rounded border border-border bg-white px-2 py-1 text-xs text-charcoal focus:border-gold focus:outline-none"
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                value={range.to}
                onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
                className="rounded border border-border bg-white px-2 py-1 text-xs text-charcoal focus:border-gold focus:outline-none"
              />
            </div>
          )}

          {/* Supplier Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted">Supplier:</span>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="rounded border border-border bg-white px-2.5 py-1.5 text-xs text-charcoal focus:border-gold focus:outline-none max-w-[200px]"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded border border-border bg-white px-2.5 py-1.5 text-xs text-charcoal focus:border-gold focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="POSTED">Posted</option>
              <option value="DRAFT">Draft</option>
              <option value="APPLIED">Applied</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              type="button"
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table Container ────────────────────────────────────── */}
      <div className="rounded-card border-t-2 border-t-gold bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 bg-slate-50/40 text-xs text-muted">
          <span>
            Showing <strong className="text-charcoal font-mono">{displayNotes.length}</strong> debit notes
          </span>
          <span className="text-[11px] text-muted italic">
            Tip: Click anywhere on a row to open for editing
          </span>
        </div>

        <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gold-tint text-charcoal shadow-sm">
              <tr>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Note #
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Date
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Supplier
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Reason / Category
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Ref Bill
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Subtotal (₹)
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Tax (₹)
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Grand Total (₹)
                </th>
                <th className="border-b border-border px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted">
                    Loading debit notes...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-ruby">
                    <p className="font-semibold text-slate-700">Failed to load debit notes</p>
                    <button
                      onClick={() => void refetch()}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-gold-metallic font-semibold underline hover:text-gold-dark"
                    >
                      Retry loading
                    </button>
                  </td>
                </tr>
              ) : displayNotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted">
                    <FileText className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-base font-semibold text-slate-600">No debit notes found</p>
                    <p className="text-xs text-muted mt-1">
                      {searchQuery || hasActiveFilters
                        ? "Try clearing your search query or filters."
                        : "Click '+ Create Debit Note' above to record a purchase return or debit."}
                    </p>
                  </td>
                </tr>
              ) : (
                displayNotes.map((row: any) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/debit-notes/${row.id}/edit`)}
                    className="hover:bg-gold-tint/15 cursor-pointer transition-colors group"
                  >
                    {/* Note # */}
                    <td className="px-4 py-3 font-mono font-bold text-xs text-charcoal whitespace-nowrap">
                      <span className="group-hover:text-gold-dark transition-colors">
                        {row.noteNo || `DBN-#${row.id}`}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-3 font-medium text-charcoal">
                      <div className="flex flex-col">
                        <span>{row.supplier?.name || "Direct Supplier"}</span>
                        {row.supplier?.code && (
                          <span className="font-mono text-[10px] text-muted">
                            {row.supplier.code}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate">
                      {row.reason || "Purchase Return"}
                    </td>

                    {/* Ref Bill */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {row.referenceNo || "-"}
                    </td>

                    {/* Subtotal */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 whitespace-nowrap">
                      {formatCurrency(row.subTotal || 0)}
                    </td>

                    {/* Tax */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                      {formatCurrency(row.taxTotal || 0)}
                    </td>

                    {/* Grand Total */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-sm text-charcoal whitespace-nowrap">
                      {formatCurrency(row.grandTotal || 0)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <StatusBadge status={row.status || "POSTED"} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Sticky Summary Accounting Footer */}
            {displayNotes.length > 0 && (
              <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 backdrop-blur font-bold text-xs border-t-2 border-border shadow-inner">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-slate-700 uppercase tracking-wider">
                    Total ({displayNotes.length} records)
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 whitespace-nowrap">
                    {formatCurrency(totalSubtotal)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 whitespace-nowrap">
                    {formatCurrency(totalTax)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-charcoal whitespace-nowrap">
                    {formatCurrency(totalDebitAmount)}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
