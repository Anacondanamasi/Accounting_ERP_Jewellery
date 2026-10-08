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
    const rate =
      item.karat === "24K"
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

  const categoryMap = new Map<string, number>();
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

  return (
    <div className="space-y-4">
      <PageHeader title="Inventory Dashboard" subtitle="Real-time stock, valuation, and job work visibility" />

      {itemsError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load inventory data.
          <button className="ml-3 underline" onClick={() => { void refetchItems(); void refetchRates(); }} type="button">Retry</button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <KPICard title="Total Items" value={String(totalItems)} />
        <KPICard title="Total Gold Wt" value={`${totalGoldWt.toFixed(3)}g`} />
        <KPICard title="Inventory at Cost" value={formatCurrency(inventoryAtCost)} />
        <KPICard title="At Market Rate" value={formatCurrency(marketValue)} />
        <KPICard title="Unrealized Gain" value={formatCurrency(unrealizedGain)} trend={`${inventoryAtCost > 0 ? ((unrealizedGain / inventoryAtCost) * 100).toFixed(2) : "0.00"}%`} trendDirection={unrealizedGain >= 0 ? "up" : "down"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h2 className="mb-3 font-display text-xl font-semibold">Metal-wise Stock</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metalWise}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metal" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="wt" fill="#C9922A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h2 className="mb-3 font-display text-xl font-semibold">Category-wise Stock</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryWise} dataKey="qty" nameKey="category" outerRadius={110}>
                  {categoryWise.map((entry, idx) => (
                    <Cell key={entry.category} fill={palette[idx % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <h3 className="mb-2 font-display text-xl font-semibold">Low Stock Alerts</h3>
          {lowStock.length === 0 ? <p className="text-sm text-muted">No items below reorder level.</p> : (
            <div className="space-y-2 text-sm">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded border border-ruby/20 bg-ruby/5 px-3 py-2">
                  <span>{item.sku} - {item.name}</span>
                  <span className="font-mono text-ruby">{item.stockQty} / RL {item.reorderLevel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <h3 className="mb-2 font-display text-xl font-semibold">Top 10 Fast-moving Items</h3>
          <div className="space-y-2 text-sm">
            {fastMoving.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                <span>{item.sku} - {item.name}</span>
                <span className="font-mono">{formatCurrency(item.stockQty * item.mrp)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-card p-4 shadow-card">
        <h3 className="mb-2 font-display text-xl font-semibold">Karigar In-Process</h3>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded border border-border p-3"><div className="text-muted">Open/Partial JWO</div><div className="font-mono text-lg">{inProcessCount}</div></div>
          <div className="rounded border border-border p-3"><div className="text-muted">Gold with Karigar</div><div className="font-mono text-lg">{inProcessWeight.toFixed(3)}g</div></div>
          <div className="rounded border border-border p-3"><div className="text-muted">Rate Feed</div><div className="font-mono text-lg">{loadingRates ? "Loading..." : rates?.date ?? "N/A"}</div></div>
        </div>
      </div>
    </div>
  );
};
