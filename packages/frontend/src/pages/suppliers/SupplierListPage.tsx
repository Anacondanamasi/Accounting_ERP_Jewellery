import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import { supplierService } from "@/services/supplierService";
import { SupplierFormModal } from "./SupplierFormModal";

interface SupplierRow {
  id: number;
  code: string;
  name: string;
  mobile: string;
  gstin?: string;
  city: string;
  category: string;
  totalBusiness: number;
  outstanding: number;
  lastBill?: string | null;
  status: string;
}

const col = createColumnHelper<SupplierRow>();

export const SupplierListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<SupplierRow | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["suppliers", filters],
    queryFn: () => supplierService.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierService.remove(id),
    onSuccess: () => {
      toast.success("Supplier deactivated");
      void refetch();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error?.message ?? "Unable to deactivate supplier"),
  });

  const rows: SupplierRow[] = data ?? [];
  const outstandingTotal = rows.reduce((sum, row) => sum + Number(row.outstanding || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        subtitle={`${rows.length} suppliers · ${formatCurrency(outstandingTotal)} outstanding`}
        actions={
          <button
            className="h-10 rounded-btn bg-gold px-4 text-sm text-white"
            onClick={() => {
              setEditRow(null);
              setModalOpen(true);
            }}
            type="button"
          >
            + Add Supplier
          </button>
        }
      />
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search name/mobile/GSTIN" },
          { key: "city", type: "search", label: "City" },
          {
            key: "category",
            type: "select",
            label: "Category",
            options: [
              { label: "Bullion", value: "BULLION" },
              { label: "Diamond", value: "DIAMOND" },
              { label: "Karigar", value: "KARIGAR" },
              { label: "General", value: "GENERAL" },
            ],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({})}
      />
      <DataTable
        columns={[
          col.accessor("code", { header: "Code", cell: (info) => <span className="font-mono">{info.getValue()}</span> }),
          col.accessor("name", { header: "Supplier Name" }),
          col.accessor("mobile", { header: "Mobile" }),
          col.accessor("gstin", { header: "GSTIN", cell: (info) => info.getValue() || "-" }),
          col.accessor("city", { header: "City" }),
          col.accessor("category", { header: "Category" }),
          col.accessor("totalBusiness", {
            header: "Total Business",
            cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
          }),
          col.accessor("outstanding", {
            header: "Outstanding",
            cell: (info) => <span className="font-mono text-ruby">{formatCurrency(info.getValue())}</span>,
          }),
          col.accessor("lastBill", { header: "Last Bill", cell: (info) => info.getValue() || "-" }),
          col.accessor("status", { header: "Status", cell: (info) => <StatusBadge status={info.getValue()} /> }),
          col.display({
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
              <div className="flex gap-2">
                <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => navigate(`/suppliers/${row.original.id}`)} type="button">View</button>
                <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => { setEditRow(row.original); setModalOpen(true); }} type="button">Edit</button>
                <button className="rounded border border-ruby px-2 py-1 text-xs text-ruby" onClick={() => deleteMutation.mutate(row.original.id)} type="button">Deactivate</button>
              </div>
            ),
          }),
        ]}
        data={rows}
        loading={isLoading}
        onRowClick={(row) => navigate(`/suppliers/${row.id}`)}
      />
      <SupplierFormModal open={modalOpen} initialData={editRow} onClose={() => setModalOpen(false)} onSaved={() => void refetch()} />
    </div>
  );
};
