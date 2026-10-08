import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { inventoryService } from "@/services/inventoryService";
import { z } from "zod";
const lineSchema = z.object({
    itemId: z.coerce.number(),
    currentQty: z.coerce.number(),
    currentWt: z.coerce.number(),
    adjustedQty: z.coerce.number(),
    adjustedWt: z.coerce.number(),
    diffQty: z.coerce.number(),
    diffWt: z.coerce.number(),
    oldRate: z.coerce.number(),
    newRate: z.coerce.number(),
    valueImpact: z.coerce.number(),
    accountId: z.coerce.number(),
});
const adjustmentSchema = z.object({
    date: z.string().min(1),
    type: z.string().min(3),
    reason: z.string().min(3),
    lines: z.array(lineSchema).min(1, "At least one line is required"),
});
const types = [
    "Physical Count Variance",
    "Gold Melting Loss (Karigar)",
    "Metal Purity Adjustment",
    "Old Gold Purchase Entry",
    "Gold Bar to Jewellery Conversion",
    "Jewellery to Scrap Conversion",
    "Stone Setting Loss",
    "Theft / Breakage Write-off",
    "Display Sample Transfer",
    "Inter-Branch Transfer",
    "Rate Revaluation (Mark-to-Market)",
    "Opening Stock Entry",
    "Hallmarking Conversion",
];
export const AdjustmentFormPage = () => {
    const navigate = useNavigate();
    const [revaluation, setRevaluation] = useState({ previousRate22k: 5800, newRate22k: 5842 });
    const { data: items = [] } = useQuery({
        queryKey: ["inventory-items-adjustment"],
        queryFn: () => inventoryService.listItems({ inStock: "" }),
    });
    const form = useForm({
        resolver: zodResolver(adjustmentSchema),
        defaultValues: {
            date: new Date().toISOString().slice(0, 10),
            type: "Physical Count Variance",
            reason: "",
            lines: [
                {
                    itemId: "",
                    currentQty: 0,
                    currentWt: 0,
                    adjustedQty: 0,
                    adjustedWt: 0,
                    diffQty: 0,
                    diffWt: 0,
                    oldRate: 0,
                    newRate: 0,
                    valueImpact: 0,
                    accountId: 5005,
                },
            ],
        },
    });
    const lineArray = useFieldArray({ control: form.control, name: "lines" });
    const createMutation = useMutation({
        mutationFn: async (payload) => {
            const result = await inventoryService.createAdjustment(payload);
            if (payload.type === "Rate Revaluation (Mark-to-Market)") {
                await inventoryService.createRevaluation({
                    date: payload.date,
                    reason: payload.reason,
                    previousRate22k: revaluation.previousRate22k,
                    newRate22k: revaluation.newRate22k,
                });
            }
            return result;
        },
        onSuccess: () => {
            toast.success("Adjustment draft created");
            navigate("/inventory/adjust");
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message ?? "Unable to create adjustment");
        },
    });
    const watchType = form.watch("type");
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Inventory Adjustment Form", subtitle: "Create draft and route through approval workflow" }), _jsxs("form", { className: "space-y-4", onSubmit: form.handleSubmit((values) => createMutation.mutate(values)), children: [_jsxs("div", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-3", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Date", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", ...form.register("date") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Adjustment Type", _jsx("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("type"), children: types.map((type) => _jsx("option", { value: type, children: type }, type)) })] }), _jsxs("label", { className: "text-xs text-muted md:col-span-3", children: ["Reason", _jsx("textarea", { className: "mt-1 min-h-[84px] w-full rounded border border-border px-3 py-2 text-sm", ...form.register("reason") })] })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-xl font-semibold", children: "Adjustment Lines" }), _jsx("button", { className: "rounded border border-border px-3 py-1 text-sm", onClick: () => lineArray.append({
                                            itemId: "",
                                            currentQty: 0,
                                            currentWt: 0,
                                            adjustedQty: 0,
                                            adjustedWt: 0,
                                            diffQty: 0,
                                            diffWt: 0,
                                            oldRate: 0,
                                            newRate: 0,
                                            valueImpact: 0,
                                            accountId: 5005,
                                        }), type: "button", children: "+ Add Line" })] }), _jsx("div", { className: "space-y-3", children: lineArray.fields.map((line, index) => (_jsxs("div", { className: "grid gap-2 rounded border border-border p-3 md:grid-cols-6", children: [_jsxs("label", { className: "text-xs text-muted md:col-span-2", children: ["Item", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register(`lines.${index}.itemId`), onChange: (event) => {
                                                        const item = items.find((row) => row.id === event.target.value);
                                                        form.setValue(`lines.${index}.itemId`, event.target.value);
                                                        form.setValue(`lines.${index}.currentQty`, item?.stockQty ?? 0);
                                                        form.setValue(`lines.${index}.currentWt`, item?.stockWt ?? 0);
                                                        form.setValue(`lines.${index}.oldRate`, item?.costPrice ?? 0);
                                                    }, children: [_jsx("option", { value: "", children: "Select item" }), items.map((item) => (_jsxs("option", { value: item.id, children: [item.sku, " - ", item.name] }, item.id)))] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Current Qty", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register(`lines.${index}.currentQty`, { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Adjusted Qty", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register(`lines.${index}.adjustedQty`, { valueAsNumber: true }), onChange: (e) => {
                                                        const adjustedQty = Number(e.target.value);
                                                        form.setValue(`lines.${index}.adjustedQty`, adjustedQty);
                                                        const currentQty = form.getValues(`lines.${index}.currentQty`);
                                                        form.setValue(`lines.${index}.diffQty`, adjustedQty - currentQty);
                                                    } })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Current Wt", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.001", ...form.register(`lines.${index}.currentWt`, { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Adjusted Wt", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.001", ...form.register(`lines.${index}.adjustedWt`, { valueAsNumber: true }), onChange: (e) => {
                                                        const adjustedWt = Number(e.target.value);
                                                        form.setValue(`lines.${index}.adjustedWt`, adjustedWt);
                                                        const currentWt = form.getValues(`lines.${index}.currentWt`);
                                                        const diffWt = adjustedWt - currentWt;
                                                        form.setValue(`lines.${index}.diffWt`, Number(diffWt.toFixed(3)));
                                                        const oldRate = form.getValues(`lines.${index}.oldRate`);
                                                        const newRate = form.getValues(`lines.${index}.newRate`) || oldRate;
                                                        form.setValue(`lines.${index}.valueImpact`, Number((diffWt * (newRate || oldRate)).toFixed(2)));
                                                    } })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Old Rate", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register(`lines.${index}.oldRate`, { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["New Rate", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register(`lines.${index}.newRate`, { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Value Impact", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register(`lines.${index}.valueImpact`, { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Account Head", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register(`lines.${index}.accountId`) })] }), _jsx("button", { className: "rounded border border-ruby/30 px-3 py-1 text-xs text-ruby", onClick: () => lineArray.remove(index), type: "button", children: "Remove" })] }, line.id))) })] }), watchType === "Rate Revaluation (Mark-to-Market)" ? (_jsxs("div", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-2", children: [_jsx("h3", { className: "md:col-span-2 font-display text-xl font-semibold", children: "Rate Revaluation" }), _jsxs("label", { className: "text-xs text-muted", children: ["Previous 22K Rate", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", value: revaluation.previousRate22k, onChange: (event) => setRevaluation((prev) => ({ ...prev, previousRate22k: Number(event.target.value) })) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["New 22K Rate", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", value: revaluation.newRate22k, onChange: (event) => setRevaluation((prev) => ({ ...prev, newRate22k: Number(event.target.value) })) })] })] })) : null, _jsx("div", { className: "text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => navigate("/inventory/adjust"), type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: createMutation.isPending, type: "submit", children: createMutation.isPending ? "Saving..." : "Save Draft" })] })] })] }));
};
