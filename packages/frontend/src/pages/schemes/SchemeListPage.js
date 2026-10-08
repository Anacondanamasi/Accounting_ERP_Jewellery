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
import { formatCurrency } from "@/lib/formatters";
import { schemeService } from "@/services/schemeService";
const schemeSchema = z.object({
    name: z.string().min(1),
    monthlyMin: z.coerce.number().nonnegative(),
    monthlyMax: z.coerce.number().nonnegative(),
    durationMonths: z.coerce.number().int().positive(),
    bonusType: z.string().min(1),
    bonusValue: z.coerce.number().nonnegative(),
    isActive: z.boolean(),
});
const col = createColumnHelper();
const toNumber = (value) => Number(value ?? 0);
export const SchemeListPage = () => {
    const [editing, setEditing] = useState(null);
    const form = useForm({
        resolver: zodResolver(schemeSchema),
        defaultValues: {
            name: "",
            monthlyMin: 500,
            monthlyMax: 50000,
            durationMonths: 11,
            bonusType: "INSTALLMENT",
            bonusValue: 1,
            isActive: true,
        },
    });
    const { data = [], isLoading, refetch } = useQuery({
        queryKey: ["gold-schemes"],
        queryFn: () => schemeService.list(),
    });
    const saveMutation = useMutation({
        mutationFn: (payload) => editing ? schemeService.update(editing.id, payload) : schemeService.create(payload),
        onSuccess: () => {
            toast.success(editing ? "Scheme updated" : "Scheme created");
            setEditing(null);
            form.reset({
                name: "",
                monthlyMin: 500,
                monthlyMax: 50000,
                durationMonths: 11,
                bonusType: "INSTALLMENT",
                bonusValue: 1,
                isActive: true,
            });
            void refetch();
        },
        onError: (error) => toast.error(error?.response?.data?.error?.message ?? "Unable to save scheme"),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Gold Schemes", subtitle: `${data.length} schemes configured` }), _jsxs("form", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4", onSubmit: form.handleSubmit((values) => saveMutation.mutate(values)), children: [_jsxs("label", { className: "text-xs text-muted", children: ["Scheme Name", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("name") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Monthly Min", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("monthlyMin", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Monthly Max", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("monthlyMax", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Duration (Months)", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register("durationMonths", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Bonus Type", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("bonusType"), children: [_jsx("option", { value: "INSTALLMENT", children: "INSTALLMENT" }), _jsx("option", { value: "PERCENTAGE", children: "PERCENTAGE" }), _jsx("option", { value: "FLAT", children: "FLAT" })] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Bonus Value", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("bonusValue", { valueAsNumber: true }) })] }), _jsxs("label", { className: "flex items-center gap-2 text-xs text-muted", children: [_jsx("input", { type: "checkbox", ...form.register("isActive") }), "Active"] }), _jsxs("div", { className: "flex items-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: saveMutation.isPending, type: "submit", children: saveMutation.isPending ? "Saving..." : editing ? "Update Scheme" : "Create Scheme" }), editing ? (_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => {
                                    setEditing(null);
                                    form.reset({
                                        name: "",
                                        monthlyMin: 500,
                                        monthlyMax: 50000,
                                        durationMonths: 11,
                                        bonusType: "INSTALLMENT",
                                        bonusValue: 1,
                                        isActive: true,
                                    });
                                }, type: "button", children: "Cancel" })) : null] })] }), _jsx(DataTable, { columns: [
                    col.accessor("name", { header: "Scheme" }),
                    col.accessor("monthlyMin", { header: "Monthly Min", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(toNumber(info.getValue())) }) }),
                    col.accessor("monthlyMax", { header: "Monthly Max", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(toNumber(info.getValue())) }) }),
                    col.accessor("durationMonths", { header: "Duration" }),
                    col.accessor("bonusType", { header: "Bonus Type" }),
                    col.accessor("bonusValue", { header: "Bonus", cell: (info) => _jsx("span", { className: "font-mono", children: toNumber(info.getValue()) }) }),
                    col.accessor((row) => row.members?.length ?? 0, { id: "members", header: "Members" }),
                    col.accessor("isActive", { header: "Status", cell: (info) => _jsx("span", { className: `rounded-full px-2 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-ruby/10 text-ruby"}`, children: info.getValue() ? "ACTIVE" : "INACTIVE" }) }),
                    col.display({
                        id: "actions",
                        header: "Actions",
                        cell: ({ row }) => (_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => {
                                setEditing(row.original);
                                form.reset({
                                    name: row.original.name,
                                    monthlyMin: toNumber(row.original.monthlyMin),
                                    monthlyMax: toNumber(row.original.monthlyMax),
                                    durationMonths: row.original.durationMonths,
                                    bonusType: row.original.bonusType,
                                    bonusValue: toNumber(row.original.bonusValue),
                                    isActive: row.original.isActive,
                                });
                            }, type: "button", children: "Edit" })),
                    }),
                ], data: data, loading: isLoading })] }));
};
