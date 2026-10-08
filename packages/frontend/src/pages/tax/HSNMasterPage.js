import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { taxService } from "@/services/taxService";
const col = createColumnHelper();
const hsnSchema = z.object({
    code: z.string().min(4, "HSN code is required"),
    description: z.string().min(3, "Description is required"),
    gstRate: z.coerce.number().min(0).max(28),
    cessRate: z.coerce.number().min(0).max(28),
    isActive: z.boolean(),
});
export const HSNMasterPage = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const form = useForm({
        resolver: zodResolver(hsnSchema),
        defaultValues: {
            code: "",
            description: "",
            gstRate: 3,
            cessRate: 0,
            isActive: true,
        },
    });
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["tax-hsn-master"],
        queryFn: () => taxService.getHsnMaster(),
    });
    const createMutation = useMutation({
        mutationFn: (payload) => taxService.createHsn(payload),
        onSuccess: () => {
            toast.success("HSN code added");
            setIsOpen(false);
            form.reset();
            void refetch();
        },
        onError: (error) => toast.error(error.response?.data?.error?.message ?? "Unable to add HSN code"),
    });
    const updateMutation = useMutation({
        mutationFn: (payload) => taxService.updateHsn(editing.id, payload),
        onSuccess: () => {
            toast.success("HSN code updated");
            setIsOpen(false);
            setEditing(null);
            form.reset();
            void refetch();
        },
        onError: (error) => toast.error(error.response?.data?.error?.message ?? "Unable to update HSN code"),
    });
    const activeCount = useMemo(() => data.filter((row) => row.isActive).length, [data]);
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
                setEditing(null);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
    const openCreate = () => {
        setEditing(null);
        form.reset({
            code: "",
            description: "",
            gstRate: 3,
            cessRate: 0,
            isActive: true,
        });
        setIsOpen(true);
    };
    const openEdit = (row) => {
        setEditing(row);
        form.reset({
            code: row.code,
            description: row.description,
            gstRate: row.gstRate,
            cessRate: row.cessRate,
            isActive: row.isActive,
        });
        setIsOpen(true);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "HSN/SAC Master", subtitle: `${data.length} codes configured (${activeCount} active)`, actions: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: openCreate, type: "button", children: "Add HSN" }) }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load HSN codes.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsx(DataTable, { columns: [
                    col.accessor("code", { header: "HSN Code" }),
                    col.accessor("description", { header: "Description" }),
                    col.accessor("gstRate", { header: "GST %" }),
                    col.accessor("cessRate", { header: "Cess %" }),
                    col.accessor("isActive", {
                        header: "Status",
                        cell: (info) => (_jsx("span", { className: `rounded-full px-3 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-ruby/10 text-ruby"}`, children: info.getValue() ? "Active" : "Inactive" })),
                    }),
                    col.display({
                        id: "taxPreview",
                        header: "Preview",
                        cell: (info) => {
                            const sampleTax = (100000 * info.row.original.gstRate) / 100;
                            return _jsx("span", { className: "font-mono", children: formatCurrency(sampleTax) });
                        },
                    }),
                    col.display({
                        id: "action",
                        header: "Action",
                        cell: (info) => (_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => openEdit(info.row.original), type: "button", children: "Edit" })),
                    }),
                ], data: data, loading: isLoading }), isOpen ? (_jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4", onClick: (event) => {
                    if (event.currentTarget === event.target) {
                        setIsOpen(false);
                        setEditing(null);
                    }
                }, children: _jsxs("form", { className: "w-full max-w-xl rounded-card bg-card p-6 shadow-modal", onSubmit: form.handleSubmit((values) => {
                        if (editing) {
                            updateMutation.mutate(values);
                            return;
                        }
                        createMutation.mutate(values);
                    }), children: [_jsx("h3", { className: "mb-4 font-display text-2xl font-semibold", children: editing ? "Edit HSN" : "Add HSN" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "text-xs text-muted", children: ["HSN Code", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("code") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["GST Rate %", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("gstRate", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Cess Rate %", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("cessRate", { valueAsNumber: true }) })] }), _jsxs("label", { className: "flex items-center gap-2 pt-6 text-xs text-muted", children: [_jsx("input", { type: "checkbox", ...form.register("isActive") }), " Active"] }), _jsxs("label", { className: "text-xs text-muted md:col-span-2", children: ["Description", _jsx("textarea", { className: "mt-1 min-h-[84px] w-full rounded border border-border px-3 py-2 text-sm", ...form.register("description") })] })] }), _jsx("div", { className: "mt-2 text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => { setIsOpen(false); setEditing(null); }, type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: createMutation.isPending || updateMutation.isPending, type: "submit", children: createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Update" : "Save" })] })] }) })) : null] }));
};
