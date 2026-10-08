import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
const newLine = () => ({
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
    const [lines, setLines] = useState([newLine()]);
    const [supplier, setSupplier] = useState("");
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
    const [deliveryDate, setDeliveryDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().slice(0, 10);
    });
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [notes, setNotes] = useState("");
    const updateLine = (id, field, value) => {
        setLines((prev) => prev.map((l) => {
            if (l.id !== id)
                return l;
            const updated = { ...l, [field]: value };
            const base = Number(updated.qty) * Number(updated.rate);
            updated.amount = base + base * (Number(updated.tax) / 100);
            return updated;
        }));
    };
    const subTotal = lines.reduce((sum, l) => {
        const base = l.qty * l.rate;
        return sum + base;
    }, 0);
    const taxTotal = lines.reduce((sum, l) => sum + l.qty * l.rate * (l.tax / 100), 0);
    const grandTotal = subTotal + taxTotal;
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "New Purchase Order", subtitle: "Create an order for goods from your supplier", actions: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", onClick: () => navigate("/purchase-orders"), type: "button", children: "Cancel" }), _jsxs(Button, { variant: "outline", type: "button", children: [_jsx(Save, { className: "mr-2 h-4 w-4" }), " Save Draft"] }), _jsxs(Button, { type: "button", children: [_jsx(Send, { className: "mr-2 h-4 w-4" }), " Submit PO"] })] }) }), _jsxs("div", { className: "grid gap-6 rounded-xl border-t-2 border-t-[#b45309] bg-card p-8 shadow-card md:grid-cols-4", children: [_jsx(Input, { label: "Order Date", type: "date", value: orderDate, onChange: (e) => setOrderDate(e.target.value), required: true }), _jsx(Input, { label: "Expected Delivery", type: "date", value: deliveryDate, onChange: (e) => setDeliveryDate(e.target.value) }), _jsx("div", { className: "md:col-span-2", children: _jsx(Input, { label: "Supplier", placeholder: "Search or type supplier name...", value: supplier, onChange: (e) => setSupplier(e.target.value), required: true }) }), _jsx("div", { className: "md:col-span-2", children: _jsx(Input, { label: "Delivery Address", placeholder: "Ship-to address...", value: deliveryAddress, onChange: (e) => setDeliveryAddress(e.target.value) }) }), _jsx(TextArea, { label: "Notes", containerClassName: "md:col-span-2", placeholder: "Add any supplier instructions or notes...", value: notes, onChange: (e) => setNotes(e.target.value) })] }), _jsxs("div", { className: "rounded-xl border-t-2 border-t-[#b45309] bg-card p-6 shadow-card", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display text-xl font-semibold text-charcoal", children: "Order Items" }), _jsx("p", { className: "text-xs text-muted", children: "Specify what you are ordering from the supplier" })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setLines((p) => [...p, newLine()]), type: "button", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " Add Row"] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-12 gap-2 border-b border-border pb-2 text-[10px] font-bold uppercase tracking-widest text-muted", children: [_jsx("div", { className: "col-span-4", children: "Description" }), _jsx("div", { className: "col-span-1 text-right", children: "Qty" }), _jsx("div", { className: "col-span-1", children: "Unit" }), _jsx("div", { className: "col-span-2 text-right", children: "Rate (\u20B9)" }), _jsx("div", { className: "col-span-1 text-right", children: "Tax %" }), _jsx("div", { className: "col-span-2 text-right", children: "Amount" }), _jsx("div", { className: "col-span-1" })] }), lines.map((line) => (_jsxs("div", { className: "grid grid-cols-12 items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:border-[#b45309]/30 hover:bg-amber-50/30", children: [_jsx("div", { className: "col-span-4", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-xs focus:border-[#b45309] focus:outline-none", placeholder: "Item description...", value: line.description, onChange: (e) => updateLine(line.id, "description", e.target.value) }) }), _jsx("div", { className: "col-span-1", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-right text-xs", type: "number", value: line.qty, onChange: (e) => updateLine(line.id, "qty", Number(e.target.value)) }) }), _jsx("div", { className: "col-span-1", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-xs", value: line.unit, onChange: (e) => updateLine(line.id, "unit", e.target.value) }) }), _jsx("div", { className: "col-span-2", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-right text-xs font-mono", type: "number", value: line.rate, onChange: (e) => updateLine(line.id, "rate", Number(e.target.value)) }) }), _jsx("div", { className: "col-span-1", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-right text-xs", type: "number", value: line.tax, onChange: (e) => updateLine(line.id, "tax", Number(e.target.value)) }) }), _jsxs("div", { className: "col-span-2 flex h-9 items-center justify-end rounded border border-border bg-canvas px-3 font-mono text-xs font-bold", children: ["\u20B9", line.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })] }), _jsx("div", { className: "col-span-1 flex justify-center", children: _jsx("button", { className: "grid h-8 w-8 place-items-center rounded-full border border-border text-muted hover:border-ruby hover:bg-ruby hover:text-white transition-all", onClick: () => setLines((p) => p.filter((l) => l.id !== line.id)), type: "button", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) }) })] }, line.id)))] })] }), _jsxs("div", { className: "ml-auto w-full max-w-sm rounded-xl border-t-4 border-t-[#b45309] bg-charcoal p-6 text-white shadow-card", children: [_jsx("h3", { className: "mb-4 font-display text-lg font-medium text-amber-300", children: "Order Summary" }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { className: "flex justify-between border-b border-white/10 pb-2", children: [_jsx("span", { className: "text-white/60", children: "Sub Total" }), _jsxs("span", { className: "font-mono", children: ["\u20B9", subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })] })] }), _jsxs("div", { className: "flex justify-between border-b border-white/10 pb-2", children: [_jsx("span", { className: "text-white/60", children: "Tax" }), _jsxs("span", { className: "font-mono", children: ["\u20B9", taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })] })] }), _jsxs("div", { className: "flex justify-between pt-2", children: [_jsx("span", { className: "text-lg font-bold text-amber-300", children: "Grand Total" }), _jsxs("span", { className: "font-mono text-2xl font-bold text-amber-300", children: ["\u20B9", grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })] })] })] })] })] }));
};
