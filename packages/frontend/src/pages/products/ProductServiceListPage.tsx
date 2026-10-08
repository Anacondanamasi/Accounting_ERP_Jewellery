import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Download,
  Upload,
  Archive,
  Package,
  Wrench,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  MoreVertical,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import { productServiceService, type ProductService } from "@/services/productServiceService";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatters";

const TYPE_FILTERS = [
  { key: "", label: "All Items" },
  { key: "PRODUCT", label: "Products" },
  { key: "SERVICE", label: "Services" },
] as const;

const STATUS_FILTERS = [
  { key: "ACTIVE", label: "Active" },
  { key: "ARCHIVED", label: "Archived" },
] as const;

const TRACKED_FILTERS = [
  { key: "", label: "All" },
  { key: "true", label: "Tracked Inventory" },
] as const;

export const ProductServiceListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [trackedFilter, setTrackedFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["product-services", { search, typeFilter, statusFilter, trackedFilter, page }],
    queryFn: () =>
      productServiceService.list({
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        tracked: trackedFilter === "true" ? true : trackedFilter === "false" ? false : undefined,
        page,
        limit: 25,
      }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => productServiceService.archive(id),
    onSuccess: (updated) => {
      toast.success(updated.status === "ARCHIVED" ? "Item archived" : "Item restored");
      queryClient.invalidateQueries({ queryKey: ["product-services"] });
      setConfirmArchiveId(null);
    },
    onError: () => toast.error("Action failed"),
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: () => productServiceService.bulkArchive(Array.from(selectedIds)),
    onSuccess: (result) => {
      toast.success(`${result.updated} item(s) archived`);
      queryClient.invalidateQueries({ queryKey: ["product-services"] });
      setSelectedIds(new Set());
    },
    onError: () => toast.error("Bulk archive failed"),
  });

  const rows = data?.rows ?? [];
  const pagination = data?.pagination;

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stats = useMemo(() => ({
    total: pagination?.total ?? 0,
    products: rows.filter((r) => r.type === "PRODUCT").length,
    services: rows.filter((r) => r.type === "SERVICE").length,
    tracked: rows.filter((r) => r.isTracked).length,
    lowStock: rows.filter((r) => r.isTracked && r.quantityOnHand <= r.reorderLevel && r.reorderLevel > 0).length,
  }), [rows, pagination]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products & Services"
        subtitle="Manage items used in invoices, bills, quotations and more"
        actions={
          <>
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                onClick={() => bulkArchiveMutation.mutate()}
                loading={bulkArchiveMutation.isPending}
                type="button"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive {selectedIds.size} Selected
              </Button>
            )}
            <Button variant="outline" onClick={() => window.open(productServiceService.getExportUrl())} type="button">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => navigate("/products/import")} type="button">
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button onClick={() => navigate("/products/new")} id="new-product-btn" type="button">
              <Plus className="mr-2 h-4 w-4" /> New Item
            </Button>
          </>
        }
      />

      {/* Stats strip */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Total Items", value: stats.total, icon: Package, color: "text-charcoal bg-canvas border-border" },
          { label: "Products", value: stats.products, icon: Package, color: "text-sapphire bg-blue-50 border-blue-200" },
          { label: "Services", value: stats.services, icon: Wrench, color: "text-emerald bg-emerald-50 border-emerald-200" },
          { label: "Tracked Inventory", value: stats.tracked, icon: BarChart3, color: "text-gold bg-gold-tint border-[#e2bc6d]" },
          { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: stats.lowStock > 0 ? "text-ruby bg-red-50 border-red-200" : "text-muted bg-canvas border-border" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`flex items-center gap-3 rounded-xl border p-4 ${stat.color}`}>
              <Icon className="h-5 w-5 flex-shrink-0 opacity-70" />
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-[11px] opacity-70">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="product-search"
            className="h-9 w-full rounded-lg border border-border bg-canvas pl-9 pr-3 text-sm focus:border-gold focus:outline-none"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Type filter tabs */}
        <div className="flex rounded-lg border border-border bg-canvas p-0.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                typeFilter === f.key
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-muted hover:text-charcoal"
              }`}
              onClick={() => { setTypeFilter(f.key); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex rounded-lg border border-border bg-canvas p-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === f.key
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-muted hover:text-charcoal"
              }`}
              onClick={() => { setStatusFilter(f.key); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tracked */}
        <div className="flex rounded-lg border border-border bg-canvas p-0.5">
          {TRACKED_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                trackedFilter === f.key
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-muted hover:text-charcoal"
              }`}
              onClick={() => { setTrackedFilter(f.key); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas text-left text-[10px] font-semibold uppercase tracking-widest text-muted">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-gold"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">Code / SKU</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Sales Price</th>
              <th className="px-4 py-3 text-right">Purchase Price</th>
              <th className="px-4 py-3 text-right">Sales Tax</th>
              <th className="px-4 py-3 text-right">Qty on Hand</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(10)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-canvas" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-tint">
                      <Package className="h-8 w-8 text-gold" />
                    </div>
                    <h3 className="mb-1 font-display text-base font-semibold text-charcoal">
                      No products or services yet
                    </h3>
                    <p className="mb-4 text-sm text-muted">
                      Create your first item to use it in invoices, bills, and quotations.
                    </p>
                    <Button onClick={() => navigate("/products/new")} size="sm" type="button">
                      <Plus className="mr-2 h-4 w-4" /> Create First Item
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && rows.map((row) => (
              <ProductRow
                key={row.id}
                row={row}
                selected={selectedIds.has(row.id)}
                onToggle={() => toggleOne(row.id)}
                onView={() => navigate(`/products/${row.id}`)}
                onEdit={() => navigate(`/products/${row.id}/edit`)}
                onArchive={() => setConfirmArchiveId(row.id)}
                menuOpen={openMenuId === row.id}
                onMenuToggle={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
              />
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-canvas px-5 py-3">
            <p className="text-xs text-muted">
              Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, pagination.total)} of {pagination.total} items
            </p>
            <div className="flex items-center gap-1">
              <button
                className="grid h-8 w-8 place-items-center rounded border border-border bg-white text-muted hover:bg-canvas disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    className={`grid h-8 w-8 place-items-center rounded border text-xs font-medium transition-colors ${
                      p === page
                        ? "border-gold bg-gold text-white"
                        : "border-border bg-white text-charcoal hover:bg-canvas"
                    }`}
                    onClick={() => setPage(p)}
                    type="button"
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="grid h-8 w-8 place-items-center rounded border border-border bg-white text-muted hover:bg-canvas disabled:opacity-40"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Archive Modal */}
      {confirmArchiveId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-modal">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Archive className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="mb-1 font-display text-base font-semibold text-charcoal">Archive this item?</h3>
            <p className="mb-5 text-sm text-muted">
              The item will be hidden from selection but existing transactions won't be affected.
              You can restore it anytime.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmArchiveId(null)} type="button">Cancel</Button>
              <Button
                onClick={() => archiveMutation.mutate(confirmArchiveId!)}
                loading={archiveMutation.isPending}
                type="button"
                className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
              >
                Archive
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Row Component ──────────────────────────────────────────────────────────
interface ProductRowProps {
  row: ProductService;
  selected: boolean;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
}

const ProductRow = ({ row, selected, onToggle, onView, onEdit, onArchive, menuOpen, onMenuToggle }: ProductRowProps) => {
  const isLowStock = row.isTracked && row.reorderLevel > 0 && row.quantityOnHand <= row.reorderLevel;

  return (
    <tr className={`transition-colors hover:bg-canvas/50 ${selected ? "bg-gold-tint/30" : ""}`}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border accent-gold"
          checked={selected}
          onChange={onToggle}
        />
      </td>
      <td className="px-4 py-3">
        <span className="rounded bg-canvas px-2 py-0.5 font-mono text-xs text-charcoal">{row.code}</span>
      </td>
      <td className="px-4 py-3">
        <div>
          <button
            className="font-medium text-charcoal hover:text-sapphire hover:underline text-left"
            onClick={onView}
            type="button"
          >
            {row.name}
          </button>
          {row.description && (
            <p className="text-[11px] text-muted truncate max-w-[200px]">{row.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          row.type === "PRODUCT"
            ? "bg-blue-50 text-blue-600"
            : "bg-emerald-50 text-emerald-600"
        }`}>
          {row.type === "PRODUCT" ? <Package className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
          {row.type === "PRODUCT" ? "Product" : "Service"}
          {row.isTracked && (
            <span className="ml-1 rounded bg-gold/20 px-1 text-[9px] font-bold uppercase text-gold-dark">Tracked</span>
          )}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {row.isSold ? formatCurrency(row.salesPrice) : <span className="text-muted text-xs">—</span>}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {row.isPurchased ? formatCurrency(row.purchasePrice) : <span className="text-muted text-xs">—</span>}
      </td>
      <td className="px-4 py-3 text-right text-sm text-muted">
        {row.salesTaxRate > 0 ? `${row.salesTaxRate}%` : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        {row.isTracked ? (
          <div className="flex items-center justify-end gap-1">
            {isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-ruby" />}
            <span className={`font-mono text-sm font-medium ${isLowStock ? "text-ruby" : "text-charcoal"}`}>
              {row.quantityOnHand} {row.unit}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted">N/A</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          row.status === "ACTIVE"
            ? "bg-emerald-50 text-emerald-600"
            : "bg-slate-100 text-slate-500"
        }`}>
          {row.status === "ACTIVE" ? "Active" : "Archived"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="relative flex items-center justify-end gap-1">
          <button
            className="grid h-7 w-7 place-items-center rounded border border-border text-muted hover:bg-canvas hover:text-sapphire transition-colors"
            onClick={onView}
            title="View"
            type="button"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            className="grid h-7 w-7 place-items-center rounded border border-border text-muted hover:bg-canvas hover:text-gold transition-colors"
            onClick={onEdit}
            title="Edit"
            type="button"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <div className="relative">
            <button
              className="grid h-7 w-7 place-items-center rounded border border-border text-muted hover:bg-canvas transition-colors"
              onClick={onMenuToggle}
              type="button"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-border bg-card shadow-modal">
                <button
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                  onClick={onArchive}
                  type="button"
                >
                  {row.status === "ARCHIVED" ? (
                    <><RotateCcw className="h-4 w-4" /> Restore</>
                  ) : (
                    <><Archive className="h-4 w-4" /> Archive</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};
