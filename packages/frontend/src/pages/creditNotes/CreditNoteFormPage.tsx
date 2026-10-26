import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Check,
  Users,
  FileText,
  Tag,
  Package,
} from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import { noteService, type NotePayload } from "@/services/noteService";
import { customerService } from "@/services/customerService";
import { invoiceService } from "@/services/invoiceService";
import { inventoryService } from "@/services/inventoryService";
import { productServiceService } from "@/services/productServiceService";

const REASON_CATEGORIES = [
  "Sales Return / Rejected Goods",
  "Price / Rate Adjustment",
  "Damaged / Defective Stock",
  "Customer Allowance / Rebate",
  "Order Cancellation",
  "Other Adjustment",
];

const KARAT_OPTIONS = [
  { label: "24K", value: "24K" },
  { label: "22K", value: "22K" },
  { label: "18K", value: "18K" },
  { label: "14K", value: "14K" },
  { label: "925 Silver", value: "925 Silver" },
  { label: "Diamond", value: "Diamond" },
  { label: "General", value: "General" },
];

const lineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  karat: z.string().default("22K"),
  quantity: z.coerce.number().min(0.001, "Qty/Weight must be > 0"),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  gstPct: z.coerce.number().min(0).max(28).default(3),
});

const creditNoteSchema = z.object({
  date: z.string().min(1, "Date is required"),
  partyType: z.literal("CUSTOMER"),
  customerId: z.coerce.number().min(1, "Customer is required"),
  referenceNo: z.string().optional().nullable(),
  reasonCategory: z.string().default("Sales Return / Rejected Goods"),
  reason: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1, "At least one item line is required"),
});

type CreditNoteInput = z.infer<typeof creditNoteSchema>;

const defaultLine: CreditNoteInput["lines"][number] = {
  description: "",
  karat: "22K",
  quantity: 1,
  rate: 0,
  gstPct: 3,
};

