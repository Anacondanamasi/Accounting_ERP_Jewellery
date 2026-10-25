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
import { customerService } from "@/services/customerService";

interface CustomerRow {
  id: number;
  code: string;
  name: string;
  mobile: string;
  gstin?: string;
  city: string;
  category: string;
  totalBusiness: number;
  outstanding: number;
  lastPurchase?: string | null;
  status: string;
}

const col = createColumnHelper<CustomerRow>();

export const CustomerListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<CustomerRow | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customers", filters],
    queryFn: () => customerService.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerService.remove(id),
    onSuccess: () => {
      toast.success("Customer deactivated");
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message ?? "Unable to deactivate customer");
    },
  });

  const rows: CustomerRow[] = data ?? [];
  const outstandingTotal = rows.reduce((sum, row) => sum + Number(row.outstanding || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} customers · ${formatCurrency(outstandingTotal)} outstanding`}
        actions={
          <>
            <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => toast.info("CSV import endpoint scaffold is ready")} type="button">
              Import CSV
            </button>
            <button
              className="h-10 rounded-btn border border-border px-4 text-sm"
              onClick={async () => {
                const exported = await customerService.export();
                toast.success(`Export ready at ${exported.url}`);
              }}
              title="Export"
              type="button"
            >
              Export
            </button>
            <button
              className="h-10 rounded-btn bg-gold px-4 text-sm text-white"
              onClick={() => navigate("/customers/new")}
              title="New Customer"
              type="button"
            >
              + Add Customer
            </button>
          </>
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
              { label: "B2B", value: "B2B" },
              { label: "Retail", value: "RETAIL" },
            ],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({})}
      />
      <DataTable
        columns={[
          col.accessor("code", {
            header: "Code",
            cell: (info) => <span className="font-mono font-medium text-sapphire">{info.getValue()}</span>,
          }),
          col.accessor("name", {
            header: "Customer Name",
            cell: (info) => <span className="font-medium text-charcoal">{info.getValue()}</span>,
          }),
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
            cell: (info) => (
              <span className={`font-mono ${info.getValue() > 0 ? "text-ruby" : "text-emerald"}`}>
                {formatCurrency(info.getValue())}
              </span>
            ),
          }),
          col.accessor("lastPurchase", { header: "Last Purchase", cell: (info) => info.getValue() || "-" }),
          col.accessor("status", { header: "Status", cell: (info) => <StatusBadge status={info.getValue()} /> }),
        ]}
        data={rows}
        loading={isLoading}
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
      />
    </div>
  );
};
