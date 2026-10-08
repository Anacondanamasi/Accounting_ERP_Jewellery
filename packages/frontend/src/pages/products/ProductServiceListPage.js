import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Download, Upload, Archive, Package, Wrench, RotateCcw, ChevronLeft, ChevronRight, Eye, Edit, MoreVertical, AlertTriangle, BarChart3, } from "lucide-react";
import { productServiceService } from "@/services/productServiceService";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatters";
const TYPE_FILTERS = [
    { key: "", label: "All Items" },
    { key: "PRODUCT", label: "Products" },
    { key: "SERVICE", label: "Services" },
];
const STATUS_FILTERS = [
    { key: "ACTIVE", label: "Active" },
    { key: "ARCHIVED", label: "Archived" },
];
const TRACKED_FILTERS = [
    { key: "", label: "All" },
    { key: "true", label: "Tracked Inventory" },
];
export const ProductServiceListPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");
    const [trackedFilter, setTrackedFilter] = useState("");
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [confirmArchiveId, setConfirmArchiveId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const { data, isLoading } = useQuery({
        queryKey: ["product-services", { search, typeFilter, statusFilter, trackedFilter, page }],
        queryFn: () => productServiceService.list({
            search: search || undefined,
            type: typeFilter || undefined,
            status: statusFilter || undefined,
            tracked: trackedFilter === "true" ? true : trackedFilter === "false" ? false : undefined,
            page,
            limit: 25,
        }),
    });
    const archiveMutation = useMutation({
        mutationFn: (id) => productServiceService.archive(id),
        onSuccess: (updated) => {
            toast.success(updated.status === "ARCHIVED" ? "Item archived" : "Item restored");
            queryClient.invalidateQueries({ queryKey: ["product-services"] });
            setConfirmArchiveId(null);
        },
        onError: () => toast.error("Action failed"),
    });
    const bulkArchiveMutation = useMutation({
        mutationFn: () => productServiceService.bulkArchive(Array.from(selectedIds)),
        onSuccess: (result) => {
            toast.success(`${result.updated} item(s) archived`);
            queryClient.invalidateQueries({ queryKey: ["product-services"] });
            setSelectedIds(new Set());
        },
        onError: () => toast.error("Bulk archive failed"),
    });
    const rows = data?.rows ?? [];
    const pagination = data?.pagination;
    const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        }
        else {
            setSelectedIds(new Set(rows.map((r) => r.id)));
        }
    };
    const toggleOne = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const stats = useMemo(() => ({
        total: pagination?.total ?? 0,
        products: rows.filter((r) => r.type === "PRODUCT").length,
        services: rows.filter((r) => r.type === "SERVICE").length,
        tracked: rows.filter((r) => r.isTracked).length,
        lowStock: rows.filter((r) => r.isTracked && r.quantityOnHand <= r.reorderLevel && r.reorderLevel > 0).length,
    }), [rows, pagination]);
    return (_jsxs("div", { className: "space-y-5", children: [_jsx(PageHeader, { title: "Products & Services", subtitle: "Manage items used in invoices, bills, quotations and more", actions: _jsxs(_Fragment, { children: [selectedIds.size > 0 && (_jsxs(Button, { variant: "outline", onClick: () => bulkArchiveMutation.mutate(), loading: bulkArchiveMutation.isPending, type: "button", children: [_jsx(Archive, { className: "mr-2 h-4 w-4" }), "Archive ", selectedIds.size, " Selected"] })), _jsxs(Button, { variant: "outline", onClick: () => window.open(productServiceService.getExportUrl()), type: "button", children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), " Export"] }), _jsxs(Button, { variant: "outline", onClick: () => navigate("/products/import"), type: "button", children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), " Import"] }), _jsxs(Button, { onClick: () => navigate("/products/new"), id: "new-product-btn", type: "button", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " New Item"] })] }) }), _jsx("div", { className: "grid gap-4 md:grid-cols-5", children: [
                    { label: "Total Items", value: stats.total, icon: Package, color: "text-charcoal bg-canvas border-border" },
                    { label: "Products", value: stats.products, icon: Package, color: "text-sapphire bg-blue-50 border-blue-200" },
                    { label: "Services", value: stats.services, icon: Wrench, color: "text-emerald bg-emerald-50 border-emerald-200" },
                    { label: "Tracked Inventory", value: stats.tracked, icon: BarChart3, color: "text-gold bg-gold-tint border-[#e2bc6d]" },
                    { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: stats.lowStock > 0 ? "text-ruby bg-red-50 border-red-200" : "text-muted bg-canvas border-border" },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (_jsxs("div", { className: `flex items-center gap-3 rounded-xl border p-4 ${stat.color}`, children: [_jsx(Icon, { className: "h-5 w-5 flex-shrink-0 opacity-70" }), _jsxs("div", { children: [_jsx("p", { className: "text-xl font-bold", children: stat.value }), _jsx("p", { className: "text-[11px] opacity-70", children: stat.label })] })] }, stat.label));
                }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" }), _jsx("input", { id: "product-search", className: "h-9 w-full rounded-lg border border-border bg-canvas pl-9 pr-3 text-sm focus:border-gold focus:outline-none", placeholder: "Search by name or code...", value: search, onChange: (e) => { setSearch(e.target.value); setPage(1); } })] }), _jsx("div", { className: "flex rounded-lg border border-border bg-canvas p-0.5", children: TYPE_FILTERS.map((f) => (_jsx("button", { type: "button", className: `rounded-md px-3 py-1.5 text-xs font-medium transition-all ${typeFilter === f.key
                                ? "bg-white text-charcoal shadow-sm"
                                : "text-muted hover:text-charcoal"}`, onClick: () => { setTypeFilter(f.key); setPage(1); }, children: f.label }, f.key))) }), _jsx("div", { className: "flex rounded-lg border border-border bg-canvas p-0.5", children: STATUS_FILTERS.map((f) => (_jsx("button", { type: "button", className: `rounded-md px-3 py-1.5 text-xs font-medium transition-all ${statusFilter === f.key
                                ? "bg-white text-charcoal shadow-sm"
                                : "text-muted hover:text-charcoal"}`, onClick: () => { setStatusFilter(f.key); setPage(1); }, children: f.label }, f.key))) }), _jsx("div", { className: "flex rounded-lg border border-border bg-canvas p-0.5", children: TRACKED_FILTERS.map((f) => (_jsx("button", { type: "button", className: `rounded-md px-3 py-1.5 text-xs font-medium transition-all ${trackedFilter === f.key
                                ? "bg-white text-charcoal shadow-sm"
                                : "text-muted hover:text-charcoal"}`, onClick: () => { setTrackedFilter(f.key); setPage(1); }, children: f.label }, f.key))) })] }), _jsxs("div", { className: "overflow-hidden rounded-xl border border-border bg-card shadow-card", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-canvas text-left text-[10px] font-semibold uppercase tracking-widest text-muted", children: [_jsx("th", { className: "px-4 py-3", children: _jsx("input", { type: "checkbox", className: "h-4 w-4 rounded border-border accent-gold", checked: allSelected, onChange: toggleAll }) }), _jsx("th", { className: "px-4 py-3", children: "Code / SKU" }), _jsx("th", { className: "px-4 py-3", children: "Name" }), _jsx("th", { className: "px-4 py-3", children: "Type" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Sales Price" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Purchase Price" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Sales Tax" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Qty on Hand" }), _jsx("th", { className: "px-4 py-3", children: "Status" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsxs("tbody", { className: "divide-y divide-border", children: [isLoading && ([...Array(6)].map((_, i) => (_jsx("tr", { className: "animate-pulse", children: [...Array(10)].map((__, j) => (_jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-4 rounded bg-canvas" }) }, j))) }, i)))), !isLoading && rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 10, children: _jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center", children: [_jsx("div", { className: "mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-tint", children: _jsx(Package, { className: "h-8 w-8 text-gold" }) }), _jsx("h3", { className: "mb-1 font-display text-base font-semibold text-charcoal", children: "No products or services yet" }), _jsx("p", { className: "mb-4 text-sm text-muted", children: "Create your first item to use it in invoices, bills, and quotations." }), _jsxs(Button, { onClick: () => navigate("/products/new"), size: "sm", type: "button", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " Create First Item"] })] }) }) })), !isLoading && rows.map((row) => (_jsx(ProductRow, { row: row, selected: selectedIds.has(row.id), onToggle: () => toggleOne(row.id), onView: () => navigate(`/products/${row.id}`), onEdit: () => navigate(`/products/${row.id}/edit`), onArchive: () => setConfirmArchiveId(row.id), menuOpen: openMenuId === row.id, onMenuToggle: () => setOpenMenuId(openMenuId === row.id ? null : row.id) }, row.id)))] })] }), pagination && pagination.pages > 1 && (_jsxs("div", { className: "flex items-center justify-between border-t border-border bg-canvas px-5 py-3", children: [_jsxs("p", { className: "text-xs text-muted", children: ["Showing ", (page - 1) * 25 + 1, "\u2013", Math.min(page * 25, pagination.total), " of ", pagination.total, " items"] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { className: "grid h-8 w-8 place-items-center rounded border border-border bg-white text-muted hover:bg-canvas disabled:opacity-40", disabled: page <= 1, onClick: () => setPage((p) => p - 1), type: "button", children: _jsx(ChevronLeft, { className: "h-4 w-4" }) }), [...Array(Math.min(5, pagination.pages))].map((_, i) => {
                                        const p = i + 1;
                                        return (_jsx("button", { className: `grid h-8 w-8 place-items-center rounded border text-xs font-medium transition-colors ${p === page
                                                ? "border-gold bg-gold text-white"
                                                : "border-border bg-white text-charcoal hover:bg-canvas"}`, onClick: () => setPage(p), type: "button", children: p }, p));
                                    }), _jsx("button", { className: "grid h-8 w-8 place-items-center rounded border border-border bg-white text-muted hover:bg-canvas disabled:opacity-40", disabled: page >= pagination.pages, onClick: () => setPage((p) => p + 1), type: "button", children: _jsx(ChevronRight, { className: "h-4 w-4" }) })] })] }))] }), confirmArchiveId !== null && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-modal", children: [_jsx("div", { className: "mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100", children: _jsx(Archive, { className: "h-6 w-6 text-amber-600" }) }), _jsx("h3", { className: "mb-1 font-display text-base font-semibold text-charcoal", children: "Archive this item?" }), _jsx("p", { className: "mb-5 text-sm text-muted", children: "The item will be hidden from selection but existing transactions won't be affected. You can restore it anytime." }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx(Button, { variant: "outline", onClick: () => setConfirmArchiveId(null), type: "button", children: "Cancel" }), _jsx(Button, { onClick: () => archiveMutation.mutate(confirmArchiveId), loading: archiveMutation.isPending, type: "button", className: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500", children: "Archive" })] })] }) }))] }));
};
const ProductRow = ({ row, selected, onToggle, onView, onEdit, onArchive, menuOpen, onMenuToggle }) => {
    const isLowStock = row.isTracked && row.reorderLevel > 0 && row.quantityOnHand <= row.reorderLevel;
    return (_jsxs("tr", { className: `transition-colors hover:bg-canvas/50 ${selected ? "bg-gold-tint/30" : ""}`, children: [_jsx("td", { className: "px-4 py-3", children: _jsx("input", { type: "checkbox", className: "h-4 w-4 rounded border-border accent-gold", checked: selected, onChange: onToggle }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "rounded bg-canvas px-2 py-0.5 font-mono text-xs text-charcoal", children: row.code }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { children: [_jsx("button", { className: "font-medium text-charcoal hover:text-sapphire hover:underline text-left", onClick: onView, type: "button", children: row.name }), row.description && (_jsx("p", { className: "text-[11px] text-muted truncate max-w-[200px]", children: row.description }))] }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${row.type === "PRODUCT"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-emerald-50 text-emerald-600"}`, children: [row.type === "PRODUCT" ? _jsx(Package, { className: "h-3 w-3" }) : _jsx(Wrench, { className: "h-3 w-3" }), row.type === "PRODUCT" ? "Product" : "Service", row.isTracked && (_jsx("span", { className: "ml-1 rounded bg-gold/20 px-1 text-[9px] font-bold uppercase text-gold-dark", children: "Tracked" }))] }) }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-sm", children: row.isSold ? formatCurrency(row.salesPrice) : _jsx("span", { className: "text-muted text-xs", children: "\u2014" }) }), _jsx("td", { className: "px-4 py-3 text-right font-mono text-sm", children: row.isPurchased ? formatCurrency(row.purchasePrice) : _jsx("span", { className: "text-muted text-xs", children: "\u2014" }) }), _jsx("td", { className: "px-4 py-3 text-right text-sm text-muted", children: row.salesTaxRate > 0 ? `${row.salesTaxRate}%` : "—" }), _jsx("td", { className: "px-4 py-3 text-right", children: row.isTracked ? (_jsxs("div", { className: "flex items-center justify-end gap-1", children: [isLowStock && _jsx(AlertTriangle, { className: "h-3.5 w-3.5 text-ruby" }), _jsxs("span", { className: `font-mono text-sm font-medium ${isLowStock ? "text-ruby" : "text-charcoal"}`, children: [row.quantityOnHand, " ", row.unit] })] })) : (_jsx("span", { className: "text-xs text-muted", children: "N/A" })) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${row.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-500"}`, children: row.status === "ACTIVE" ? "Active" : "Archived" }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "relative flex items-center justify-end gap-1", children: [_jsx("button", { className: "grid h-7 w-7 place-items-center rounded border border-border text-muted hover:bg-canvas hover:text-sapphire transition-colors", onClick: onView, title: "View", type: "button", children: _jsx(Eye, { className: "h-3.5 w-3.5" }) }), _jsx("button", { className: "grid h-7 w-7 place-items-center rounded border border-border text-muted hover:bg-canvas hover:text-gold transition-colors", onClick: onEdit, title: "Edit", type: "button", children: _jsx(Edit, { className: "h-3.5 w-3.5" }) }), _jsxs("div", { className: "relative", children: [_jsx("button", { className: "grid h-7 w-7 place-items-center rounded border border-border text-muted hover:bg-canvas transition-colors", onClick: onMenuToggle, type: "button", children: _jsx(MoreVertical, { className: "h-3.5 w-3.5" }) }), menuOpen && (_jsx("div", { className: "absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-border bg-card shadow-modal", children: _jsx("button", { className: "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors", onClick: onArchive, type: "button", children: row.status === "ARCHIVED" ? (_jsxs(_Fragment, { children: [_jsx(RotateCcw, { className: "h-4 w-4" }), " Restore"] })) : (_jsxs(_Fragment, { children: [_jsx(Archive, { className: "h-4 w-4" }), " Archive"] })) }) }))] })] }) })] }));
};