export const CreditNoteFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const form = useForm<CreditNoteInput>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      partyType: "CUSTOMER",
      customerId: 0,
      referenceNo: "",
      reasonCategory: "Sales Return / Rejected Goods",
      reason: "",
      lines: [defaultLine],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const lineValues = useWatch({ control: form.control, name: "lines" });
  const selectedCustomerId = useWatch({ control: form.control, name: "customerId" });

  // Calculation totals (exact match with Invoice & Bill calculations)
  const totals = (lineValues || []).reduce(
    (acc, line) => {
      const qty = Number(line?.quantity) || 0;
      const rate = Number(line?.rate) || 0;
      const gst = Number(line?.gstPct) || 0;
      const taxable = qty * rate;
      const tax = (taxable * gst) / 100;
      return {
        subTotal: acc.subTotal + taxable,
        taxTotal: acc.taxTotal + tax,
        grandTotal: acc.grandTotal + taxable + tax,
      };
    },
    { subTotal: 0, taxTotal: 0, grandTotal: 0 },
  );

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-credit-note"],
    queryFn: () => customerService.list({}),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ["invoices-for-credit-note-customer", selectedCustomerId],
    queryFn: () => invoiceService.list({ customerId: selectedCustomerId || undefined }),
    enabled: Boolean(selectedCustomerId),
  });

  const customerInvoices = invoicesData?.rows ?? [];

  const { data: items = [] } = useQuery({
    queryKey: ["items-for-credit-note"],
    queryFn: () => inventoryService.listItems(),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-for-credit-note"],
    queryFn: () => productServiceService.list({ status: "ACTIVE", limit: 300 }),
  });
  const products = productsData?.rows ?? [];

  // Existing Note Query (when in edit mode)
  const { data: existing } = useQuery({
    queryKey: ["credit-note", id],
    queryFn: () => noteService.credit.getById(Number(id)),
    enabled: editing,
  });

  useEffect(() => {
    if (existing) {
      let cat = "Sales Return / Rejected Goods";
      let rem = existing.reason || "";
      for (const c of REASON_CATEGORIES) {
        if (rem.startsWith(c)) {
          cat = c;
          rem = rem.replace(c, "").replace(/^[:\-–\s]+/, "");
          break;
        }
      }

      form.reset({
        date: new Date(existing.date).toISOString().slice(0, 10),
        partyType: "CUSTOMER",
        customerId: existing.customerId || 0,
        referenceNo: existing.referenceNo || "",
        reasonCategory: cat,
        reason: rem,
        lines:
          existing.lines && existing.lines.length > 0
            ? existing.lines.map((l: any) => {
                let karat = "22K";
                const match = /\b(24K|22K|18K|14K|925 Silver|Diamond)\b/i.exec(l.description || "");
                if (match) karat = match[1];

                return {
                  description: l.description || "",
                  karat,
                  quantity: Number(l.quantity) || 1,
                  rate: Number(l.rate) || 0,
                  gstPct: Number(l.gstPct) ?? 3,
                };
              })
            : [defaultLine],
      });
    }
  }, [existing, form]);

  const customerOptions = customers.map((c: any) => ({
    value: c.id,
    label: c.name,
    meta: c.code ? `${c.code} · ${c.mobile || ""}` : c.mobile,
  }));

  const mutation = useMutation({
    mutationFn: (data: CreditNoteInput) => {
      const fullReason = data.reason?.trim()
        ? `${data.reasonCategory}: ${data.reason.trim()}`
        : data.reasonCategory;

      const payload: NotePayload = {
        date: new Date(data.date).toISOString(),
        partyType: "CUSTOMER",
        customerId: Number(data.customerId),
        referenceNo: data.referenceNo?.trim() || null,
        reason: fullReason,
        lines: data.lines.map((l) => ({
          description: l.description.trim(),
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          gstPct: Number(l.gstPct),
        })),
      };

      return editing
        ? noteService.credit.update(Number(id), payload)
        : noteService.credit.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Credit Note updated successfully" : "Credit Note created successfully");
      navigate("/credit-notes");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save Credit Note");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => noteService.credit.delete(Number(id)),
    onSuccess: () => {
      toast.success("Credit Note deleted successfully");
      navigate("/credit-notes");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete Credit Note");
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  }, (errors) => {
    console.error("Form Errors:", errors);
    toast.error("Please fill in all required fields marked in red.");
  });

  const selectedCustomer = customers.find((c: any) => Number(c.id) === Number(selectedCustomerId));

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* ── Page Header ────────────────────────────────────────── */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>{editing ? "Edit Credit Note" : "New Credit Note"}</span>
            {existing?.status && <StatusBadge status={existing.status} />}
          </div>
        }
        subtitle={
          editing
            ? `Note No: ${existing?.noteNo || `CRN-#${id}`}${
                existing?.customer?.name ? ` · Customer: ${existing.customer.name}` : ""
              }`
            : "Record sales returns, customer allowances, and credit note adjustments"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/credit-notes")}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-card px-4 text-xs font-semibold text-charcoal shadow-sm hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted" />
              Cancel
            </button>

            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/credit-notes/new")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-gold/40 bg-gold/10 px-3.5 text-xs font-bold text-gold-dark hover:bg-gold/20 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> + Create New
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    const noteNum = existing?.noteNo || `#${id}`;
                    if (
                      window.confirm(
                        `Are you sure you want to delete Credit Note ${noteNum}? This will permanently remove the record and reverse all associated accounting journal entries.`
                      )
                    ) {
                      deleteMutation.mutate();
                    }
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-ruby/30 bg-ruby/5 px-3.5 text-xs font-bold text-ruby hover:bg-ruby hover:text-white transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </>
            )}

            <button
              onClick={onSubmit}
              disabled={mutation.isPending}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-gold px-5 text-xs font-bold text-white shadow-sm hover:bg-gold-dark transition-all disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {mutation.isPending ? "Saving Note..." : editing ? "Update Credit Note" : "Save & Post Note"}
            </button>
          </div>
        }
      />

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {/* ── Section 1: Note & Customer Details (Gold Top Border) ── */}
        <div className="rounded-card border-t-2 border-t-gold bg-card p-6 shadow-card space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Users className="h-4 w-4 text-gold" />
            <h2 className="font-display text-base font-bold text-charcoal">
              Customer & Document Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Note Date */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Note Date <span className="text-ruby">*</span>
              </label>
              <input
                type="date"
                {...form.register("date")}
                className="mt-1 h-9 w-full rounded border border-border bg-white px-3 text-xs text-charcoal focus:border-gold focus:outline-none"
              />
              {form.formState.errors.date && (
                <p className="mt-1 text-[11px] text-ruby">{form.formState.errors.date.message}</p>
              )}
            </div>

            {/* Customer Selector */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Customer <span className="text-ruby">*</span>
              </label>
              <div className="mt-1">
                <SearchableSelect
                  options={customerOptions}
                  value={form.watch("customerId")}
                  onChange={(val) => {
                    form.setValue("customerId", Number(val), { shouldValidate: true });
                  }}
                  placeholder="Select or search customer..."
                />
              </div>
              {form.formState.errors.customerId && (
                <p className="mt-1 text-[11px] text-ruby">Please select a customer</p>
              )}
              {selectedCustomer && (
                <p className="mt-1 text-[11px] text-muted">
                  Code: <strong className="text-charcoal font-mono">{selectedCustomer.code || "-"}</strong>
                  {selectedCustomer.mobile && (
                    <> · Mobile: <strong className="text-charcoal">{selectedCustomer.mobile}</strong></>
                  )}
                  {selectedCustomer.gstin && (
                    <> · GST: <strong className="text-charcoal font-mono">{selectedCustomer.gstin}</strong></>
                  )}
                </p>
              )}
            </div>

            {/* Reference Invoice No / Dropdown */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Ref Sales Invoice
              </label>
              {customerInvoices.length > 0 ? (
                <div className="mt-1 flex flex-col gap-1">
                  <select
                    value={form.watch("referenceNo") || ""}
                    onChange={(e) => form.setValue("referenceNo", e.target.value)}
                    className="h-9 w-full rounded border border-border bg-white px-2.5 text-xs text-charcoal focus:border-gold focus:outline-none"
                  >
                    <option value="">-- Choose Past Invoice or Type --</option>
                    {customerInvoices.map((inv: any) => (
                      <option key={inv.id} value={inv.invoiceNo}>
                        {inv.invoiceNo} ({formatCurrency(inv.grandTotal)} · Bal: {formatCurrency(inv.balanceDue)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom Invoice #"
                    {...form.register("referenceNo")}
                    className="h-7 w-full rounded border border-border/70 bg-slate-50/50 px-2 text-[11px] text-charcoal focus:border-gold focus:bg-white focus:outline-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. INV-2026-001"
                  {...form.register("referenceNo")}
                  className="mt-1 h-9 w-full rounded border border-border bg-white px-3 text-xs text-charcoal focus:border-gold focus:outline-none"
                />
              )}
            </div>

            {/* Reason Category */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Credit Reason Category <span className="text-ruby">*</span>
              </label>
              <select
                {...form.register("reasonCategory")}
                className="mt-1 h-9 w-full rounded border border-border bg-white px-3 text-xs text-charcoal focus:border-gold focus:outline-none"
              >
                {REASON_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Detailed Reason / Justification */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Remarks / Discrepancy Details
              </label>
              <input
                type="text"
                placeholder="Specific return note, weight discrepancy, or customer allowance details..."
                {...form.register("reason")}
                className="mt-1 h-9 w-full rounded border border-border bg-white px-3 text-xs text-charcoal focus:border-gold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Line Items Table (Gold Top Border) ──────── */}
        <div className="rounded-card border-t-2 border-t-gold bg-card p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
            <div>
              <h2 className="font-display text-base font-bold text-charcoal">
                Credit Note Items
              </h2>
              <p className="text-xs text-muted">
                List the returned or credited jewellery items, weights, and agreed rates
              </p>
            </div>
            <button
              onClick={() => append({ ...defaultLine })}
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-gold/40 bg-gold/5 px-3 text-xs font-bold text-gold hover:bg-gold/15 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Line Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-slate-50/70 text-slate-600 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 text-left w-10">#</th>
                  <th className="py-2.5 px-3 text-left min-w-[220px]">Item / Description</th>
                  <th className="py-2.5 px-3 text-left w-28">Karat / Metal</th>
                  <th className="py-2.5 px-3 text-right w-28">Qty / Wt (g)</th>
                  <th className="py-2.5 px-3 text-right w-32">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-32">Taxable (₹)</th>
                  <th className="py-2.5 px-3 text-center w-24">GST %</th>
                  <th className="py-2.5 px-3 text-right w-28">Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right w-32">Total (₹)</th>
                  <th className="py-2.5 px-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {fields.map((field, index) => {
                  const qty = Number(lineValues?.[index]?.quantity) || 0;
                  const rate = Number(lineValues?.[index]?.rate) || 0;
                  const gst = Number(lineValues?.[index]?.gstPct) || 0;
                  const taxable = qty * rate;
                  const tax = (taxable * gst) / 100;
                  const lineTotal = taxable + tax;

                  return (
                    <tr key={field.id} className="hover:bg-gold-tint/10 transition-colors">
                      {/* # */}
                      <td className="py-2.5 px-3 font-mono text-muted text-center">
                        {index + 1}
                      </td>

                      {/* Item / Description with quick autocomplete presets */}
                      <td className="py-2.5 px-3 space-y-1">
                        <input
                          type="text"
                          placeholder="Item name / description (e.g. 22K Gold Chain Return)"
                          {...form.register(`lines.${index}.description`)}
                          className="h-8 w-full rounded border border-border bg-white px-2.5 text-xs text-charcoal focus:border-gold focus:outline-none"
                        />
                        {/* Quick pick chips */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-muted flex items-center gap-0.5">
                            <Tag className="h-2.5 w-2.5" /> Suggest:
                          </span>
                          {["Gold Jewellery Return", "Diamond Ring Exchange", "Weight Allowance", "Old Gold Purchase Credit", "Silver Articles Return"].map((suggest) => (
                            <button
                              key={suggest}
                              type="button"
                              onClick={() => form.setValue(`lines.${index}.description`, suggest, { shouldValidate: true })}
                              className="text-[10px] bg-slate-100 hover:bg-gold/15 hover:text-gold-dark text-slate-600 px-1.5 py-0.5 rounded transition-colors"
                            >
                              {suggest}
                            </button>
                          ))}
                        </div>
                        {form.formState.errors.lines?.[index]?.description && (
                          <p className="text-[10px] text-ruby">
                            {form.formState.errors.lines[index]?.description?.message}
                          </p>
                        )}
                      </td>

                      {/* Karat / Metal */}
                      <td className="py-2.5 px-3">
                        <select
                          {...form.register(`lines.${index}.karat`)}
                          className="h-8 w-full rounded border border-border bg-white px-2 text-xs text-charcoal focus:border-gold focus:outline-none"
                        >
                          {KARAT_OPTIONS.map((k) => (
                            <option key={k.value} value={k.value}>
                              {k.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Qty / Wt */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          {...form.register(`lines.${index}.quantity`)}
                          className="h-8 w-full rounded border border-border bg-white px-2 text-right font-mono text-xs text-charcoal focus:border-gold focus:outline-none"
                        />
                      </td>

                      {/* Rate */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register(`lines.${index}.rate`)}
                          className="h-8 w-full rounded border border-border bg-white px-2 text-right font-mono text-xs text-charcoal focus:border-gold focus:outline-none"
                        />
                      </td>

                      {/* Taxable Amount */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                        {formatCurrency(taxable)}
                      </td>

                      {/* GST % */}
                      <td className="py-2.5 px-3">
                        <select
                          {...form.register(`lines.${index}.gstPct`)}
                          className="h-8 w-full rounded border border-border bg-white px-1 text-center font-mono text-xs text-charcoal focus:border-gold focus:outline-none"
                        >
                          <option value="0">0%</option>
                          <option value="3">3%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>

                      {/* Tax Amount */}
                      <td className="py-2.5 px-3 text-right font-mono text-muted whitespace-nowrap">
                        {formatCurrency(tax)}
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-charcoal whitespace-nowrap">
                        {formatCurrency(lineTotal)}
                      </td>

                      {/* Delete */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (fields.length > 1) {
                              remove(index);
                            } else {
                              toast.info("At least one line item is required");
                            }
                          }}
                          className="grid h-7 w-7 place-items-center rounded border border-ruby/30 text-ruby hover:bg-ruby/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 3: Accounting Totals Summary (Matching Invoices/Bills) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Notes & Terms */}
          <div className="rounded-card border border-border bg-card p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Accounting & Ledger Notes
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upon posting this Credit Note, the accounting system will automatically:
            </p>
            <ul className="list-disc pl-4 text-xs text-muted space-y-1">
              <li>Debit Sales Returns account with taxable subtotal</li>
              <li>Debit Output GST with total output tax reversal</li>
              <li>Credit Customer Accounts Receivable ledger with grand total</li>
            </ul>
          </div>

          {/* Totals Summary Box */}
          <div className="rounded-card border-t-4 border-t-gold bg-card p-6 shadow-card space-y-3">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-medium">Taxable Subtotal</span>
              <span className="font-mono font-bold">{formatCurrency(totals.subTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-medium">Total GST Reversal</span>
              <span className="font-mono font-bold">{formatCurrency(totals.taxTotal)}</span>
            </div>
            <div className="pt-3 border-t border-border flex justify-between items-baseline">
              <div>
                <span className="text-sm font-bold text-charcoal">Total Credit Amount</span>
                <p className="text-[10px] text-muted">Receivable reduction from customer</p>
              </div>
              <span className="text-2xl font-bold font-mono text-gold-dark">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Bottom Action Bar ──────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            {editing && (
              <button
                onClick={() => {
                  const noteNum = existing?.noteNo || `#${id}`;
                  if (
                    window.confirm(
                      `Are you sure you want to delete Credit Note ${noteNum}? This will permanently remove the record and reverse all associated accounting journal entries.`
                    )
                  ) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                type="button"
                className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-ruby/30 bg-ruby/5 px-4 text-sm font-semibold text-ruby shadow-sm hover:bg-ruby hover:text-white transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete Credit Note"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/credit-notes")}
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-border bg-card px-5 text-sm font-semibold text-charcoal shadow-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-btn bg-gold px-6 text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {mutation.isPending ? "Saving..." : editing ? "Update Credit Note" : "Save & Post Credit Note"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
