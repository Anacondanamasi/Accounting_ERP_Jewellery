import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { supplierService } from "@/services/supplierService";

const supplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  mobile: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().optional(),
  city: z.string().min(1),
  category: z.enum(["BULLION", "DIAMOND", "KARIGAR", "GENERAL"]),
  creditLimit: z.coerce.number().nonnegative(),
  creditDays: z.coerce.number().int().nonnegative(),
  notes: z.string().optional(),
});

type SupplierInput = z.infer<typeof supplierSchema>;

interface SupplierFormModalProps {
  open: boolean;
  initialData?: Record<string, any> | null;
  onClose: () => void;
  onSaved: () => void;
}

export const SupplierFormModal = ({ open, initialData, onClose, onSaved }: SupplierFormModalProps) => {
  const [tab, setTab] = useState<"basic" | "financial" | "tax" | "notes">("basic");
  const editing = Boolean(initialData?.id);
  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: "",
      name: "",
      mobile: "",
      email: "",
      gstin: "",
      city: "",
      category: "GENERAL",
      creditLimit: 0,
      creditDays: 0,
      notes: "",
    },
  });

  useEffect(() => {
    form.reset({
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      mobile: initialData?.mobile ?? "",
      email: initialData?.email ?? "",
      gstin: initialData?.gstin ?? "",
      city: initialData?.city ?? "",
      category: initialData?.category ?? "GENERAL",
      creditLimit: initialData?.creditLimit ?? 0,
      creditDays: initialData?.creditDays ?? 0,
      notes: initialData?.notes ?? "",
    });
  }, [form, initialData, open]);

  const mutation = useMutation({
    mutationFn: async (payload: SupplierInput) =>
      editing ? supplierService.update(initialData!.id, payload) : supplierService.create(payload),
    onSuccess: () => {
      toast.success(editing ? "Supplier updated" : "Supplier created");
      onSaved();
      onClose();
    },
    onError: () => toast.error("Unable to save supplier"),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4" onClick={(event) => event.currentTarget === event.target && onClose()}>
      <form className="w-full max-w-3xl rounded-card bg-card p-6 shadow-modal" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <h3 className="mb-4 font-display text-2xl font-semibold text-charcoal">{editing ? "Edit Supplier" : "Add Supplier"}</h3>
        <div className="mb-4 flex gap-2">
          <button className={`rounded-full px-3 py-1 text-xs ${tab === "basic" ? "bg-gold text-white" : "bg-slate-100"}`} onClick={() => setTab("basic")} type="button">Basic Info</button>
          <button className={`rounded-full px-3 py-1 text-xs ${tab === "financial" ? "bg-gold text-white" : "bg-slate-100"}`} onClick={() => setTab("financial")} type="button">Financial</button>
          <button className={`rounded-full px-3 py-1 text-xs ${tab === "tax" ? "bg-gold text-white" : "bg-slate-100"}`} onClick={() => setTab("tax")} type="button">GST & Tax</button>
          <button className={`rounded-full px-3 py-1 text-xs ${tab === "notes" ? "bg-gold text-white" : "bg-slate-100"}`} onClick={() => setTab("notes")} type="button">Notes</button>
        </div>

        {tab === "basic" && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-muted">Code<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("code")} /></label>
            <label className="text-xs text-muted">Supplier Name<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("name")} /></label>
            <label className="text-xs text-muted">Mobile<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("mobile")} /></label>
            <label className="text-xs text-muted">Email<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("email")} /></label>
            <label className="text-xs text-muted">City<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("city")} /></label>
            <label className="text-xs text-muted">Category<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("category")}><option value="BULLION">Bullion</option><option value="DIAMOND">Diamond</option><option value="KARIGAR">Karigar</option><option value="GENERAL">General</option></select></label>
          </div>
        )}

        {tab === "financial" && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-muted">Credit Limit<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" step="0.01" type="number" {...form.register("creditLimit", { valueAsNumber: true })} /></label>
            <label className="text-xs text-muted">Credit Days<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" {...form.register("creditDays", { valueAsNumber: true })} /></label>
          </div>
        )}

        {tab === "tax" && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-muted">GSTIN<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("gstin")} /></label>
          </div>
        )}

        {tab === "notes" && (
          <label className="text-xs text-muted">Notes<textarea className="mt-1 min-h-24 w-full rounded border border-border px-3 py-2 text-sm" {...form.register("notes")} /></label>
        )}

        <div className="mt-2 text-xs text-ruby">{Object.values(form.formState.errors)[0]?.message as string}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={onClose} type="button">Cancel</button>
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={mutation.isPending} type="submit">
            {editing ? "Update Supplier" : "Create Supplier"}
          </button>
        </div>
      </form>
    </div>
  );
};
