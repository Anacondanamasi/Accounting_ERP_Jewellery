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

type ParsedRow = {
  code: string;
  name: string;
  type: string;
  salesPrice: number;
  status: "ok" | "error";
  error?: string;
};

export const ProductImportPage = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);

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

  const handleFile = (f: File) => {
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

      const parsed: ParsedRow[] = lines.slice(1).map((line, i) => {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
        const code = codeIdx >= 0 ? cols[codeIdx] : "";
        const name = nameIdx >= 0 ? cols[nameIdx] : "";
        const type = typeIdx >= 0 ? cols[typeIdx] : "PRODUCT";
        const salesPrice = priceIdx >= 0 ? Number(cols[priceIdx]) : 0;

        if (!code) return { code, name, type, salesPrice, status: "error" as const, error: `Row ${i + 2}: Code is required` };
        if (!name) return { code, name, type, salesPrice, status: "error" as const, error: `Row ${i + 2}: Name is required` };
        return { code, name, type, salesPrice, status: "ok" as const };
      });

      setPreview(parsed);
      setStep(2);
    };
    reader.readAsText(f);
  };

  const errorCount = preview.filter((r) => r.status === "error").length;
  const validCount = preview.filter((r) => r.status === "ok").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Import Products & Services"
        subtitle="Upload a CSV or Excel file to add items in bulk"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/products")} type="button">Cancel</Button>
            <Button variant="outline" onClick={downloadTemplate} type="button">
              <Download className="mr-2 h-4 w-4" /> Download Template
            </Button>
          </>
        }
      />

      {/* Step indicators */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-4">
        {[
          { n: 1, label: "Upload File" },
          { n: 2, label: "Preview & Validate" },
          { n: 3, label: "Import" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step === s.n ? "bg-gold text-white" : step > s.n ? "bg-emerald text-white" : "bg-canvas text-muted border border-border"
            }`}>
              {step > s.n ? <CheckCircle className="h-4 w-4" /> : s.n}
            </div>
            <span className={`text-sm ${step === s.n ? "font-medium text-charcoal" : "text-muted"}`}>{s.label}</span>
            {i < 2 && <ChevronRight className="h-4 w-4 text-muted mx-1" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <Upload className="mx-auto mb-4 h-12 w-12 text-muted" />
          <h3 className="mb-2 font-display text-base font-semibold text-charcoal">Drop your CSV file here</h3>
          <p className="mb-4 text-sm text-muted">Supports CSV files. Max 5MB. Use the template for best results.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={downloadTemplate} type="button">
              <Download className="mr-2 h-4 w-4" /> Download Template
            </Button>
            <Button onClick={() => fileRef.current?.click()} type="button">
              <Upload className="mr-2 h-4 w-4" /> Choose File
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {step === 2 && preview.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted" />
              <span className="text-sm font-medium text-charcoal">{file?.name}</span>
            </div>
            <div className="flex gap-3 ml-auto">
              <span className="flex items-center gap-1 text-sm text-emerald">
                <CheckCircle className="h-4 w-4" /> {validCount} valid
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-ruby">
                  <AlertCircle className="h-4 w-4" /> {errorCount} errors
                </span>
              )}
            </div>
          </div>

          {errorCount > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="mb-2 text-sm font-medium text-ruby">Fix these errors before importing:</p>
              <ul className="space-y-1">
                {preview.filter((r) => r.status === "error").map((r, i) => (
                  <li key={i} className="text-xs text-ruby flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {r.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-canvas text-left text-[10px] font-semibold uppercase tracking-widest text-muted">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Sales Price</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.slice(0, 20).map((row, i) => (
                  <tr key={i} className={row.status === "error" ? "bg-red-50/50" : "hover:bg-canvas/40"}>
                    <td className="px-4 py-2.5 text-muted text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.code || <span className="text-ruby">—</span>}</td>
                    <td className="px-4 py-2.5">{row.name || <span className="text-ruby">—</span>}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">{row.type}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">₹{row.salesPrice.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5">
                      {row.status === "ok" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald"><CheckCircle className="h-3 w-3" /> Valid</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-ruby"><AlertCircle className="h-3 w-3" /> Error</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setStep(1); setPreview([]); setFile(null); }} type="button">Back</Button>
            <Button
              disabled={errorCount > 0 || validCount === 0}
              onClick={() => {
                setStep(3);
                toast.success(`${validCount} items would be imported (backend API integration pending)`);
                setTimeout(() => navigate("/products"), 1500);
              }}
              type="button"
            >
              Import {validCount} Items
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
          <CheckCircle className="mb-3 h-12 w-12 text-emerald" />
          <p className="font-semibold text-charcoal">Import Complete</p>
          <p className="mt-1 text-sm text-muted">Redirecting you back...</p>
        </div>
      )}
    </div>
  );
};
