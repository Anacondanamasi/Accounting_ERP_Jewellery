import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight, Wallet } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { createColumnHelper } from "@tanstack/react-table";
import { dashboardService } from "@/services/dashboardService";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/shared/KPICard";
import { DataTable } from "@/components/shared/DataTable";
import { formatCurrency } from "@/lib/formatters";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionChecks } from "@/lib/permissions";
const categoryColors = ["#C9922A", "#2563EB", "#1E7B5E", "#C0392B", "#8B8070"];
const columnHelper = createColumnHelper();
export const DashboardPage = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["dashboard-summary"],
        queryFn: dashboardService.getSummary,
    });
    const companies = useAuthStore((state) => state.companies);
    const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
    const currentCompany = useMemo(() => companies.find((c) => c.id === currentCompanyId), [companies, currentCompanyId]);
    const { hasPermission } = usePermissionChecks();
    if (isError) {
        return (_jsx(EmptyState, { icon: AlertCircle, title: "Unable to load dashboard", description: "Please check your API connection and retry.", actionLabel: "Retry", onAction: () => refetch() }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "Financial Overview", subtitle: `${currentCompany?.name || "Company"} · Live snapshot`, actions: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm font-medium text-white hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60", disabled: !hasPermission("invoice.create"), title: !hasPermission("invoice.create") ? "Contact your admin" : undefined, type: "button", children: "+ New Invoice" }) }), _jsxs("div", { className: "grid gap-4 xl:grid-cols-5", children: [_jsx(KPICard, { title: "Revenue MTD", value: formatCurrency(data?.revenueMtd ?? 0), trend: "+12.4%", trendDirection: "up", icon: _jsx(ArrowUpRight, { className: "h-4 w-4 text-emerald" }) }), _jsx(KPICard, { title: "Receivables", value: formatCurrency(data?.receivables ?? 0) }), _jsx(KPICard, { title: "Payables", value: formatCurrency(data?.payables ?? 0) }), _jsx(KPICard, { title: "Bank Balance", value: formatCurrency(data?.bankBalance ?? 0), icon: _jsx(Wallet, { className: "h-4 w-4 text-sapphire" }) }), _jsx(KPICard, { title: "Stock Value", value: formatCurrency(data?.stockValue ?? 0) })] }), _jsxs("div", { className: "grid gap-4 xl:grid-cols-3", children: [_jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card xl:col-span-2", children: [_jsx("h2", { className: "mb-3 font-display text-xl font-semibold", children: "Revenue vs Expense" }), _jsx("div", { className: "h-72", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: data?.revenueChart ?? [], children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "month" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "revenue", fill: "#C9922A" }), _jsx(Line, { type: "monotone", dataKey: "expense", stroke: "#2563EB" })] }) }) })] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h2", { className: "mb-3 font-display text-xl font-semibold", children: "Sales Category Mix" }), _jsx("div", { className: "h-72", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: data?.categoryChart ?? [], dataKey: "value", nameKey: "category", innerRadius: 60, outerRadius: 95, children: (data?.categoryChart ?? []).map((_, index) => (_jsx(Cell, { fill: categoryColors[index % categoryColors.length] }, index))) }), _jsx(Tooltip, {})] }) }) })] })] }), _jsx(DataTable, { columns: [
                    columnHelper.accessor("date", { header: "Date", cell: (info) => info.getValue() }),
                    columnHelper.accessor("type", { header: "Type", cell: (info) => info.getValue() }),
                    columnHelper.accessor("narration", { header: "Narration", cell: (info) => info.getValue() }),
                    columnHelper.accessor("amount", {
                        header: "Amount",
                        cell: (info) => _jsx("span", { className: "font-mono text-right", children: formatCurrency(info.getValue()) }),
                    }),
                    columnHelper.accessor("balance", {
                        header: "Balance",
                        cell: (info) => _jsx("span", { className: "font-mono text-right", children: formatCurrency(info.getValue()) }),
                    }),
                ], data: data?.recentTransactions ?? [], loading: isLoading })] }));
};
