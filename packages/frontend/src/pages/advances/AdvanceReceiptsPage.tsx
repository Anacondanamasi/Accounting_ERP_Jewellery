import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import { advanceService } from "@/services/advanceService";
import { customerService } from "@/services/customerService";
import { accountsService } from "@/services/accountsService";
import { useMemo, useState } from "react";

const col = createColumnHelper<any>();

export const AdvanceReceiptsPage = () => {
  const [selectedAdvanceId, setSelectedAdvanceId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(1);

  const createForm = useForm({
    defaultValues: {
      customerId: 1,
      accountId: "",
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      mode: "UPI",
      reference: "",
    },
  });
  const applyForm = useForm({
    defaultValues: {
      invoiceId: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const { data: advances, isLoading, refetch } = useQuery({
    queryKey: ["advances"],
    queryFn: () => advanceService.list(),
  });
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsService.list(),
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-selector-adv"],
    queryFn: () => customerService.list({}),
  });
  const { data: customerInvoices } = useQuery({
    queryKey: ["adv-customer-invoices", selectedCustomerId],
    queryFn: () => customerService.getInvoices(selectedCustomerId),
    enabled: Boolean(selectedCustomerId),
  });

  const selectedAdvance = useMemo(
    () => (advances ?? []).find((row: any) => row.id === selectedAdvanceId),
    [advances, selectedAdvanceId],
  );

  const createMutation = useMutation({
    mutationFn: (payload: any) => advanceService.create(payload),
    onSuccess: (res: any) => {
      const createdAdvance = res.data ?? res; // Handle depending on axios response shape
      toast.success("Payment received successfully");
      
      const invoiceIdToApply = applyForm.watch("invoiceId");
      if (invoiceIdToApply) {
        applyMutation.mutate({
          id: createdAdvance.id,
          payload: {
            invoiceId: invoiceIdToApply,
            amount: createForm.watch("amount"),
            date: createForm.watch("date"),
          }
        });
      } else {
        createForm.reset();
        applyForm.reset();
        void refetch();
      }
    },
    onError: () => toast.error("Unable to record payment"),
  });

  const applyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => advanceService.apply(id, payload),
    onSuccess: () => {
      toast.success("Payment allocated to invoice");
      createForm.reset();
      applyForm.reset();
      void refetch();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error?.message ?? "Unable to apply advance"),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Payment Received" subtitle="Receive payments from customers and apply against open invoices" />

      <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card max-w-2xl mx-auto">
        <form
          className="space-y-4"
          onSubmit={createForm.handleSubmit((values) => {
            const amount = Number(values.amount);
            if (amount <= 0) {
              toast.error("Amount must be greater than zero");
              return;
            }
            if (!values.accountId) {
              toast.error("Please select a Deposit Account");
              return;
            }
            createMutation.mutate({
              ...values,
              amount,
              mode: "BANK_TRANSFER", // Defaulting mode for legacy support, but using accountId for journals
            });
          })}
        >
          <h3 className="font-display text-xl font-semibold border-b border-border pb-2">Receive Payment</h3>
          
          <div>
            <p className="mb-1 text-xs text-muted font-bold uppercase tracking-wider">Select Customer</p>
            <SearchableSelect
              onChange={(value) => {
                createForm.setValue("customerId", value);
                setSelectedCustomerId(value);
              }}
              options={(customers ?? []).map((customer: any) => ({
                value: customer.id,
                label: customer.name,
                meta: customer.code,
              }))}
              value={createForm.watch("customerId")}
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-muted font-bold uppercase tracking-wider">Deposit To (Bank/Cash Account) <span className="text-ruby">*</span></p>
            <SearchableSelect
              onChange={(value) => createForm.setValue("accountId", value)}
              options={(accounts ?? [])
                .filter((acc: any) => acc.type === "ASSET" && (acc.name.toLowerCase().includes("bank") || acc.name.toLowerCase().includes("cash") || acc.group === "Current Assets"))
                .map((acc: any) => ({
                  value: acc.id,
                  label: acc.name,
                  meta: acc.code,
                }))}
              value={createForm.watch("accountId")}
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-muted font-bold uppercase tracking-wider">Allocate to Invoice (Optional)</p>
            <SearchableSelect
              onChange={(value) => {
                applyForm.setValue("invoiceId", value);
                // Auto-fill amount if an invoice is selected
                const invoice = (customerInvoices ?? []).find((inv: any) => inv.id === value);
                if (invoice && Number(createForm.watch("amount")) === 0) {
                  createForm.setValue("amount", Number(invoice.balanceDue));
                }
              }}
              options={(customerInvoices ?? [])
                .filter((invoice: any) => invoice.balanceDue > 0)
                .map((invoice: any) => ({
                  value: invoice.id,
                  label: `${invoice.invoiceNo} · ${formatCurrency(invoice.balanceDue)} due`,
                  meta: invoice.dueDate ? invoice.dueDate.slice(0, 10) : "",
                }))}
              value={applyForm.watch("invoiceId")}
            />
            {applyForm.watch("invoiceId") && (
              <p className="mt-1 text-[11px] text-emerald">
                Payment will be automatically applied to this invoice.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-xs text-muted font-bold uppercase tracking-wider">
              Date
              <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm font-mono text-charcoal" type="date" {...createForm.register("date")} />
            </label>
            <label className="block text-xs text-muted font-bold uppercase tracking-wider">
              Amount
              <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm font-mono text-charcoal" step="0.01" min="0" type="number" {...createForm.register("amount", { valueAsNumber: true })} />
            </label>
          </div>

          <label className="block text-xs text-muted font-bold uppercase tracking-wider">
            Reference / Notes
            <input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" placeholder="e.g. UTR Number or Transfer Details" {...createForm.register("reference")} />
          </label>
          
          <div className="pt-2">
            <button 
              className="h-10 w-full rounded-btn bg-gold px-4 text-sm font-bold text-white shadow hover:bg-gold/90 disabled:opacity-50" 
              type="submit"
              disabled={createMutation.isPending || applyMutation.isPending}
            >
              {createMutation.isPending || applyMutation.isPending ? "Processing..." : "Save Payment"}
            </button>
          </div>
        </form>
      </div>

      <DataTable
        columns={[
          col.accessor("id", { header: "Advance ID" }),
          col.accessor("date", { header: "Date" }),
          col.accessor("customerId", { header: "Customer ID" }),
          col.accessor("mode", { header: "Mode" }),
          col.accessor("amount", {
            header: "Amount",
            cell: (info) => <span className="font-mono text-emerald font-semibold">{formatCurrency(info.getValue())}</span>,
          }),
        ]}
        data={advances ?? []}
        loading={isLoading}
      />
    </div>
  );
};
