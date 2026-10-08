import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Grid3X3, List } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { WeightCell } from "@/components/shared/WeightCell";
import { formatCurrency } from "@/lib/formatters";
import { inventoryService, } from "@/services/inventoryService";
import { ItemFormModal } from "./ItemFormModal";
const col = createColumnHelper();
export const ItemMasterPage = () => {
    const [view, setView] = useState("table");
    const [filters, setFilters] = useState({
        category: "",
        karat: "",
        search: "",
        inStock: "true",
    });
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["inventory-items", filters],
        queryFn: () => inventoryService.listItems(filters),
    });
    const saveMutation = useMutation({
        mutationFn: async (values) => {
            const payload = {
                ...values,
                occasion: editing?.occasion ?? [],
                description: editing?.description ?? "",
                tags: editing?.tags ?? [],
                wastagePct: values.grossWt > 0 ? Number((((values.grossWt - values.netWt) / values.grossWt) * 100).toFixed(3)) : 0,
                huid: editing?.huid ?? "N/A",
                hallmarkGrade: editing?.hallmarkGrade ?? "BIS",
                costingMethod: editing?.costingMethod ?? "WEIGHTED_AVG",
                makingType: editing?.makingType ?? "PER_GRAM",
                makingRate: editing?.makingRate ?? 0,
                overheadPct: editing?.overheadPct ?? 0,
                inProcessWt: editing?.inProcessWt ?? 0,
            };
            if (editing) {
                return inventoryService.updateItem(editing.id, payload);
            }
            return inventoryService.createItem(payload);
        },
        onSuccess: () => {
            toast.success(editing ? "Item updated" : "Item created");
            setOpenModal(false);
            setEditing(null);
            void refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message ?? "Unable to save item");
        },
    });
    const categories = useMemo(() => Array.from(new Set(data.map((item) => item.category))).sort(), [data]);
    const onEdit = (item) => {
        setEditing(item);
        setOpenModal(true);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Item Master", subtitle: `${data.length} active SKUs with advanced stock and pricing controls`, actions: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { className: `h-10 rounded-btn border px-3 text-sm ${view === "grid" ? "border-gold text-gold" : "border-border"}`, onClick: () => setView("grid"), type: "button", children: _jsx(Grid3X3, { className: "h-4 w-4" }) }), _jsx("button", { className: `h-10 rounded-btn border px-3 text-sm ${view === "table" ? "border-gold text-gold" : "border-border"}`, onClick: () => setView("table"), type: "button", children: _jsx(List, { className: "h-4 w-4" }) }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => { setEditing(null); setOpenModal(true); }, type: "button", children: "Add Item" })] }) }), _jsx(FilterBar, { filters: [
                    {
                        key: "category",
                        type: "select",
                        label: "Category",
                        options: categories.map((category) => ({ label: category, value: category })),
                    },
                    {
                        key: "karat",
                        type: "select",
                        label: "Karat",
                        options: [
                            { label: "24K", value: "24K" },
                            { label: "22K", value: "22K" },
                            { label: "18K", value: "18K" },
                            { label: "14K", value: "14K" },
                            { label: "Silver", value: "SILVER" },
                            { label: "Platinum", value: "PLATINUM" },
                        ],
                    },
                    {
                        key: "inStock",
                        type: "select",
                        label: "Stock",
                        options: [
                            { label: "In stock", value: "true" },
                            { label: "All", value: "" },
                        ],
                    },
                    { key: "search", type: "search", label: "Search" },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({ category: "", karat: "", search: "", inStock: "true" }) }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load item master.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, view === "grid" ? (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3", children: data.map((item) => (_jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-4 shadow-card", children: [item.imageUrl ? _jsx("img", { alt: item.name, className: "mb-3 h-40 w-full rounded object-cover", src: item.imageUrl }) : null, _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("div", { className: "font-mono text-xs text-muted", children: item.sku }), _jsx("h3", { className: "font-display text-xl font-semibold", children: item.name })] }), _jsx("span", { className: "rounded-full bg-sapphire/10 px-3 py-1 text-xs text-sapphire", children: item.karat })] }), _jsxs("div", { className: "mt-2 text-sm text-muted", children: [item.category, " / ", item.subCategory] }), _jsxs("div", { className: "mt-2 flex justify-between text-sm", children: [_jsx("span", { children: "Stock" }), _jsx("span", { className: "font-mono", children: item.stockQty })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { children: "Weight" }), _jsx(WeightCell, { weight: item.stockWt, unit: "g" })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { children: "MRP" }), _jsx("span", { className: "font-mono", children: formatCurrency(item.mrp) })] }), _jsx("button", { className: "mt-3 h-9 rounded-btn border border-border px-3 text-xs", onClick: () => onEdit(item), type: "button", children: "Edit" })] }, item.id))) })) : (_jsx(DataTable, { columns: [
                    col.accessor("sku", { header: "SKU" }),
                    col.accessor("name", { header: "Item" }),
                    col.accessor("category", { header: "Category" }),
                    col.accessor("karat", { header: "Karat" }),
                    col.accessor("stockQty", { header: "Qty" }),
                    col.accessor("stockWt", { header: "Weight", cell: (info) => _jsx(WeightCell, { weight: info.getValue(), unit: "g" }) }),
                    col.accessor("costPrice", { header: "Cost", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("mrp", { header: "MRP", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("isActive", {
                        header: "Status",
                        cell: (info) => (_jsx("span", { className: `rounded-full px-3 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-ruby/10 text-ruby"}`, children: info.getValue() ? "Active" : "Inactive" })),
                    }),
                ], data: data, loading: isLoading, onRowClick: (row) => onEdit(row) })), _jsx(ItemFormModal, { open: openModal, title: editing ? "Edit Item" : "Add Item", loading: saveMutation.isPending, initialValues: editing ?? undefined, onClose: () => {
                    setOpenModal(false);
                    setEditing(null);
                }, onSubmit: (values) => saveMutation.mutate(values) })] }));
};
