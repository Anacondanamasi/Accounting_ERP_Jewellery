import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Tag, Trash2, Save, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { useProductServiceLookup } from "@/hooks/useProductServiceLookup";

interface QuoteLine {
  id: string;
  productCode?: string;   // auto-filled from P&S master
  description: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number;
  gstRate: number;        // auto-filled from P&S salesTaxRate
  amount: number;
}

const newLine = (): QuoteLine => ({
  id: Math.random().toString(36).slice(2),
  productCode: undefined,
  description: "",
  qty: 1,
  unit: "pcs",
  rate: 0,
  discount: 0,
  gstRate: 3,
  amount: 0,
});

export const QuoteFormPage = () => {
  const navigate = useNavigate();
  const [lines, setLines] = useState<QuoteLine[]>([newLine()]);
  const [customer, setCustomer] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");

  // P&S master lookup for auto-fill
  const { productOptions, buildAutofill, searchProducts } = useProductServiceLookup("sales");

  const updateLine = (id: string, field: keyof QuoteLine, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        updated.amount = Number(updated.qty) * Number(updated.rate) * (1 - Number(updated.discount) / 100);
        return updated;
      })
    );
  };

  /** Auto-fill a line from the P&S master */
  const fillFromProduct = (lineId: string, payload: any) => {
    if (!payload) return;
    const af = buildAutofill(payload);
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const rate = af.ratePerGram;
        return {
          ...l,
          productCode: af._productCode,
          description: af.description,
          rate,
          unit: payload.unit ?? "pcs",
          gstRate: af.gstPct,
          amount: Number(l.qty) * rate * (1 - l.discount / 100),
        };
      })
    );
  };

  const subTotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const taxTotal = lines.reduce((sum, l) => sum + l.amount * (l.gstRate / 100), 0);
  const grandTotal = subTotal + taxTotal;

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Quote"
        subtitle="Create a price estimate for your customer"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/quotes")} type="button">Cancel</Button>
            <Button variant="outline" type="button">
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            <Button type="button">
              <Send className="mr-2 h-4 w-4" /> Send Quote
            </Button>
          </>
        }
      />

      <div className="grid gap-6 rounded-xl border-t-2 border-t-[#7c3aed] bg-card p-8 shadow-card md:grid-cols-4">
        <Input label="Quote Date" type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} required />
        <Input label="Expiry Date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
        <div className="md:col-span-2">
          <Input
            label="Customer"
            placeholder="Search or type customer name..."
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            required
          />
        </div>
        <TextArea
          label="Notes / Terms"
          containerClassName="md:col-span-4"
          placeholder="Add any notes or terms for this quote..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="rounded-xl border-t-2 border-t-[#7c3aed] bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-charcoal">Line Items</h2>
            <p className="text-xs text-muted">Add products or services to this quote</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])} type="button">
            <Plus className="mr-2 h-4 w-4" /> Add Row
          </Button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 border-b border-border pb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            <div className="col-span-4">Description</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-2 text-right">Rate (₹)</div>
            <div className="col-span-1 text-right">Disc %</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1" />
          </div>

          {lines.map((line) => (
            <div key={line.id} className="grid grid-cols-12 items-start gap-2 rounded-lg border border-border p-2 transition-colors hover:border-[#7c3aed]/30 hover:bg-[#7c3aed]/5">
              <div className="col-span-4 space-y-1">
                {/* P&S product picker — auto-fills description, rate, unit, gst */}
                <SearchableSelect
                  loadOptions={searchProducts}
                  onChange={(_val, option) => fillFromProduct(line.id, option?.payload)}
                  options={productOptions}
                  placeholder="📦 Select product/service..."
                  value={""}
                />
                {line.productCode && (
                  <div className="flex items-center gap-1 text-[9px] text-gold font-semibold uppercase tracking-wide">
                    <Tag className="h-2.5 w-2.5" />
                    {line.productCode}
                  </div>
                )}
                <input
                  className="h-9 w-full rounded border border-border px-2 text-xs focus:border-[#7c3aed] focus:outline-none"
                  placeholder="Item description..."
                  value={line.description}
                  onChange={(e) => updateLine(line.id, "description", e.target.value)}
                />
              </div>
              <div className="col-span-1">
                <input
                  className="h-9 w-full rounded border border-border px-2 text-right text-xs"
                  type="number"
                  value={line.qty}
                  onChange={(e) => updateLine(line.id, "qty", Number(e.target.value))}
                />
              </div>
              <div className="col-span-1">
                <input
                  className="h-9 w-full rounded border border-border px-2 text-xs"
                  value={line.unit}
                  onChange={(e) => updateLine(line.id, "unit", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <input
                  className="h-9 w-full rounded border border-border px-2 text-right text-xs font-mono"
                  type="number"
                  value={line.rate}
                  onChange={(e) => updateLine(line.id, "rate", Number(e.target.value))}
                />
              </div>
              <div className="col-span-1">
                <input
                  className="h-9 w-full rounded border border-border px-2 text-right text-xs"
                  type="number"
                  value={line.discount}
                  onChange={(e) => updateLine(line.id, "discount", Number(e.target.value))}
                />
              </div>
              <div className="col-span-2 flex h-9 items-center justify-end rounded border border-border bg-canvas px-3 font-mono text-xs font-bold">
                ₹{line.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted hover:border-ruby hover:bg-ruby hover:text-white transition-all"
                  onClick={() => setLines((p) => p.filter((l) => l.id !== line.id))}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="ml-auto w-full max-w-sm rounded-xl border-t-4 border-t-[#7c3aed] bg-charcoal p-6 text-white shadow-card">
        <h3 className="mb-4 font-display text-lg font-medium text-purple-300">Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">Sub Total</span>
            <span className="font-mono">₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">Tax (GST)</span>
            <span className="font-mono">₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-lg font-bold text-purple-300">Grand Total</span>
            <span className="font-mono text-2xl font-bold text-purple-300">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
