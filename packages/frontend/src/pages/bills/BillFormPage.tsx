import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Copy, Send, CreditCard, Ban, Save, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import { billService } from "@/services/billService";
import { taxService } from "@/services/taxService";
import { JournalPreviewModal } from "@/components/accounting/JournalPreviewModal";
import { FileText } from "lucide-react";
import { useInvoiceCalc } from "@/hooks/useInvoiceCalc";
import { supplierService } from "@/services/supplierService";
import { productServiceService } from "@/services/productServiceService";
import { RecordBillPaymentModal } from "@/pages/bills/RecordBillPaymentModal";
import { LinkedSettlementsPanel } from "@/components/shared/LinkedSettlementsPanel";

const lineSchema = z.object({
  sku: z.string().optional().nullable().default(""),
  description: z.string().min(1, "Description is required"),
  karat: z.string().min(1).default("22K"),
  grossWt: z.coerce.number().nonnegative(),
  netWt: z.coerce.number().nonnegative(),
  stoneWt: z.coerce.number().nonnegative().optional().default(0),
  makingType: z.string().optional().default("PER_GRAM"),
  makingRate: z.coerce.number().nonnegative().optional().default(0),
  ratePerGram: z.coerce.number().nonnegative(),
  discountPct: z.coerce.number().min(0).max(100).optional().default(0),
  gstPct: z.coerce.number().min(0).max(28).default(3),
  hsnCode: z.string().optional().default("7113"),
});

