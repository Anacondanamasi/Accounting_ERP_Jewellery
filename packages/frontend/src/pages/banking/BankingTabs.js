import { jsx as _jsx } from "react/jsx-runtime";
import { Link, useLocation } from "react-router-dom";
const tabs = [
    { key: "overview", label: "Overview", path: "/banking" },
    { key: "transactions", label: "Transactions", path: "/banking/transactions" },
    { key: "import", label: "Bank Statements", path: "/banking/import" },
    { key: "reconcile", label: "Reconciliation", path: "/banking/reconcile" },
    { key: "cheques", label: "Cheques", path: "/banking/cheques" },
];
const isActivePath = (pathname, path) => {
    if (path === "/banking") {
        return pathname === "/banking";
    }
    return pathname.startsWith(path);
};
export const BankingTabs = () => {
    const location = useLocation();
    return (_jsx("div", { className: "mb-4 rounded-card border border-border bg-card p-2 shadow-card", children: _jsx("div", { className: "flex flex-wrap gap-2", children: tabs.map((tab) => {
                const active = isActivePath(location.pathname, tab.path);
                return (_jsx(Link, { className: `inline-flex h-9 items-center rounded-btn px-4 text-sm ${active ? "bg-sapphire text-white" : "border border-border bg-white text-charcoal hover:bg-gold-tint"}`, to: tab.path, children: tab.label }, tab.key));
            }) }) }));
};
