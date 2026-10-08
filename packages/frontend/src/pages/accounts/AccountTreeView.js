import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
export const AccountTreeView = ({ accounts, groups, onEditAccount }) => {
    const [expanded, setExpanded] = useState({});
    const toggle = (id) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };
    const hierarchy = useMemo(() => {
        const tree = {};
        // Group accounts by Heading -> Type -> Group
        accounts.forEach((acc) => {
            const heading = acc.heading || "Uncategorized";
            const type = acc.type || "Other";
            const group = acc.group || "Ungrouped";
            if (!tree[heading])
                tree[heading] = {};
            if (!tree[heading][type])
                tree[heading][type] = {};
            if (!tree[heading][type][group])
                tree[heading][type][group] = [];
            tree[heading][type][group].push(acc);
        });
        return tree;
    }, [accounts]);
    const renderAccounts = (accList, prefix) => {
        return accList.map((acc) => (_jsxs("div", { className: "flex items-center justify-between py-2 pl-12 pr-4 hover:bg-slate-50 border-b border-border/50 group", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FileText, { className: "h-4 w-4 text-slate-400" }), _jsx("span", { className: "font-mono text-xs font-bold text-charcoal w-20", children: acc.code }), _jsx("span", { className: "text-sm font-medium text-slate-700", children: acc.name }), acc.isControlAccount && (_jsx("span", { className: "ml-2 rounded-full bg-ruby/10 px-2 py-0.5 text-[10px] font-bold text-ruby", children: "Control" }))] }), _jsxs("div", { className: "flex items-center gap-6", children: [_jsx("span", { className: "font-mono text-sm font-medium text-slate-700", children: formatCurrency(acc.openingBalance) }), _jsx("button", { className: "text-xs font-semibold text-gold opacity-0 group-hover:opacity-100 transition-opacity", onClick: () => onEditAccount(acc), children: "Edit" })] })] }, `acc-${acc.id}`)));
    };
    const renderGroups = (groupsMap, prefix) => {
        return Object.entries(groupsMap).map(([groupName, accList]) => {
            const id = `${prefix}-${groupName}`;
            const isExpanded = expanded[id] ?? false;
            const totalBalance = accList.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
            return (_jsxs("div", { children: [_jsxs("div", { className: "flex cursor-pointer items-center justify-between py-2 pl-8 pr-4 hover:bg-slate-50 border-b border-border/50", onClick: () => toggle(id), children: [_jsxs("div", { className: "flex items-center gap-2", children: [isExpanded ? _jsx(ChevronDown, { className: "h-4 w-4 text-slate-400" }) : _jsx(ChevronRight, { className: "h-4 w-4 text-slate-400" }), _jsx(Folder, { className: "h-4 w-4 text-gold" }), _jsx("span", { className: "text-sm font-bold text-slate-800", children: groupName }), _jsxs("span", { className: "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500", children: [accList.length, " accounts"] })] }), _jsx("span", { className: "font-mono text-sm font-bold text-slate-700", children: formatCurrency(totalBalance) })] }), isExpanded && renderAccounts(accList, id)] }, id));
        });
    };
    const renderTypes = (typesMap, prefix) => {
        return Object.entries(typesMap).map(([typeName, groupsMap]) => {
            const id = `${prefix}-${typeName}`;
            const isExpanded = expanded[id] ?? false;
            return (_jsxs("div", { children: [_jsxs("div", { className: "flex cursor-pointer items-center gap-2 py-2 pl-4 pr-4 bg-slate-50/80 border-b border-border", onClick: () => toggle(id), children: [isExpanded ? _jsx(ChevronDown, { className: "h-4 w-4 text-slate-500" }) : _jsx(ChevronRight, { className: "h-4 w-4 text-slate-500" }), _jsx("span", { className: "text-sm font-semibold uppercase tracking-wider text-slate-600", children: typeName })] }), isExpanded && renderGroups(groupsMap, id)] }, id));
        });
    };
    return (_jsxs("div", { className: "rounded-card border-2 border-border bg-card shadow-sm overflow-hidden", children: [Object.entries(hierarchy).map(([heading, typesMap]) => {
                const id = `heading-${heading}`;
                const isExpanded = expanded[id] ?? true; // Headings expanded by default
                return (_jsxs("div", { className: "border-b-4 border-b-border last:border-b-0", children: [_jsxs("div", { className: "flex cursor-pointer items-center gap-2 bg-charcoal text-white py-3 px-4", onClick: () => toggle(id), children: [isExpanded ? _jsx(ChevronDown, { className: "h-5 w-5 opacity-70" }) : _jsx(ChevronRight, { className: "h-5 w-5 opacity-70" }), _jsx("span", { className: "text-lg font-display font-bold tracking-widest uppercase", children: heading })] }), isExpanded && renderTypes(typesMap, id)] }, id));
            }), Object.keys(hierarchy).length === 0 && (_jsx("div", { className: "p-8 text-center text-muted", children: "No accounts found" }))] }));
};