const billSchema = z.object({
  billDate: z.string().min(1, "Bill date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  supplierId: z.coerce.number().min(1, "Supplier is required"),
  supplierName: z.string().optional().nullable().default(""),
  qualityCertUrl: z.string().optional().nullable().default(""),
  lines: z.array(lineSchema).min(1, "At least one line item is required"),
});

type BillInput = z.infer<typeof billSchema>;

const defaultLine: BillInput["lines"][number] = {
  sku: "",
  description: "",
  karat: "22K",
  grossWt: 0,
  netWt: 0,
  stoneWt: 0,
  makingType: "PER_GRAM",
  makingRate: 0,
  ratePerGram: 0,
  discountPct: 0,
  gstPct: 3,
  hsnCode: "7113",
};

export const BillFormPage = () => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const editing = Boolean(id);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const form = useForm<BillInput>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      billDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      supplierId: 0,
      supplierName: "",
      qualityCertUrl: "",
      lines: [defaultLine],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const { data: nextNo } = useQuery({
    queryKey: ["bill-next-number"],
    queryFn: billService.getNextNumber,
    enabled: !editing,
  });

  const { data: existing, refetch: refetchExisting } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => billService.getById(id!),
    enabled: editing,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-for-bill"],
    queryFn: () => supplierService.list({}),
  });

  const { data: productsData } = useQuery({
    queryKey: ["product-services-for-bill"],
    queryFn: () => productServiceService.list({ status: "ACTIVE", limit: 500 }),
  });
  const products = (productsData?.rows ?? []).filter((p) => p.isPurchased !== false);

  useEffect(() => {
    if (!existing || !editing) return;
    const rawBillDate = existing.billDate || existing.date;
    const billDate = rawBillDate
      ? new Date(rawBillDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const rawDueDate = existing.dueDate;
    const dueDate = rawDueDate
      ? new Date(rawDueDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const supplierName = existing.supplierName || existing.supplier?.name || "";

    form.reset({
      billDate,
      dueDate,
      supplierId: Number(existing.supplierId) || 0,
      supplierName,
      qualityCertUrl: existing.qualityCertUrl ?? "",
      lines:
        existing.lines && existing.lines.length > 0
          ? existing.lines.map((l: any) => ({
              sku: l.sku || "",
              description: l.description || "",
              karat: l.karat || "22K",
              grossWt: Number(l.grossWt) || 0,
              netWt: Number(l.netWt) || 0,
              stoneWt: Number(l.stoneWt) || 0,
              makingType: l.makingType || "PER_GRAM",
              makingRate: Number(l.makingRate) || 0,
              ratePerGram: Number(l.ratePerGram) || 0,
              discountPct: Number(l.discountPct) || 0,
              gstPct: Number(l.gstPct) ?? 3,
              hsnCode: l.hsnCode || "7113",
            }))
          : [defaultLine],
    });
  }, [editing, existing, form]);

  const lineValues = useWatch({ control: form.control, name: "lines" });
  const totals = useInvoiceCalc((lineValues as any) || []);

  const handleProductSelect = (index: number, productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    form.setValue(`lines.${index}.sku`, product.code ?? "");
    form.setValue(`lines.${index}.description`, product.purchaseDescription || product.name);
    form.setValue(`lines.${index}.gstPct`, product.purchaseTaxRate ?? 3);
    form.setValue(`lines.${index}.ratePerGram`, product.purchasePrice ?? 0);
    form.setValue(`lines.${index}.hsnCode`, "7113");
  };

  const saveMutation = useMutation({
    mutationFn: (payload: BillInput) =>
      editing ? billService.update(Number(id), payload) : billService.create(payload),
    onSuccess: (record) => {
      toast.success(editing ? "Bill saved & ledger updated" : "Bill created & posted to ledger");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      if (!editing && record?.id) {
        navigate(`/bills/${record.id}/edit`);
      } else {
        void refetchExisting();
      }
    },
    onError: (error: any) => {
      console.error("Save Error:", error);
      toast.error(error?.response?.data?.message || error?.userMessage || "Unable to save bill");
    },
  });

  const saveAndNewMutation = useMutation({
    mutationFn: (payload: BillInput) =>
      editing ? billService.update(Number(id), payload) : billService.create(payload),
    onSuccess: () => {
      toast.success("Bill created & posted to ledger");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      if (editing) {
        navigate("/bills/new");
      } else {
        form.reset();
        void refetchExisting();
      }
    },
    onError: (error: any) => {
      console.error("Save Error:", error);
      toast.error(error?.response?.data?.message || error?.userMessage || "Unable to save bill");
    },
  });

  const saveAndCloseMutation = useMutation({
    mutationFn: (payload: BillInput) =>
      editing ? billService.update(Number(id), payload) : billService.create(payload),
    onSuccess: () => {
      toast.success("Bill saved successfully");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      navigate("/bills");
    },
    onError: (error: any) => {
      console.error("Save & Close Error:", error);
      toast.error(error?.response?.data?.message || error?.userMessage || "Unable to save bill");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => billService.duplicate(Number(id)),
    onSuccess: (record) => {
      toast.success("Bill duplicated successfully");
      navigate(`/bills/${record.id}/edit`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.userMessage || "Unable to duplicate bill");
    },
  });

  const postMutation = useMutation({
    mutationFn: () => billService.post(Number(id)),
    onSuccess: () => {
      toast.success("Bill posted successfully");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      void refetchExisting();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.userMessage || "Unable to post bill");
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => billService.void(Number(id)),
    onSuccess: () => {
      toast.success("Bill voided successfully");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      navigate("/bills");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.userMessage || "Unable to void bill");
    },
  });

  const onInvalid = (errors: any) => {
    console.error("Form Errors:", errors);
    if (errors.lines) {
      toast.error("Please check your line items for required fields.");
    } else if (errors.supplierId) {
      toast.error("Please select a valid supplier.");
    } else {
      toast.error("Please fill in all required fields.");
    }
  };

  const isBusy =
    saveMutation.isPending ||
    saveAndNewMutation.isPending ||
    saveAndCloseMutation.isPending ||
    duplicateMutation.isPending ||
    postMutation.isPending ||
    voidMutation.isPending;

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>{editing ? "Edit Purchase Bill" : "New Purchase Bill"}</span>
            {editing && existing?.status && <StatusBadge status={existing.status} />}
          </div>
        }
        subtitle={`Bill No: ${existing?.billNo ?? nextNo?.billNo ?? "Auto-generated"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-border px-4 text-sm font-medium hover:bg-slate-50 transition-colors"
              onClick={form.handleSubmit((v) => saveMutation.mutate(v), onInvalid)}
              type="button"
              data-shortcut="save"
              title="Save (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-border px-4 text-sm font-medium hover:bg-slate-50 transition-colors"
              onClick={form.handleSubmit((v) => saveAndNewMutation.mutate(v), onInvalid)}
              type="button"
              data-shortcut="save-new"
              title="Save and New (Ctrl+Enter)"
            >
              <Plus className="h-3.5 w-3.5" />
              Save & New
            </button>

            <button
              className="inline-flex h-10 items-center gap-1.5 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all disabled:opacity-50"
              onClick={form.handleSubmit((v) => saveAndCloseMutation.mutate(v), onInvalid)}
              type="button"
              data-shortcut="save-close"
              title="Save and Close (Shift+Ctrl+Enter)"
              disabled={isBusy}
            >
              <Check className="h-4 w-4" />
              {saveAndCloseMutation.isPending ? "Saving…" : "Save & Close"}
            </button>
          </div>
        }
      />

      <form className="space-y-4">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="grid gap-4 rounded-card border-t-2 border-t-gold bg-card p-6 shadow-card md:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Bill Date</label>
            <input
              className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none"
              type="date"
              {...form.register("billDate")}
            />
            {form.formState.errors.billDate && (
              <p className="mt-1 text-[10px] text-ruby">{form.formState.errors.billDate.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Due Date</label>
            <input
              className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none"
              type="date"
              {...form.register("dueDate")}
            />
            {form.formState.errors.dueDate && (
              <p className="mt-1 text-[10px] text-ruby">{form.formState.errors.dueDate.message}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Supplier</p>
            <SearchableSelect
              onChange={(value) => {
                const supplier = (suppliers ?? []).find((row: any) => row.id === value);
                form.setValue("supplierId", Number(value), { shouldValidate: true });
                form.setValue("supplierName", supplier?.name ?? "");
              }}
              options={(suppliers ?? []).map((supplier: any) => ({
                value: supplier.id,
                label: supplier.name,
                meta: supplier.code,
              }))}
              value={form.watch("supplierId")}
              placeholder="Select supplier…"
            />
            {form.formState.errors.supplierId && (
              <p className="mt-1 text-[10px] text-ruby">Please select a valid supplier</p>
            )}
          </div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted md:col-span-4">
            Quality Certificate URL
            <input
              className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none font-normal"
              {...form.register("qualityCertUrl")}
              placeholder="https://…"
            />
          </label>
        </div>

        {/* ── Line Items ───────────────────────────────────────────── */}
        <div className="rounded-card border-t-2 border-t-gold bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Line Items</h2>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-btn border border-gold/30 bg-gold/5 px-4 text-xs font-bold text-gold hover:bg-gold/10 transition-colors"
              onClick={() => append({ ...defaultLine })}
              type="button"
            >
              <Plus className="h-4 w-4" /> Add Row
            </button>
          </div>

          {/* Column headers */}
          <div className="hidden md:grid gap-2 px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted grid-cols-12">
            <div className="col-span-3">Product / Service</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1">Karat</div>
            <div className="col-span-1">Gross Wt</div>
            <div className="col-span-1">Net Wt</div>
            <div className="col-span-1">Rate/g</div>
            <div className="col-span-1">GST %</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1 text-center">Del</div>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-2 rounded-lg border border-border bg-slate-50/50 p-2 md:grid-cols-12 items-center"
              >
                {/* ── Product / Service Dropdown ── */}
                <div className="md:col-span-3">
                  <SearchableSelect
                    onChange={(value) => handleProductSelect(index, Number(value))}
                    options={products.map((p) => ({
                      value: p.id,
                      label: p.name,
                      meta: `${p.code}${p.purchasePrice ? ` · ₹${p.purchasePrice}` : ""}`,
                    }))}
                    value={
                      products.find(
                        (p) => p.code === form.watch(`lines.${index}.sku`)
                      )?.id ?? undefined
                    }
                    placeholder="Select product / service…"
                  />
                </div>

                {/* Description */}
                <input
                  className="h-9 rounded border border-border px-2 text-xs focus:border-gold outline-none md:col-span-2"
                  placeholder="Description"
                  title="Description"
                  {...form.register(`lines.${index}.description`)}
                />

                {/* Karat */}
                <select
                  className="h-9 rounded border border-border px-1 text-xs focus:border-gold outline-none md:col-span-1"
                  {...form.register(`lines.${index}.karat`)}
                >
                  <option value="24K">24K</option>
                  <option value="22K">22K</option>
                  <option value="18K">18K</option>
                  <option value="14K">14K</option>
                  <option value="SILVER">Silver</option>
                  <option value="PLATINUM">Platinum</option>
                </select>

                {/* Gross Wt */}
                <input
                  className="h-9 rounded border border-border px-1 text-xs focus:border-gold outline-none md:col-span-1"
                  step="0.001"
                  type="number"
                  placeholder="Gross g"
                  title="Gross Weight (g)"
                  {...form.register(`lines.${index}.grossWt`, { valueAsNumber: true })}
                />

                {/* Net Wt */}
                <input
                  className="h-9 rounded border border-border px-1 text-xs focus:border-gold outline-none md:col-span-1"
                  step="0.001"
                  type="number"
                  placeholder="Net g"
                  title="Net Weight (g)"
                  {...form.register(`lines.${index}.netWt`, { valueAsNumber: true })}
                />

                {/* Rate / g */}
                <input
                  className="h-9 rounded border border-border px-1 text-xs focus:border-gold outline-none md:col-span-1"
                  step="0.01"
                  type="number"
                  placeholder="Rate"
                  title="Rate per gram"
                  {...form.register(`lines.${index}.ratePerGram`, { valueAsNumber: true })}
                />

                {/* GST % */}
                <input
                  className="h-9 rounded border border-border px-1 text-xs focus:border-gold outline-none md:col-span-1"
                  step="0.01"
                  type="number"
                  placeholder="GST"
                  title="GST %"
                  {...form.register(`lines.${index}.gstPct`, { valueAsNumber: true })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                      if (index === fields.length - 1) {
                        e.preventDefault();
                        append({ ...defaultLine });
                      }
                    }
                  }}
                />

                {/* Line Total */}
                <div className="flex h-9 items-center justify-end rounded border border-slate-100 bg-white px-2 font-mono text-xs font-bold text-charcoal md:col-span-1">
                  {formatCurrency(totals.lineTotals[index]?.total ?? 0)}
                </div>

                {/* Delete */}
                <div className="md:col-span-1 flex items-center justify-center gap-1">
                  <button
                    className="grid h-8 w-8 place-items-center rounded border border-border text-muted hover:border-gold hover:bg-gold-tint/20 hover:text-gold transition-all"
                    onClick={() => {
                      const cur = form.watch(`lines.${index}`);
                      append({ ...cur });
                      toast.info(`Duplicated row ${index + 1}`);
                    }}
                    type="button"
                    title="Duplicate item (Ctrl+D)"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="grid h-8 w-8 place-items-center rounded border border-ruby/30 text-ruby hover:bg-ruby/5 transition-colors"
                    onClick={() => remove(index)}
                    type="button"
                    title="Remove row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Totals ───────────────────────────────────────────────── */}
        <div className="ml-auto w-full max-w-sm rounded-card border-t-4 border-t-gold bg-card p-6 shadow-card">
          <h2 className="mb-3 font-display text-lg font-bold">Totals</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Sub Total</span>
              <span className="font-mono font-semibold">{formatCurrency(totals.subTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Discount</span>
              <span className="font-mono font-semibold">{formatCurrency(totals.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Taxable</span>
              <span className="font-mono font-semibold">{formatCurrency(totals.taxableAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">GST</span>
              <span className="font-mono font-semibold">{formatCurrency(totals.taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-bold text-base">
              <span>Grand Total</span>
              <span className="font-mono text-gold">{formatCurrency(totals.grandTotal)}</span>
            </div>
            {editing && existing && (
              <>
                <div className="flex justify-between text-xs text-muted">
                  <span>Paid Amount</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {formatCurrency(existing.paidAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-ruby">
                  <span>Balance Due</span>
                  <span className="font-mono">{formatCurrency(existing.balanceDue || 0)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </form>

      {/* ── Payment History ────────────────────────────────────────── */}
      {editing && existing?.payments && existing.payments.length > 0 && (
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-charcoal">Payment History</h3>
            <span className="font-mono text-xs font-semibold text-emerald-600">
              Total Paid: {formatCurrency(existing.paidAmount || 0)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gold/5 text-left text-xs font-semibold text-muted">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Mode</th>
                  <th className="px-4 py-2">Reference</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {existing.payments.map((p: any) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="px-4 py-2 text-xs">
                      {p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">{p.mode}</td>
                    <td className="px-4 py-2 text-xs text-muted">{p.reference || "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-emerald-600">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Linked Settlements ──────────────────────────────────────── */}
      {editing && existing && (
        <LinkedSettlementsPanel
          targetType="bill"
          targetId={existing.id}
          grandTotal={existing.grandTotal}
          partyId={existing.supplierId}
          partyName={existing.supplierName ?? existing.supplier?.name ?? "Supplier"}
          status={existing.status}
          onSettled={() => void refetchExisting()}
        />
      )}

      {/* ── Record Payment Modal ─────────────────────────────────────── */}
      {editing && existing && (
        <RecordBillPaymentModal
          open={paymentModalOpen}
          billId={Number(id)}
          billNo={existing.billNo}
          balanceDue={Number(existing.balanceDue || 0)}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={() => {
            void refetchExisting();
            queryClient.invalidateQueries({ queryKey: ["bills"] });
          }}
        />
      )}
    </div>
  );
};
