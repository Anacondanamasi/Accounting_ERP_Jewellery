import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { inventoryService } from "@/services/inventoryService";
const col = createColumnHelper();
const karigarSchema = z.object({
    code: z.string().min(2),
    name: z.string().min(2),
    specialization: z.string().min(2),
    mobile: z.string().min(8),
    goldInHand: z.coerce.number().nonnegative(),
    pendingReturn: z.coerce.number().int().nonnegative(),
    makingDue: z.coerce.number().nonnegative(),
    isActive: z.boolean(),
});
export const KarigarPage = () => {
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const form = useForm({
        resolver: zodResolver(karigarSchema),
        defaultValues: {
            code: "",
            name: "",
            specialization: "",
            mobile: "",
            goldInHand: 0,
            pendingReturn: 0,
            makingDue: 0,
            isActive: true,
        },
    });
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["inventory-karigars"],
        queryFn: () => inventoryService.listKarigars(),
    });
    const saveMutation = useMutation({
        mutationFn: (payload) => {
            if (editing)
                return inventoryService.updateKarigar(editing.id, payload);
            return inventoryService.createKarigar(payload);
        },
        onSuccess: () => {
            toast.success(editing ? "Karigar updated" : "Karigar created");
            setOpenModal(false);
            setEditing(null);
            form.reset();
            void refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message ?? "Unable to save karigar");
        },
    });
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape")
                setOpenModal(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
    const openCreate = () => {
        setEditing(null);
        form.reset({ code: "", name: "", specialization: "", mobile: "", goldInHand: 0, pendingReturn: 0, makingDue: 0, isActive: true });
        setOpenModal(true);
    };
    const openEdit = (row) => {
        setEditing(row);
        form.reset(row);
        setOpenModal(true);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Karigar Management", subtitle: "Track gold in hand, pending returns, and making dues", actions: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: openCreate, type: "button", children: "Add Karigar" }) }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load karigar records.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsx(DataTable, { columns: [
                    col.accessor("code", { header: "Code" }),
                    col.accessor("name", { header: "Name" }),
                    col.accessor("specialization", { header: "Specialization" }),
                    col.accessor("mobile", { header: "Mobile" }),
                    col.accessor("goldInHand", { header: "Gold in Hand (g)", cell: (info) => _jsx("span", { className: "font-mono", children: info.getValue().toFixed(3) }) }),
                    col.accessor("pendingReturn", { header: "Pending Return" }),
                    col.accessor("makingDue", { header: "Making Due", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("isActive", {
                        header: "Status",
                        cell: (info) => (_jsx("span", { className: `rounded-full px-3 py-1 text-xs ${info.getValue() ? "bg-emerald/10 text-emerald" : "bg-ruby/10 text-ruby"}`, children: info.getValue() ? "Active" : "Inactive" })),
                    }),
                ], data: data, loading: isLoading, onRowClick: (row) => openEdit(row) }), openModal ? (_jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4", onClick: (event) => { if (event.currentTarget === event.target)
                    setOpenModal(false); }, children: _jsxs("form", { className: "w-full max-w-3xl rounded-card bg-card p-6 shadow-modal", onSubmit: form.handleSubmit((values) => saveMutation.mutate(values)), children: [_jsx("h3", { className: "mb-4 font-display text-2xl font-semibold", children: editing ? "Edit Karigar" : "Add Karigar" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Code", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("code") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Name", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("name") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Mobile", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("mobile") })] }), _jsxs("label", { className: "text-xs text-muted md:col-span-2", children: ["Specialization", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("specialization") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Gold in Hand", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.001", ...form.register("goldInHand", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Pending Return", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register("pendingReturn", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Making Due", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("makingDue", { valueAsNumber: true }) })] }), _jsxs("label", { className: "flex items-center gap-2 pt-6 text-xs text-muted", children: [_jsx("input", { type: "checkbox", ...form.register("isActive") }), " Active"] })] }), _jsx("div", { className: "mt-2 text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => setOpenModal(false), type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: saveMutation.isPending, type: "submit", children: saveMutation.isPending ? "Saving..." : "Save" })] })] }) })) : null] }));
};
