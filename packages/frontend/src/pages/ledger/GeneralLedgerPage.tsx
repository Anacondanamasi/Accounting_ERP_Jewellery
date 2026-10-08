import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { reportsService } from "@/services/reportsService";
import { BookOpen, ArrowLeft, Download, Printer } from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { accountsService } from "@/services/accountsService";

interface LedgerRow {
  date: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

const col = createColumnHelper<LedgerRow>();

export const GeneralLedgerPage = () => {
  const { accountId: paramAccountId } = useParams();
  const navigate = useNavigate();
  const [accountId, setAccountId] = useState(paramAccountId || "");
  const [range, setRange] = useState({ from: "2025-04-01", to: "2025-04-30" });

  useEffect(() => {
    if (paramAccountId) {
      setAccountId(paramAccountId);
    }
  }, [paramAccountId]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-minimal"],
    queryFn: () => accountsService.list(),
  });

  const accountOptions = accounts.map((acc: any) => ({
    value: String(acc.id),
    label: `${acc.code} - ${acc.name}`,
    meta: acc.group
  }));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ledger", accountId, range.from, range.to],
    queryFn: () => accountId ? reportsService.getGeneralLedger({ accountId: Number(accountId), from: range.from, to: range.to }) : null,
    enabled: !!accountId,
  });

  const handleAccountChange = (val: string) => {
    setAccountId(val);
    if (val) navigate(`/ledger/${val}`);
    else navigate("/ledger");
  };

  const totalDr = data?.transactions?.reduce((sum: number, r: LedgerRow) => sum + r.debit, 0) ?? 0;
  const totalCr = data?.transactions?.reduce((sum: number, r: LedgerRow) => sum + r.credit, 0) ?? 0;

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
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/ledger" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted hover:text-gold hover:border-gold transition-all shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <PageHeader 
            title="General Ledger" 
            subtitle="View detailed transaction history and running balances" 
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button className="flex h-10 items-center gap-2 rounded-btn bg-charcoal px-4 text-sm font-medium text-white hover:bg-charcoal/90 transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-6 rounded-card border border-border bg-card p-6 shadow-card lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-1.5">
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
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Date Range</label>
          <DateRangePicker onChange={setRange} value={range} />
        </div>
      </div>

      {accountId ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard label="Opening Balance" value={data?.openingBalance ?? 0} />
            <SummaryCard label="Total Debit" value={totalDr} color="text-ruby" />
            <SummaryCard label="Total Credit" value={totalCr} color="text-emerald" />
            <SummaryCard label="Closing Balance" value={data?.closingBalance ?? 0} highlight />
          </div>

          <div className="rounded-card border border-border bg-card shadow-card">
            <div className="border-b border-border bg-slate-50/50 px-6 py-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Transaction History</h3>
            </div>
            <div className="p-0">
              <DataTable
                columns={[
                  col.accessor("date", { 
                    header: "Date",
                    cell: (info) => <span className="text-slate-600">{info.getValue()}</span>
                  }),
                  col.accessor("voucherNo", { 
                    header: "Voucher #",
                    cell: (info) => <span className="font-bold text-charcoal">{info.getValue()}</span>
                  }),
                  col.accessor("narration", { 
                    header: "Description",
                    cell: (info) => <span className="text-xs text-muted line-clamp-1 max-w-xs" title={info.getValue()}>{info.getValue()}</span>
                  }),
                  col.accessor("debit", { 
                    header: "Debit", 
                    cell: (info) => <span className={`font-mono font-medium ${info.getValue() > 0 ? 'text-ruby' : 'text-slate-400'}`}>{info.getValue() > 0 ? formatCurrency(info.getValue()) : '-'}</span> 
                  }),
                  col.accessor("credit", { 
                    header: "Credit", 
                    cell: (info) => <span className={`font-mono font-medium ${info.getValue() > 0 ? 'text-emerald' : 'text-slate-400'}`}>{info.getValue() > 0 ? formatCurrency(info.getValue()) : '-'}</span> 
                  }),
                  col.accessor("runningBalance", {
                    header: "Balance",
                    cell: (info) => {
                      const val = info.getValue();
                      return (
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-mono font-bold ${val >= 0 ? 'text-charcoal' : 'text-ruby'}`}>{formatCurrency(Math.abs(val))}</span>
                          <span className="text-[10px] font-bold uppercase text-muted">{val >= 0 ? 'Dr' : 'Cr'}</span>
                        </div>
                      );
                    },
                  }),
                ]}
                data={data?.transactions ?? []}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-border bg-slate-50/30 py-20 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">No Account Selected</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">Select an account from the dropdown above to view its detailed ledger statement.</p>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, color = "text-charcoal", highlight = false }: { label: string, value: number, color?: string, highlight?: boolean }) => (
  <div className={`rounded-card border p-4 shadow-sm transition-all hover:shadow-md ${highlight ? 'bg-charcoal border-charcoal text-white' : 'bg-card border-border'}`}>
    <p className={`text-[10px] font-bold uppercase tracking-widest ${highlight ? 'text-slate-400' : 'text-muted'}`}>{label}</p>
    <div className="mt-2 flex items-baseline gap-1">
      <p className={`text-xl font-bold font-mono ${highlight ? 'text-white' : color}`}>
        {formatCurrency(Math.abs(value))}
      </p>
      <span className={`text-[10px] font-bold uppercase ${highlight ? 'text-slate-400' : 'text-muted'}`}>
        {value >= 0 ? 'Dr' : 'Cr'}
      </span>
    </div>
  </div>
);
