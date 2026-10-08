import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Edit, Archive, Package, Wrench, ArrowLeft, BarChart3, TrendingUp, TrendingDown, ArrowUpDown, AlertTriangle, CheckCircle, ShoppingCart, RotateCcw, } from "lucide-react";
import { productServiceService } from "@/services/productServiceService";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
const MOVEMENT_CONFIG = {
    OPENING: { label: "Opening Balance", color: "bg-blue-50 text-blue-600", icon: BarChart3 },
    SALE: { label: "Sale", color: "bg-red-50 text-red-600", icon: TrendingDown },
    PURCHASE: { label: "Purchase", color: "bg-emerald-50 text-emerald-600", icon: TrendingUp },
    ADJUSTMENT: { label: "Adjustment", color: "bg-amber-50 text-amber-600", icon: ArrowUpDown },
    RETURN: { label: "Return", color: "bg-purple-50 text-purple-600", icon: RotateCcw },
};
export const ProductServiceDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const queryClient = useQueryClient();
    const { data: product, isLoading } = useQuery({
        queryKey: ["product-service", id],
        queryFn: () => productServiceService.getById(Number(id)),
        enabled: Boolean(id),
    });
    const archiveMutation = useMutation({
        mutationFn: () => productServiceService.archive(Number(id)),
        onSuccess: (updated) => {
            toast.success(updated.status === "ARCHIVED" ? "Item archived" : "Item restored");
            queryClient.invalidateQueries({ queryKey: ["product-service", id] });
            queryClient.invalidateQueries({ queryKey: ["product-services"] });
        },
        onError: () => toast.error("Action failed"),
    });
    if (isLoading) {
        return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "h-14 animate-pulse rounded-xl bg-canvas" }), _jsx("div", { className: "h-48 animate-pulse rounded-xl bg-canvas" })] }));
    }
    if (!product) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-24", children: [_jsx(AlertTriangle, { className: "mb-3 h-12 w-12 text-muted" }), _jsx("p", { className: "font-medium text-charcoal", children: "Item not found" }), _jsxs(Button, { variant: "outline", className: "mt-4", onClick: () => navigate("/products"), type: "button", children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back to list"] })] }));
    }
    const isLowStock = product.isTracked && product.reorderLevel > 0 && product.quantityOnHand <= product.reorderLevel;
    const movements = product.stockMovements ?? [];
    return (_jsxs("div", { className: "space-y-5", children: [_jsx(PageHeader, { title: product.name, subtitle: `Code: ${product.code} • ${product.type === "PRODUCT" ? "Product" : "Service"}`, actions: _jsxs(_Fragment, { children: [_jsxs(Button, { variant: "outline", onClick: () => navigate("/products"), type: "button", children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back"] }), _jsx(Button, { variant: "outline", onClick: () => archiveMutation.mutate(), loading: archiveMutation.isPending, type: "button", className: product.status === "ARCHIVED" ? "text-emerald border-emerald" : "text-amber-600 border-amber-400", children: product.status === "ARCHIVED" ? (_jsxs(_Fragment, { children: [_jsx(RotateCcw, { className: "mr-2 h-4 w-4" }), " Restore"] })) : (_jsxs(_Fragment, { children: [_jsx(Archive, { className: "mr-2 h-4 w-4" }), " Archive"] })) }), _jsxs(Button, { onClick: () => navigate(`/products/${id}/edit`), type: "button", children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), " Edit Item"] })] }) }), product.status === "ARCHIVED" && (_jsxs("div", { className: "flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3", children: [_jsx(Archive, { className: "h-5 w-5 text-amber-600" }), _jsx("p", { className: "text-sm font-medium text-amber-700", children: "This item is archived and won't appear in transaction dropdowns. Restore it to use in new transactions." })] })), _jsx("div", { className: "grid gap-4 md:grid-cols-4", children: [
                    {
                        label: "Sales Price",
                        value: product.isSold ? formatCurrency(product.salesPrice) : "—",
                        icon: ShoppingCart,
                        color: "bg-emerald-50 text-emerald-600 border-emerald-200",
                    },
                    {
                        label: "Purchase Price",
                        value: product.isPurchased ? formatCurrency(product.purchasePrice) : "—",
                        icon: Package,
                        color: "bg-blue-50 text-blue-600 border-blue-200",
                    },
                    {
                        label: "Qty on Hand",
                        value: product.isTracked ? `${product.quantityOnHand} ${product.unit ?? ""}` : "N/A",
                        icon: BarChart3,
                        color: isLowStock
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-gold-tint text-gold border-[#e2bc6d]",
                        extra: isLowStock ? (_jsxs("span", { className: "flex items-center gap-1 text-[10px] text-red-500 mt-0.5", children: [_jsx(AlertTriangle, { className: "h-3 w-3" }), " Low stock"] })) : null,
                    },
                    {
                        label: "Average Cost",
                        value: product.isTracked ? formatCurrency(product.averageCost) : "—",
                        icon: TrendingUp,
                        color: "bg-purple-50 text-purple-600 border-purple-200",
                    },
                ].map((card) => {
                    const Icon = card.icon;
                    return (_jsxs("div", { className: `rounded-xl border p-5 ${card.color}`, children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-medium opacity-70", children: card.label }), _jsx(Icon, { className: "h-4 w-4 opacity-60" })] }), _jsx("p", { className: "font-display text-xl font-bold", children: card.value }), card.extra] }, card.label));
                }) }), _jsxs("div", { className: "grid gap-5 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-xl border border-border bg-card p-6 shadow-sm", children: [_jsxs("h3", { className: "mb-4 flex items-center gap-2 font-display text-sm font-semibold text-charcoal", children: [_jsx(Package, { className: "h-4 w-4 text-gold" }), " Item Details"] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Row, { label: "Code / SKU", value: product.code, mono: true }), _jsx(Row, { label: "Name", value: product.name }), _jsx(Row, { label: "Type", value: _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${product.type === "PRODUCT" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`, children: [product.type === "PRODUCT" ? _jsx(Package, { className: "h-3 w-3" }) : _jsx(Wrench, { className: "h-3 w-3" }), product.type === "PRODUCT" ? "Product" : "Service"] }) }), _jsx(Row, { label: "Track Inventory", value: product.isTracked
                                            ? _jsxs("span", { className: "flex items-center gap-1 text-emerald text-xs", children: [_jsx(CheckCircle, { className: "h-3.5 w-3.5" }), " Yes"] })
                                            : _jsx("span", { className: "text-muted text-xs", children: "No" }) }), product.description && _jsx(Row, { label: "Description", value: product.description }), _jsx(Row, { label: "Status", value: _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${product.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`, children: product.status === "ACTIVE" ? "Active" : "Archived" }) })] })] }), _jsxs("div", { className: "rounded-xl border border-border bg-card p-6 shadow-sm", children: [_jsxs("h3", { className: "mb-4 flex items-center gap-2 font-display text-sm font-semibold text-charcoal", children: [_jsx(ShoppingCart, { className: "h-4 w-4 text-gold" }), " Sales & Purchase"] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Row, { label: "Sells This Item", value: product.isSold ? "Yes" : "No" }), product.isSold && _jsx(Row, { label: "Sales Price", value: formatCurrency(product.salesPrice), mono: true }), product.isSold && _jsx(Row, { label: "Sales Tax Rate", value: `${product.salesTaxRate}%` }), _jsx("div", { className: "border-t border-border pt-3" }), _jsx(Row, { label: "Purchases This Item", value: product.isPurchased ? "Yes" : "No" }), product.isPurchased && _jsx(Row, { label: "Purchase Price", value: formatCurrency(product.purchasePrice), mono: true }), product.isPurchased && _jsx(Row, { label: "Purchase Tax Rate", value: `${product.purchaseTaxRate}%` })] })] }), product.isTracked && (_jsxs("div", { className: "rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2", children: [_jsxs("h3", { className: "mb-4 flex items-center gap-2 font-display text-sm font-semibold text-charcoal", children: [_jsx(BarChart3, { className: "h-4 w-4 text-gold" }), " Inventory Details"] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-4", children: [_jsx(StatBox, { label: "Opening Qty", value: `${product.openingQuantity} ${product.unit ?? ""}` }), _jsx(StatBox, { label: "Opening Value", value: formatCurrency(product.openingValue) }), _jsx(StatBox, { label: "Current Qty on Hand", value: `${product.quantityOnHand} ${product.unit ?? ""}`, highlight: isLowStock }), _jsx(StatBox, { label: "Reorder Level", value: `${product.reorderLevel} ${product.unit ?? ""}` })] })] }))] }), product.isTracked && movements.length > 0 && (_jsxs("div", { className: "rounded-xl border border-border bg-card shadow-sm overflow-hidden", children: [_jsx("div", { className: "border-b border-border px-6 py-4", children: _jsxs("h3", { className: "flex items-center gap-2 font-display text-sm font-semibold text-charcoal", children: [_jsx(ArrowUpDown, { className: "h-4 w-4 text-gold" }), " Stock Movement History"] }) }), _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-canvas text-left text-[10px] font-semibold uppercase tracking-widest text-muted", children: [_jsx("th", { className: "px-5 py-3", children: "Date" }), _jsx("th", { className: "px-5 py-3", children: "Type" }), _jsx("th", { className: "px-5 py-3", children: "Reference" }), _jsx("th", { className: "px-5 py-3 text-right", children: "Qty In" }), _jsx("th", { className: "px-5 py-3 text-right", children: "Qty Out" }), _jsx("th", { className: "px-5 py-3 text-right", children: "Balance" }), _jsx("th", { className: "px-5 py-3 text-right", children: "Value" }), _jsx("th", { className: "px-5 py-3", children: "Note" })] }) }), _jsx("tbody", { className: "divide-y divide-border", children: movements.map((m) => {
                                    const cfg = MOVEMENT_CONFIG[m.movementType] ?? { label: m.movementType, color: "bg-slate-50 text-slate-600", icon: ArrowUpDown };
                                    const Icon = cfg.icon;
                                    return (_jsxs("tr", { className: "hover:bg-canvas/50 transition-colors", children: [_jsx("td", { className: "px-5 py-3 text-xs text-muted", children: format(new Date(m.date), "dd MMM yyyy") }), _jsx("td", { className: "px-5 py-3", children: _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`, children: [_jsx(Icon, { className: "h-3 w-3" }), cfg.label] }) }), _jsx("td", { className: "px-5 py-3 text-xs text-muted", children: m.referenceNo ?? "—" }), _jsx("td", { className: "px-5 py-3 text-right font-mono text-xs", children: m.quantityIn > 0 ? _jsxs("span", { className: "text-emerald", children: ["+", m.quantityIn] }) : "—" }), _jsx("td", { className: "px-5 py-3 text-right font-mono text-xs", children: m.quantityOut > 0 ? _jsxs("span", { className: "text-ruby", children: ["-", m.quantityOut] }) : "—" }), _jsx("td", { className: "px-5 py-3 text-right font-mono text-xs font-medium text-charcoal", children: m.balanceQty }), _jsx("td", { className: "px-5 py-3 text-right font-mono text-xs", children: formatCurrency(m.totalValue) }), _jsx("td", { className: "px-5 py-3 text-xs text-muted truncate max-w-[160px]", children: m.narration ?? "—" })] }, m.id));
                                }) })] })] })), product.isTracked && movements.length === 0 && (_jsxs("div", { className: "rounded-xl border border-border bg-card p-8 text-center shadow-sm", children: [_jsx(ArrowUpDown, { className: "mx-auto mb-3 h-8 w-8 text-muted" }), _jsx("p", { className: "text-sm text-muted", children: "No stock movements recorded yet" })] }))] }));
};
// ─── Helper subcomponents ─────────────────────────────────────────────────────
const Row = ({ label, value, mono = false }) => (_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsx("span", { className: "text-xs text-muted min-w-[120px]", children: label }), _jsx("span", { className: `text-sm text-charcoal text-right ${mono ? "font-mono" : ""}`, children: value })] }));
const StatBox = ({ label, value, highlight = false }) => (_jsxs("div", { className: `rounded-lg border p-3 ${highlight ? "border-red-200 bg-red-50" : "border-border bg-canvas"}`, children: [_jsx("p", { className: "mb-0.5 text-[10px] text-muted", children: label }), _jsx("p", { className: `font-mono text-sm font-semibold ${highlight ? "text-ruby" : "text-charcoal"}`, children: value })] }));
