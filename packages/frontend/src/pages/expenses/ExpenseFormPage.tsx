import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { accountsService } from "@/services/accountsService";
import { supplierService } from "@/services/supplierService";
import { expenseService } from "@/services/expenseService";
import { formatCurrency } from "@/lib/formatters";

const expenseFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  paymentMethodLedgerId: z.coerce.number().min(1, "Please select a payment method"),
  expenseLedgerId: z.coerce.number().min(1, "Please select an expense account"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  supplierId: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || Number(val) === 0 ? null : Number(val)),
    z.number().positive().nullable().optional()
  ),
  narration: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const ExpenseFormPage = () => {
  const navigate = useNavigate();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      paymentMethodLedgerId: 0,
      expenseLedgerId: 0,
      amount: undefined,
      supplierId: null,
      narration: "",
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: () => accountsService.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () => supplierService.list(),
  });

  // Filter only Cash / Bank accounts for the payment method
  const cashBankAccounts = (accounts as any[]).filter((acc) => {
    const type = String(acc.type).toLowerCase();
    const text = `${acc.code} ${acc.name} ${acc.group}`.toLowerCase();
    return (
      (type === "asset" || type === "assets") &&
      /(cash|bank|current account|savings account|petty cash)/.test(text)
    );
  });

  // Filter only Expense accounts for the expense ledger
  const expenseAccounts = (accounts as any[]).filter((acc) =>
    ["expense", "expenses"].includes(String(acc.type).toLowerCase())
  );

  const cashBankOptions = cashBankAccounts.map((a: any) => ({
    value: String(a.id),
    label: `${a.code} - ${a.name}`,
    meta: a.group,
  }));

  const expenseOptions = expenseAccounts.map((a: any) => ({
    value: String(a.id),
    label: `${a.code} - ${a.name}`,
    meta: a.group,
  }));

  const supplierOptions = (suppliers as any[]).map((s: any) => ({
    value: String(s.id),
    label: s.name,
    meta: s.code,
  }));

  const saveMutation = useMutation({
    mutationFn: (values: ExpenseFormValues) => expenseService.create(values as any),
    onSuccess: () => {
      toast.success("Expense recorded and journal posted successfully!");
      navigate("/expenses");
    },
    onError: (err: any) => {
      console.error(err);
      const detail = err?.response?.data?.error?.details?.[0]?.message;
      const msg = err?.response?.data?.error?.message ?? err?.message ?? "Failed to save expense";
      toast.error(detail ?? msg);
    },
  });

  const onInvalid = (errors: any) => {
    console.warn("Form validation errors:", errors);
    toast.error("Please fix the highlighted errors before saving.");
  };

  const onSubmit = form.handleSubmit(
    (values) => saveMutation.mutate(values),
    onInvalid
  );

  const watchedAmount = form.watch("amount");

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      <PageHeader
        title="Add Direct Expense"
        subtitle="Record operational expenses paid directly from Cash or Bank"
        actions={
          <div className="flex items-center gap-3">
            <button
              className="flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => navigate("/expenses")}
              type="button"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              className="flex h-10 items-center gap-2 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:bg-gold-dark disabled:opacity-40 transition-all"
              disabled={saveMutation.isPending}
              onClick={onSubmit}
              type="button"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Saving…" : "Save & Post"}
            </button>
          </div>
        }
      />

      {/* Main Card */}
      <div className="rounded-card border border-border bg-card p-6 shadow-card space-y-6">

        {/* Row 1: Date + Amount */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Date *</label>
            <input
              type="date"
              className={`h-10 w-full rounded-md border ${form.formState.errors.date ? "border-ruby" : "border-border"} bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all`}
              {...form.register("date")}
            />
            {form.formState.errors.date && (
              <p className="text-[10px] font-bold uppercase text-ruby">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Amount *</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              className={`h-10 w-full rounded-md border ${form.formState.errors.amount ? "border-ruby" : "border-border"} bg-slate-50/50 px-3 text-right text-sm font-mono focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all`}
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="text-[10px] font-bold uppercase text-ruby">{form.formState.errors.amount.message}</p>
            )}
          </div>
        </div>

        {/* Row 2: Expense Via / Payment Method */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Expense Via / Payment Method (Cash or Bank) *
          </label>
          <SearchableSelect
            options={cashBankOptions}
            placeholder="Select Cash or Bank account…"
            value={String(form.watch("paymentMethodLedgerId") || "")}
            onChange={(val) => {
              form.setValue("paymentMethodLedgerId", Number(val), { shouldValidate: true });
            }}
          />
          {form.formState.errors.paymentMethodLedgerId && (
            <p className="text-[10px] font-bold uppercase text-ruby">
              {form.formState.errors.paymentMethodLedgerId.message}
            </p>
          )}
          <p className="text-[10px] text-muted">Only Cash ledgers and Bank ledgers are shown.</p>
        </div>

        {/* Row 3: Expense Ledger */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Expense Ledger *</label>
          <SearchableSelect
            options={expenseOptions}
            placeholder="Select expense account (e.g. Freight, Fuel, Office Expense)…"
            value={String(form.watch("expenseLedgerId") || "")}
            onChange={(val) => {
              form.setValue("expenseLedgerId", Number(val), { shouldValidate: true });
            }}
          />
          {form.formState.errors.expenseLedgerId && (
            <p className="text-[10px] font-bold uppercase text-ruby">
              {form.formState.errors.expenseLedgerId.message}
            </p>
          )}
        </div>

        {/* Row 4: Supplier (optional) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Supplier Name <span className="text-muted/60 normal-case font-normal">(Optional — for history only, no outstanding created)</span>
          </label>
          <SearchableSelect
            options={[{ value: "", label: "— No Supplier —", meta: "" }, ...supplierOptions]}
            placeholder="Select supplier (optional)…"
            value={String(form.watch("supplierId") ?? "")}
            onChange={(val) => {
              form.setValue("supplierId", val === "" ? null : Number(val));
            }}
          />
        </div>

        {/* Row 5: Narration */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Narration</label>
          <input
            type="text"
            placeholder="e.g. Freight paid for gold consignment, May 2024"
            className="h-10 w-full rounded-md border border-border bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
            {...form.register("narration")}
          />
        </div>
      </div>

      {/* Accounting Preview */}
      {watchedAmount && Number(watchedAmount) > 0 && (
        <div className="rounded-card border border-gold/20 bg-gold/5 p-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gold">Accounting Effect (Preview)</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase font-bold text-muted border-b border-border/50">
                <th className="pb-2 text-left">Account</th>
                <th className="pb-2 text-right w-32">Debit</th>
                <th className="pb-2 text-right w-32">Credit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 text-charcoal">
                  {expenseOptions.find(o => o.value === String(form.watch("expenseLedgerId") || ""))?.label || "Expense Account"}
                </td>
                <td className="py-1 text-right font-mono font-semibold text-charcoal">{formatCurrency(Number(watchedAmount))}</td>
                <td className="py-1 text-right font-mono text-muted">—</td>
              </tr>
              <tr>
                <td className="py-1 text-charcoal">
                  {cashBankOptions.find(o => o.value === String(form.watch("paymentMethodLedgerId") || ""))?.label || "Cash / Bank Account"}
                </td>
                <td className="py-1 text-right font-mono text-muted">—</td>
                <td className="py-1 text-right font-mono font-semibold text-charcoal">{formatCurrency(Number(watchedAmount))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
