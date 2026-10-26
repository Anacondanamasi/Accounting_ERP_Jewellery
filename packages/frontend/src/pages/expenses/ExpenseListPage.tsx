import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  Download,
  Printer,
  Search,
  TrendingDown,
  Clock,
  Layers,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { expenseService } from "@/services/expenseService";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { PERIOD_PRESETS, getDatesForPeriod } from "@/lib/periodUtils";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface ExpenseRow {
  id: number;
  date: string;
  reference: string | null;
  amount: number;
  narration: string | null;
  expenseAccount: string;
  paymentAccount: string;
  supplierName: string | null;
  journalEntryNo: string | null;
}

export const ExpenseListPage = () => {
  const navigate = useNavigate();

  // Filters
  const initialDates = getDatesForPeriod("all_time");
  const [period, setPeriod] = useState("all_time");
  const [range, setRange] = useState(initialDates);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpenseAccount, setSelectedExpenseAccount] = useState("");

  const { data = [], isLoading } = useQuery<ExpenseRow[]>({
    queryKey: ["expenses-list", range.from, range.to],
    queryFn: () =>
      expenseService.list({
        from: range.from,
        to: range.to,
      }),
  });

  // Filter handlers
  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (val !== "custom") {
      const dates = getDatesForPeriod(val);
      setRange(dates);
    }
  };

  const handleManualDateChange = (field: "from" | "to", val: string) => {
    setPeriod("custom");
    setRange((prev) => ({ ...prev, [field]: val }));
  };

  const handleResetFilters = () => {
    const dates = getDatesForPeriod("all_time");
    setPeriod("all_time");
    setRange(dates);
    setSearchQuery("");
    setSelectedExpenseAccount("");
  };

  // Unique Expense Accounts for dropdown
  const expenseAccounts = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r) => {
      if (r.expenseAccount) set.add(r.expenseAccount);
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtered rows
  const displayExpenses = useMemo(() => {
    return (data ?? []).filter((r) => {
      if (selectedExpenseAccount && r.expenseAccount !== selectedExpenseAccount) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const ref = r.reference?.toLowerCase() || "";
      const expAcc = r.expenseAccount?.toLowerCase() || "";
      const payAcc = r.paymentAccount?.toLowerCase() || "";
      const supp = r.supplierName?.toLowerCase() || "";
      const narr = r.narration?.toLowerCase() || "";
      const voucher = r.journalEntryNo?.toLowerCase() || "";
      const amt = String(r.amount);

      return (
        ref.includes(q) ||
        expAcc.includes(q) ||
        payAcc.includes(q) ||
        supp.includes(q) ||
        narr.includes(q) ||
        voucher.includes(q) ||
        amt.includes(q)
      );
    });
  }, [data, searchQuery, selectedExpenseAccount]);

  // KPIs
  const totalExpenses = useMemo(
    () => displayExpenses.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [displayExpenses],
  );

  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return displayExpenses
      .filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      })
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [displayExpenses]);

  // Top category
  const topCategory = useMemo(() => {
    const map = new Map<string, number>();
    displayExpenses.forEach((r) => {
      const cat = r.expenseAccount || "Other";
      map.set(cat, (map.get(cat) || 0) + Number(r.amount || 0));
    });
    let topName = "—";
    let topVal = 0;
    map.forEach((val, key) => {
      if (val > topVal) {
        topVal = val;
        topName = key;
      }
    });
    return { name: topName, amount: topVal };
  }, [displayExpenses]);

  // Export CSV
  const handleExportCSV = () => {
    if (displayExpenses.length === 0) {
      toast.info("No expenses to export");
      return;
    }
    const headers = [
      "Date",
      "Voucher #",
      "Expense Ledger",
      "Paid Via",
      "Supplier / Payee",
      "Reference",
      "Narration",
      "Amount",
    ];
    const rows = displayExpenses.map((r) => [
      formatDate(r.date),
      r.journalEntryNo || "",
      `"${r.expenseAccount || ""}"`,
      `"${r.paymentAccount || ""}"`,
      `"${r.supplierName || ""}"`,
      `"${r.reference || ""}"`,
      `"${(r.narration || "").replace(/"/g, '""')}"`,
      r.amount.toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Direct_Expenses_${range.from}_to_${range.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Direct Expenses"
          subtitle="Operational expenses paid directly from Cash or Bank accounts"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            type="button"
            className="flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={handleExportCSV}
            type="button"
            className="flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-charcoal hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => navigate("/expenses/new")}
            type="button"
            className="flex h-10 items-center gap-2 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow hover:bg-gold/90 transition-colors"
          >
            <Receipt className="h-4 w-4" /> + Add Expense
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Expenses
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-ruby/10 text-ruby">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-ruby">
            {formatCurrency(totalExpenses)}
          </div>
          <p className="mt-1 text-xs text-muted">Across {displayExpenses.length} entries</p>
        </div>

        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              This Month
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-sapphire/10 text-sapphire">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-charcoal">
            {formatCurrency(thisMonthExpenses)}
          </div>
          <p className="mt-1 text-xs text-muted">Paid in current month</p>
        </div>

        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Top Category
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-500/10 text-amber-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold text-charcoal truncate" title={topCategory.name}>
            {topCategory.name}
          </div>
          <p className="mt-1 text-xs font-mono font-semibold text-muted">
            {formatCurrency(topCategory.amount)}
          </p>
        </div>

        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Entries
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-charcoal">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-charcoal">
            {displayExpenses.length}
          </div>
          <p className="mt-1 text-xs text-muted">Recorded expense transactions</p>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="rounded-card border border-border bg-card p-5 shadow-card space-y-4">
        <div className="grid gap-4 md:grid-cols-12">
          {/* Period Preset */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Select Period
            </label>
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm font-medium text-charcoal focus:border-gold focus:outline-none"
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              From Date
            </label>
            <input
              type="date"
              value={range.from}
              onChange={(e) => handleManualDateChange("from", e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              To Date
            </label>
            <input
              type="date"
              value={range.to}
              onChange={(e) => handleManualDateChange("to", e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Expense Ledger / Category
            </label>
            <select
              value={selectedExpenseAccount}
              onChange={(e) => setSelectedExpenseAccount(e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
            >
              <option value="">All Expense Ledgers</option>
              {expenseAccounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Search + Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search by narration, payee, voucher, reference or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-border bg-white pl-9 pr-3 py-1.5 text-xs text-charcoal placeholder-muted focus:border-gold focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-muted hover:text-charcoal underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
        <div className="border-b border-border bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Expense Records
          </h3>
          <span className="text-xs text-muted font-medium">
            Showing {displayExpenses.length} entries
          </span>
        </div>

        <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gold-tint text-charcoal shadow-sm">
              <tr>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Date
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Voucher #
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Expense Ledger
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Paid Via
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Supplier / Payee
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Narration / Notes
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted">
                    Loading expenses...
                  </td>
                </tr>
              ) : displayExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted">
                    <Receipt className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-base font-semibold text-slate-600">No expense records found</p>
                    <p className="text-xs text-muted mt-1">
                      {searchQuery
                        ? "Try clearing your search query or filters."
                        : "Click '+ Add Expense' above to record a new business expense."}
                    </p>
                  </td>
                </tr>
              ) : (
                displayExpenses.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/expenses/${row.id}/edit`)}
                    className="hover:bg-gold-tint/15 cursor-pointer transition-colors group"
                  >
                    {/* Date */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>

                    {/* Voucher */}
                    <td className="px-4 py-3 font-mono font-bold text-xs text-charcoal whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 group-hover:text-gold-dark transition-colors">
                        {row.journalEntryNo || `EXP-${row.id}`}
                      </span>
                    </td>

                    {/* Expense Account */}
                    <td className="px-4 py-3 font-medium text-charcoal">
                      <span className="font-semibold text-charcoal">
                        {row.expenseAccount || "Expense"}
                      </span>
                    </td>

                    {/* Paid Via */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-700">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {row.paymentAccount || "Bank / Cash"}
                      </span>
                    </td>

                    {/* Supplier / Payee */}
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {row.supplierName ? (
                        <span className="font-medium text-charcoal">{row.supplierName}</span>
                      ) : (
                        <span className="text-muted italic">—</span>
                      )}
                    </td>

                    {/* Narration */}
                    <td className="px-4 py-3 text-xs text-muted max-w-sm truncate" title={row.narration || row.reference || ""}>
                      {row.narration || row.reference || "—"}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-ruby whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Footer */}
            {displayExpenses.length > 0 && (
              <tfoot className="border-t-2 border-b-2 border-border bg-gold-tint/40 font-bold text-sm sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={6} className="px-4 py-3 font-bold uppercase tracking-wider text-charcoal">
                    Total Expenses
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold text-ruby whitespace-nowrap">
                    {formatCurrency(totalExpenses)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
