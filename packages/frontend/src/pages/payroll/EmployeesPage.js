import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const col = createColumnHelper();
const toNumber = (value) => Number(value ?? 0);
export const EmployeesPage = () => {
    const [editing, setEditing] = useState(null);
    const form = useForm({
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
        mutationFn: (payload) => editing ? employeeService.update(editing.id, payload) : employeeService.create(payload),
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
        onError: (error) => {
            toast.error(error?.response?.data?.error?.message ?? "Unable to save employee");
        },
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Employees", subtitle: `${data.length} employee records`, actions: (_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => {
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
                    }, type: "button", children: "New Employee" })) }), _jsxs("form", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4", onSubmit: form.handleSubmit((values) => saveMutation.mutate(values)), children: [_jsxs("label", { className: "text-xs text-muted", children: ["Code", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("code") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Name", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("name") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Designation", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("designation") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Department", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("department") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Date of Join", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", ...form.register("dateOfJoin") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Basic Salary", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("basicSalary", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["HRA", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("hra", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Allowances", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("otherAllowances", { valueAsNumber: true }) })] }), _jsxs("label", { className: "flex items-center gap-2 text-xs text-muted md:col-span-1", children: [_jsx("input", { type: "checkbox", ...form.register("pfApplicable") }), "PF Applicable"] }), _jsxs("label", { className: "flex items-center gap-2 text-xs text-muted md:col-span-1", children: [_jsx("input", { type: "checkbox", ...form.register("esiApplicable") }), "ESI Applicable"] }), _jsxs("label", { className: "flex items-center gap-2 text-xs text-muted md:col-span-1", children: [_jsx("input", { type: "checkbox", ...form.register("isActive") }), "Active"] }), _jsxs("div", { className: "flex items-end gap-2 md:col-span-1", children: [_jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: saveMutation.isPending, type: "submit", children: saveMutation.isPending ? "Saving..." : editing ? "Update" : "Add" }), editing ? (_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => {
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
                                }, type: "button", children: "Cancel" })) : null] })] }), _jsx(DataTable, { columns: [
                    col.accessor("code", { header: "Code" }),
                    col.accessor("name", { header: "Name" }),
                    col.accessor("designation", { header: "Designation" }),
                    col.accessor("department", { header: "Department" }),
                    col.accessor("dateOfJoin", { header: "DOJ", cell: (info) => formatDate(info.getValue(), "display") }),
                    col.accessor("basicSalary", { header: "Basic", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(toNumber(info.getValue())) }) }),
                    col.accessor("isActive", { header: "Status", cell: (info) => _jsx("span", { className: `rounded-full px-2 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-ruby/10 text-ruby"}`, children: info.getValue() ? "ACTIVE" : "INACTIVE" }) }),
                    col.display({
                        id: "actions",
                        header: "Actions",
                        cell: ({ row }) => (_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => {
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
                            }, type: "button", children: "Edit" })),
                    }),
                ], data: data, loading: isLoading })] }));
};
