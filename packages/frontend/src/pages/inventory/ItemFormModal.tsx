import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { QrCode, Plus, RefreshCw, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, Printer } from "lucide-react";
import { toast } from "sonner";
import { LabelPrintModal } from "@/components/inventory/LabelPrintModal";
import {
  inventoryService,
  type ItemCodeRecord,
} from "@/services/inventoryService";
import {
  isValidEan13,
  isValidUpcA,
  isValidEan8,
  normalizeCodeString,
} from "@jewelledger/shared";

const itemSchema = z.object({
  sku: z.string().min(2, "SKU is required"),
  name: z.string().min(2, "Item name is required"),
  category: z.string().min(2, "Category is required"),
  subCategory: z.string().min(1, "Sub-category is required"),
  collection: z.string().min(1, "Collection is required"),
  gender: z.enum(["UNISEX", "WOMEN", "MEN", "KIDS"]),
  metalType: z.enum(["GOLD", "SILVER", "PLATINUM"]),
  karat: z.enum(["24K", "22K", "18K", "14K", "SILVER", "PLATINUM"]),
  grossWt: z.coerce.number().nonnegative(),
  netWt: z.coerce.number().nonnegative(),
  stoneWt: z.coerce.number().nonnegative(),
  costPrice: z.coerce.number().nonnegative(),
  minSalePrice: z.coerce.number().nonnegative(),
  mrp: z.coerce.number().nonnegative(),
  stockQty: z.coerce.number().int().nonnegative(),
  stockWt: z.coerce.number().nonnegative(),
  reorderLevel: z.coerce.number().int().nonnegative(),
  isActive: z.boolean(),
});

export type ItemFormInput = z.infer<typeof itemSchema>;

interface ItemFormModalProps {
  open: boolean;
  title: string;
  loading?: boolean;
  itemId?: number;
  initialValues?: Partial<ItemFormInput>;
  onClose: () => void;
  onSubmit: (values: ItemFormInput) => void;
}

