import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, Save, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";

export const TransferMoneyPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    fromAccount: "",
    toAccount: "",
    amount: "",
    reference: "",
    description: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const sameAccount = form.fromAccount && form.fromAccount === form.toAccount;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transfer Money"
        subtitle="Move funds between your bank accounts"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/banking")} type="button">Cancel</Button>
            <Button type="button" disabled={!!sameAccount}>
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
          <p className="font-semibold text-[#0891b2]">Internal Transfer</p>
          <p className="text-sm text-muted">No external payment — funds move between your own accounts</p>
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
          <div className="md:col-span-2 flex items-center gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted">
                From Account <span className="text-ruby">*</span>
              </label>
              <select
                className="h-11 w-full rounded-lg border-2 border-ruby/40 bg-red-50 px-3 text-sm font-medium text-charcoal focus:border-ruby focus:outline-none"
                value={form.fromAccount}
                onChange={(e) => set("fromAccount", e.target.value)}
              >
                <option value="">Select source account...</option>
                <option value="hdfc-current">HDFC Current (••4521)</option>
                <option value="sbi-savings">SBI Savings (••8873)</option>
                <option value="axis-current">Axis Bank Current (••2290)</option>
              </select>
            </div>

            {/* Arrow */}
            <div className="flex h-11 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#0891b2]/10 text-[#0891b2]">
              <ArrowLeftRight className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted">
                To Account <span className="text-ruby">*</span>
              </label>
              <select
                className="h-11 w-full rounded-lg border-2 border-[#1e7b5e]/40 bg-emerald-50 px-3 text-sm font-medium text-charcoal focus:border-[#1e7b5e] focus:outline-none"
                value={form.toAccount}
                onChange={(e) => set("toAccount", e.target.value)}
              >
                <option value="">Select destination account...</option>
                <option value="hdfc-current">HDFC Current (••4521)</option>
                <option value="sbi-savings">SBI Savings (••8873)</option>
                <option value="axis-current">Axis Bank Current (••2290)</option>
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
          <Input label="Reference" placeholder="UTR, IMPS, NEFT, RTGS ref..." value={form.reference} onChange={(e) => set("reference", e.target.value)} />
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
            <span>{form.fromAccount ? form.fromAccount.replace("-", " ").toUpperCase() : "—"}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">To</span>
            <span>{form.toAccount ? form.toAccount.replace("-", " ").toUpperCase() : "—"}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-lg font-bold text-cyan-300">Amount</span>
            <span className="font-mono text-2xl font-bold text-cyan-300">
              ₹{(parseFloat(form.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
