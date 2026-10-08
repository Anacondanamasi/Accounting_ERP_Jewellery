import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { taxService } from "@/services/taxService";

const b2bCol = createColumnHelper<{
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  gstin: string;
  taxableValue: number;
  gstRate: number;
  taxAmount: number;
  total: number;
}>();

const hsnCol = createColumnHelper<{
  hsnCode: string;
  description: string;
  qty: number;
  taxableValue: number;
  gstRate: number;
  taxAmount: number;
}>();

const cdnCol = createColumnHelper<{
  noteNo: string;
  noteType: "CREDIT" | "DEBIT";
  customerName: string;
  taxableValue: number;
  gstRate: number;
  taxAmount: number;
}>();

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const GSTPage = () => {
  const [filters, setFilters] = useState<Record<string, string>>({
    month: "4",
    year: "2025",
  });

  const month = Number(filters.month || "4");
  const year = Number(filters.year || "2025");

  const {
    data: gstr1,
    isLoading: gstr1Loading,
    isError: gstr1Error,
    refetch: refetchGstr1,
  } = useQuery({
    queryKey: ["tax-gstr1", month, year],
    queryFn: () => taxService.getGstr1({ month, year }),
  });

  const {
    data: gstr3b,
    isLoading: gstr3bLoading,
    isError: gstr3bError,
    refetch: refetchGstr3b,
  } = useQuery({
    queryKey: ["tax-gstr3b", month, year],
    queryFn: () => taxService.getGstr3b({ month, year }),
  });

  const calendar = gstr1?.calendar ?? [];
  const dueSoon = useMemo(
    () => calendar.filter((row) => row.status === "UPCOMING").slice(0, 3),
    [calendar],
  );

  const exportReturn = async (returnType: "gstr1" | "gstr3b", format: "json" | "excel") => {
    try {
      const blob = await taxService.exportGstReturn({ returnType, format });
      downloadBlob(blob, `${returnType}.${format === "excel" ? "xlsx" : "json"}`);
      toast.success(`${returnType.toUpperCase()} exported`);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="GST Returns"
        subtitle="GSTR-1 and GSTR-3B summaries with filing-ready exports"
        actions={
          <ExportButton
            onExportCSV={() => void exportReturn("gstr1", "json")}
            onExportExcel={() => void exportReturn("gstr1", "excel")}
            onExportPDF={() => void exportReturn("gstr3b", "json")}
          />
        }
      />

      <FilterBar
        filters={[
          {
            key: "month",
            type: "select",
            label: "Month",
            options: [
              { label: "Jan", value: "1" },
              { label: "Feb", value: "2" },
              { label: "Mar", value: "3" },
              { label: "Apr", value: "4" },
              { label: "May", value: "5" },
              { label: "Jun", value: "6" },
              { label: "Jul", value: "7" },
              { label: "Aug", value: "8" },
              { label: "Sep", value: "9" },
              { label: "Oct", value: "10" },
              { label: "Nov", value: "11" },
              { label: "Dec", value: "12" },
            ],
          },
          { key: "year", type: "search", label: "Year" },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ month: "4", year: "2025" })}
      />

      {gstr1Error || gstr3bError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load GST data.
          <button className="ml-3 underline" onClick={() => { void refetchGstr1(); void refetchGstr3b(); }} type="button">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card lg:col-span-2">
          <h3 className="mb-3 font-display text-xl font-semibold">Return Calendar</h3>
          {!calendar.length ? (
            <p className="text-sm text-muted">No due dates available.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {calendar.map((entry) => (
                <div key={entry.id} className="rounded border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.returnType}</span>
                    <span className={`rounded-full px-3 py-1 text-xs ${entry.status === "FILED" ? "bg-emerald/10 text-emerald" : entry.status === "OVERDUE" ? "bg-ruby/10 text-ruby" : "bg-gold/10 text-gold"}`}>
                      {entry.status}
                    </span>
                  </div>
                  <div className="mt-1 text-muted">{entry.periodLabel}</div>
                  <div className="font-mono">Due: {entry.dueDate}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
          <h3 className="mb-3 font-display text-xl font-semibold">Upcoming</h3>
          <div className="space-y-2 text-sm">
            {dueSoon.map((entry) => (
              <div key={entry.id} className="rounded border border-border p-3">
                <div className="font-medium">{entry.returnType}</div>
                <div>{entry.periodLabel}</div>
                <div className="font-mono">{entry.dueDate}</div>
              </div>
            ))}
            {dueSoon.length === 0 ? <p className="text-muted">No upcoming dues.</p> : null}
          </div>
        </div>
      </div>

      <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-2xl font-semibold">GSTR-1</h3>
          <div className="flex gap-2">
            <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => void exportReturn("gstr1", "json")} type="button">
              Export JSON
            </button>
            <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => void exportReturn("gstr1", "excel")} type="button">
              Download Excel
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border border-border p-3 text-sm">
            <div className="text-muted">Taxable Value</div>
            <div className="font-mono text-lg">{formatCurrency(gstr1?.totals.taxableValue ?? 0)}</div>
          </div>
          <div className="rounded border border-border p-3 text-sm">
            <div className="text-muted">Tax Amount</div>
            <div className="font-mono text-lg">{formatCurrency(gstr1?.totals.taxAmount ?? 0)}</div>
          </div>
          <div className="rounded border border-border p-3 text-sm">
            <div className="text-muted">Invoices</div>
            <div className="font-mono text-lg">{gstr1?.totals.invoiceCount ?? 0}</div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="mb-2 font-display text-lg font-semibold">B2B Invoices</h4>
          <DataTable
            columns={[
              b2bCol.accessor("invoiceNo", { header: "Invoice" }),
              b2bCol.accessor("invoiceDate", { header: "Date" }),
              b2bCol.accessor("customerName", { header: "Customer" }),
              b2bCol.accessor("gstin", { header: "GSTIN" }),
              b2bCol.accessor("taxableValue", { header: "Taxable", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
              b2bCol.accessor("taxAmount", { header: "Tax", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
              b2bCol.accessor("total", { header: "Total", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
            ]}
            data={gstr1?.b2b ?? []}
            loading={gstr1Loading}
          />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div>
            <h4 className="mb-2 font-display text-lg font-semibold">HSN/SAC Summary</h4>
            <DataTable
              columns={[
                hsnCol.accessor("hsnCode", { header: "HSN" }),
                hsnCol.accessor("description", { header: "Description" }),
                hsnCol.accessor("taxableValue", { header: "Taxable", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
                hsnCol.accessor("gstRate", { header: "GST %" }),
                hsnCol.accessor("taxAmount", { header: "Tax", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
              ]}
              data={gstr1?.hsn ?? []}
              loading={gstr1Loading}
            />
          </div>
          <div>
            <h4 className="mb-2 font-display text-lg font-semibold">CDN (Credit/Debit Notes)</h4>
            <DataTable
              columns={[
                cdnCol.accessor("noteNo", { header: "Note No" }),
                cdnCol.accessor("noteType", { header: "Type" }),
                cdnCol.accessor("customerName", { header: "Customer" }),
                cdnCol.accessor("taxableValue", { header: "Taxable", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
                cdnCol.accessor("taxAmount", { header: "Tax", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
              ]}
              data={gstr1?.cdn ?? []}
              loading={gstr1Loading}
            />
          </div>
        </div>
      </div>

      <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-2xl font-semibold">GSTR-3B</h3>
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => void exportReturn("gstr3b", "json")} type="button">
            Export for GST Portal
          </button>
        </div>

        {gstr3bLoading ? (
          <p className="text-sm text-muted">Loading GSTR-3B...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded border border-border p-3">
              <div className="font-medium">Outward Supplies</div>
              <div className="mt-1 flex justify-between"><span>Taxable</span><span className="font-mono">{formatCurrency(gstr3b?.outward.taxableValue ?? 0)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span className="font-mono">{formatCurrency(gstr3b?.outward.taxAmount ?? 0)}</span></div>
            </div>
            <div className="rounded border border-border p-3">
              <div className="font-medium">ITC Summary</div>
              <div className="mt-1 flex justify-between"><span>Eligible</span><span className="font-mono text-emerald">{formatCurrency(gstr3b?.itc.eligible ?? 0)}</span></div>
              <div className="flex justify-between"><span>Net ITC</span><span className="font-mono text-emerald">{formatCurrency(gstr3b?.itc.net ?? 0)}</span></div>
            </div>
            <div className="rounded border border-border p-3">
              <div className="font-medium">Net Tax Payable</div>
              <div className="mt-1 font-mono text-xl text-gold">{formatCurrency(gstr3b?.netTaxPayable ?? 0)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
