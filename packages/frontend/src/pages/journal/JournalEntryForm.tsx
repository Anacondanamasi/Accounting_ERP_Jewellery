import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Save, Send, X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { journalService } from "@/services/journalService";
import { accountsService } from "@/services/accountsService";
import { customerService } from "@/services/customerService";
import { supplierService } from "@/services/supplierService";
import { formatCurrency } from "@/lib/formatters";

const isAccountsReceivable = (account: any) => {
  if (!account) return false;
  const name = (account.name || "").toLowerCase();
  const group = (account.group || "").toLowerCase();
  const code = String(account.code || "");
  return (
    code === "1100" ||
    name.includes("accounts receivable") ||
    name.includes("sundry debtors") ||
    name.includes("debtors") ||
    group.includes("accounts receivable") ||
    group.includes("debtors")
  );
};

const isAccountsPayable = (account: any) => {
  if (!account) return false;
  const name = (account.name || "").toLowerCase();
  const group = (account.group || "").toLowerCase();
  const code = String(account.code || "");
  return (
    code === "2100" ||
    name.includes("accounts payable") ||
    name.includes("sundry creditors") ||
    name.includes("creditors") ||
    group.includes("accounts payable") ||
    group.includes("creditors")
  );
};

const lineSchema = z
  .object({
    accountId: z.coerce.number().min(1, "Please select an account"),
    partyName: z.string().optional().default(""),
    debit: z.coerce.number().min(0).optional().default(0),
    credit: z.coerce.number().min(0).optional().default(0),
    narration: z.string().optional(),
  })
  .refine((data) => (data.debit || 0) > 0 || (data.credit || 0) > 0, {
    message: "Enter either a Debit or Credit amount",
    path: ["debit"],
  });

const journalSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  narration: z.string().optional(),
  lines: z.array(lineSchema).min(2, "At least two lines are required"),
});

type JournalInput = z.infer<typeof journalSchema>;

const defaultLine = {
  accountId: 0,
  partyName: "",
  debit: 0,
  credit: 0,
  narration: "",
};

