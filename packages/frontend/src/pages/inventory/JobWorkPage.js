import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { inventoryService } from "@/services/inventoryService";
const col = createColumnHelper();
const jwoSchema = z.object({
    karigarId: z.coerce.number(),
    issueDate: z.string().min(1),
    expectedDate: z.string().min(1),
    description: z.string().min(3),
    goldIssuedG: z.coerce.number().positive(),
    allowedLossPct: z.coerce.number().min(0).max(100),
    makingCharges: z.coerce.number().nonnegative(),
});
export const JobWorkPage = () => {
    const [filters, setFilters] = useState({ karigarId: "", status: "" });
    const [openIssue, setOpenIssue] = useState(false);
    const [returnTarget, setReturnTarget] = useState(null);
    const [returnWeight, setReturnWeight] = useState(0);
    const form = useForm({
        resolver: zodResolver(jwoSchema),
        defaultValues: {
            karigarId: "",
            issueDate: new Date().toISOString().slice(0, 10),
            expectedDate: new Date().toISOString().slice(0, 10),
            description: "",
            goldIssuedG: 0,
            allowedLossPct: 1,
            makingCharges: 0,
        },
    });
    const { data: karigars = [] } = useQuery({ queryKey: ["inventory-karigars-lite"], queryFn: () => inventoryService.listKarigars() });
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["inventory-job-work", filters],
        queryFn: () => inventoryService.listJobWorkOrders(filters),
    });
    const createMutation = useMutation({
        mutationFn: (payload) => inventoryService.createJobWorkOrder(payload),
        onSuccess: () => {
            toast.success("JWO created");
            setOpenIssue(false);
            form.reset();
            void refetch();
        },
        onError: (error) => toast.error(error.response?.data?.error?.message ?? "Unable to create JWO"),
    });
    const returnMutation = useMutation({
        mutationFn: ({ id, goldReturnedG }) => inventoryService.returnJobWork(id, { goldReturnedG }),
        onSuccess: () => {
            toast.success("Return recorded");
            setReturnTarget(null);
            setReturnWeight(0);
            void refetch();
        },
        onError: (error) => toast.error(error.response?.data?.error?.message ?? "Unable to record return"),
    });
    const billMutation = useMutation({
        mutationFn: (id) => inventoryService.createJobWorkBill(id),
        onSuccess: (dataRes) => toast.success(`Making bill generated: ${dataRes.billNo}`),
        onError: () => toast.error("Unable to generate bill"),
    });
    const karigarOptions = karigars.map((k) => ({
        value: k.id,
        label: k.name,
        meta: k.code,
    }));
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Job Work", subtitle: "Issue gold, record returns, and bill making charges", actions: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => setOpenIssue(true), type: "button", children: "Issue Gold (Create JWO)" }) }), _jsx(FilterBar, { filters: [
                    { key: "karigarId", type: "select", label: "Karigar", options: karigars.map((k) => ({ label: k.name, value: k.id })) },
                    {
                        key: "status",
                        type: "select",
                        label: "Status",
                        options: [
                            { label: "Issued", value: "ISSUED" },
                            { label: "Partially Returned", value: "PARTIALLY_RETURNED" },
                            { label: "Completed", value: "COMPLETED" },
                            { label: "Overdue", value: "OVERDUE" },
                        ],
                    },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({ karigarId: "", status: "" }) }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load job work orders.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsx(DataTable, { columns: [
                    col.accessor("jwoNo", { header: "JWO No" }),
                    col.accessor("karigarName", { header: "Karigar" }),
                    col.accessor("issueDate", { header: "Issue Date" }),
                    col.accessor("expectedDate", { header: "Expected" }),
                    col.accessor("goldIssuedG", { header: "Issued (g)", cell: (info) => _jsx("span", { className: "font-mono", children: info.getValue().toFixed(3) }) }),
                    col.accessor("goldReturnedG", { header: "Returned (g)", cell: (info) => _jsx("span", { className: "font-mono", children: info.getValue().toFixed(3) }) }),
                    col.accessor("makingCharges", { header: "Making Charges", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("status", {
                        header: "Status",
                        cell: (info) => {
                            const status = info.getValue();
                            const cls = status === "COMPLETED" ? "bg-emerald/10 text-emerald" : status === "PARTIALLY_RETURNED" ? "bg-gold/10 text-gold" : status === "OVERDUE" ? "bg-ruby/10 text-ruby" : "bg-sapphire/10 text-sapphire";
                            return _jsx("span", { className: `rounded-full px-3 py-1 text-xs ${cls}`, children: status });
                        },
                    }),
                    col.display({
                        id: "actions",
                        header: "Actions",
                        cell: ({ row }) => (_jsxs("div", { className: "flex gap-1", children: [_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => { setReturnTarget(row.original); setReturnWeight(Math.max(0, row.original.goldIssuedG - row.original.goldReturnedG)); }, type: "button", children: "Return" }), _jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => billMutation.mutate(row.original.id), type: "button", children: "Create Bill" })] })),
                    }),
                ], data: data, loading: isLoading }), openIssue ? (_jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4", onClick: (event) => { if (event.currentTarget === event.target)
                    setOpenIssue(false); }, children: _jsxs("form", { className: "w-full max-w-3xl rounded-card bg-card p-6 shadow-modal", onSubmit: form.handleSubmit((values) => createMutation.mutate(values)), children: [_jsx("h3", { className: "mb-4 font-display text-2xl font-semibold", children: "Issue Gold to Karigar" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("div", { className: "md:col-span-1", children: [_jsx("p", { className: "mb-1 text-xs text-muted", children: "Karigar" }), _jsx(SearchableSelect, { onChange: (val) => form.setValue("karigarId", val), options: karigarOptions, value: form.watch("karigarId") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Issue Date", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", ...form.register("issueDate") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Expected Date", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", ...form.register("expectedDate") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Gold Issued (g)", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.001", ...form.register("goldIssuedG", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Allowed Loss %", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("allowedLossPct", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Making Charges", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("makingCharges", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted md:col-span-3", children: ["Description", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("description") })] })] }), _jsx("div", { className: "mt-2 text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => setOpenIssue(false), type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: createMutation.isPending, type: "submit", children: createMutation.isPending ? "Saving..." : "Create JWO" })] })] }) })) : null, returnTarget ? (_jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4", onClick: (event) => { if (event.currentTarget === event.target)
                    setReturnTarget(null); }, children: _jsxs("div", { className: "w-full max-w-md rounded-card bg-card p-6 shadow-modal", children: [_jsx("h3", { className: "mb-3 font-display text-2xl font-semibold", children: "Return Gold" }), _jsxs("p", { className: "text-sm text-muted", children: [returnTarget.jwoNo, " - ", returnTarget.karigarName] }), _jsxs("p", { className: "text-sm text-muted", children: ["Outstanding: ", (returnTarget.goldIssuedG - returnTarget.goldReturnedG).toFixed(3), "g"] }), _jsxs("label", { className: "mt-3 block text-xs text-muted", children: ["Returned Weight (g)", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.001", value: returnWeight, onChange: (event) => setReturnWeight(Number(event.target.value)) })] }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => setReturnTarget(null), type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: returnMutation.isPending, onClick: () => returnMutation.mutate({ id: returnTarget.id, goldReturnedG: returnWeight }), type: "button", children: returnMutation.isPending ? "Saving..." : "Record Return" })] })] }) })) : null] }));
};
