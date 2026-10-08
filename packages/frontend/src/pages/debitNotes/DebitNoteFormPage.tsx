import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { noteService, type NotePayload } from "@/services/noteService";
import { supplierService } from "@/services/supplierService";

const noteSchema = z.object({
  date: z.string().min(1, "Date is required"),
  partyType: z.literal("SUPPLIER"),
  supplierId: z.coerce.number().min(1, "Supplier is required"),
  referenceNo: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  lines: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(0.001, "Qty must be > 0"),
    rate: z.coerce.number().min(0, "Rate cannot be negative"),
    gstPct: z.coerce.number().min(0).max(28),
  })).min(1, "At least one item is required"),
});

type NoteInput = z.infer<typeof noteSchema>;

export const DebitNoteFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const form = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      partyType: "SUPPLIER",
      supplierId: "",
      referenceNo: "",
      reason: "",
      lines: [{ description: "", quantity: 1, rate: 0, gstPct: 3 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const lineValues = useWatch({ control: form.control, name: "lines" });
  
  const totals = (lineValues || []).reduce((acc, line) => {
    const qty = Number(line.quantity) || 0;
    const rate = Number(line.rate) || 0;
    const gst = Number(line.gstPct) || 0;
    const amount = qty * rate;
    const tax = (amount * gst) / 100;
    return {
      subTotal: acc.subTotal + amount,
      taxTotal: acc.taxTotal + tax,
      grandTotal: acc.grandTotal + amount + tax,
    };
  }, { subTotal: 0, taxTotal: 0, grandTotal: 0 });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () => supplierService.list({}),
  });

  const { data: existing } = useQuery({
    queryKey: ["debit-note", id],
    queryFn: () => noteService.debit.getById(id!),
    enabled: editing,
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        date: new Date(existing.date).toISOString().slice(0, 10),
        partyType: "SUPPLIER",
        supplierId: existing.supplierId,
        referenceNo: existing.referenceNo,
        reason: existing.reason,
        lines: existing.lines.map((l: any) => ({
          description: l.description,
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          gstPct: Number(l.gstPct),
        })),
      });
    }
  }, [existing, form]);

  const mutation = useMutation({
    mutationFn: (data: NoteInput) => editing ? noteService.debit.update(id!, data as NotePayload) : noteService.debit.create(data as NotePayload),
    onSuccess: () => {
      toast.success(editing ? "Debit Note updated" : "Debit Note created");
      navigate("/debit-notes");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error("Failed to save Debit Note");
    },
  });

  const onInvalid = (errors: any) => {
    console.error("Form Errors:", errors);
    toast.error("Please fill in all required fields correctly.");
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title={editing ? "Edit Debit Note" : "New Debit Note"}
        subtitle={editing ? `Note No: ${existing?.noteNo}` : "Return or adjustment for purchases"}
        actions={
          <div className="flex gap-2">
            <button className="h-10 rounded-btn border border-border px-4 text-sm font-medium hover:bg-slate-50 transition-colors" onClick={() => navigate("/debit-notes")} type="button">
              Cancel
            </button>
            <button className="h-10 rounded-btn bg-gold px-6 text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all disabled:opacity-50" onClick={form.handleSubmit((v) => mutation.mutate(v), onInvalid)} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Debit Note"}
            </button>
          </div>
        }
      />

      <form className="grid gap-6">
        <div className="grid gap-4 rounded-card border-t-2 border-t-gold bg-card p-6 shadow-card md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Note Date</label>
            <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none" type="date" {...form.register("date")} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Supplier</label>
            <SearchableSelect
              onChange={(val) => form.setValue("supplierId", val, { shouldValidate: true })}
              options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))}
              value={form.watch("supplierId")}
            />
            {form.formState.errors.supplierId && <p className="mt-1 text-[10px] text-ruby">{form.formState.errors.supplierId.message}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Reference Bill No</label>
            <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none" placeholder="BILL-2024-..." {...form.register("referenceNo")} />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">Reason for Debit</label>
            <textarea className="mt-1 min-h-[60px] w-full rounded border border-border px-3 py-2 text-sm focus:border-gold outline-none" placeholder="Item return, weight discrepancy, etc." {...form.register("reason")} />
          </div>
        </div>

        <div className="rounded-card border-t-2 border-t-gold bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Line Items</h3>
            <button className="inline-flex h-9 items-center gap-2 rounded-btn border border-gold/30 bg-gold/5 px-4 text-xs font-bold text-gold hover:bg-gold/10 transition-colors" onClick={() => append({ description: "", quantity: 1, rate: 0, gstPct: 3 })} type="button">
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid gap-4 px-3 text-[10px] font-bold uppercase tracking-wider text-muted md:grid-cols-12">
              <div className="md:col-span-5">Description</div>
              <div className="md:col-span-2">Quantity</div>
              <div className="md:col-span-2">Rate</div>
              <div className="md:col-span-1 text-center">GST %</div>
              <div className="md:col-span-1 text-right">Total</div>
              <div className="md:col-span-1 text-center">Action</div>
            </div>

            {fields.map((field, index) => {
              const qty = Number(lineValues?.[index]?.quantity) || 0;
              const rate = Number(lineValues?.[index]?.rate) || 0;
              const gst = Number(lineValues?.[index]?.gstPct) || 0;
              const itemTotal = (qty * rate) * (1 + gst / 100);

              return (
                <div key={field.id} className="grid gap-4 rounded border border-border bg-slate-50/50 p-3 md:grid-cols-12 items-center">
                  <div className="md:col-span-5">
                    <input className="h-9 w-full rounded border border-border px-2 text-xs focus:border-gold outline-none" placeholder="Item description" {...form.register(`lines.${index}.description`)} />
                  </div>
                  <div className="md:col-span-2">
                    <input className="h-9 w-full rounded border border-border px-2 text-xs focus:border-gold outline-none" type="number" step="0.001" {...form.register(`lines.${index}.quantity`)} />
                  </div>
                  <div className="md:col-span-2">
                    <input className="h-9 w-full rounded border border-border px-2 text-xs focus:border-gold outline-none" type="number" step="0.01" {...form.register(`lines.${index}.rate`)} />
                  </div>
                  <div className="md:col-span-1">
                    <input className="h-9 w-full rounded border border-border px-2 text-xs text-center focus:border-gold outline-none" type="number" step="1" {...form.register(`lines.${index}.gstPct`)} />
                  </div>
                  <div className="md:col-span-1 text-right font-mono text-xs font-bold">
                    {formatCurrency(itemTotal)}
                  </div>
                  <div className="md:col-span-1 flex justify-center">
                    <button className="grid h-8 w-8 place-items-center rounded border border-ruby/30 text-ruby hover:bg-ruby/5 transition-colors" onClick={() => remove(index)} type="button">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ml-auto w-full max-sm rounded-card border-t-4 border-t-gold bg-card p-6 shadow-card">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Sub Total</span>
              <span className="font-mono font-semibold">{formatCurrency(totals.subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Tax Amount</span>
              <span className="font-mono font-semibold">{formatCurrency(totals.taxTotal)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-lg font-bold">
              <span>Total Debit</span>
              <span className="font-mono text-gold">{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
