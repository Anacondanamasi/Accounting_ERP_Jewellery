import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { inventoryService, type JobWorkOrderRow, type KarigarRow } from "@/services/inventoryService";

const col = createColumnHelper<JobWorkOrderRow>();

const jwoSchema = z.object({
  karigarId: z.coerce.number(),
  issueDate: z.string().min(1),
  expectedDate: z.string().min(1),
  description: z.string().min(3),
  goldIssuedG: z.coerce.number().positive(),
  allowedLossPct: z.coerce.number().min(0).max(100),
  makingCharges: z.coerce.number().nonnegative(),
});

type JwoInput = z.infer<typeof jwoSchema>;

export const JobWorkPage = () => {
  const [filters, setFilters] = useState<Record<string, string>>({ karigarId: "", status: "" });
  const [openIssue, setOpenIssue] = useState(false);
  const [returnTarget, setReturnTarget] = useState<JobWorkOrderRow | null>(null);
  const [returnWeight, setReturnWeight] = useState(0);

  const form = useForm<JwoInput>({
    resolver: zodResolver(jwoSchema),
    defaultValues: {
      karigarId: "",
      issueDate: new Date().toISOString().slice(0, 10),
      expectedDate: new Date().toISOString().slice(0, 10),
      description: "",
      goldIssuedG: 0,
      allowedLossPct: 1,
      makingCharges: 0,
    },
  });

  const { data: karigars = [] } = useQuery({ queryKey: ["inventory-karigars-lite"], queryFn: () => inventoryService.listKarigars() });

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["inventory-job-work", filters],
    queryFn: () => inventoryService.listJobWorkOrders(filters),
  });

  const createMutation = useMutation({
    mutationFn: (payload: JwoInput) => inventoryService.createJobWorkOrder(payload),
    onSuccess: () => {
      toast.success("JWO created");
      setOpenIssue(false);
      form.reset();
      void refetch();
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message ?? "Unable to create JWO"),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, goldReturnedG }: { id: number; goldReturnedG: number }) => inventoryService.returnJobWork(id, { goldReturnedG }),
    onSuccess: () => {
      toast.success("Return recorded");
      setReturnTarget(null);
      setReturnWeight(0);
      void refetch();
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message ?? "Unable to record return"),
  });

  const billMutation = useMutation({
    mutationFn: (id: number) => inventoryService.createJobWorkBill(id),
    onSuccess: (dataRes) => toast.success(`Making bill generated: ${dataRes.billNo}`),
    onError: () => toast.error("Unable to generate bill"),
  });

  const karigarOptions = karigars.map((k: KarigarRow) => ({
    value: k.id,
    label: k.name,
    meta: k.code,
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Job Work" subtitle="Issue gold, record returns, and bill making charges" actions={<button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => setOpenIssue(true)} type="button">Issue Gold (Create JWO)</button>} />

      <FilterBar
        filters={[
          { key: "karigarId", type: "select", label: "Karigar", options: karigars.map((k: KarigarRow) => ({ label: k.name, value: k.id })) },
          {
            key: "status",
            type: "select",
            label: "Status",
            options: [
              { label: "Issued", value: "ISSUED" },
              { label: "Partially Returned", value: "PARTIALLY_RETURNED" },
              { label: "Completed", value: "COMPLETED" },
              { label: "Overdue", value: "OVERDUE" },
            ],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ karigarId: "", status: "" })}
      />

      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">Failed to load job work orders.<button className="ml-3 underline" onClick={() => void refetch()} type="button">Retry</button></div>
      ) : null}

      <DataTable
        columns={[
          col.accessor("jwoNo", { header: "JWO No" }),
          col.accessor("karigarName", { header: "Karigar" }),
          col.accessor("issueDate", { header: "Issue Date" }),
          col.accessor("expectedDate", { header: "Expected" }),
          col.accessor("goldIssuedG", { header: "Issued (g)", cell: (info) => <span className="font-mono">{info.getValue().toFixed(3)}</span> }),
          col.accessor("goldReturnedG", { header: "Returned (g)", cell: (info) => <span className="font-mono">{info.getValue().toFixed(3)}</span> }),
          col.accessor("makingCharges", { header: "Making Charges", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("status", {
            header: "Status",
            cell: (info) => {
              const status = info.getValue();
              const cls = status === "COMPLETED" ? "bg-emerald/10 text-emerald" : status === "PARTIALLY_RETURNED" ? "bg-gold/10 text-gold" : status === "OVERDUE" ? "bg-ruby/10 text-ruby" : "bg-sapphire/10 text-sapphire";
              return <span className={`rounded-full px-3 py-1 text-xs ${cls}`}>{status}</span>;
            },
          }),
          col.display({
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
              <div className="flex gap-1">
                <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => { setReturnTarget(row.original); setReturnWeight(Math.max(0, row.original.goldIssuedG - row.original.goldReturnedG)); }} type="button">Return</button>
                <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => billMutation.mutate(row.original.id)} type="button">Create Bill</button>
              </div>
            ),
          }),
        ]}
        data={data}
        loading={isLoading}
      />

      {openIssue ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4" onClick={(event) => { if (event.currentTarget === event.target) setOpenIssue(false); }}>
          <form className="w-full max-w-3xl rounded-card bg-card p-6 shadow-modal" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
            <h3 className="mb-4 font-display text-2xl font-semibold">Issue Gold to Karigar</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-1">
                <p className="mb-1 text-xs text-muted">Karigar</p>
                <SearchableSelect
                  onChange={(val) => form.setValue("karigarId", val)}
                  options={karigarOptions}
                  value={form.watch("karigarId")}
                />
              </div>
              <label className="text-xs text-muted">Issue Date<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" {...form.register("issueDate")} /></label>
              <label className="text-xs text-muted">Expected Date<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" {...form.register("expectedDate")} /></label>
              <label className="text-xs text-muted">Gold Issued (g)<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.001" {...form.register("goldIssuedG", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Allowed Loss %<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("allowedLossPct", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted">Making Charges<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("makingCharges", { valueAsNumber: true })} /></label>
              <label className="text-xs text-muted md:col-span-3">Description<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("description")} /></label>
            </div>
            <div className="mt-2 text-xs text-ruby">{Object.values(form.formState.errors)[0]?.message as string}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => setOpenIssue(false)} type="button">Cancel</button>
              <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={createMutation.isPending} type="submit">{createMutation.isPending ? "Saving..." : "Create JWO"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {returnTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4" onClick={(event) => { if (event.currentTarget === event.target) setReturnTarget(null); }}>
          <div className="w-full max-w-md rounded-card bg-card p-6 shadow-modal">
            <h3 className="mb-3 font-display text-2xl font-semibold">Return Gold</h3>
            <p className="text-sm text-muted">{returnTarget.jwoNo} - {returnTarget.karigarName}</p>
            <p className="text-sm text-muted">Outstanding: {(returnTarget.goldIssuedG - returnTarget.goldReturnedG).toFixed(3)}g</p>
            <label className="mt-3 block text-xs text-muted">Returned Weight (g)<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.001" value={returnWeight} onChange={(event) => setReturnWeight(Number(event.target.value))} /></label>
            <div className="mt-4 flex justify-end gap-2">
              <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => setReturnTarget(null)} type="button">Cancel</button>
              <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={returnMutation.isPending} onClick={() => returnMutation.mutate({ id: returnTarget.id, goldReturnedG: returnWeight })} type="button">{returnMutation.isPending ? "Saving..." : "Record Return"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

