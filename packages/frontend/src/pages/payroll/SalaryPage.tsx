import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { employeeService } from "@/services/employeeService";
import { payrollService } from "@/services/payrollService";

interface SalaryRow {
  id: number;
  month: number;
  year: number;
  daysWorked: number | string;
  netPay: number | string;
  status: string;
  employee: { name: string; code: string };
}

const salarySchema = z.object({
  employeeId: z.coerce.number(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2024),
  daysWorked: z.coerce.number().min(0),
  tdsDeduction: z.coerce.number().min(0),
  status: z.string().default("DRAFT"),
});

type SalaryInput = z.infer<typeof salarySchema>;
const col = createColumnHelper<SalaryRow>();
const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

export const SalaryPage = () => {
  const now = new Date();
  const form = useForm<SalaryInput>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      employeeId: 0,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      daysWorked: 30,
      tdsDeduction: 0,
      status: "DRAFT",
    },
  });

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["payroll-records"],
    queryFn: () => payrollService.list(),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-payroll"],
    queryFn: () => employeeService.list(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: SalaryInput) => payrollService.create(payload),
    onSuccess: () => {
      toast.success("Salary record created");
      form.reset({
        employeeId: 0,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        daysWorked: 30,
        tdsDeduction: 0,
        status: "DRAFT",
      });
      void refetch();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error?.message ?? "Unable to create salary record"),
  });

  const employeeOptions = (employees as Array<{ id: number; code: string; name: string }>).map((employee) => ({
    value: employee.id,
    label: `${employee.code} - ${employee.name}`,
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Salary Processing" subtitle={`${(rows as SalaryRow[]).length} payroll records`} />

      <form className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-5" onSubmit={form.handleSubmit((values: SalaryInput) => createMutation.mutate(values))}>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-muted">Employee</p>
          <SearchableSelect onChange={(value) => form.setValue("employeeId", Number(value))} options={employeeOptions} value={form.watch("employeeId")} />
        </div>
        <label className="text-xs text-muted">Month<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" min={1} max={12} {...form.register("month", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">Year<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" {...form.register("year", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">Days Worked<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.5" {...form.register("daysWorked", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">TDS Deduction<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("tdsDeduction", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">Status<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("status")}><option value="DRAFT">DRAFT</option><option value="POSTED">POSTED</option></select></label>
        <div className="flex items-end">
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={createMutation.isPending} type="submit">
            {createMutation.isPending ? "Creating..." : "Run Payroll"}
          </button>
        </div>
      </form>

      <DataTable
        columns={[
          col.accessor((row) => row.employee?.code ?? "-", { id: "empCode", header: "Emp Code" }),
          col.accessor((row) => row.employee?.name ?? "-", { id: "empName", header: "Employee" }),
          col.accessor("month", { header: "Month" }),
          col.accessor("year", { header: "Year" }),
          col.accessor("daysWorked", { header: "Days" }),
          col.accessor("netPay", {
            header: "Net Pay",
            cell: (info) => <span className="font-mono">{formatCurrency(toNumber(info.getValue()))}</span>,
          }),
          col.accessor("status", {
            header: "Status",
            cell: (info) => <span className={`rounded-full px-2 py-1 text-xs ${info.getValue() === "POSTED" ? "bg-emerald/10 text-emerald" : "bg-sapphire/10 text-sapphire"}`}>{info.getValue()}</span>,
          }),
        ]}
        data={rows as SalaryRow[]}
        loading={isLoading}
      />
    </div>
  );
};
