import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { employeeService } from "@/services/employeeService";

interface EmployeeRow {
  id: number;
  code: string;
  name: string;
  designation: string;
  department: string;
  dateOfJoin: string;
  basicSalary: number | string;
  hra: number | string;
  otherAllowances: number | string;
  pfApplicable: boolean;
  esiApplicable: boolean;
  isActive: boolean;
}

const employeeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  designation: z.string().min(1),
  department: z.string().min(1),
  dateOfJoin: z.string().min(1),
  basicSalary: z.coerce.number().min(0),
  hra: z.coerce.number().min(0),
  otherAllowances: z.coerce.number().min(0),
  pfApplicable: z.boolean(),
  esiApplicable: z.boolean(),
  isActive: z.boolean(),
});

type EmployeeInput = z.infer<typeof employeeSchema>;

const col = createColumnHelper<EmployeeRow>();
const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

export const EmployeesPage = () => {
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const form = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      code: "",
      name: "",
      designation: "Staff",
      department: "General",
      dateOfJoin: formatDate(new Date(), "input"),
      basicSalary: 0,
      hra: 0,
      otherAllowances: 0,
      pfApplicable: false,
      esiApplicable: false,
      isActive: true,
    },
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeService.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: EmployeeInput) =>
      editing ? employeeService.update(editing.id, payload) : employeeService.create(payload),
    onSuccess: () => {
      toast.success(editing ? "Employee updated" : "Employee created");
      setEditing(null);
      form.reset({
        code: "",
        name: "",
        designation: "Staff",
        department: "General",
        dateOfJoin: formatDate(new Date(), "input"),
        basicSalary: 0,
        hra: 0,
        otherAllowances: 0,
        pfApplicable: false,
        esiApplicable: false,
        isActive: true,
      });
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message ?? "Unable to save employee");
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employees"
        subtitle={`${(data as EmployeeRow[]).length} employee records`}
        actions={(
          <button
            className="h-10 rounded-btn border border-border px-4 text-sm"
            onClick={() => {
              setEditing(null);
              form.reset({
                code: "",
                name: "",
                designation: "Staff",
                department: "General",
                dateOfJoin: formatDate(new Date(), "input"),
                basicSalary: 0,
                hra: 0,
                otherAllowances: 0,
                pfApplicable: false,
                esiApplicable: false,
                isActive: true,
              });
            }}
            type="button"
          >
            New Employee
          </button>
        )}
      />

      <form
        className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4"
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      >
        <label className="text-xs text-muted">Code<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("code")} /></label>
        <label className="text-xs text-muted">Name<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("name")} /></label>
        <label className="text-xs text-muted">Designation<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("designation")} /></label>
        <label className="text-xs text-muted">Department<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("department")} /></label>
        <label className="text-xs text-muted">Date of Join<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="date" {...form.register("dateOfJoin")} /></label>
        <label className="text-xs text-muted">Basic Salary<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("basicSalary", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">HRA<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("hra", { valueAsNumber: true })} /></label>
        <label className="text-xs text-muted">Allowances<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" step="0.01" {...form.register("otherAllowances", { valueAsNumber: true })} /></label>
        <label className="flex items-center gap-2 text-xs text-muted md:col-span-1"><input type="checkbox" {...form.register("pfApplicable")} />PF Applicable</label>
        <label className="flex items-center gap-2 text-xs text-muted md:col-span-1"><input type="checkbox" {...form.register("esiApplicable")} />ESI Applicable</label>
        <label className="flex items-center gap-2 text-xs text-muted md:col-span-1"><input type="checkbox" {...form.register("isActive")} />Active</label>
        <div className="flex items-end gap-2 md:col-span-1">
          <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={saveMutation.isPending} type="submit">
            {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Add"}
          </button>
          {editing ? (
            <button
              className="h-10 rounded-btn border border-border px-4 text-sm"
              onClick={() => {
                setEditing(null);
                form.reset({
                  code: "",
                  name: "",
                  designation: "Staff",
                  department: "General",
                  dateOfJoin: formatDate(new Date(), "input"),
                  basicSalary: 0,
                  hra: 0,
                  otherAllowances: 0,
                  pfApplicable: false,
                  esiApplicable: false,
                  isActive: true,
                });
              }}
              type="button"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <DataTable
        columns={[
          col.accessor("code", { header: "Code" }),
          col.accessor("name", { header: "Name" }),
          col.accessor("designation", { header: "Designation" }),
          col.accessor("department", { header: "Department" }),
          col.accessor("dateOfJoin", { header: "DOJ", cell: (info) => formatDate(info.getValue(), "display") }),
          col.accessor("basicSalary", { header: "Basic", cell: (info) => <span className="font-mono">{formatCurrency(toNumber(info.getValue()))}</span> }),
          col.accessor("isActive", { header: "Status", cell: (info) => <span className={`rounded-full px-2 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-ruby/10 text-ruby"}`}>{info.getValue() ? "ACTIVE" : "INACTIVE"}</span> }),
          col.display({
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
              <button
                className="rounded border border-border px-2 py-1 text-xs"
                onClick={() => {
                  setEditing(row.original);
                  form.reset({
                    code: row.original.code,
                    name: row.original.name,
                    designation: row.original.designation,
                    department: row.original.department,
                    dateOfJoin: formatDate(row.original.dateOfJoin, "input"),
                    basicSalary: toNumber(row.original.basicSalary),
                    hra: toNumber(row.original.hra),
                    otherAllowances: toNumber(row.original.otherAllowances),
                    pfApplicable: row.original.pfApplicable,
                    esiApplicable: row.original.esiApplicable,
                    isActive: row.original.isActive,
                  });
                }}
                type="button"
              >
                Edit
              </button>
            ),
          }),
        ]}
        data={data as EmployeeRow[]}
        loading={isLoading}
      />
    </div>
  );
};
