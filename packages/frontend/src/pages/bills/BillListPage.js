import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WeightCell } from "@/components/shared/WeightCell";
import { formatCurrency } from "@/lib/formatters";
import { billService } from "@/services/billService";
import { format } from "date-fns";
const col = createColumnHelper();
export const BillListPage = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({});
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["bills", filters],
        queryFn: () => billService.list(filters),
    });
    const rows = data?.rows ?? [];
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Purchase Bills", subtitle: "Supplier-side payable register", actions: _jsxs(_Fragment, { children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", type: "button", children: "Bulk Export" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => navigate("/bills/new"), type: "button", children: "+ New Bill" })] }) }), _jsx(FilterBar, { filters: [
                    { key: "search", type: "search", label: "Search" },
                    { key: "from", type: "date", label: "From" },
                    { key: "to", type: "date", label: "To" },
                    {
                        key: "status",
                        type: "select",
                        label: "Status",
                        options: [
                            { label: "Draft", value: "DRAFT" },
                            { label: "Posted", value: "POSTED" },
                            { label: "Paid", value: "PAID" },
                            { label: "Partial", value: "PARTIAL" },
                        ],
                    },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({}) }), _jsx(DataTable, { columns: [
                    col.accessor("billNo", {
                        header: "Bill No",
                        cell: (info) => _jsx(Link, { className: "text-sapphire hover:underline", to: `/bills/${info.row.original.id}`, children: info.getValue() }),
                    }),
                    col.accessor("date", {
                        header: "Date",
                        cell: (info) => {
                            const val = info.getValue();
                            return val ? format(new Date(val), "dd-MM-yyyy") : "";
                        }
                    }),
                    col.accessor((row) => row.supplier?.name ?? "-", { header: "Supplier" }),
                    col.accessor((row) => row.lines.reduce((sum, line) => sum + Number(line.netWt ?? 0), 0), {
                        header: "Gold Wt",
                        cell: (info) => _jsx(WeightCell, { weight: info.getValue(), unit: "g" }),
                    }),
                    col.accessor("grandTotal", { header: "Total", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("balanceDue", { header: "Balance", cell: (info) => _jsx("span", { className: "font-mono text-ruby", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("dueDate", {
                        header: "Due Date",
                        cell: (info) => {
                            const val = info.getValue();
                            return val ? format(new Date(val), "dd-MM-yyyy") : "";
                        }
                    }),
                    col.accessor("status", { header: "Status", cell: (info) => _jsx(StatusBadge, { status: info.getValue() }) }),
                ], data: rows, loading: isLoading, onRowClick: (row) => navigate(`/bills/${row.id}`) }), _jsx("button", { className: "h-9 rounded-btn border border-border px-4 text-sm", onClick: () => void refetch(), type: "button", children: "Refresh" })] }));
};
