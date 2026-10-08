import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  initialValues?: Partial<ItemFormInput>;
  onClose: () => void;
  onSubmit: (values: ItemFormInput) => void;
}

export const ItemFormModal = ({
  open,
  title,
  loading = false,
  initialValues,
  onClose,
  onSubmit,
}: ItemFormModalProps) => {
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

  useEffect(() => {
    if (open) {
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
    }
  }, [form, initialValues, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4"
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <form
        className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-card bg-card p-6 shadow-modal"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <h3 className="mb-4 font-display text-2xl font-semibold">{title}</h3>
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
        <div className="mt-5 flex justify-end gap-2">
          <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={onClose} type="button">Cancel</button>
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={loading} type="submit">{loading ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
};
