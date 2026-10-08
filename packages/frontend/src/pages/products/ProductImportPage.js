import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Download, FileText, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
const TEMPLATE_HEADERS = [
    "code", "name", "description", "type", "is_tracked", "is_sold",
    "sales_price", "sales_tax_rate", "is_purchased", "purchase_price",
    "purchase_tax_rate", "opening_quantity", "opening_value", "reorder_level", "unit",
].join(",");
const TEMPLATE_EXAMPLE = [
    '"RING-22K-001"', '"22K Gold Ring"', '"Classic solitaire ring"', '"PRODUCT"', '"Yes"', '"Yes"',
    '8500', '3', '"Yes"', '7200', '3', '10', '72000', '2', '"pcs"',
].join(",");
export const ProductImportPage = () => {
    const navigate = useNavigate();
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [step, setStep] = useState(1);
    const downloadTemplate = () => {
        const csv = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "products-services-template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };
    const handleFile = (f) => {
        setFile(f);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = String(e.target?.result ?? "");
            const lines = text.trim().split("\n");
            if (lines.length < 2) {
                toast.error("File appears empty or has no data rows");
                return;
            }
            const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, "").toLowerCase());
            const codeIdx = headers.indexOf("code");
            const nameIdx = headers.indexOf("name");
            const typeIdx = headers.indexOf("type");
            const priceIdx = headers.indexOf("sales_price");
            const parsed = lines.slice(1).map((line, i) => {
                const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
                const code = codeIdx >= 0 ? cols[codeIdx] : "";
                const name = nameIdx >= 0 ? cols[nameIdx] : "";
                const type = typeIdx >= 0 ? cols[typeIdx] : "PRODUCT";
                const salesPrice = priceIdx >= 0 ? Number(cols[priceIdx]) : 0;
                if (!code)
                    return { code, name, type, salesPrice, status: "error", error: `Row ${i + 2}: Code is required` };
                if (!name)
                    return { code, name, type, salesPrice, status: "error", error: `Row ${i + 2}: Name is required` };
                return { code, name, type, salesPrice, status: "ok" };
            });
            setPreview(parsed);
            setStep(2);
        };
        reader.readAsText(f);
    };
    const errorCount = preview.filter((r) => r.status === "error").length;
    const validCount = preview.filter((r) => r.status === "ok").length;
    return (_jsxs("div", { className: "space-y-5", children: [_jsx(PageHeader, { title: "Import Products & Services", subtitle: "Upload a CSV or Excel file to add items in bulk", actions: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", onClick: () => navigate("/products"), type: "button", children: "Cancel" }), _jsxs(Button, { variant: "outline", onClick: downloadTemplate, type: "button", children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), " Download Template"] })] }) }), _jsx("div", { className: "flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-4", children: [
                    { n: 1, label: "Upload File" },
                    { n: 2, label: "Preview & Validate" },
                    { n: 3, label: "Import" },
                ].map((s, i) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step === s.n ? "bg-gold text-white" : step > s.n ? "bg-emerald text-white" : "bg-canvas text-muted border border-border"}`, children: step > s.n ? _jsx(CheckCircle, { className: "h-4 w-4" }) : s.n }), _jsx("span", { className: `text-sm ${step === s.n ? "font-medium text-charcoal" : "text-muted"}`, children: s.label }), i < 2 && _jsx(ChevronRight, { className: "h-4 w-4 text-muted mx-1" })] }, s.n))) }), step === 1 && (_jsxs("div", { className: "rounded-xl border-2 border-dashed border-border bg-card p-12 text-center", children: [_jsx(Upload, { className: "mx-auto mb-4 h-12 w-12 text-muted" }), _jsx("h3", { className: "mb-2 font-display text-base font-semibold text-charcoal", children: "Drop your CSV file here" }), _jsx("p", { className: "mb-4 text-sm text-muted", children: "Supports CSV files. Max 5MB. Use the template for best results." }), _jsxs("div", { className: "flex justify-center gap-3", children: [_jsxs(Button, { variant: "outline", onClick: downloadTemplate, type: "button", children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), " Download Template"] }), _jsxs(Button, { onClick: () => fileRef.current?.click(), type: "button", children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), " Choose File"] })] }), _jsx("input", { ref: fileRef, type: "file", accept: ".csv,.xlsx", className: "hidden", onChange: (e) => e.target.files?.[0] && handleFile(e.target.files[0]) })] })), step === 2 && preview.length > 0 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-4 rounded-xl border border-border bg-card p-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FileText, { className: "h-5 w-5 text-muted" }), _jsx("span", { className: "text-sm font-medium text-charcoal", children: file?.name })] }), _jsxs("div", { className: "flex gap-3 ml-auto", children: [_jsxs("span", { className: "flex items-center gap-1 text-sm text-emerald", children: [_jsx(CheckCircle, { className: "h-4 w-4" }), " ", validCount, " valid"] }), errorCount > 0 && (_jsxs("span", { className: "flex items-center gap-1 text-sm text-ruby", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), " ", errorCount, " errors"] }))] })] }), errorCount > 0 && (_jsxs("div", { className: "rounded-xl border border-red-200 bg-red-50 p-4", children: [_jsx("p", { className: "mb-2 text-sm font-medium text-ruby", children: "Fix these errors before importing:" }), _jsx("ul", { className: "space-y-1", children: preview.filter((r) => r.status === "error").map((r, i) => (_jsxs("li", { className: "text-xs text-ruby flex items-start gap-1", children: [_jsx(AlertCircle, { className: "h-3 w-3 mt-0.5 flex-shrink-0" }), r.error] }, i))) })] })), _jsx("div", { className: "overflow-hidden rounded-xl border border-border bg-card", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-canvas text-left text-[10px] font-semibold uppercase tracking-widest text-muted", children: [_jsx("th", { className: "px-4 py-3", children: "#" }), _jsx("th", { className: "px-4 py-3", children: "Code" }), _jsx("th", { className: "px-4 py-3", children: "Name" }), _jsx("th", { className: "px-4 py-3", children: "Type" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Sales Price" }), _jsx("th", { className: "px-4 py-3", children: "Status" })] }) }), _jsx("tbody", { className: "divide-y divide-border", children: preview.slice(0, 20).map((row, i) => (_jsxs("tr", { className: row.status === "error" ? "bg-red-50/50" : "hover:bg-canvas/40", children: [_jsx("td", { className: "px-4 py-2.5 text-muted text-xs", children: i + 1 }), _jsx("td", { className: "px-4 py-2.5 font-mono text-xs", children: row.code || _jsx("span", { className: "text-ruby", children: "\u2014" }) }), _jsx("td", { className: "px-4 py-2.5", children: row.name || _jsx("span", { className: "text-ruby", children: "\u2014" }) }), _jsx("td", { className: "px-4 py-2.5 text-xs text-muted", children: row.type }), _jsxs("td", { className: "px-4 py-2.5 text-right font-mono text-xs", children: ["\u20B9", row.salesPrice.toLocaleString("en-IN")] }), _jsx("td", { className: "px-4 py-2.5", children: row.status === "ok" ? (_jsxs("span", { className: "flex items-center gap-1 text-xs text-emerald", children: [_jsx(CheckCircle, { className: "h-3 w-3" }), " Valid"] })) : (_jsxs("span", { className: "flex items-center gap-1 text-xs text-ruby", children: [_jsx(AlertCircle, { className: "h-3 w-3" }), " Error"] })) })] }, i))) })] }) }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx(Button, { variant: "outline", onClick: () => { setStep(1); setPreview([]); setFile(null); }, type: "button", children: "Back" }), _jsxs(Button, { disabled: errorCount > 0 || validCount === 0, onClick: () => {
                                    setStep(3);
                                    toast.success(`${validCount} items would be imported (backend API integration pending)`);
                                    setTimeout(() => navigate("/products"), 1500);
                                }, type: "button", children: ["Import ", validCount, " Items"] })] })] })), step === 3 && (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center", children: [_jsx(CheckCircle, { className: "mb-3 h-12 w-12 text-emerald" }), _jsx("p", { className: "font-semibold text-charcoal", children: "Import Complete" }), _jsx("p", { className: "mt-1 text-sm text-muted", children: "Redirecting you back..." })] }))] }));
};
