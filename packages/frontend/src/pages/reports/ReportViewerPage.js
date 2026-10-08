import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
const sampleRows = [
    { metric: "Total Sales", value: 1245000 },
    { metric: "Total Purchase", value: 832400 },
    { metric: "Gross Margin", value: 412600 },
];
export const ReportViewerPage = () => {
    const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
    const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Custom Reports", subtitle: "Configure a range and review summary metrics" }), _jsxs("div", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4", children: [_jsxs("label", { className: "text-xs text-muted", children: ["From", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", value: from, onChange: (event) => setFrom(event.target.value) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["To", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", value: to, onChange: (event) => setTo(event.target.value) })] })] }), _jsx("div", { className: "rounded-card border border-border bg-card shadow-card", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-gold-tint text-charcoal", children: _jsxs("tr", { children: [_jsx("th", { className: "border-b border-border px-3 py-2 text-left font-semibold", children: "Metric" }), _jsx("th", { className: "border-b border-border px-3 py-2 text-left font-semibold", children: "Value" })] }) }), _jsx("tbody", { children: sampleRows.map((row) => (_jsxs("tr", { className: "border-b border-border/60", children: [_jsx("td", { className: "px-3 py-2", children: row.metric }), _jsx("td", { className: "px-3 py-2 font-mono", children: formatCurrency(row.value) })] }, row.metric))) })] }) })] }));
};
