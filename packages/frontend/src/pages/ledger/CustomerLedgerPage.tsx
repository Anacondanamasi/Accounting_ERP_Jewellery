import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { customerService } from "@/services/customerService";

const col = createColumnHelper<any>();

export const CustomerLedgerPage = () => {
  const [customerId, setCustomerId] = useState(1);
  const [range, setRange] = useState({ from: "2025-04-01", to: "2025-04-30" });

  const { data: customers } = useQuery({
    queryKey: ["customers-selector"],
    queryFn: () => customerService.list({}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["customer-ledger-page", customerId, range.from, range.to],
    queryFn: () => customerService.getLedger(customerId, range),
    enabled: Boolean(customerId),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Customer Ledger" subtitle="Running balance statement by customer" />
      <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-card p-4">
        <div className="w-full max-w-lg">
          <p className="mb-1 text-xs text-muted">Customer</p>
          <SearchableSelect
            onChange={setCustomerId}
            options={(customers ?? []).map((customer: any) => ({
              value: customer.id,
              label: customer.name,
              meta: customer.code,
            }))}
            value={customerId}
          />
        </div>
        <DateRangePicker onChange={setRange} value={range} />
      </div>
      <div className="rounded-card border border-border bg-card p-4 shadow-card">
        <div className="mb-2 text-sm text-muted">
          Opening Balance: <span className="font-mono">{formatCurrency(data?.openingBalance ?? 0)}</span>
        </div>
        <DataTable
          columns={[
            col.accessor("date", { header: "Date" }),
            col.accessor("type", { header: "Type" }),
            col.accessor("refNo", { header: "Ref No" }),
            col.accessor("narration", { header: "Narration" }),
            col.accessor("debit", { header: "Debit", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
            col.accessor("credit", { header: "Credit", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
            col.accessor("runningBalance", {
              header: "Running Balance",
              cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
            }),
          ]}
          data={data?.rows ?? []}
          loading={isLoading}
        />
        <div className="mt-2 border-t border-border pt-2 text-sm text-muted">
          Closing Balance: <span className="font-mono">{formatCurrency(data?.closingBalance ?? 0)}</span>
        </div>
      </div>
    </div>
  );
};
