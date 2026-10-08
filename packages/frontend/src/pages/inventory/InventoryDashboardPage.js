import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KPICard } from "@/components/shared/KPICard";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { inventoryService } from "@/services/inventoryService";
const palette = ["#C9922A", "#1E7B5E", "#2563EB", "#C0392B", "#8B8070"];
export const InventoryDashboardPage = () => {
    const { data: items = [], isLoading: loadingItems, isError: itemsError, refetch: refetchItems } = useQuery({
        queryKey: ["inventory-dashboard-items"],
        queryFn: () => inventoryService.listItems({ inStock: "" }),
    });
    const { data: rates, isLoading: loadingRates, refetch: refetchRates } = useQuery({
        queryKey: ["inventory-dashboard-rates"],
        queryFn: () => inventoryService.getTodayRates(),
    });
    const { data: jobWork = [] } = useQuery({
        queryKey: ["inventory-dashboard-jwo"],
        queryFn: () => inventoryService.listJobWorkOrders({}),
    });
    const { data: karigars = [] } = useQuery({
        queryKey: ["inventory-dashboard-karigars"],
        queryFn: () => inventoryService.listKarigars(),
    });
    const totalItems = items.length;
    const totalGoldWt = items.filter((item) => item.metalType === "GOLD").reduce((sum, item) => sum + item.stockWt, 0);
    const inventoryAtCost = items.reduce((sum, item) => sum + item.costPrice * item.stockQty, 0);
    const marketValue = items.reduce((sum, item) => {
        const rate = item.karat === "24K"
            ? rates?.karat24 ?? 0
            : item.karat === "22K"
                ? rates?.karat22 ?? 0
                : item.karat === "18K"
                    ? rates?.karat18 ?? 0
                    : item.karat === "14K"
                        ? rates?.karat14 ?? 0
                        : item.karat === "SILVER"
                            ? rates?.silver ?? 0
                            : (rates?.karat24 ?? 0) * 1.1;
        return sum + item.stockWt * rate;
    }, 0);
    const unrealizedGain = marketValue - inventoryAtCost;
    const metalWise = [
        { metal: "24K", wt: items.filter((i) => i.karat === "24K").reduce((s, i) => s + i.stockWt, 0) },
        { metal: "22K", wt: items.filter((i) => i.karat === "22K").reduce((s, i) => s + i.stockWt, 0) },
        { metal: "18K", wt: items.filter((i) => i.karat === "18K").reduce((s, i) => s + i.stockWt, 0) },
        { metal: "14K", wt: items.filter((i) => i.karat === "14K").reduce((s, i) => s + i.stockWt, 0) },
        { metal: "Silver", wt: items.filter((i) => i.karat === "SILVER").reduce((s, i) => s + i.stockWt, 0) },
    ].filter((row) => row.wt > 0);
    const categoryMap = new Map();
    for (const item of items) {
        categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + item.stockQty);
    }
    const categoryWise = Array.from(categoryMap.entries()).map(([category, qty]) => ({ category, qty }));
    const lowStock = items.filter((item) => item.stockQty <= item.reorderLevel);
    const fastMoving = [...items]
        .sort((a, b) => (b.stockQty * b.mrp) - (a.stockQty * a.mrp))
        .slice(0, 10);
    const inProcessCount = jobWork.filter((jwo) => jwo.status !== "COMPLETED").length;
    const inProcessWeight = karigars.reduce((sum, row) => sum + row.goldInHand, 0);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Inventory Dashboard", subtitle: "Real-time stock, valuation, and job work visibility" }), itemsError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load inventory data.", _jsx("button", { className: "ml-3 underline", onClick: () => { void refetchItems(); void refetchRates(); }, type: "button", children: "Retry" })] })) : null, _jsxs("div", { className: "grid gap-4 xl:grid-cols-5", children: [_jsx(KPICard, { title: "Total Items", value: String(totalItems) }), _jsx(KPICard, { title: "Total Gold Wt", value: `${totalGoldWt.toFixed(3)}g` }), _jsx(KPICard, { title: "Inventory at Cost", value: formatCurrency(inventoryAtCost) }), _jsx(KPICard, { title: "At Market Rate", value: formatCurrency(marketValue) }), _jsx(KPICard, { title: "Unrealized Gain", value: formatCurrency(unrealizedGain), trend: `${inventoryAtCost > 0 ? ((unrealizedGain / inventoryAtCost) * 100).toFixed(2) : "0.00"}%`, trendDirection: unrealizedGain >= 0 ? "up" : "down" })] }), _jsxs("div", { className: "grid gap-4 xl:grid-cols-2", children: [_jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h2", { className: "mb-3 font-display text-xl font-semibold", children: "Metal-wise Stock" }), _jsx("div", { className: "h-72", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: metalWise, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "metal" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "wt", fill: "#C9922A" })] }) }) })] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h2", { className: "mb-3 font-display text-xl font-semibold", children: "Category-wise Stock" }), _jsx("div", { className: "h-72", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: categoryWise, dataKey: "qty", nameKey: "category", outerRadius: 110, children: categoryWise.map((entry, idx) => (_jsx(Cell, { fill: palette[idx % palette.length] }, entry.category))) }), _jsx(Tooltip, {})] }) }) })] })] }), _jsxs("div", { className: "grid gap-4 xl:grid-cols-2", children: [_jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-xl font-semibold", children: "Low Stock Alerts" }), lowStock.length === 0 ? _jsx("p", { className: "text-sm text-muted", children: "No items below reorder level." }) : (_jsx("div", { className: "space-y-2 text-sm", children: lowStock.map((item) => (_jsxs("div", { className: "flex items-center justify-between rounded border border-ruby/20 bg-ruby/5 px-3 py-2", children: [_jsxs("span", { children: [item.sku, " - ", item.name] }), _jsxs("span", { className: "font-mono text-ruby", children: [item.stockQty, " / RL ", item.reorderLevel] })] }, item.id))) }))] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-xl font-semibold", children: "Top 10 Fast-moving Items" }), _jsx("div", { className: "space-y-2 text-sm", children: fastMoving.map((item) => (_jsxs("div", { className: "flex items-center justify-between rounded border border-border px-3 py-2", children: [_jsxs("span", { children: [item.sku, " - ", item.name] }), _jsx("span", { className: "font-mono", children: formatCurrency(item.stockQty * item.mrp) })] }, item.id))) })] })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4 shadow-card", children: [_jsx("h3", { className: "mb-2 font-display text-xl font-semibold", children: "Karigar In-Process" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3 text-sm", children: [_jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("div", { className: "text-muted", children: "Open/Partial JWO" }), _jsx("div", { className: "font-mono text-lg", children: inProcessCount })] }), _jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("div", { className: "text-muted", children: "Gold with Karigar" }), _jsxs("div", { className: "font-mono text-lg", children: [inProcessWeight.toFixed(3), "g"] })] }), _jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("div", { className: "text-muted", children: "Rate Feed" }), _jsx("div", { className: "font-mono text-lg", children: loadingRates ? "Loading..." : rates?.date ?? "N/A" })] })] })] })] }));
};
