import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { expenseService } from "@/services/expenseService";
import { formatCurrency } from "@/lib/formatters";
import { useState } from "react";
const col = createColumnHelper();
export const ExpenseListPage = () => {
    const navigate = useNavigate();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const [filters, setFilters] = useState({
        from: firstDay,
        to: lastDay,
    });
    const { data, isLoading } = useQuery({
        queryKey: ["expenses-list", filters],
        queryFn: () => expenseService.list(filters),
    });
    const rows = (data ?? []).map((item) => ({
        ...item,
        date: item.date ? new Date(item.date).toLocaleDateString("en-IN") : "—",
    }));
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Direct Expenses", subtitle: "Operational expenses paid directly from Cash or Bank", actions: _jsxs("button", { className: "flex h-10 items-center gap-2 rounded-btn bg-gold px-4 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:bg-gold-dark transition-all", onClick: () => navigate("/expenses/new"), type: "button", children: [_jsx(Receipt, { className: "h-4 w-4" }), "+ Add Expense"] }) }), _jsx(FilterBar, { filters: [
                    { key: "from", type: "date", label: "From" },
                    { key: "to", type: "date", label: "To" },
                ], onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({ from: firstDay, to: lastDay }), values: filters }), _jsx(DataTable, { columns: [
                    col.accessor("date", { header: "Date" }),
                    col.accessor("reference", {
                        header: "Reference",
                        cell: (info) => _jsx("span", { className: "font-mono text-xs", children: info.getValue() ?? "—" }),
                    }),
                    col.accessor("expenseAccount", { header: "Expense Ledger" }),
                    col.accessor("paymentAccount", { header: "Paid Via" }),
                    col.accessor("supplierName", {
                        header: "Supplier",
                        cell: (info) => info.getValue() ?? _jsx("span", { className: "text-muted text-xs", children: "\u2014" }),
                    }),
                    col.accessor("narration", {
                        header: "Narration",
                        cell: (info) => (_jsx("span", { className: "max-w-xs truncate block text-sm text-slate-600", title: info.getValue() ?? "", children: info.getValue() ?? "—" })),
                    }),
                    col.accessor("amount", {
                        header: "Amount",
                        cell: (info) => (_jsx("span", { className: "font-mono font-semibold text-charcoal", children: formatCurrency(info.getValue()) })),
                    }),
                    col.accessor("journalEntryNo", {
                        header: "Voucher No",
                        cell: (info) => (_jsx("span", { className: "font-mono text-xs text-gold", children: info.getValue() ?? "—" })),
                    }),
                ], data: rows, loading: isLoading })] }));
};
