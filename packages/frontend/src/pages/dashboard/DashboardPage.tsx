import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight, Wallet } from "lucide-react";
import { useMemo } from "react";
import {

  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createColumnHelper } from "@tanstack/react-table";
import { dashboardService } from "@/services/dashboardService";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/shared/KPICard";
import { DataTable } from "@/components/shared/DataTable";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionChecks } from "@/lib/permissions";


const categoryColors = ["#C9922A", "#2563EB", "#1E7B5E", "#C0392B", "#8B8070"];
const columnHelper = createColumnHelper<{
  date: string;
  type: string;
  narration: string;
  amount: number;
  balance: number;
}>();

export const DashboardPage = () => {
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-summary", currentCompanyId],
    queryFn: dashboardService.getSummary,
  });

  const companies = useAuthStore((state) => state.companies);
  const currentCompany = useMemo(
    () => companies.find((c) => c.id === currentCompanyId),
    [companies, currentCompanyId],
  );
  const { hasPermission } = usePermissionChecks();


  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Unable to load dashboard"
        description="Please check your API connection and retry."
        actionLabel="Retry"
        onAction={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Overview"
        subtitle={`${currentCompany?.name || "Company"} · Live snapshot`}

        actions={
          <button
            className="h-10 rounded-btn bg-gold px-4 text-sm font-medium text-white hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasPermission("invoice.create")}
            title={!hasPermission("invoice.create") ? "Contact your admin" : undefined}
            type="button"
          >
            + New Invoice
          </button>
        }
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KPICard title="Revenue MTD" value={formatCurrency(data?.revenueMtd ?? 0)} trend="+12.4%" trendDirection="up" icon={<ArrowUpRight className="h-4 w-4 text-emerald" />} />
        <KPICard title="Receivables" value={formatCurrency(data?.receivables ?? 0)} />
        <KPICard title="Payables" value={formatCurrency(data?.payables ?? 0)} />
        <KPICard title="Bank Balance" value={formatCurrency(data?.bankBalance ?? 0)} icon={<Wallet className="h-4 w-4 text-sapphire" />} />
        <KPICard title="Stock Value" value={formatCurrency(data?.stockValue ?? 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card xl:col-span-2">
          <h2 className="mb-3 font-display text-xl font-semibold">Revenue vs Expense</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenueChart ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#C9922A" />
                <Line type="monotone" dataKey="expense" stroke="#2563EB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h2 className="mb-3 font-display text-xl font-semibold">Sales Category Mix</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.categoryChart ?? []} dataKey="value" nameKey="category" innerRadius={60} outerRadius={95}>
                  {(data?.categoryChart ?? []).map((_, index) => (
                    <Cell key={index} fill={categoryColors[index % categoryColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <DataTable
        columns={[
          columnHelper.accessor("date", {
            header: "Date",
            cell: (info) => (
              <span className="font-mono font-medium text-slate-700 whitespace-nowrap">
                {formatDate(info.getValue())}
              </span>
            ),
          }),
          columnHelper.accessor("type", {
            header: "Type",
            cell: (info) => {
              const type = info.getValue();
              const badgeClass =
                type === "Sales"
                  ? "bg-emerald/10 text-emerald"
                  : type === "Purchase"
                    ? "bg-ruby/10 text-ruby"
                    : "bg-sapphire/10 text-sapphire";
              return (
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                  {type}
                </span>
              );
            },
          }),
          columnHelper.accessor("narration", {
            header: "Narration",
            cell: (info) => <span className="font-medium text-charcoal">{info.getValue()}</span>,
          }),
          columnHelper.accessor("amount", {
            header: "Amount",
            cell: (info) => {
              const amount = info.getValue();
              return (
                <span className={`font-mono text-right font-semibold ${amount >= 0 ? "text-emerald" : "text-ruby"}`}>
                  {formatCurrency(amount)}
                </span>
              );
            },
          }),
          columnHelper.accessor("balance", {
            header: "Balance",
            cell: (info) => <span className="font-mono text-right text-muted">{formatCurrency(info.getValue())}</span>,
          }),
        ]}
        data={data?.recentTransactions ?? []}
        loading={isLoading}
      />
    </div>
  );
};
