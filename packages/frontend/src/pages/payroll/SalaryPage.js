import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const salarySchema = z.object({
    employeeId: z.coerce.number(),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2024),
    daysWorked: z.coerce.number().min(0),
    tdsDeduction: z.coerce.number().min(0),
    status: z.string().default("DRAFT"),
});
const col = createColumnHelper();
const toNumber = (value) => Number(value ?? 0);
export const SalaryPage = () => {
    const now = new Date();
    const form = useForm({
        resolver: zodResolver(salarySchema),
        defaultValues: {
            employeeId: "",
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
        mutationFn: (payload) => payrollService.create(payload),
        onSuccess: () => {
            toast.success("Salary record created");
            form.reset({
                employeeId: "",
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                daysWorked: 30,
                tdsDeduction: 0,
                status: "DRAFT",
            });
            void refetch();
        },
        onError: (error) => toast.error(error?.response?.data?.error?.message ?? "Unable to create salary record"),
    });
    const employeeOptions = employees.map((employee) => ({
        value: employee.id,
        label: `${employee.code} - ${employee.name}`,
    }));
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Salary Processing", subtitle: `${rows.length} payroll records` }), _jsxs("form", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-5", onSubmit: form.handleSubmit((values) => createMutation.mutate(values)), children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("p", { className: "mb-1 text-xs text-muted", children: "Employee" }), _jsx(SearchableSelect, { onChange: (value) => form.setValue("employeeId", value), options: employeeOptions, value: form.watch("employeeId") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Month", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", min: 1, max: 12, ...form.register("month", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Year", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register("year", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Days Worked", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.5", ...form.register("daysWorked", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["TDS Deduction", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("tdsDeduction", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Status", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("status"), children: [_jsx("option", { value: "DRAFT", children: "DRAFT" }), _jsx("option", { value: "POSTED", children: "POSTED" })] })] }), _jsx("div", { className: "flex items-end", children: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: createMutation.isPending, type: "submit", children: createMutation.isPending ? "Creating..." : "Run Payroll" }) })] }), _jsx(DataTable, { columns: [
                    col.accessor((row) => row.employee?.code ?? "-", { id: "empCode", header: "Emp Code" }),
                    col.accessor((row) => row.employee?.name ?? "-", { id: "empName", header: "Employee" }),
                    col.accessor("month", { header: "Month" }),
                    col.accessor("year", { header: "Year" }),
                    col.accessor("daysWorked", { header: "Days" }),
                    col.accessor("netPay", {
                        header: "Net Pay",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(toNumber(info.getValue())) }),
                    }),
                    col.accessor("status", {
                        header: "Status",
                        cell: (info) => _jsx("span", { className: `rounded-full px-2 py-1 text-xs ${info.getValue() === "POSTED" ? "bg-emerald/10 text-emerald" : "bg-sapphire/10 text-sapphire"}`, children: info.getValue() }),
                    }),
                ], data: rows, loading: isLoading })] }));
};
