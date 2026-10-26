import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownCircle, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { bankingService } from "@/services/bankingService";

export const ReceiveMoneyPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    bankAccount: "",
    payer: "",
    reference: "",
    amount: "",
    taxRate: "0",
    description: "",
  });

  const { data: bankAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => bankingService.listAccounts(),
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const amount = parseFloat(form.amount) || 0;
  const tax = amount * (parseFloat(form.taxRate) / 100);
  const total = amount + tax;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.bankAccount) throw new Error("Please select a bank account");
      if (!form.amount || parseFloat(form.amount) <= 0) throw new Error("Please enter a valid amount");
      return bankingService.createTransaction(Number(form.bankAccount), {
        date: form.date,
        narration: form.description ? `${form.payer} - ${form.description}` : form.payer || "Receive Money",
        reference: form.reference,
        debit: 0,
        credit: total,
      });
    },
    onSuccess: () => {
      toast.success("Receipt recorded successfully");
      void queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      navigate("/banking/accounts");
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || "Failed to record receipt");
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Receive Money"
        subtitle="Record money received into your bank account"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/banking/accounts")} type="button">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              data-shortcut="save"
              title="Save Transaction (Ctrl+S)"
              type="button"
            >
              <Save className="mr-2 h-4 w-4" /> Save Transaction
            </Button>
          </>
        }
      />

      {/* Icon banner */}
      <div className="flex items-center gap-4 rounded-xl border-l-4 border-l-[#1e7b5e] bg-emerald-50 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e7b5e]/10">
          <ArrowDownCircle className="h-6 w-6 text-[#1e7b5e]" />
        </div>
        <div>
          <p className="font-semibold text-[#1e7b5e]">Money Coming In</p>
          <p className="text-sm text-muted">This transaction will increase your bank balance immediately</p>
        </div>
      </div>

      <div className="grid gap-6 rounded-xl border-t-2 border-t-[#1e7b5e] bg-card p-8 shadow-card md:grid-cols-2">
        <Input label="Date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Bank Account <span className="text-ruby">*</span>
          </label>
          <select
            className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-[#1e7b5e] focus:outline-none"
            value={form.bankAccount}
            onChange={(e) => set("bankAccount", e.target.value)}
            disabled={loadingAccounts}
          >
            <option value="">Select bank account...</option>
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bankName} - {acc.accountName} ({acc.accountNoMasked || "••" + String(acc.id)})
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Payer / Received From"
          placeholder="Who sent this money?"
          value={form.payer}
          onChange={(e) => set("payer", e.target.value)}
          required
        />
        <Input
          label="Reference"
          placeholder="UTR, cheque no., NEFT/RTGS ref..."
          value={form.reference}
          onChange={(e) => set("reference", e.target.value)}
        />
        <Input
          label="Amount (₹)"
          type="number"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          required
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Tax Rate</label>
          <select
            className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-[#1e7b5e] focus:outline-none"
            value={form.taxRate}
            onChange={(e) => set("taxRate", e.target.value)}
          >
            <option value="0">No Tax (0%)</option>
            <option value="5">GST 5%</option>
            <option value="12">GST 12%</option>
            <option value="18">GST 18%</option>
            <option value="28">GST 28%</option>
          </select>
        </div>
        <TextArea
          label="Description / Narration"
          containerClassName="md:col-span-2"
          placeholder="What is this receipt for?"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {/* Amount summary */}
      <div className="ml-auto w-full max-w-sm rounded-xl border-t-4 border-t-[#1e7b5e] bg-charcoal p-6 text-white shadow-card">
        <h3 className="mb-4 font-display text-lg font-medium text-emerald-300">Receipt Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">Amount</span>
            <span className="font-mono">₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">Tax ({form.taxRate}%)</span>
            <span className="font-mono">₹{tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-lg font-bold text-emerald-300">Total Received</span>
            <span className="font-mono text-2xl font-bold text-emerald-300">
              ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
