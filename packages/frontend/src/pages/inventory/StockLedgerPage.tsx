import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { inventoryService, type InventoryItem, type StockLedgerRow } from "@/services/inventoryService";

const col = createColumnHelper<StockLedgerRow>();

export const StockLedgerPage = () => {
  const [itemId, setItemId] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({
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
    if (!data.length) return { qty: 0, wt: 0 };
    const first = data[0];
    return {
      qty: first.balanceQty - first.receivedQty + first.issuedQty,
      wt: Number((first.balanceWt - first.receivedWt + first.issuedWt).toFixed(3)),
    };
  }, [data]);

  const closing = useMemo(() => {
    if (!data.length) return { qty: 0, wt: 0 };
    const last = data[data.length - 1];
    return { qty: last.balanceQty, wt: last.balanceWt };
  }, [data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Ledger"
        subtitle="Item-wise movement history with running balances"
        actions={<ExportButton onExportCSV={() => {}} onExportExcel={() => {}} onExportPDF={() => {}} />}
      />

      <div className="rounded-card border border-border bg-card p-4">
        <p className="mb-1 text-xs text-muted">Item</p>
        <SearchableSelect
          onChange={setItemId}
          options={items.map((item: InventoryItem) => ({ value: item.id, label: `${item.sku} - ${item.name}` }))}
          value={itemId}
        />
        {loadingItems ? <p className="mt-2 text-xs text-muted">Loading items...</p> : null}
      </div>

      <FilterBar
        filters={[
          { key: "from", type: "date", label: "From" },
          { key: "to", type: "date", label: "To" },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ from: "2025-04-01", to: "2025-04-30" })}
      />

      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load stock ledger.
          <button className="ml-3 underline" onClick={() => void refetch()} type="button">Retry</button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-4 text-sm shadow-card">
          <div className="text-muted">Opening Stock</div>
          <div className="font-mono">Qty: {opening.qty}</div>
          <div className="font-mono">Wt: {opening.wt.toFixed(3)}g</div>
        </div>
        <div className="rounded-card border border-border bg-card p-4 text-sm shadow-card">
          <div className="text-muted">Closing Stock</div>
          <div className="font-mono">Qty: {closing.qty}</div>
          <div className="font-mono">Wt: {closing.wt.toFixed(3)}g</div>
        </div>
      </div>

      <DataTable
        columns={[
          col.accessor("date", { header: "Date" }),
          col.accessor("transactionType", { header: "Transaction" }),
          col.accessor("referenceId", { header: "Ref" }),
          col.accessor("issuedWt", { header: "Issued (g)", cell: (info) => <span className="font-mono">{info.getValue().toFixed(3)}</span> }),
          col.accessor("receivedWt", { header: "Received (g)", cell: (info) => <span className="font-mono">{info.getValue().toFixed(3)}</span> }),
          col.accessor("balanceWt", { header: "Balance (g)", cell: (info) => <span className="font-mono">{info.getValue().toFixed(3)}</span> }),
          col.accessor("rate", { header: "Rate", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("value", { header: "Value", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("narration", { header: "Narration" }),
        ]}
        data={data}
        loading={isLoading}
      />
    </div>
  );
};
