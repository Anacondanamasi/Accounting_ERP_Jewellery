import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { noteService } from "@/services/noteService";
import { formatCurrency, formatDate } from "@/lib/formatters";

const columnHelper = createColumnHelper<any>();

export const CreditNoteListPage = () => {
  const navigate = useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ["credit-notes"],
    queryFn: () => noteService.credit.list(),
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <PageHeader
        title="Credit Notes"
        subtitle="Manage sales returns and customer credits"
        actions={
          <button
            className="inline-flex h-10 items-center gap-2 rounded-btn bg-gold px-4 text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all"
            onClick={() => navigate("/credit-notes/new")}
            type="button"
          >
            <Plus className="h-4 w-4" /> Create Credit Note
          </button>
        }
      />

      <div className="flex items-center gap-2 rounded-card border border-border bg-card p-2 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="h-9 w-full rounded border-none bg-transparent pl-10 text-sm focus:ring-0"
            placeholder="Search by Note No, Party name..."
          />
        </div>
        <button className="flex h-9 items-center gap-2 rounded border border-border px-3 text-sm font-medium hover:bg-slate-50 transition-colors">
          <Filter className="h-4 w-4 text-muted" /> Filters
        </button>
      </div>

      <div className="rounded-card border-t-2 border-t-gold bg-card shadow-card overflow-hidden">
        <DataTable
          columns={[
            columnHelper.accessor("noteNo", {
              header: "Note No",
              cell: (info) => <span className="font-mono font-bold text-charcoal">{info.getValue()}</span>,
            }),
            columnHelper.accessor("date", {
              header: "Date",
              cell: (info) => <span className="text-slate-600">{formatDate(info.getValue())}</span>,
            }),
            columnHelper.accessor((row) => row.customer?.name || "Walking Customer", {
              header: "Customer",
              cell: (info) => <span className="font-medium text-slate-700">{info.getValue()}</span>,
            }),
            columnHelper.accessor("referenceNo", {
              header: "Ref Invoice",
              cell: (info) => <span className="text-xs text-muted">{info.getValue() || "-"}</span>,
            }),
            columnHelper.accessor("grandTotal", {
              header: "Total Amount",
              cell: (info) => <span className="font-mono font-bold text-charcoal">{formatCurrency(info.getValue())}</span>,
            }),
            columnHelper.accessor("status", {
              header: "Status",
              cell: (info) => <StatusBadge status={info.getValue() || "POSTED"} />,
            }),
            columnHelper.display({
              id: "actions",
              cell: (info) => (
                <button
                  className="text-xs font-semibold text-gold hover:text-gold-dark transition-colors"
                  onClick={() => navigate(`/credit-notes/${info.row.original.id}`)}
                >
                  View Details
                </button>
              ),
            }),
          ]}
          data={data}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
