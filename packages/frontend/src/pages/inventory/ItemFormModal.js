import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
const itemSchema = z.object({
    sku: z.string().min(2, "SKU is required"),
    name: z.string().min(2, "Item name is required"),
    category: z.string().min(2, "Category is required"),
    subCategory: z.string().min(1, "Sub-category is required"),
    collection: z.string().min(1, "Collection is required"),
    gender: z.enum(["UNISEX", "WOMEN", "MEN", "KIDS"]),
    metalType: z.enum(["GOLD", "SILVER", "PLATINUM"]),
    karat: z.enum(["24K", "22K", "18K", "14K", "SILVER", "PLATINUM"]),
    grossWt: z.coerce.number().nonnegative(),
    netWt: z.coerce.number().nonnegative(),
    stoneWt: z.coerce.number().nonnegative(),
    costPrice: z.coerce.number().nonnegative(),
    minSalePrice: z.coerce.number().nonnegative(),
    mrp: z.coerce.number().nonnegative(),
    stockQty: z.coerce.number().int().nonnegative(),
    stockWt: z.coerce.number().nonnegative(),
    reorderLevel: z.coerce.number().int().nonnegative(),
    isActive: z.boolean(),
});
export const ItemFormModal = ({ open, title, loading = false, initialValues, onClose, onSubmit, }) => {
    const form = useForm({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            sku: "",
            name: "",
            category: "",
            subCategory: "",
            collection: "",
            gender: "UNISEX",
            metalType: "GOLD",
            karat: "22K",
            grossWt: 0,
            netWt: 0,
            stoneWt: 0,
            costPrice: 0,
            minSalePrice: 0,
            mrp: 0,
            stockQty: 0,
            stockWt: 0,
            reorderLevel: 0,
            isActive: true,
        },
    });
    useEffect(() => {
        if (open) {
            form.reset({
                sku: initialValues?.sku ?? "",
                name: initialValues?.name ?? "",
                category: initialValues?.category ?? "",
                subCategory: initialValues?.subCategory ?? "",
                collection: initialValues?.collection ?? "",
                gender: initialValues?.gender ?? "UNISEX",
                metalType: initialValues?.metalType ?? "GOLD",
                karat: initialValues?.karat ?? "22K",
                grossWt: initialValues?.grossWt ?? 0,
                netWt: initialValues?.netWt ?? 0,
                stoneWt: initialValues?.stoneWt ?? 0,
                costPrice: initialValues?.costPrice ?? 0,
                minSalePrice: initialValues?.minSalePrice ?? 0,
                mrp: initialValues?.mrp ?? 0,
                stockQty: initialValues?.stockQty ?? 0,
                stockWt: initialValues?.stockWt ?? 0,
                reorderLevel: initialValues?.reorderLevel ?? 0,
                isActive: initialValues?.isActive ?? true,
            });
        }
    }, [form, initialValues, open]);
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape")
                onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4", onClick: (event) => {
            if (event.currentTarget === event.target)
                onClose();
        }, children: _jsxs("form", { className: "max-h-[90vh] w-full max-w-4xl overflow-auto rounded-card bg-card p-6 shadow-modal", onSubmit: form.handleSubmit(onSubmit), children: [_jsx("h3", { className: "mb-4 font-display text-2xl font-semibold", children: title }), _jsxs("div", { className: "grid gap-3 md:grid-cols-4", children: [_jsxs("label", { className: "text-xs text-muted", children: ["SKU", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("sku") })] }), _jsxs("label", { className: "text-xs text-muted md:col-span-2", children: ["Item Name", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("name") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Category", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("category") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Sub-Category", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("subCategory") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Collection", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("collection") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Gender", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("gender"), children: [_jsx("option", { value: "UNISEX", children: "Unisex" }), _jsx("option", { value: "WOMEN", children: "Women" }), _jsx("option", { value: "MEN", children: "Men" }), _jsx("option", { value: "KIDS", children: "Kids" })] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Metal", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("metalType"), children: [_jsx("option", { value: "GOLD", children: "Gold" }), _jsx("option", { value: "SILVER", children: "Silver" }), _jsx("option", { value: "PLATINUM", children: "Platinum" })] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Karat", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("karat"), children: [_jsx("option", { value: "24K", children: "24K" }), _jsx("option", { value: "22K", children: "22K" }), _jsx("option", { value: "18K", children: "18K" }), _jsx("option", { value: "14K", children: "14K" }), _jsx("option", { value: "SILVER", children: "Silver" }), _jsx("option", { value: "PLATINUM", children: "Platinum" })] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Gross Wt (g)", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.001", ...form.register("grossWt", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Net Wt (g)", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.001", ...form.register("netWt", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Stone Wt (g)", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.001", ...form.register("stoneWt", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Cost Price", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("costPrice", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Min Sale Price", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("minSalePrice", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["MRP", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("mrp", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Stock Qty", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register("stockQty", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Stock Wt (g)", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.001", ...form.register("stockWt", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Reorder Level", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", ...form.register("reorderLevel", { valueAsNumber: true }) })] }), _jsxs("label", { className: "flex items-center gap-2 pt-6 text-xs text-muted", children: [_jsx("input", { type: "checkbox", ...form.register("isActive") }), " Active"] })] }), _jsx("div", { className: "mt-2 text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message }), _jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: onClose, type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: loading, type: "submit", children: loading ? "Saving..." : "Save" })] })] }) }));
};
