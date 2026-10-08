import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, CheckCircle, XCircle, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
const MOCK_QUOTES = [
    { id: 1, number: "QT-001", customer: "Ravi Jewellers", amount: "₹1,24,500", date: "2026-05-28", expiry: "2026-06-28", status: "sent" },
    { id: 2, number: "QT-002", customer: "Meera Gold House", amount: "₹88,000", date: "2026-05-25", expiry: "2026-06-25", status: "draft" },
    { id: 3, number: "QT-003", customer: "Sharma Jewels", amount: "₹2,10,000", date: "2026-05-20", expiry: "2026-06-20", status: "accepted" },
    { id: 4, number: "QT-004", customer: "Gold Palace", amount: "₹54,800", date: "2026-05-15", expiry: "2026-05-29", status: "expired" },
];
const STATUS_CONFIG = {
    draft: { label: "Draft", color: "bg-slate-100 text-slate-600", icon: FileText },
    sent: { label: "Sent", color: "bg-blue-50 text-blue-600", icon: Send },
    accepted: { label: "Accepted", color: "bg-emerald-50 text-emerald-600", icon: CheckCircle },
    expired: { label: "Expired", color: "bg-red-50 text-red-600", icon: XCircle },
};
export const QuoteListPage = () => {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "Quotes", subtitle: "Create and manage customer quotations", actions: _jsxs(Button, { onClick: () => navigate("/quotes/new"), id: "new-quote-btn", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " New Quote"] }) }), _jsx("div", { className: "grid gap-4 md:grid-cols-4", children: [
                    { label: "Draft", value: "1", icon: FileText, color: "bg-slate-50 border-slate-200 text-slate-600" },
                    { label: "Sent", value: "1", icon: Send, color: "bg-blue-50 border-blue-200 text-blue-600" },
                    { label: "Accepted", value: "1", icon: CheckCircle, color: "bg-emerald-50 border-emerald-200 text-emerald-600" },
                    { label: "Expired", value: "1", icon: XCircle, color: "bg-red-50 border-red-200 text-red-600" },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (_jsxs("div", { className: `flex items-center gap-3 rounded-xl border p-4 ${stat.color}`, children: [_jsx(Icon, { className: "h-6 w-6 opacity-70" }), _jsxs("div", { children: [_jsx("p", { className: "text-xl font-bold", children: stat.value }), _jsx("p", { className: "text-xs opacity-70", children: stat.label })] })] }, stat.label));
                }) }), _jsx("div", { className: "overflow-hidden rounded-xl border border-border bg-card shadow-card", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-canvas text-left text-[11px] font-semibold uppercase tracking-widest text-muted", children: [_jsx("th", { className: "px-5 py-3", children: "Quote #" }), _jsx("th", { className: "px-5 py-3", children: "Customer" }), _jsx("th", { className: "px-5 py-3", children: "Date" }), _jsx("th", { className: "px-5 py-3", children: "Expiry" }), _jsx("th", { className: "px-5 py-3 text-right", children: "Amount" }), _jsx("th", { className: "px-5 py-3", children: "Status" }), _jsx("th", { className: "px-5 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-border", children: MOCK_QUOTES.map((q) => {
                                const cfg = STATUS_CONFIG[q.status];
                                const Icon = cfg.icon;
                                return (_jsxs("tr", { className: "transition-colors hover:bg-canvas/60", children: [_jsx("td", { className: "px-5 py-3 font-medium text-charcoal", children: q.number }), _jsx("td", { className: "px-5 py-3 text-muted", children: q.customer }), _jsx("td", { className: "px-5 py-3 text-muted", children: q.date }), _jsx("td", { className: "px-5 py-3 text-muted", children: q.expiry }), _jsx("td", { className: "px-5 py-3 text-right font-mono font-semibold text-charcoal", children: q.amount }), _jsx("td", { className: "px-5 py-3", children: _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`, children: [_jsx(Icon, { className: "h-3 w-3" }), cfg.label] }) }), _jsx("td", { className: "px-5 py-3", children: _jsx("button", { className: "text-xs text-sapphire hover:underline", onClick: () => navigate(`/quotes/${q.id}/edit`), type: "button", children: "Edit" }) })] }, q.id));
                            }) })] }) })] }));
};
