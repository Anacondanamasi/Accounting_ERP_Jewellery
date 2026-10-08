import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import { customerService } from "@/services/customerService";
const col = createColumnHelper();
export const CustomerListPage = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState(null);
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["customers", filters],
        queryFn: () => customerService.list(filters),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => customerService.remove(id),
        onSuccess: () => {
            toast.success("Customer deactivated");
            void refetch();
        },
        onError: (error) => {
            toast.error(error?.response?.data?.error?.message ?? "Unable to deactivate customer");
        },
    });
    const rows = data ?? [];
    const outstandingTotal = rows.reduce((sum, row) => sum + Number(row.outstanding || 0), 0);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Customers", subtitle: `${rows.length} customers · ${formatCurrency(outstandingTotal)} outstanding`, actions: _jsxs(_Fragment, { children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => toast.info("CSV import endpoint scaffold is ready"), type: "button", children: "Import CSV" }), _jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: async () => {
                                const exported = await customerService.export();
                                toast.success(`Export ready at ${exported.url}`);
                            }, title: "Export", type: "button", children: "Export" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => navigate("/customers/new"), title: "New Customer", type: "button", children: "+ Add Customer" })] }) }), _jsx(FilterBar, { filters: [
                    { key: "search", type: "search", label: "Search name/mobile/GSTIN" },
                    { key: "city", type: "search", label: "City" },
                    {
                        key: "category",
                        type: "select",
                        label: "Category",
                        options: [
                            { label: "B2B", value: "B2B" },
                            { label: "Retail", value: "RETAIL" },
                        ],
                    },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({}) }), _jsx(DataTable, { columns: [
                    col.accessor("code", {
                        header: "Code",
                        cell: (info) => _jsx("span", { className: "font-mono", children: info.getValue() }),
                    }),
                    col.accessor("name", { header: "Customer Name" }),
                    col.accessor("mobile", { header: "Mobile" }),
                    col.accessor("gstin", { header: "GSTIN", cell: (info) => info.getValue() || "-" }),
                    col.accessor("city", { header: "City" }),
                    col.accessor("category", { header: "Category" }),
                    col.accessor("totalBusiness", {
                        header: "Total Business",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }),
                    }),
                    col.accessor("outstanding", {
                        header: "Outstanding",
                        cell: (info) => (_jsx("span", { className: `font-mono ${info.getValue() > 0 ? "text-ruby" : "text-emerald"}`, children: formatCurrency(info.getValue()) })),
                    }),
                    col.accessor("lastPurchase", { header: "Last Purchase", cell: (info) => info.getValue() || "-" }),
                    col.accessor("status", { header: "Status", cell: (info) => _jsx(StatusBadge, { status: info.getValue() }) }),
                    col.display({
                        id: "actions",
                        header: "Actions",
                        cell: ({ row }) => (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: (e) => {
                                        e.stopPropagation();
                                        navigate(`/customers/${row.original.id}`);
                                    }, type: "button", children: "View" }), _jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: (e) => {
                                        e.stopPropagation();
                                        navigate(`/customers/${row.original.id}/edit`);
                                    }, type: "button", children: "Edit" }), _jsx("button", { className: "rounded border border-ruby px-2 py-1 text-xs text-ruby", onClick: (e) => {
                                        e.stopPropagation();
                                        deleteMutation.mutate(row.original.id);
                                    }, type: "button", children: "Deactivate" })] })),
                    }),
                ], data: rows, loading: isLoading, onRowClick: (row) => navigate(`/customers/${row.id}`) })] }));
};
