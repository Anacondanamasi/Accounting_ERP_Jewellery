import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpCircle, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";

export const SpendMoneyPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    bankAccount: "",
    payee: "",
    reference: "",
    amount: "",
    taxRate: "18",
    description: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const amount = parseFloat(form.amount) || 0;
  const tax = amount * (parseFloat(form.taxRate) / 100);
  const total = amount + tax;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Spend Money"
        subtitle="Record a payment made from your bank account"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/banking")} type="button">Cancel</Button>
            <Button type="button">
              <Save className="mr-2 h-4 w-4" /> Save Transaction
            </Button>
          </>
        }
      />

      {/* Icon banner */}
      <div className="flex items-center gap-4 rounded-xl border-l-4 border-l-ruby bg-red-50 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ruby/10">
          <ArrowUpCircle className="h-6 w-6 text-ruby" />
        </div>
        <div>
          <p className="font-semibold text-ruby">Money Going Out</p>
          <p className="text-sm text-muted">This transaction will reduce your bank balance</p>
        </div>
      </div>

      <div className="grid gap-6 rounded-xl border-t-2 border-t-ruby bg-card p-8 shadow-card md:grid-cols-2">
        <Input label="Date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Bank Account <span className="text-ruby">*</span>
          </label>
          <select
            className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-ruby focus:outline-none"
            value={form.bankAccount}
            onChange={(e) => set("bankAccount", e.target.value)}
          >
            <option value="">Select bank account...</option>
            <option value="hdfc-current">HDFC Current Account (••4521)</option>
            <option value="sbi-savings">SBI Savings Account (••8873)</option>
            <option value="axis-current">Axis Bank Current (••2290)</option>
          </select>
        </div>
        <Input label="Payee / Paid To" placeholder="Who did you pay?" value={form.payee} onChange={(e) => set("payee", e.target.value)} required />
        <Input label="Reference" placeholder="Cheque no., transaction ID..." value={form.reference} onChange={(e) => set("reference", e.target.value)} />
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
            className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-ruby focus:outline-none"
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
          placeholder="What is this payment for?"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {/* Amount summary */}
      <div className="ml-auto w-full max-w-sm rounded-xl border-t-4 border-t-ruby bg-charcoal p-6 text-white shadow-card">
        <h3 className="mb-4 font-display text-lg font-medium text-red-300">Payment Summary</h3>
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
            <span className="text-lg font-bold text-red-300">Total Spent</span>
            <span className="font-mono text-2xl font-bold text-red-300">₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
