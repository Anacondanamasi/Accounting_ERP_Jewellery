import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, Save, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { bankingService } from "@/services/bankingService";

export const TransferMoneyPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    fromAccount: "",
    toAccount: "",
    amount: "",
    reference: "",
    description: "",
  });

  const { data: bankAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => bankingService.listAccounts(),
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const sameAccount = form.fromAccount && form.fromAccount === form.toAccount;
  const numAmount = parseFloat(form.amount) || 0;

  const fromAccObj = bankAccounts.find((a) => String(a.id) === String(form.fromAccount));
  const toAccObj = bankAccounts.find((a) => String(a.id) === String(form.toAccount));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.fromAccount || !form.toAccount) throw new Error("Please select both source and destination accounts");
      if (form.fromAccount === form.toAccount) throw new Error("Source and destination accounts must be different");
      if (!form.amount || numAmount <= 0) throw new Error("Please enter a valid transfer amount");

      const fromName = fromAccObj?.accountName || "Bank Account";
      const toName = toAccObj?.accountName || "Bank Account";

      // 1. Post Outflow from source account
      await bankingService.createTransaction(Number(form.fromAccount), {
        date: form.date,
        narration: `Contra Transfer to ${toName}${form.description ? ` (${form.description})` : ""}`,
        reference: form.reference || "INTERNAL-XFER",
        debit: numAmount,
        credit: 0,
      });

      // 2. Post Inflow into destination account
      await bankingService.createTransaction(Number(form.toAccount), {
        date: form.date,
        narration: `Contra Transfer from ${fromName}${form.description ? ` (${form.description})` : ""}`,
        reference: form.reference || "INTERNAL-XFER",
        debit: 0,
        credit: numAmount,
      });
    },
    onSuccess: () => {
      toast.success("Contra bank transfer completed successfully");
      void queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      navigate("/banking/accounts");
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || "Failed to process transfer");
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transfer Money"
        subtitle="Move funds between your bank accounts (Contra)"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/banking/accounts")} type="button">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={Boolean(sameAccount) || !form.fromAccount || !form.toAccount || numAmount <= 0}
              data-shortcut="save"
              title="Save Transfer (Ctrl+S)"
              type="button"
            >
              <Save className="mr-2 h-4 w-4" /> Save Transfer
            </Button>
          </>
        }
      />

      {/* Banner */}
      <div className="flex items-center gap-4 rounded-xl border-l-4 border-l-[#0891b2] bg-cyan-50 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0891b2]/10">
          <ArrowLeftRight className="h-6 w-6 text-[#0891b2]" />
        </div>
        <div>
          <p className="font-semibold text-[#0891b2]">Internal Contra Transfer</p>
          <p className="text-sm text-muted">No external party — funds move atomically between your bank accounts</p>
        </div>
      </div>

      {sameAccount && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Source and destination accounts must be different.
        </div>
      )}

      <div className="rounded-xl border-t-2 border-t-[#0891b2] bg-card p-8 shadow-card">
        <div className="grid gap-6 md:grid-cols-2">
          {/* From → To visual */}
          <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="mb-1 block text-xs font-medium text-muted">
                From Account (Source) <span className="text-ruby">*</span>
              </label>
              <select
                className="h-11 w-full rounded-lg border-2 border-ruby/40 bg-red-50 px-3 text-sm font-medium text-charcoal focus:border-ruby focus:outline-none"
                value={form.fromAccount}
                onChange={(e) => set("fromAccount", e.target.value)}
                disabled={loadingAccounts}
              >
                <option value="">Select source account...</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.accountName} (₹{acc.bookBalance.toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>

            {/* Arrow */}
            <div className="flex h-11 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#0891b2]/10 text-[#0891b2]">
              <ArrowLeftRight className="h-5 w-5" />
            </div>

            <div className="flex-1 w-full">
              <label className="mb-1 block text-xs font-medium text-muted">
                To Account (Destination) <span className="text-ruby">*</span>
              </label>
              <select
                className="h-11 w-full rounded-lg border-2 border-[#1e7b5e]/40 bg-emerald-50 px-3 text-sm font-medium text-charcoal focus:border-[#1e7b5e] focus:outline-none"
                value={form.toAccount}
                onChange={(e) => set("toAccount", e.target.value)}
                disabled={loadingAccounts}
              >
                <option value="">Select destination account...</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.accountName} (₹{acc.bookBalance.toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input label="Transfer Date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
          <Input
            label="Amount (₹)"
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            required
          />
          <Input
            label="Reference / UTR"
            placeholder="UTR, IMPS, NEFT, RTGS ref..."
            value={form.reference}
            onChange={(e) => set("reference", e.target.value)}
          />
          <TextArea
            label="Description / Narration"
            placeholder="Why is this transfer being made?"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>

      {/* Summary card */}
      <div className="ml-auto w-full max-w-sm rounded-xl border-t-4 border-t-[#0891b2] bg-charcoal p-6 text-white shadow-card">
        <h3 className="mb-4 font-display text-lg font-medium text-cyan-300">Transfer Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">From</span>
            <span className="font-medium text-red-300">{fromAccObj?.accountName || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">To</span>
            <span className="font-medium text-emerald-300">{toAccObj?.accountName || "—"}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-lg font-bold text-cyan-300">Amount</span>
            <span className="font-mono text-2xl font-bold text-cyan-300">
              ₹{numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
