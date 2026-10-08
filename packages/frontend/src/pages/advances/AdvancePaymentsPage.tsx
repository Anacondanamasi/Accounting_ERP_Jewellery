import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { billService } from "@/services/billService";

const col = createColumnHelper<any>();

export const AdvancePaymentsPage = () => {
  const [selectedBillId, setSelectedBillId] = useState("");
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState("BANK_TRANSFER");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["advance-payments-bills"],
    queryFn: () => billService.list({}),
  });

  const bills = (data?.rows ?? []).filter((bill: any) => bill.balanceDue > 0);
  const selectedBill = bills.find((bill: any) => bill.id === selectedBillId);

  const mutation = useMutation({
    mutationFn: () =>
      billService.recordPayment(selectedBillId, {
        date: new Date().toISOString().slice(0, 10),
        mode,
        amount,
      }),
    onSuccess: () => {
      toast.success("Supplier payment recorded");
      setAmount(0);
      void refetch();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error?.message ?? "Unable to record payment"),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Advance Payments" subtitle="Record supplier-side payments and reduce payable balance" />
      <div className="grid gap-4 rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-muted">Select Bill</p>
          <SearchableSelect
            onChange={setSelectedBillId}
            options={bills.map((bill: any) => ({
              value: bill.id,
              label: `${bill.billNo} · ${bill.supplierName}`,
              meta: formatCurrency(bill.balanceDue),
            }))}
            value={selectedBillId}
          />
        </div>
        <label className="text-xs text-muted">Mode
          <select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CASH">Cash</option>
          </select>
        </label>
        <label className="text-xs text-muted">Amount
          <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" step="0.01" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </label>
        <div className="md:col-span-4">
          <div className="text-sm text-muted">
            Selected Bill Balance:{" "}
            <span className="font-mono">{formatCurrency(selectedBill?.balanceDue ?? 0)}</span>
          </div>
          <button className="mt-2 h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => mutation.mutate()} type="button">
            Record Payment
          </button>
        </div>
      </div>
      <DataTable
        columns={[
          col.accessor("billNo", { header: "Bill No" }),
          col.accessor("supplierName", { header: "Supplier" }),
          col.accessor("billDate", { header: "Bill Date" }),
          col.accessor("dueDate", { header: "Due Date" }),
          col.accessor("grandTotal", { header: "Grand Total", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("paidAmount", { header: "Paid", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("balanceDue", { header: "Balance Due", cell: (info) => <span className="font-mono text-ruby">{formatCurrency(info.getValue())}</span> }),
          col.accessor("status", { header: "Status" }),
        ]}
        data={data?.rows ?? []}
        loading={isLoading}
      />
    </div>
  );
};
