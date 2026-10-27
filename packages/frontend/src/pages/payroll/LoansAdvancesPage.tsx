import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { employeeService } from "@/services/employeeService";
import { useAuthStore } from "@/stores/authStore";

interface LoanRow {
  id: number;
  employeeId: number;
  employeeName: string;
  issuedDate: string;
  principal: number;
  monthlyRecovery: number;
  recovered: number;
  balance: number;
  status: "OPEN" | "CLOSED";
}

const loansSchema = z.object({
  employeeId: z.coerce.number(),
  issuedDate: z.string().min(1),
  principal: z.coerce.number().positive(),
  monthlyRecovery: z.coerce.number().positive(),
});

type LoanInput = z.infer<typeof loansSchema>;

const col = createColumnHelper<LoanRow>();

const getStoreKey = (companyId?: string | null) => `payroll_loans_tracker_v1:${companyId || "default"}`;

const readLoans = (companyId?: string | null): LoanRow[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStoreKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LoanRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLoans = (companyId: string | null | undefined, rows: LoanRow[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStoreKey(companyId), JSON.stringify(rows));
};

export const LoansAdvancesPage = () => {
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-loans", currentCompanyId],
    queryFn: () => employeeService.list(),
  });
  const [rows, setRows] = useState<LoanRow[]>(() => readLoans(currentCompanyId));

  useEffect(() => {
    setRows(readLoans(currentCompanyId));
  }, [currentCompanyId]);

  const form = useForm<LoanInput>({
    resolver: zodResolver(loansSchema),
    defaultValues: {
      employeeId: 0,
      issuedDate: formatDate(new Date(), "input"),
      principal: 0,
      monthlyRecovery: 0,
    },
  });

  const employeeMap = useMemo(
    () => new Map((employees as Array<{ id: number; name: string; code: string }>).map((row) => [row.id, row])),
    [employees],
  );

  const openTotal = rows.reduce((sum, row) => sum + row.balance, 0);

  const employeeOptions = (employees as Array<{ id: number; name: string; code: string }>).map((row) => ({
    value: row.id,
    label: `${row.code} - ${row.name}`,
  }));

  const addLoan = form.handleSubmit((values) => {
    const employee = employeeMap.get(values.employeeId);
    if (!employee) return;
    const next: LoanRow = {
      id: Date.now(),
      employeeId: employee.id,
      employeeName: employee.name,
      issuedDate: values.issuedDate,
      principal: values.principal,
      monthlyRecovery: values.monthlyRecovery,
      recovered: 0,
      balance: values.principal,
      status: "OPEN",
    };
    const updated = [next, ...rows];
    writeLoans(currentCompanyId, updated);
    setRows(updated);
    form.reset({
      employeeId: 0,
      issuedDate: formatDate(new Date(), "input"),
      principal: 0,
      monthlyRecovery: 0,
    });
  });

  const markInstallment = (id: number) => {
    const updated = rows.map((row) => {
      if (row.id !== id || row.status === "CLOSED") return row;
      const recovered = Math.min(row.principal, row.recovered + row.monthlyRecovery);
      const balance = Math.max(0, row.principal - recovered);
      return {
        ...row,
        recovered,
        balance,
        status: (balance === 0 ? "CLOSED" : "OPEN") as "OPEN" | "CLOSED",
      };
    });
    writeLoans(currentCompanyId, updated);
    setRows(updated);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Loans & Advances" subtitle={`Outstanding ${formatCurrency(openTotal)}`} />

      <form className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-5" onSubmit={addLoan}>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-muted">Employee</p>
          <SearchableSelect
            onChange={(value) => form.setValue("employeeId", Number(value))}
            options={employeeOptions}
            value={form.watch("employeeId")}
          />
        </div>
        <label className="text-xs text-muted">Issued Date<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" {...form.register("issuedDate")} /></label>
        <label className="text-xs text-muted">Principal<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("principal", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">Monthly Recovery<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("monthlyRecovery", { valueAsNumber: true })} /></label>
        <div className="md:col-span-5">
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" type="submit">Create Loan</button>
        </div>
      </form>

      <DataTable
        columns={[
          col.accessor("employeeName", { header: "Employee" }),
          col.accessor("issuedDate", { header: "Issued", cell: (info) => formatDate(info.getValue(), "display") }),
          col.accessor("principal", { header: "Principal", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("monthlyRecovery", { header: "Monthly Recovery", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("recovered", { header: "Recovered", cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> }),
          col.accessor("balance", { header: "Balance", cell: (info) => <span className={`font-mono ${info.getValue() > 0 ? "text-ruby" : "text-emerald"}`}>{formatCurrency(info.getValue())}</span> }),
          col.accessor("status", { header: "Status", cell: (info) => <span className={`rounded-full px-2 py-1 text-xs ${info.getValue() === "CLOSED" ? "bg-emerald/10 text-emerald" : "bg-gold/10 text-gold"}`}>{info.getValue()}</span> }),
          col.display({
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
              <button
                className="rounded border border-border px-2 py-1 text-xs"
                disabled={row.original.status === "CLOSED"}
                onClick={() => markInstallment(row.original.id)}
                type="button"
              >
                Recover Installment
              </button>
            ),
          }),
        ]}
        data={rows}
      />
    </div>
  );
};
