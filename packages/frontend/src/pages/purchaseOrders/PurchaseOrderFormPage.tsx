import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";

interface POLine {
  id: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  tax: number;
  amount: number;
}

const newLine = (): POLine => ({
  id: Math.random().toString(36).slice(2),
  description: "",
  qty: 1,
  unit: "pcs",
  rate: 0,
  tax: 18,
  amount: 0,
});

export const PurchaseOrderFormPage = () => {
  const navigate = useNavigate();
  const [lines, setLines] = useState<POLine[]>([newLine()]);
  const [supplier, setSupplier] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  const updateLine = (id: string, field: keyof POLine, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        const base = Number(updated.qty) * Number(updated.rate);
        updated.amount = base + base * (Number(updated.tax) / 100);
        return updated;
      })
    );
  };

  const subTotal = lines.reduce((sum, l) => {
    const base = l.qty * l.rate;
    return sum + base;
  }, 0);
  const taxTotal = lines.reduce((sum, l) => sum + l.qty * l.rate * (l.tax / 100), 0);
  const grandTotal = subTotal + taxTotal;

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Purchase Order"
        subtitle="Create an order for goods from your supplier"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/purchase-orders")} type="button">Cancel</Button>
            <Button variant="outline" type="button">
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            <Button type="button">
              <Send className="mr-2 h-4 w-4" /> Submit PO
            </Button>
          </>
        }
      />

      <div className="grid gap-6 rounded-xl border-t-2 border-t-[#b45309] bg-card p-8 shadow-card md:grid-cols-4">
        <Input label="Order Date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
        <Input label="Expected Delivery" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        <div className="md:col-span-2">
          <Input
            label="Supplier"
            placeholder="Search or type supplier name..."
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Input
            label="Delivery Address"
            placeholder="Ship-to address..."
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
          />
        </div>
        <TextArea
          label="Notes"
          containerClassName="md:col-span-2"
          placeholder="Add any supplier instructions or notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="rounded-xl border-t-2 border-t-[#b45309] bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-charcoal">Order Items</h2>
            <p className="text-xs text-muted">Specify what you are ordering from the supplier</p>
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
            <div className="col-span-1 text-right">Tax %</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1" />
          </div>

          {lines.map((line) => (
            <div key={line.id} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:border-[#b45309]/30 hover:bg-amber-50/30">
              <div className="col-span-4">
                <input
                  className="h-9 w-full rounded border border-border px-2 text-xs focus:border-[#b45309] focus:outline-none"
                  placeholder="Item description..."
                  value={line.description}
                  onChange={(e) => updateLine(line.id, "description", e.target.value)}
                />
              </div>
              <div className="col-span-1">
                <input className="h-9 w-full rounded border border-border px-2 text-right text-xs" type="number" value={line.qty} onChange={(e) => updateLine(line.id, "qty", Number(e.target.value))} />
              </div>
              <div className="col-span-1">
                <input className="h-9 w-full rounded border border-border px-2 text-xs" value={line.unit} onChange={(e) => updateLine(line.id, "unit", e.target.value)} />
              </div>
              <div className="col-span-2">
                <input className="h-9 w-full rounded border border-border px-2 text-right text-xs font-mono" type="number" value={line.rate} onChange={(e) => updateLine(line.id, "rate", Number(e.target.value))} />
              </div>
              <div className="col-span-1">
                <input className="h-9 w-full rounded border border-border px-2 text-right text-xs" type="number" value={line.tax} onChange={(e) => updateLine(line.id, "tax", Number(e.target.value))} />
              </div>
              <div className="col-span-2 flex h-9 items-center justify-end rounded border border-border bg-canvas px-3 font-mono text-xs font-bold">
                ₹{line.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="col-span-1 flex justify-center">
                <button className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted hover:border-ruby hover:bg-ruby hover:text-white transition-all" onClick={() => setLines((p) => p.filter((l) => l.id !== line.id))} type="button">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ml-auto w-full max-w-sm rounded-xl border-t-4 border-t-[#b45309] bg-charcoal p-6 text-white shadow-card">
        <h3 className="mb-4 font-display text-lg font-medium text-amber-300">Order Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">Sub Total</span>
            <span className="font-mono">₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">Tax</span>
            <span className="font-mono">₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-lg font-bold text-amber-300">Grand Total</span>
            <span className="font-mono text-2xl font-bold text-amber-300">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
