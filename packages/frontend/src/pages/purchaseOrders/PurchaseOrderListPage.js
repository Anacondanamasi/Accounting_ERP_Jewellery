import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { Plus, ClipboardList, Clock, TruckIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
const MOCK_POS = [
    { id: 1, number: "PO-001", supplier: "Bullion Traders Ltd", amount: "₹5,24,000", date: "2026-05-28", delivery: "2026-06-11", status: "sent" },
    { id: 2, number: "PO-002", supplier: "Gold Wire Suppliers", amount: "₹1,88,500", date: "2026-05-25", delivery: "2026-06-08", status: "draft" },
    { id: 3, number: "PO-003", supplier: "Gems & Co", amount: "₹3,10,000", date: "2026-05-20", delivery: "2026-06-03", status: "received" },
];
const STATUS_CONFIG = {
    draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
    sent: { label: "Sent", color: "bg-blue-50 text-blue-600" },
    received: { label: "Received", color: "bg-emerald-50 text-emerald-600" },
};
export const PurchaseOrderListPage = () => {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "Purchase Orders", subtitle: "Create and track orders sent to your suppliers", actions: _jsxs(Button, { onClick: () => navigate("/purchase-orders/new"), id: "new-po-btn", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " New Purchase Order"] }) }), _jsx("div", { className: "grid gap-4 md:grid-cols-3", children: [
                    { label: "Draft", value: "1", icon: ClipboardList, color: "bg-slate-50 border-slate-200 text-slate-600" },
                    { label: "Sent", value: "1", icon: Clock, color: "bg-blue-50 border-blue-200 text-blue-600" },
                    { label: "Received", value: "1", icon: TruckIcon, color: "bg-emerald-50 border-emerald-200 text-emerald-600" },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (_jsxs("div", { className: `flex items-center gap-3 rounded-xl border p-4 ${stat.color}`, children: [_jsx(Icon, { className: "h-6 w-6 opacity-70" }), _jsxs("div", { children: [_jsx("p", { className: "text-xl font-bold", children: stat.value }), _jsx("p", { className: "text-xs opacity-70", children: stat.label })] })] }, stat.label));
                }) }), _jsx("div", { className: "overflow-hidden rounded-xl border border-border bg-card shadow-card", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-canvas text-left text-[11px] font-semibold uppercase tracking-widest text-muted", children: [_jsx("th", { className: "px-5 py-3", children: "PO #" }), _jsx("th", { className: "px-5 py-3", children: "Supplier" }), _jsx("th", { className: "px-5 py-3", children: "Order Date" }), _jsx("th", { className: "px-5 py-3", children: "Expected Delivery" }), _jsx("th", { className: "px-5 py-3 text-right", children: "Amount" }), _jsx("th", { className: "px-5 py-3", children: "Status" }), _jsx("th", { className: "px-5 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-border", children: MOCK_POS.map((po) => {
                                const cfg = STATUS_CONFIG[po.status];
                                return (_jsxs("tr", { className: "transition-colors hover:bg-canvas/60", children: [_jsx("td", { className: "px-5 py-3 font-medium text-charcoal", children: po.number }), _jsx("td", { className: "px-5 py-3 text-muted", children: po.supplier }), _jsx("td", { className: "px-5 py-3 text-muted", children: po.date }), _jsx("td", { className: "px-5 py-3 text-muted", children: po.delivery }), _jsx("td", { className: "px-5 py-3 text-right font-mono font-semibold text-charcoal", children: po.amount }), _jsx("td", { className: "px-5 py-3", children: _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`, children: cfg.label }) }), _jsx("td", { className: "px-5 py-3", children: _jsx("button", { className: "text-xs text-sapphire hover:underline", onClick: () => navigate(`/purchase-orders/${po.id}/edit`), type: "button", children: "Edit" }) })] }, po.id));
                            }) })] }) })] }));
};
