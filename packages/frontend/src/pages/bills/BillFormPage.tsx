import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { billService } from "@/services/billService";
import { useInvoiceCalc } from "@/hooks/useInvoiceCalc";
import { supplierService } from "@/services/supplierService";
import { productServiceService } from "@/services/productServiceService";

const lineSchema = z.object({
  sku: z.string().optional().default(""),
  description: z.string().min(1, "Description is required"),
  karat: z.enum(["24K", "22K", "18K", "14K", "SILVER", "PLATINUM"]),
  grossWt: z.coerce.number().multipleOf(0.001).nonnegative(),
  netWt: z.coerce.number().multipleOf(0.001).nonnegative(),
  stoneWt: z.coerce.number().multipleOf(0.001).nonnegative(),
  makingType: z.enum(["PER_GRAM", "FLAT", "PERCENT", "FIXED"]),
  makingRate: z.coerce.number().multipleOf(0.01).nonnegative(),
  ratePerGram: z.coerce.number().multipleOf(0.01).nonnegative(),
  discountPct: z.coerce.number().min(0).max(100),
  gstPct: z.coerce.number().min(0).max(28),
  hsnCode: z.string().optional().default("7113"),
});

const billSchema = z.object({
  billDate: z.string().min(1),
  dueDate: z.string().min(1),
  supplierId: z.coerce.number(),
  supplierName: z.string().min(1),
  qualityCertUrl: z.string().optional(),
  lines: z.array(lineSchema).min(1),
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
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

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
  });

  const { data: existing } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => billService.getById(id!),
    enabled: editing,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-for-bill"],
    queryFn: () => supplierService.list({}),
  });

  // Fetch active Products & Services for the dropdown
  const { data: productsData } = useQuery({
    queryKey: ["product-services-for-bill"],
    queryFn: () => productServiceService.list({ status: "ACTIVE", limit: 500 }),
  });
  const products = (productsData?.rows ?? []).filter((p) => p.isPurchased !== false);

  useEffect(() => {
    if (!existing || !editing) return;
    form.reset({
      billDate: existing.billDate,
      dueDate: existing.dueDate,
      supplierId: existing.supplierId,
      supplierName: existing.supplierName,
      qualityCertUrl: existing.qualityCertUrl ?? "",
      lines: existing.lines,
    });
  }, [editing, existing, form]);

  const lineValues = useWatch({ control: form.control, name: "lines" });
  const totals = useInvoiceCalc((lineValues as any) || []);

  // Track which product is selected per line (by product id stored in a parallel state)
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
    mutationFn: (payload: BillInput) => (editing ? billService.update(id!, payload) : billService.create(payload)),
    onSuccess: (record) => {
      toast.success(editing ? "Bill updated" : "Bill created");
      navigate(`/bills/${record.id}`);
    },
    onError: (error: any) => {
      console.error("Save Bill Error:", error);
      toast.error(error.userMessage || "Unable to save bill");
    },
  });

  const postMutation = useMutation({
    mutationFn: async (payload: BillInput) => {
      const record = editing ? await billService.update(id!, payload) : await billService.create(payload);
      return billService.post(record.id);
    },
    onSuccess: (record) => {
      toast.success("Bill posted");
      navigate(`/bills/${record.id}`);
    },
    onError: (error: any) => {
      console.error("Post Bill Error:", error);
      toast.error(error.userMessage || "Unable to post bill");
    },
  });

  const onInvalid = (errors: any) => {
    console.error("Form Errors:", errors);
    if (errors.lines) {
      toast.error("Please check your line items for errors.");
    } else {
      toast.error("Please fill in all required fields.");
    }
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title={editing ? "Edit Purchase Bill" : "New Purchase Bill"}
        subtitle={`Bill No: ${existing?.billNo ?? nextNo?.billNo ?? "Auto-generated"}`}
        actions={
          <>
            <button
              className="h-10 rounded-btn border border-border px-4 text-sm font-medium hover:bg-slate-50 transition-colors"
              onClick={() => navigate("/bills")}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-btn border border-border px-4 text-sm font-medium hover:bg-slate-50 transition-colors"
              onClick={form.handleSubmit((v) => saveMutation.mutate(v), onInvalid)}
              type="button"
              disabled={saveMutation.isPending}
            >
              Save Draft
            </button>
            <button
              className="h-10 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all disabled:opacity-50"
              onClick={form.handleSubmit((v) => postMutation.mutate(v), onInvalid)}
              type="button"
              disabled={postMutation.isPending}
            >
              {postMutation.isPending ? "Posting…" : "Save & Post"}
            </button>
          </>
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
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Due Date</label>
            <input
              className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none"
              type="date"
              {...form.register("dueDate")}
            />
          </div>
          <div className="md:col-span-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Supplier</p>
            <SearchableSelect
              onChange={(value) => {
                const supplier = (suppliers ?? []).find((row: any) => row.id === value);
                form.setValue("supplierId", value, { shouldValidate: true });
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
                />

                {/* Line Total */}
                <div className="flex h-9 items-center justify-end rounded border border-slate-100 bg-white px-2 font-mono text-xs font-bold text-charcoal md:col-span-1">
                  {formatCurrency(totals.lineTotals[index]?.total ?? 0)}
                </div>

                {/* Delete */}
                <button
                  className="grid h-9 place-items-center rounded border border-ruby/30 text-ruby hover:bg-ruby/5 transition-colors md:col-span-1"
                  onClick={() => remove(index)}
                  type="button"
                  title="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
          </div>
        </div>
      </form>
    </div>
  );
};
