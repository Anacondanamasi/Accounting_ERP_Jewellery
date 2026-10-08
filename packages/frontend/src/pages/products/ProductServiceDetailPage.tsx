import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Edit, Archive, Package, Wrench, ArrowLeft, BarChart3,
  TrendingUp, TrendingDown, ArrowUpDown, AlertTriangle, CheckCircle,
  ShoppingCart, RotateCcw,
} from "lucide-react";
import { productServiceService } from "@/services/productServiceService";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";

const MOVEMENT_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  OPENING: { label: "Opening Balance", color: "bg-blue-50 text-blue-600", icon: BarChart3 },
  SALE: { label: "Sale", color: "bg-red-50 text-red-600", icon: TrendingDown },
  PURCHASE: { label: "Purchase", color: "bg-emerald-50 text-emerald-600", icon: TrendingUp },
  ADJUSTMENT: { label: "Adjustment", color: "bg-amber-50 text-amber-600", icon: ArrowUpDown },
  RETURN: { label: "Return", color: "bg-purple-50 text-purple-600", icon: RotateCcw },
};

export const ProductServiceDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-service", id],
    queryFn: () => productServiceService.getById(Number(id)),
    enabled: Boolean(id),
  });

  const archiveMutation = useMutation({
    mutationFn: () => productServiceService.archive(Number(id)),
    onSuccess: (updated) => {
      toast.success(updated.status === "ARCHIVED" ? "Item archived" : "Item restored");
      queryClient.invalidateQueries({ queryKey: ["product-service", id] });
      queryClient.invalidateQueries({ queryKey: ["product-services"] });
    },
    onError: () => toast.error("Action failed"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-14 animate-pulse rounded-xl bg-canvas" />
        <div className="h-48 animate-pulse rounded-xl bg-canvas" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="mb-3 h-12 w-12 text-muted" />
        <p className="font-medium text-charcoal">Item not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/products")} type="button">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
      </div>
    );
  }

  const isLowStock = product.isTracked && product.reorderLevel > 0 && product.quantityOnHand <= product.reorderLevel;
  const movements = (product as any).stockMovements ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={product.name}
        subtitle={`Code: ${product.code} • ${product.type === "PRODUCT" ? "Product" : "Service"}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/products")} type="button">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              variant="outline"
              onClick={() => archiveMutation.mutate()}
              loading={archiveMutation.isPending}
              type="button"
              className={product.status === "ARCHIVED" ? "text-emerald border-emerald" : "text-amber-600 border-amber-400"}
            >
              {product.status === "ARCHIVED" ? (
                <><RotateCcw className="mr-2 h-4 w-4" /> Restore</>
              ) : (
                <><Archive className="mr-2 h-4 w-4" /> Archive</>
              )}
            </Button>
            <Button onClick={() => navigate(`/products/${id}/edit`)} type="button">
              <Edit className="mr-2 h-4 w-4" /> Edit Item
            </Button>
          </>
        }
      />

      {/* Status banner */}
      {product.status === "ARCHIVED" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
          <Archive className="h-5 w-5 text-amber-600" />
          <p className="text-sm font-medium text-amber-700">
            This item is archived and won't appear in transaction dropdowns. Restore it to use in new transactions.
          </p>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Sales Price",
            value: product.isSold ? formatCurrency(product.salesPrice) : "—",
            icon: ShoppingCart,
            color: "bg-emerald-50 text-emerald-600 border-emerald-200",
          },
          {
            label: "Purchase Price",
            value: product.isPurchased ? formatCurrency(product.purchasePrice) : "—",
            icon: Package,
            color: "bg-blue-50 text-blue-600 border-blue-200",
          },
          {
            label: "Qty on Hand",
            value: product.isTracked ? `${product.quantityOnHand} ${product.unit ?? ""}` : "N/A",
            icon: BarChart3,
            color: isLowStock
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-gold-tint text-gold border-[#e2bc6d]",
            extra: isLowStock ? (
              <span className="flex items-center gap-1 text-[10px] text-red-500 mt-0.5">
                <AlertTriangle className="h-3 w-3" /> Low stock
              </span>
            ) : null,
          },
          {
            label: "Average Cost",
            value: product.isTracked ? formatCurrency(product.averageCost) : "—",
            icon: TrendingUp,
            color: "bg-purple-50 text-purple-600 border-purple-200",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl border p-5 ${card.color}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium opacity-70">{card.label}</span>
                <Icon className="h-4 w-4 opacity-60" />
              </div>
              <p className="font-display text-xl font-bold">{card.value}</p>
              {card.extra}
            </div>
          );
        })}
      </div>

      {/* Details grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Basic Info */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-charcoal">
            <Package className="h-4 w-4 text-gold" /> Item Details
          </h3>
          <div className="space-y-3">
            <Row label="Code / SKU" value={product.code} mono />
            <Row label="Name" value={product.name} />
            <Row label="Type" value={
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                product.type === "PRODUCT" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
              }`}>
                {product.type === "PRODUCT" ? <Package className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                {product.type === "PRODUCT" ? "Product" : "Service"}
              </span>
            } />
            <Row label="Track Inventory" value={
              product.isTracked
                ? <span className="flex items-center gap-1 text-emerald text-xs"><CheckCircle className="h-3.5 w-3.5" /> Yes</span>
                : <span className="text-muted text-xs">No</span>
            } />
            {product.description && <Row label="Description" value={product.description} />}
            <Row label="Status" value={
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                product.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
              }`}>
                {product.status === "ACTIVE" ? "Active" : "Archived"}
              </span>
            } />
          </div>
        </div>

        {/* Sales & Purchase Info */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-charcoal">
            <ShoppingCart className="h-4 w-4 text-gold" /> Sales & Purchase
          </h3>
          <div className="space-y-3">
            <Row label="Sells This Item" value={product.isSold ? "Yes" : "No"} />
            {product.isSold && <Row label="Sales Price" value={formatCurrency(product.salesPrice)} mono />}
            {product.isSold && <Row label="Sales Tax Rate" value={`${product.salesTaxRate}%`} />}
            <div className="border-t border-border pt-3" />
            <Row label="Purchases This Item" value={product.isPurchased ? "Yes" : "No"} />
            {product.isPurchased && <Row label="Purchase Price" value={formatCurrency(product.purchasePrice)} mono />}
            {product.isPurchased && <Row label="Purchase Tax Rate" value={`${product.purchaseTaxRate}%`} />}
          </div>
        </div>

        {/* Inventory Info */}
        {product.isTracked && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-charcoal">
              <BarChart3 className="h-4 w-4 text-gold" /> Inventory Details
            </h3>
            <div className="grid gap-3 md:grid-cols-4">
              <StatBox label="Opening Qty" value={`${product.openingQuantity} ${product.unit ?? ""}`} />
              <StatBox label="Opening Value" value={formatCurrency(product.openingValue)} />
              <StatBox label="Current Qty on Hand" value={`${product.quantityOnHand} ${product.unit ?? ""}`} highlight={isLowStock} />
              <StatBox label="Reorder Level" value={`${product.reorderLevel} ${product.unit ?? ""}`} />
            </div>
          </div>
        )}
      </div>

      {/* Stock Movements */}
      {product.isTracked && movements.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-charcoal">
              <ArrowUpDown className="h-4 w-4 text-gold" /> Stock Movement History
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-left text-[10px] font-semibold uppercase tracking-widest text-muted">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3 text-right">Qty In</th>
                <th className="px-5 py-3 text-right">Qty Out</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-right">Value</th>
                <th className="px-5 py-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m: any) => {
                const cfg = MOVEMENT_CONFIG[m.movementType] ?? { label: m.movementType, color: "bg-slate-50 text-slate-600", icon: ArrowUpDown };
                const Icon = cfg.icon;
                return (
                  <tr key={m.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted">
                      {format(new Date(m.date), "dd MMM yyyy")}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{m.referenceNo ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {m.quantityIn > 0 ? <span className="text-emerald">+{m.quantityIn}</span> : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {m.quantityOut > 0 ? <span className="text-ruby">-{m.quantityOut}</span> : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-medium text-charcoal">
                      {m.balanceQty}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">{formatCurrency(m.totalValue)}</td>
                    <td className="px-5 py-3 text-xs text-muted truncate max-w-[160px]">{m.narration ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {product.isTracked && movements.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <ArrowUpDown className="mx-auto mb-3 h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No stock movements recorded yet</p>
        </div>
      )}
    </div>
  );
};

// ─── Helper subcomponents ─────────────────────────────────────────────────────
const Row = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs text-muted min-w-[120px]">{label}</span>
    <span className={`text-sm text-charcoal text-right ${mono ? "font-mono" : ""}`}>{value}</span>
  </div>
);

const StatBox = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`rounded-lg border p-3 ${highlight ? "border-red-200 bg-red-50" : "border-border bg-canvas"}`}>
    <p className="mb-0.5 text-[10px] text-muted">{label}</p>
    <p className={`font-mono text-sm font-semibold ${highlight ? "text-ruby" : "text-charcoal"}`}>{value}</p>
  </div>
);
