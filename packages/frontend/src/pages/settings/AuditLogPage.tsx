import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { settingsService, type AuditLog } from "@/services/settingsService";

const col = createColumnHelper<AuditLog>();

export const AuditLogPage = () => {
  const [filters, setFilters] = useState<Record<string, string>>({
    from: "2025-04-01",
    to: "2025-04-30",
    user: "",
    module: "",
  });

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["settings-audit-log", filters],
    queryFn: () => settingsService.getAuditLog(filters),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Log" subtitle="Trace all critical configuration and permission changes" />

      <FilterBar
        filters={[
          { key: "from", type: "date", label: "From" },
          { key: "to", type: "date", label: "To" },
          { key: "user", type: "search", label: "User" },
          { key: "module", type: "search", label: "Module" },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ from: "2025-04-01", to: "2025-04-30", user: "", module: "" })}
      />

      {isError ? (
        <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">Failed to load audit logs.<button className="ml-3 underline" onClick={() => void refetch()} type="button">Retry</button></div>
      ) : null}

      <DataTable
        columns={[
          col.accessor("createdAt", { header: "Timestamp", cell: (info) => new Date(info.getValue()).toLocaleString("en-IN") }),
          col.accessor("userName", { header: "User" }),
          col.accessor("module", { header: "Module" }),
          col.accessor("action", { header: "Action" }),
          col.accessor("tableName", { header: "Table" }),
          col.accessor("recordId", { header: "Record" }),
          col.accessor("ipAddress", { header: "IP" }),
        ]}
        data={data}
        loading={isLoading}
      />
    </div>
  );
};