export const ItemFormModal = ({
  open,
  title,
  loading = false,
  itemId,
  initialValues,
  onClose,
  onSubmit,
}: ItemFormModalProps) => {
  const [activeTab, setActiveTab] = useState<"details" | "barcodes">("details");

  // Barcode state
  const [codes, setCodes] = useState<ItemCodeRecord[]>([]);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [newCodeVal, setNewCodeVal] = useState("");
  const [newCodeType, setNewCodeType] = useState("MANUFACTURER");
  const [newPackQty, setNewPackQty] = useState(1);
  const [regenerating, setRegenerating] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const form = useForm<ItemFormInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      sku: "",
      name: "",
      category: "",
      subCategory: "",
      collection: "",
      gender: "UNISEX",
      metalType: "GOLD",
      karat: "22K",
      grossWt: 0,
      netWt: 0,
      stoneWt: 0,
      costPrice: 0,
      minSalePrice: 0,
      mrp: 0,
      stockQty: 0,
      stockWt: 0,
      reorderLevel: 0,
      isActive: true,
    },
  });

  const loadItemCodes = async () => {
    if (!itemId) return;
    setLoadingCodes(true);
    try {
      const [fetchedCodes, qrData] = await Promise.all([
        inventoryService.getItemCodes(itemId),
        inventoryService.getItemQrSvg(itemId).catch(() => null),
      ]);
      setCodes(fetchedCodes || []);
      if (qrData?.svg) {
        setQrSvg(qrData.svg);
      }
    } catch {
      toast.error("Unable to load item codes");
    } finally {
      setLoadingCodes(false);
    }
  };

  useEffect(() => {
    if (open) {
      setActiveTab("details");
      form.reset({
        sku: initialValues?.sku ?? "",
        name: initialValues?.name ?? "",
        category: initialValues?.category ?? "",
        subCategory: initialValues?.subCategory ?? "",
        collection: initialValues?.collection ?? "",
        gender: initialValues?.gender ?? "UNISEX",
        metalType: initialValues?.metalType ?? "GOLD",
        karat: initialValues?.karat ?? "22K",
        grossWt: initialValues?.grossWt ?? 0,
        netWt: initialValues?.netWt ?? 0,
        stoneWt: initialValues?.stoneWt ?? 0,
        costPrice: initialValues?.costPrice ?? 0,
        minSalePrice: initialValues?.minSalePrice ?? 0,
        mrp: initialValues?.mrp ?? 0,
        stockQty: initialValues?.stockQty ?? 0,
        stockWt: initialValues?.stockWt ?? 0,
        reorderLevel: initialValues?.reorderLevel ?? 0,
        isActive: initialValues?.isActive ?? true,
      });

      if (itemId) {
        void loadItemCodes();
      }
    }
  }, [form, initialValues, itemId, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleAddAlternateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;
    const clean = normalizeCodeString(newCodeVal);
    if (!clean) {
      toast.error("Please enter a barcode string");
      return;
    }

    if (newCodeType === "EAN13" && !isValidEan13(clean)) {
      toast.error("Invalid EAN-13 barcode checksum");
      return;
    }
    if (newCodeType === "UPCA" && !isValidUpcA(clean)) {
      toast.error("Invalid UPC-A barcode checksum");
      return;
    }
    if (newCodeType === "EAN8" && !isValidEan8(clean)) {
      toast.error("Invalid EAN-8 barcode checksum");
      return;
    }

    try {
      await inventoryService.addItemCode(itemId, {
        code: clean,
        codeType: newCodeType,
        packQty: Number(newPackQty) || 1,
      });
      toast.success(`Barcode "${clean}" added`);
      setNewCodeVal("");
      void loadItemCodes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Unable to add barcode");
    }
  };

  const handleRegenerateCode = async () => {
    if (!itemId) return;
    const confirmed = window.confirm(
      "Regenerating will revoke the previous primary QR code. Existing printed tags with the old code will be retired. Proceed?"
    );
    if (!confirmed) return;

    setRegenerating(true);
    try {
      await inventoryService.generatePrimaryCode(itemId, "Label reissued by user");
      toast.success("New primary QR code generated");
      void loadItemCodes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Unable to regenerate code");
    } finally {
      setRegenerating(false);
    }
  };

  const handleRevokeCode = async (codeId: number, codeVal: string) => {
    if (!itemId) return;
    const reason = window.prompt(`Reason for revoking barcode "${codeVal}":`, "Retired / Damaged tag");
    if (!reason) return;

    try {
      await inventoryService.revokeItemCode(itemId, codeId, reason);
      toast.success("Barcode revoked");
      void loadItemCodes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Unable to revoke barcode");
    }
  };

  if (!open) return null;

  const primaryCode = codes.find((c) => c.isPrimary && c.status === "ACTIVE");

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4"
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-card bg-card shadow-modal flex flex-col">
        {/* Modal Header & Tabs */}
        <div className="border-b border-border p-6 pb-0">
          <div className="flex items-center justify-between pb-4">
            <h3 className="font-display text-2xl font-semibold text-charcoal">{title}</h3>
            {itemId && (
              <span className="font-mono text-xs bg-gold-tint/40 text-gold-dark px-2.5 py-1 rounded font-semibold">
                ID #{itemId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              className={`pb-3 border-b-2 transition-all ${
                activeTab === "details"
                  ? "border-gold text-gold font-bold"
                  : "border-transparent text-muted hover:text-charcoal"
              }`}
              onClick={() => setActiveTab("details")}
            >
              General Information
            </button>

            {itemId && (
              <button
                type="button"
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === "barcodes"
                    ? "border-gold text-gold font-bold"
                    : "border-transparent text-muted hover:text-charcoal"
                }`}
                onClick={() => setActiveTab("barcodes")}
              >
                <QrCode className="h-4 w-4" />
                Barcodes & QR Labels
                {codes.filter((c) => c.status === "ACTIVE").length > 0 && (
                  <span className="ml-1 rounded-full bg-gold/10 px-1.5 py-0.2 text-[10px] font-bold text-gold">
                    {codes.filter((c) => c.status === "ACTIVE").length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: General Details Form */}
        {activeTab === "details" && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-xs text-muted">SKU<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("sku")} /></label>
              <label className="text-xs text-muted md:col-span-2">Item Name<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("name")} /></label>
              <label className="text-xs text-muted">Category<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("category")} /></label>
              <label className="text-xs text-muted">Sub-Category<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("subCategory")} /></label>
              <label className="text-xs text-muted">Collection<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("collection")} /></label>
              <label className="text-xs text-muted">Gender<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("gender")}><option value="UNISEX">Unisex</option><option value="WOMEN">Women</option><option value="MEN">Men</option><option value="KIDS">Kids</option></select></label>
              <label className="text-xs text-muted">Metal<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("metalType")}><option value="GOLD">Gold</option><option value="SILVER">Silver</option><option value="PLATINUM">Platinum</option></select></label>
              <label className="text-xs text-muted">Karat<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("karat")}><option value="24K">24K</option><option value="22K">22K</option><option value="18K">18K</option><option value="14K">14K</option><option value="SILVER">Silver</option><option value="PLATINUM">Platinum</option></select></label>
              <label className="text-xs text-muted">Gross Wt (g)<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.001" {...form.register("grossWt", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Net Wt (g)<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.001" {...form.register("netWt", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Stone Wt (g)<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.001" {...form.register("stoneWt", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Cost Price<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("costPrice", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Min Sale Price<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("minSalePrice", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">MRP<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("mrp", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Stock Qty<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" {...form.register("stockQty", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Stock Wt (g)<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.001" {...form.register("stockWt", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Reorder Level<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" {...form.register("reorderLevel", { valueAsNumber: true })} /></label>
              <label className="flex items-center gap-2 pt-6 text-xs text-muted"><input type="checkbox" {...form.register("isActive")} /> Active</label>
            </div>
            <div className="mt-2 text-xs text-ruby">{Object.values(form.formState.errors)[0]?.message as string}</div>
            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button className="h-10 rounded-btn border border-border px-4 text-sm font-medium" onClick={onClose} type="button">Cancel</button>
              <button className="h-10 rounded-btn bg-gold px-5 text-sm font-bold text-white hover:bg-gold-dark transition-all disabled:opacity-50" disabled={loading} type="submit">{loading ? "Saving..." : "Save Item"}</button>
            </div>
          </form>
        )}

        {/* Tab 2: Barcodes & QR Management */}
        {activeTab === "barcodes" && itemId && (
          <div className="p-6 space-y-6">
            {/* Primary Scannable QR Card */}
            <div className="grid gap-6 md:grid-cols-3 rounded-card border-2 border-gold/40 bg-gold-tint/10 p-5 items-center">
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-gold/20 shadow-sm">
                {qrSvg ? (
                  <div
                    className="w-36 h-36 [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-muted text-xs">
                    Generating QR...
                  </div>
                )}
                <span className="mt-1 text-[10px] text-muted font-mono uppercase tracking-wide">
                  High-Density QR (Level M)
                </span>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded bg-gold px-2 py-0.5 text-xs font-bold text-white uppercase">
                    <ShieldCheck className="h-3.5 w-3.5" /> Primary Tag
                  </span>
                  <span className="text-xs text-muted">Unique Opaque Identifier</span>
                </div>

                <div>
                  <div className="font-mono text-2xl font-bold tracking-wider text-charcoal">
                    {primaryCode?.code || "Allocating Code..."}
                  </div>
                  <p className="text-xs text-muted font-mono mt-0.5 break-all">
                    Scannable Payload: {primaryCode?.qrPayload || `ITM1:...:${primaryCode?.code || ""}`}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-btn border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-dark hover:bg-gold/20 transition-all"
                  >
                    <Printer className="h-3.5 w-3.5 text-gold" />
                    Print Label
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 rounded-btn border border-border bg-white px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-all"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                    Regenerate (Reissue Label)
                  </button>
                </div>
              </div>
            </div>

            {/* Alternate Barcodes (EAN, UPC, Supplier) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-base font-semibold text-charcoal">
                  Registered Barcodes & Pack Multipliers
                </h4>
                <span className="text-xs text-muted">
                  {codes.length} code{codes.length === 1 ? "" : "s"} assigned
                </span>
              </div>

              {/* Add New Alternate Code */}
              <form onSubmit={handleAddAlternateCode} className="grid gap-2 sm:grid-cols-12 items-end bg-canvas p-3 rounded-lg border border-border">
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-semibold text-muted uppercase">Barcode String / EAN / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. 4006381333931 or SUPP-001"
                    value={newCodeVal}
                    onChange={(e) => setNewCodeVal(e.target.value)}
                    className="mt-1 h-9 w-full rounded border border-border px-3 text-xs font-mono uppercase bg-white focus:border-gold focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-muted uppercase">Type</label>
                  <select
                    value={newCodeType}
                    onChange={(e) => setNewCodeType(e.target.value)}
                    className="mt-1 h-9 w-full rounded border border-border px-2 text-xs bg-white focus:border-gold focus:outline-none"
                  >
                    <option value="MANUFACTURER">Manufacturer Barcode</option>
                    <option value="EAN13">EAN-13 (13 Digits)</option>
                    <option value="UPCA">UPC-A (12 Digits)</option>
                    <option value="EAN8">EAN-8 (8 Digits)</option>
                    <option value="CODE128">Code 128 (Alphanumeric)</option>
                    <option value="SUPPLIER">Supplier Tag</option>
                    <option value="CUSTOM">Custom Label</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-muted uppercase">Pack Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={newPackQty}
                    onChange={(e) => setNewPackQty(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded border border-border px-2 text-xs text-right bg-white focus:border-gold focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="h-9 w-full rounded-btn bg-gold px-3 text-xs font-bold text-white hover:bg-gold-dark transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              </form>

              {/* Barcodes Table */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas border-b border-border text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Barcode / String</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Pack Qty</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {codes.map((c) => (
                      <tr key={c.id} className="hover:bg-gold-tint/10 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-charcoal">
                          <div className="flex items-center gap-1.5">
                            {c.isPrimary && (
                              <span className="rounded bg-gold/15 text-gold-dark px-1.5 py-0.5 text-[9px] font-bold">
                                PRIMARY
                              </span>
                            )}
                            {c.code}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-muted">{c.codeType}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium">{c.packQty}</td>
                        <td className="py-2.5 px-3 text-center">
                          {c.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-ruby font-medium" title={c.revokedReason || "Revoked"}>
                              <AlertTriangle className="h-3.5 w-3.5" /> Revoked
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {c.status === "ACTIVE" && !c.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleRevokeCode(c.id, c.code)}
                              className="text-ruby hover:text-ruby-dark text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" /> Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-btn bg-charcoal px-5 text-xs font-bold text-white hover:bg-black transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {showPrintModal && itemId && (
        <LabelPrintModal
          open={showPrintModal}
          items={[
            {
              id: itemId,
              sku: form.getValues("sku"),
              name: form.getValues("name"),
              category: form.getValues("category"),
              karat: form.getValues("karat"),
              grossWt: form.getValues("grossWt"),
              netWt: form.getValues("netWt"),
              stockQty: form.getValues("stockQty"),
              mrp: form.getValues("mrp"),
              costPrice: form.getValues("costPrice"),
              isActive: form.getValues("isActive"),
              codes: codes,
            } as any,
          ]}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