export const JournalEntryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const form = useForm<JournalInput>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      reference: "",
      narration: "",
      lines: [{ ...defaultLine }, { ...defaultLine }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: () => accountsService.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list-for-journal"],
    queryFn: () => customerService.list({}),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list-for-journal"],
    queryFn: () => supplierService.list({}),
  });

  const { data: entry } = useQuery({
    queryKey: ["journal", id],
    queryFn: () => journalService.getById(id!),
    enabled: editing,
  });

  useEffect(() => {
    if (!entry || !editing) return;
    const rawDate = entry.date;
    const date = rawDate
      ? new Date(rawDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    form.reset({
      date,
      reference: entry.reference ?? "",
      narration: entry.narration ?? "",
      lines: entry.lines.map((line: any) => ({
        accountId: line.accountId,
        partyName: line.partyName ?? "",
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        narration: line.narration ?? "",
      })),
    });
  }, [editing, entry, form]);

  const accountOptions = accounts.map((a: any) => ({
    value: a.id,
    label: `${a.code} - ${a.name}`,
    meta: a.group,
  }));

  const watchedLines = form.watch("lines");
  const totals = (watchedLines || []).reduce(
    (acc, line) => {
      acc.debit += Number(line?.debit || 0);
      acc.credit += Number(line?.credit || 0);
      return acc;
    },
    { debit: 0, credit: 0 },
  );

  const difference = Math.abs(totals.debit - totals.credit);
  const balanced = difference < 0.01 && totals.debit > 0;

  const validatePartyRequirements = (values: JournalInput): boolean => {
    let isValid = true;
    values.lines.forEach((line, index) => {
      const acc = accounts.find((a: any) => a.id === Number(line.accountId));
      if (isAccountsReceivable(acc) && (!line.partyName || !line.partyName.trim())) {
        form.setError(`lines.${index}.partyName` as any, {
          type: "manual",
          message: "Customer name is compulsory for Accounts Receivable",
        });
        isValid = false;
      } else if (isAccountsPayable(acc) && (!line.partyName || !line.partyName.trim())) {
        form.setError(`lines.${index}.partyName` as any, {
          type: "manual",
          message: "Supplier name is compulsory for Accounts Payable",
        });
        isValid = false;
      }
    });
    return isValid;
  };

  const transformToApi = (values: JournalInput) => ({
    ...values,
    narration: values.narration || "Journal Entry",
    lines: values.lines.map((l) => ({
      accountId: l.accountId,
      partyName: (l.partyName || "").trim(),
      drCr: (l.debit || 0) > 0 ? "DR" : "CR",
      amount: (l.debit || 0) > 0 ? l.debit : l.credit,
      narration: l.narration,
    })),
  });

  const saveMutation = useMutation({
    mutationFn: (values: JournalInput) => {
      const payload = transformToApi(values);
      return editing ? journalService.update(id!, payload) : journalService.create(payload);
    },
    onSuccess: () => {
      toast.success("Journal saved successfully");
      navigate(`/journal`);
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.message || "Unable to save journal entry");
    },
  });

  const postMutation = useMutation({
    mutationFn: async (values: JournalInput) => {
      const payload = transformToApi(values);
      const record = editing
        ? await journalService.update(id!, payload)
        : await journalService.create(payload);
      return journalService.post(record.id);
    },
    onSuccess: () => {
      toast.success("Journal posted successfully");
      navigate("/journal");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.message || "Unable to post journal");
    },
  });

  const onInvalid = (errors: any) => {
    console.warn("Form Validation Errors:", errors);
    toast.error("Please fix the errors in the form before submitting.");
  };

  const handleSave = (values: JournalInput) => {
    if (!validatePartyRequirements(values)) {
      toast.error("Please enter the compulsory Customer/Supplier Name for Accounts Receivable/Payable lines.");
      return;
    }
    saveMutation.mutate(values);
  };

  const handlePost = (values: JournalInput) => {
    if (!validatePartyRequirements(values)) {
      toast.error("Please enter the compulsory Customer/Supplier Name for Accounts Receivable/Payable lines.");
      return;
    }
    postMutation.mutate(values);
  };

  const onSave = form.handleSubmit(handleSave, onInvalid);
  const onPost = form.handleSubmit(handlePost, onInvalid);

  const handleDebitChange = (index: number, value: string) => {
    const val = parseFloat(value) || 0;
    form.setValue(`lines.${index}.debit`, val);
    if (val > 0) {
      form.setValue(`lines.${index}.credit`, 0);
    }
  };

  const handleCreditChange = (index: number, value: string) => {
    const val = parseFloat(value) || 0;
    form.setValue(`lines.${index}.credit`, val);
    if (val > 0) {
      form.setValue(`lines.${index}.debit`, 0);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <PageHeader
        title={editing ? "Edit Journal Entry" : "New Journal Entry"}
        subtitle="Manage accounting adjustments and internal transfers"
        actions={
          <div className="flex items-center gap-3">
            <button
              className="flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => navigate("/journal")}
              type="button"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              className="flex h-10 items-center gap-2 rounded-btn border border-gold/30 bg-white px-4 text-sm font-semibold text-charcoal hover:bg-gold/5 transition-colors"
              onClick={() => onSave()}
              type="button"
            >
              <Save className="h-4 w-4 text-gold" /> Save Draft
            </button>
            <button
              className="flex h-10 items-center gap-2 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:bg-gold-dark disabled:opacity-40 disabled:shadow-none transition-all"
              disabled={!balanced || saveMutation.isPending || postMutation.isPending}
              onClick={() => onPost()}
              type="button"
            >
              <Send className="h-4 w-4" /> Post Entry
            </button>
          </div>
        }
      />

      <div className="grid gap-6 rounded-card border border-border bg-card p-6 shadow-card md:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Date</label>
          <input
            className="h-10 w-full rounded-md border border-border bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
            type="date"
            {...form.register("date")}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Reference #</label>
          <input
            className="h-10 w-full rounded-md border border-border bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
            placeholder="e.g. JVN-2024-001"
            {...form.register("reference")}
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Main Narration</label>
          <input
            className="h-10 w-full rounded-md border border-border bg-slate-50/50 px-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
            placeholder="Describe the purpose of this entry..."
            {...form.register("narration")}
          />
        </div>
      </div>

      <div className="rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border bg-slate-50/50 px-6 py-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Transaction Lines</h2>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white border border-border px-3 text-xs font-bold text-gold hover:bg-slate-50 transition-colors shadow-sm"
            onClick={() => append({ ...defaultLine })}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Line
          </button>
        </div>

        <div className="p-0 min-h-[300px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border">
                <th className="px-6 py-3 font-bold w-[28%]">Account Selection</th>
                <th className="px-3 py-3 font-bold w-[24%]">
                  Party Name (Customer / Supplier)
                </th>
                <th className="w-28 px-3 py-3 text-right">Debit</th>
                <th className="w-28 px-3 py-3 text-right">Credit</th>
                <th className="px-3 py-3">Line Narration</th>
                <th className="w-10 px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {fields.map((field, index) => {
                const currentAccountId = form.watch(`lines.${index}.accountId`);
                const selectedAcc = accounts.find((a: any) => a.id === Number(currentAccountId));
                const isAR = isAccountsReceivable(selectedAcc);
                const isAP = isAccountsPayable(selectedAcc);
                const partyError = form.formState.errors.lines?.[index]?.partyName?.message;

                return (
                  <tr key={field.id} className="group hover:bg-slate-50/30 transition-colors">
                    {/* Account Selection */}
                    <td className="px-6 py-4 align-top">
                      <div className="relative z-[40]">
                        <SearchableSelect
                          onChange={(val) => {
                            const newAccId = Number(val);
                            form.setValue(`lines.${index}.accountId`, newAccId);
                            form.clearErrors(`lines.${index}.accountId`);
                            const newAcc = accounts.find((a: any) => a.id === newAccId);
                            if (!isAccountsReceivable(newAcc) && !isAccountsPayable(newAcc)) {
                              form.setValue(`lines.${index}.partyName`, "");
                              form.clearErrors(`lines.${index}.partyName` as any);
                            }
                          }}
                          options={accountOptions.map((o: any) => ({ ...o, value: String(o.value) }))}
                          placeholder="Select an account..."
                          value={String(form.watch(`lines.${index}.accountId`) || "")}
                        />
                        {form.formState.errors.lines?.[index]?.accountId && (
                          <p className="mt-1 text-[10px] text-ruby font-bold uppercase tracking-tight">
                            {form.formState.errors.lines[index].accountId?.message}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Customer / Supplier Name Column */}
                    <td className="px-3 py-4 align-top">
                      {isAR ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Customer <span className="text-ruby font-black">*Compulsory</span>
                            </span>
                          </div>
                          <SearchableSelect
                            onChange={(val) => {
                              form.setValue(`lines.${index}.partyName`, String(val));
                              form.clearErrors(`lines.${index}.partyName` as any);
                            }}
                            options={(customers ?? []).map((c: any) => ({
                              value: c.name,
                              label: c.name,
                              meta: c.code || c.mobile || "Customer",
                            }))}
                            placeholder="Select customer..."
                            value={form.watch(`lines.${index}.partyName`) || ""}
                          />
                          {partyError && (
                            <p className="mt-1 text-[10px] text-ruby font-bold tracking-tight">
                              {partyError}
                            </p>
                          )}
                        </div>
                      ) : isAP ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                              Supplier <span className="text-ruby font-black">*Compulsory</span>
                            </span>
                          </div>
                          <SearchableSelect
                            onChange={(val) => {
                              form.setValue(`lines.${index}.partyName`, String(val));
                              form.clearErrors(`lines.${index}.partyName` as any);
                            }}
                            options={(suppliers ?? []).map((s: any) => ({
                              value: s.name,
                              label: s.name,
                              meta: s.code || s.phone || "Supplier",
                            }))}
                            placeholder="Select supplier..."
                            value={form.watch(`lines.${index}.partyName`) || ""}
                          />
                          {partyError && (
                            <p className="mt-1 text-[10px] text-ruby font-bold tracking-tight">
                              {partyError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="h-10 flex items-center px-3 rounded-md border border-dashed border-slate-200 bg-slate-50/50 text-xs text-muted">
                          <span>— Not required</span>
                        </div>
                      )}
                    </td>

                    {/* Debit */}
                    <td className="px-3 py-4 align-top">
                      <input
                        className={`h-10 w-full rounded-md border ${
                          form.formState.errors.lines?.[index]?.debit
                            ? "border-ruby bg-ruby/5"
                            : "border-border bg-white"
                        } px-3 text-right text-sm font-mono focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all`}
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={form.watch(`lines.${index}.debit`) || ""}
                        onChange={(e) => handleDebitChange(index, e.target.value)}
                      />
                    </td>

                    {/* Credit */}
                    <td className="px-3 py-4 align-top">
                      <input
                        className={`h-10 w-full rounded-md border ${
                          form.formState.errors.lines?.[index]?.credit
                            ? "border-ruby bg-ruby/5"
                            : "border-border bg-white"
                        } px-3 text-right text-sm font-mono focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all`}
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={form.watch(`lines.${index}.credit`) || ""}
                        onChange={(e) => handleCreditChange(index, e.target.value)}
                      />
                    </td>

                    {/* Narration */}
                    <td className="px-3 py-4 align-top">
                      <input
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                        placeholder="Line remark..."
                        {...form.register(`lines.${index}.narration`)}
                      />
                    </td>

                    {/* Remove */}
                    <td className="px-4 py-4 align-top text-center">
                      <button
                        className="p-2 mt-1 rounded-md text-slate-300 hover:text-ruby hover:bg-ruby/5 transition-all opacity-0 group-hover:opacity-100"
                        onClick={() => remove(index)}
                        type="button"
                        title="Remove Line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/50 border-t border-border font-medium">
                <td colSpan={2} className="px-6 py-6 text-right text-xs font-bold uppercase text-muted">
                  Grand Total
                </td>
                <td className="px-3 py-6 text-right font-mono text-base font-bold text-charcoal">
                  {formatCurrency(totals.debit)}
                </td>
                <td className="px-3 py-6 text-right font-mono text-base font-bold text-charcoal">
                  {formatCurrency(totals.credit)}
                </td>
                <td colSpan={2} className="px-6 py-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        balanced
                          ? "bg-emerald shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : "bg-ruby shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      }`}
                    />
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        balanced ? "text-emerald" : "text-ruby"
                      }`}
                    >
                      {balanced
                        ? "Journal Balanced"
                        : `Unbalanced: ${formatCurrency(difference)}`}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {!balanced && totals.debit > 0 && (
        <div className="rounded-md bg-ruby/5 border border-ruby/20 p-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-xs font-medium text-ruby">
            <strong>Warning:</strong> The journal entry is currently unbalanced by{" "}
            <strong>{formatCurrency(difference)}</strong>. Accounting standards require total debits to
            equal total credits before posting.
          </p>
        </div>
      )}
    </div>
  );
};
