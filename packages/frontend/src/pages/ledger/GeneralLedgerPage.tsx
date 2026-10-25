import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { ExportButton } from "@/components/shared/ExportButton";
import { useExport } from "@/hooks/useExport";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { reportsService } from "@/services/reportsService";
import { accountsService } from "@/services/accountsService";
import { PERIOD_PRESETS, getDatesForPeriod } from "@/lib/periodUtils";
import { BookOpen, ArrowLeft, Printer, Search } from "lucide-react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";

interface LedgerRow {
  id?: number;
  entryId?: number;
  voucherType?: string;
  date: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

const isDebitNatureAccount = (type?: string): boolean => {
  const norm = String(type || "").trim().toLowerCase();
  return (
    norm === "asset" ||
    norm === "assets" ||
    norm === "expense" ||
    norm === "expenses" ||
    norm === "cogs"
  );
};

const findMatchingPeriod = (from: string, to: string): string => {
  for (const preset of PERIOD_PRESETS) {
    if (preset.value === "custom") continue;
    const dates = preset.getFromTo();
    if (dates.from === from && dates.to === to) {
      return preset.value;
    }
  }
  return "custom";
};

export const GeneralLedgerPage = () => {
  const { accountId: paramAccountId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { exportReport } = useExport();

  const queryFrom = searchParams.get("from");
  const queryTo = searchParams.get("to");
  const queryPeriod = searchParams.get("period");

  const [accountId, setAccountId] = useState(paramAccountId || "");
  const [period, setPeriod] = useState<string>(() => {
    if (queryPeriod) return queryPeriod;
    if (queryFrom && queryTo) return findMatchingPeriod(queryFrom, queryTo);
    return "all_time";
  });

  const [range, setRange] = useState(() => {
    if (queryFrom && queryTo) {
      return { from: queryFrom, to: queryTo };
    }
    return getDatesForPeriod(period);
  });

  const [searchTable, setSearchTable] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-minimal"],
    queryFn: () => accountsService.list(),
  });

  // Resolve accountId if paramAccountId was provided as code or ID
  useEffect(() => {
    if (paramAccountId) {
      if (accounts.length > 0) {
        const found = accounts.find(
          (a: any) => String(a.id) === paramAccountId || String(a.code) === paramAccountId,
        );
        if (found) {
          setAccountId(String(found.id));
          return;
        }
      }
      setAccountId(paramAccountId);
    }
  }, [paramAccountId, accounts]);

  useEffect(() => {
    if (queryFrom && queryTo) {
      setRange({ from: queryFrom, to: queryTo });
      if (!queryPeriod) {
        setPeriod(findMatchingPeriod(queryFrom, queryTo));
      }
    }
  }, [queryFrom, queryTo, queryPeriod]);

  const accountOptions = accounts.map((acc: any) => ({
    value: String(acc.id),
    label: `${acc.code} - ${acc.name}`,
    meta: acc.group,
  }));

