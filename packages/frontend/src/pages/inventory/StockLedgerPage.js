import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { inventoryService } from "@/services/inventoryService";
const col = createColumnHelper();
export const StockLedgerPage = () => {
    const [itemId, setItemId] = useState(1);
    const [filters, setFilters] = useState({
        from: "2025-04-01",
        to: "2025-04-30",
    });
    const { data: items = [], isLoading: loadingItems } = useQuery({
        queryKey: ["inventory-items-selector"],
        queryFn: () => inventoryService.listItems({ inStock: "" }),
    });
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["inventory-stock-ledger", itemId, filters],
        queryFn: () => inventoryService.listStockLedger(itemId, filters),
        enabled: Boolean(itemId),
    });
    const opening = useMemo(() => {
        if (!data.length)
            return { qty: 0, wt: 0 };
        const first = data[0];
        return {
            qty: first.balanceQty - first.receivedQty + first.issuedQty,
            wt: Number((first.balanceWt - first.receivedWt + first.issuedWt).toFixed(3)),
        };
    }, [data]);
    const closing = useMemo(() => {
        if (!data.length)
            return { qty: 0, wt: 0 };
        const last = data[data.length - 1];
        return { qty: last.balanceQty, wt: last.balanceWt };
    }, [data]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Stock Ledger", subtitle: "Item-wise movement history with running balances", actions: _jsx(ExportButton, { onExportCSV: () => { }, onExportExcel: () => { }, onExportPDF: () => { } }) }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4", children: [_jsx("p", { className: "mb-1 text-xs text-muted", children: "Item" }), _jsx(SearchableSelect, { onChange: setItemId, options: items.map((item) => ({ value: item.id, label: `${item.sku} - ${item.name}` })), value: itemId }), loadingItems ? _jsx("p", { className: "mt-2 text-xs text-muted", children: "Loading items..." }) : null] }), _jsx(FilterBar, { filters: [
                    { key: "from", type: "date", label: "From" },
                    { key: "to", type: "date", label: "To" },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({ from: "2025-04-01", to: "2025-04-30" }) }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load stock ledger.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-card border border-border bg-card p-4 text-sm shadow-card", children: [_jsx("div", { className: "text-muted", children: "Opening Stock" }), _jsxs("div", { className: "font-mono", children: ["Qty: ", opening.qty] }), _jsxs("div", { className: "font-mono", children: ["Wt: ", opening.wt.toFixed(3), "g"] })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 text-sm shadow-card", children: [_jsx("div", { className: "text-muted", children: "Closing Stock" }), _jsxs("div", { className: "font-mono", children: ["Qty: ", closing.qty] }), _jsxs("div", { className: "font-mono", children: ["Wt: ", closing.wt.toFixed(3), "g"] })] })] }), _jsx(DataTable, { columns: [
                    col.accessor("date", { header: "Date" }),
                    col.accessor("transactionType", { header: "Transaction" }),
                    col.accessor("referenceId", { header: "Ref" }),
                    col.accessor("issuedWt", { header: "Issued (g)", cell: (info) => _jsx("span", { className: "font-mono", children: info.getValue().toFixed(3) }) }),
                    col.accessor("receivedWt", { header: "Received (g)", cell: (info) => _jsx("span", { className: "font-mono", children: info.getValue().toFixed(3) }) }),
                    col.accessor("balanceWt", { header: "Balance (g)", cell: (info) => _jsx("span", { className: "font-mono", children: info.getValue().toFixed(3) }) }),
                    col.accessor("rate", { header: "Rate", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("value", { header: "Value", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("narration", { header: "Narration" }),
                ], data: data, loading: isLoading })] }));
};
