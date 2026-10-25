import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { journalService } from "@/services/journalService";
import { useState } from "react";

interface JournalRow {
  id: number;
  date: string;
  entryNo: string;
  narration: string;
  debit?: number;
  credit?: number;
  lines?: Array<{ debit?: number | string | null; credit?: number | string | null }>;
  status: string;
}

const col = createColumnHelper<JournalRow>();
const money = (value: unknown) => Number(value ?? 0).toFixed(2);
const totalDebit = (row: JournalRow) =>
  row.debit ?? row.lines?.reduce((sum, line) => sum + Number(line.debit ?? 0), 0) ?? 0;
const totalCredit = (row: JournalRow) =>
  row.credit ?? row.lines?.reduce((sum, line) => sum + Number(line.credit ?? 0), 0) ?? 0;

export const JournalListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["journal-list", filters],
    queryFn: () => journalService.list(filters),
  });

  const postMutation = useMutation({
    mutationFn: (id: number) => journalService.post(id),
    onSuccess: () => {
      toast.success("Journal posted");
      void refetch();
    },
  });

  const reverseMutation = useMutation({
    mutationFn: (id: number) => journalService.reverse(id),
    onSuccess: () => {
      toast.success("Journal reversed");
      void refetch();
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Journal Entries"
        subtitle="Create, edit, post and reverse accounting entries"
        actions={
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={() => navigate("/journal/new")} type="button">
            + New Journal
          </button>
        }
      />
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search" },
          { key: "from", type: "date", label: "From" },
          { key: "to", type: "date", label: "To" },
          {
            key: "status",
            type: "select",
            label: "Status",
            options: [
              { label: "Draft", value: "DRAFT" },
              { label: "Posted", value: "POSTED" },
              { label: "Reversed", value: "REVERSED" },
            ],
          },
        ]}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({})}
        values={filters}
      />
      <DataTable
        columns={[
          col.accessor("date", {
            header: "Date",
            cell: (info) => {
              const val = info.getValue();
              if (!val) return "—";
              try {
                return format(new Date(val), "dd-MM-yyyy");
              } catch {
                return String(val).slice(0, 10);
              }
            },
          }),
          col.accessor("entryNo", {
            header: "Entry No",
            cell: (info) => (
              <Link
                className="font-mono font-medium text-sapphire hover:underline"
                to={`/journal/${info.row.original.id}/edit`}
                onClick={(e) => e.stopPropagation()}
              >
                {info.getValue()}
              </Link>
            ),
          }),
          col.accessor("narration", { header: "Narration" }),
          col.accessor((row) => totalDebit(row), {
            id: "debit",
            header: "Debit",
            cell: (info) => <span className="font-mono">{money(info.getValue())}</span>,
          }),
          col.accessor((row) => totalCredit(row), {
            id: "credit",
            header: "Credit",
            cell: (info) => <span className="font-mono">{money(info.getValue())}</span>,
          }),
          col.accessor("status", { header: "Status", cell: (info) => <StatusBadge status={info.getValue()} /> }),
          col.display({
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/journal/${row.original.id}/edit`)}
                  type="button"
                >
                  Edit
                </button>
                {row.original.status === "DRAFT" && (
                  <button
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-slate-50 transition-colors"
                    onClick={() => postMutation.mutate(row.original.id)}
                    type="button"
                  >
                    Post
                  </button>
                )}
                {row.original.status === "POSTED" && (
                  <button
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-slate-50 transition-colors"
                    onClick={() => reverseMutation.mutate(row.original.id)}
                    type="button"
                  >
                    Reverse
                  </button>
                )}
              </div>
            ),
          }),
        ]}
        data={data ?? []}
        loading={isLoading}
        onRowClick={(row) => navigate(`/journal/${row.id}/edit`)}
      />
    </div>
  );
};