  const selectedAccount = useMemo(() => {
    return accounts.find((a: any) => String(a.id) === accountId || String(a.code) === accountId);
  }, [accounts, accountId]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ledger", accountId, range.from, range.to],
    queryFn: () =>
      accountId
        ? reportsService.getGeneralLedger({
            accountId: Number(accountId) || (accountId as any),
            code: isNaN(Number(accountId)) ? accountId : undefined,
            from: range.from,
            to: range.to,
          })
        : null,
    enabled: !!accountId,
  });

  const handleAccountChange = (val: string) => {
    setAccountId(val);
    const search = range.from && range.to ? `?from=${range.from}&to=${range.to}&period=${period}` : "";
    if (val) navigate(`/ledger/${val}${search}`);
    else navigate(`/ledger${search}`);
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod === "custom") {
      setSearchParams({ from: range.from, to: range.to, period: "custom" }, { replace: true });
    } else {
      const dates = getDatesForPeriod(newPeriod);
      setRange(dates);
      setSearchParams({ from: dates.from, to: dates.to, period: newPeriod }, { replace: true });
    }
  };

  const handleManualDateChange = (field: "from" | "to", val: string) => {
    const updated = { ...range, [field]: val };
    setRange(updated);
    setPeriod("custom");
    setSearchParams({ from: updated.from, to: updated.to, period: "custom" }, { replace: true });
  };

  const handleOpenEntry = (row: LedgerRow) => {
    const targetId = row.entryId || row.id;
    if (!targetId) return;

    if (row.voucherNo?.startsWith("INV-")) {
      navigate(`/invoices/${targetId}/edit`);
    } else if (row.voucherNo?.startsWith("BILL-")) {
      navigate(`/bills/${targetId}/edit`);
    } else {
      navigate(`/journal/${targetId}/edit`);
    }
  };

  const isDebitNature = isDebitNatureAccount(data?.account?.type || selectedAccount?.type);

  const transactions: LedgerRow[] = data?.transactions ?? [];
  const openingBalance = Number(data?.openingBalance ?? 0);
  const closingBalance = Number(data?.closingBalance ?? openingBalance);

  const totalDr = transactions.reduce((sum: number, r: LedgerRow) => sum + (r.debit || 0), 0);
  const totalCr = transactions.reduce((sum: number, r: LedgerRow) => sum + (r.credit || 0), 0);

  // Opening balance breakdown for row 1
  const openingDr = isDebitNature
    ? openingBalance > 0
      ? openingBalance
      : 0
    : openingBalance < 0
      ? Math.abs(openingBalance)
      : 0;
  const openingCr = isDebitNature
    ? openingBalance < 0
      ? Math.abs(openingBalance)
      : 0
    : openingBalance > 0
      ? openingBalance
      : 0;
  const openingTag = isDebitNature
    ? openingBalance >= 0
      ? "Dr"
      : "Cr"
    : openingBalance >= 0
      ? "Cr"
      : "Dr";

  // Closing balance tag
  const closingTag = isDebitNature
    ? closingBalance >= 0
      ? "Dr"
      : "Cr"
    : closingBalance >= 0
      ? "Cr"
      : "Dr";

  // Filtered transactions for quick search
  const filteredTransactions = useMemo(() => {
    if (!searchTable.trim()) return transactions;
    const q = searchTable.toLowerCase();
    return transactions.filter(
      (t) =>
        t.voucherNo?.toLowerCase().includes(q) ||
        t.narration?.toLowerCase().includes(q) ||
        String(t.debit).includes(q) ||
        String(t.credit).includes(q),
    );
  }, [transactions, searchTable]);

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    if (!accountId) return;
    void exportReport(
      "general-ledger",
      {
        accountId: Number(accountId) || (accountId as any),
        code: isNaN(Number(accountId)) ? accountId : undefined,
        from: range.from,
        to: range.to,
      },
      format,
    );
  };

  if (isError) {
    return (
      <EmptyState
        actionLabel="Retry"
        description="Unable to fetch ledger entries."
        icon={BookOpen}
        onAction={() => void refetch()}
        title="Ledger unavailable"
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/ledger"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted hover:text-gold hover:border-gold transition-all shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <PageHeader
            title="General Ledger"
            subtitle="View detailed transaction history, opening & closing running balances"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            type="button"
            className="flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <ExportButton
            onExportCSV={() => handleExport("csv")}
            onExportExcel={() => handleExport("excel")}
            onExportPDF={() => handleExport("pdf")}
          />
        </div>
      </div>

      {/* Filter Bar with Account & Period Dropdowns */}
      <div className="grid gap-4 rounded-card border border-border bg-card p-5 shadow-card md:grid-cols-12">
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Select Account</label>
          <div className="relative z-[50]">
            <SearchableSelect
              onChange={handleAccountChange}
              options={accountOptions}
              placeholder="Search by account name or code..."
              value={accountId}
            />
          </div>
        </div>

        <div className="md:col-span-3 space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Select Period</label>
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

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">From Date</label>
          <input
            type="date"
            value={range.from}
            onChange={(e) => handleManualDateChange("from", e.target.value)}
            className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">To Date</label>
          <input
            type="date"
            value={range.to}
            onChange={(e) => handleManualDateChange("to", e.target.value)}
            className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {accountId ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Continuous Full-Length Scrollable Table */}
          <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
            {/* Table Header Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border bg-slate-50/70 p-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Transaction Statement
                </h3>
                {selectedAccount && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gold/15 text-charcoal border border-gold/30">
                    {selectedAccount.code} • {selectedAccount.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
                  <input
                    type="text"
                    placeholder="Search voucher, narration or amount..."
                    value={searchTable}
                    onChange={(e) => setSearchTable(e.target.value)}
                    className="w-full rounded border border-border bg-white pl-8 pr-3 py-1.5 text-xs text-charcoal placeholder-muted focus:border-gold focus:outline-none"
                  />
                </div>
                <span className="text-xs text-muted whitespace-nowrap hidden md:inline">
                  Click row to edit
                </span>
              </div>
            </div>

            {/* Scrollable Single Continuous Table Container */}
            <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
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
                      Description / Narration
                    </th>
                    <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                      Debit (₹)
                    </th>
                    <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                      Credit (₹)
                    </th>
                    <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                      Running Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-muted">
                        Loading ledger transactions...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Row 1: Opening Balance Row */}
                      <tr className="bg-slate-50/80 font-semibold text-charcoal border-b-2 border-border/80">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(range.from)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">—</td>
                        <td className="px-4 py-3 font-bold text-charcoal">
                          Opening Balance
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-ruby">
                          {openingDr > 0 ? formatCurrency(openingDr) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald">
                          {openingCr > 0 ? formatCurrency(openingCr) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                          <span className={openingBalance < 0 && isDebitNature ? "text-ruby" : "text-charcoal"}>
                            {formatCurrency(Math.abs(openingBalance))}
                          </span>{" "}
                          <span className="text-[10px] font-bold uppercase text-muted">
                            {openingTag}
                          </span>
                        </td>
                      </tr>

                      {/* Transaction Rows */}
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-muted text-xs italic">
                            {searchTable
                              ? "No transactions match your search filter."
                              : "No transactions recorded for this account in the selected period."}
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => {
                          const txBalance = tx.runningBalance;
                          const isNegative = isDebitNature ? txBalance < 0 : txBalance < 0;
                          const rowTag = isDebitNature
                            ? txBalance >= 0
                              ? "Dr"
                              : "Cr"
                            : txBalance >= 0
                              ? "Cr"
                              : "Dr";

                          return (
                            <tr
                              key={tx.id || `${tx.voucherNo}-${tx.date}`}
                              onClick={() => handleOpenEntry(tx)}
                              className="hover:bg-gold-tint/20 cursor-pointer transition-colors group"
                              title="Click to view & edit voucher entry"
                            >
                              <td className="px-4 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                                {formatDate(tx.date)}
                              </td>
                              <td className="px-4 py-2.5 font-bold font-mono text-charcoal group-hover:text-gold group-hover:underline whitespace-nowrap">
                                {tx.voucherNo}
                              </td>
                              <td
                                className="px-4 py-2.5 text-xs text-slate-700 max-w-md truncate"
                                title={tx.narration}
                              >
                                {tx.narration || "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-medium">
                                {tx.debit > 0 ? (
                                  <span className="text-ruby">{formatCurrency(tx.debit)}</span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-medium">
                                {tx.credit > 0 ? (
                                  <span className="text-emerald">{formatCurrency(tx.credit)}</span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold whitespace-nowrap">
                                <span className={isNegative ? "text-ruby" : "text-charcoal"}>
                                  {formatCurrency(Math.abs(txBalance))}
                                </span>{" "}
                                <span className="text-[10px] font-bold uppercase text-muted">
                                  {rowTag}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </>
                  )}
                </tbody>

                {/* Integrated Accounting Footer */}
                <tfoot className="border-t-2 border-b-2 border-border bg-gold-tint/40 font-bold text-sm sticky bottom-0 z-10 shadow-inner">
                  <tr>
                    <td colSpan={3} className="px-4 py-3.5 font-bold uppercase tracking-wider text-charcoal">
                      Total & Closing Balance
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-base font-bold text-ruby">
                      {formatCurrency(totalDr)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-base font-bold text-emerald">
                      {formatCurrency(totalCr)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-base font-bold whitespace-nowrap">
                      <span
                        className={`underline decoration-double ${
                          closingBalance < 0 && isDebitNature ? "text-ruby" : "text-charcoal"
                        }`}
                      >
                        {formatCurrency(Math.abs(closingBalance))}
                      </span>{" "}
                      <span className="text-xs font-bold uppercase text-charcoal">
                        {closingTag}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-border bg-slate-50/30 py-20 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">No Account Selected</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            Select an account from the dropdown above to view its detailed ledger statement.
          </p>
        </div>
      )}
    </div>
  );
};
