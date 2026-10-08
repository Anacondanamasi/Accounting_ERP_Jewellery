import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { inventoryService, type InventoryAdjustment } from "@/services/inventoryService";

const col = createColumnHelper<InventoryAdjustment>();

export const AdjustmentListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({
    type: "",
    status: "",
    from: "2025-04-01",
    to: "2025-04-30",
  });

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["inventory-adjustments", filters],
    queryFn: () => inventoryService.listAdjustments(filters),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "submit" | "approve" | "post" }) => {
      if (action === "submit") return inventoryService.submitAdjustment(id);
      if (action === "approve") return inventoryService.approveAdjustment(id);
      return inventoryService.postAdjustment(id);
    },
    onSuccess: (_, vars) => {
      toast.success(`Adjustment ${vars.action} successful`);
      void refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(error.response?.data?.error?.message ?? "Action failed");
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory Adjustments"
        subtitle="Draft to Post approval workflow"
        actions={<button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => navigate("/inventory/adjust/new")} type="button">New Adjustment</button>}
      />

      <FilterBar
        filters={[
          { key: "from", type: "date", label: "From" },
          { key: "to", type: "date", label: "To" },
          {
            key: "status",
            type: "select",
            label: "Status",
            options: [
              { label: "Draft", value: "DRAFT" },
              { label: "Submitted", value: "SUBMITTED" },
              { label: "Approved", value: "APPROVED" },
              { label: "Posted", value: "POSTED" },
            ],
          },
          { key: "type", type: "search", label: "Type" },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ type: "", status: "", from: "2025-04-01", to: "2025-04-30" })}
      />

      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
          Failed to load adjustments.
          <button className="ml-3 underline" onClick={() => void refetch()} type="button">Retry</button>
        </div>
      ) : null}

      <DataTable
        columns={[
          col.accessor("adjNo", { header: "Adjustment No" }),
          col.accessor("date", { header: "Date" }),
          col.accessor("type", { header: "Type" }),
          col.accessor("reason", { header: "Reason" }),
          col.accessor("status", {
            header: "Status",
            cell: (info) => {
              const status = info.getValue();
              const cls =
                status === "POSTED"
                  ? "bg-emerald/10 text-emerald"
                  : status === "APPROVED"
                    ? "bg-sapphire/10 text-sapphire"
                    : status === "SUBMITTED"
                      ? "bg-gold/10 text-gold"
                      : "bg-ruby/10 text-ruby";
              return <span className={`rounded-full px-3 py-1 text-xs ${cls}`}>{status}</span>;
            },
          }),
          col.display({
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
              const item = row.original;
              return (
                <div className="flex gap-1">
                  {item.status === "DRAFT" ? <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => statusMutation.mutate({ id: item.id, action: "submit" })} type="button">Submit</button> : null}
                  {item.status === "SUBMITTED" ? <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => statusMutation.mutate({ id: item.id, action: "approve" })} type="button">Approve</button> : null}
                  {item.status === "APPROVED" ? <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => statusMutation.mutate({ id: item.id, action: "post" })} type="button">Post</button> : null}
                </div>
              );
            },
          }),
        ]}
        data={data}
        loading={isLoading}
      />
    </div>
  );
};
