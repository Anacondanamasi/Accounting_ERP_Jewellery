import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
const reportLinks = [
    { title: "Profit & Loss", path: "/profit-loss", description: "Revenue, expenses and net profit overview." },
    { title: "Trial Balance", path: "/trial-balance", description: "Ledger balances before period closing." },
    { title: "Balance Sheet", path: "/balance-sheet", description: "Assets, liabilities and capital position." },
    { title: "Cash Flow", path: "/cash-flow", description: "Operating, investing and financing cash movement." },
    { title: "Day Book", path: "/day-book", description: "Voucher-wise daily transaction register." },
    { title: "GST Returns", path: "/tax/gst", description: "Return status and tax summary statements." },
];
export const ReportCentrePage = () => {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Report Centre", subtitle: "Open core financial and statutory reports" }), _jsx("div", { className: "rounded-card border border-border bg-card shadow-card", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-gold-tint text-charcoal", children: _jsxs("tr", { children: [_jsx("th", { className: "border-b border-border px-3 py-2 text-left font-semibold", children: "Report" }), _jsx("th", { className: "border-b border-border px-3 py-2 text-left font-semibold", children: "Description" }), _jsx("th", { className: "border-b border-border px-3 py-2 text-left font-semibold", children: "Action" })] }) }), _jsx("tbody", { children: reportLinks.map((report) => (_jsxs("tr", { className: "border-b border-border/60", children: [_jsx("td", { className: "px-3 py-2 font-medium", children: report.title }), _jsx("td", { className: "px-3 py-2 text-muted", children: report.description }), _jsx("td", { className: "px-3 py-2", children: _jsx("button", { className: "rounded border border-border px-3 py-1 text-xs", onClick: () => navigate(report.path), type: "button", children: "Open" }) })] }, report.path))) })] }) })] }));
};
