import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, X, Package, Wrench, Info, ShoppingCart, BarChart3 } from "lucide-react";
import { productServiceService } from "@/services/productServiceService";
import { accountsService } from "@/services/accountsService";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
const TAX_RATES = [
    { label: "No Tax (0%)", value: 0 },
    { label: "GST 3%", value: 3 },
    { label: "GST 5%", value: 5 },
    { label: "GST 12%", value: 12 },
    { label: "GST 18%", value: 18 },
    { label: "GST 28%", value: 28 },
];
const defaultForm = {
    code: "",
    name: "",
    description: "",
    type: "PRODUCT",
    isTracked: false,
    isSold: true,
    salesDescription: "",
    salesPrice: "",
    salesAccountId: "",
    salesTaxRate: 0,
    isPurchased: true,
    purchaseDescription: "",
    purchasePrice: "",
    purchaseAccountId: "",
    purchaseTaxRate: 0,
    inventoryAssetAccountId: "",
    openingQuantity: "",
    openingValue: "",
    reorderLevel: "",
    unit: "pcs",
    status: "ACTIVE",
};
export const ProductServiceFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const editing = Boolean(id);
    const queryClient = useQueryClient();
    const [form, setForm] = useState(defaultForm);
    const [activeTab, setActiveTab] = useState("sales");
    const [errors, setErrors] = useState({});
    const { data: existing } = useQuery({
        queryKey: ["product-service", id],
        queryFn: () => productServiceService.getById(Number(id)),
        enabled: editing,
    });
    const { data: accounts = [] } = useQuery({
        queryKey: ["accounts-list"],
        queryFn: () => accountsService.list(),
    });
    const accountOptions = accounts.map((a) => ({
        id: String(a.id),
        label: `${a.code} - ${a.name}`,
        type: String(a.type).toLowerCase(),
    }));
    const incomeAccounts = accountOptions.filter((a) => a.type === "income" || a.type === "revenue");
    const expenseAccounts = accountOptions.filter((a) => a.type === "expense" || a.type === "expenses");
    const assetAccounts = accountOptions.filter((a) => a.type === "asset" || a.type === "assets");
    useEffect(() => {
        if (!existing || !editing)
            return;
        setForm({
            code: existing.code,
            name: existing.name,
            description: existing.description ?? "",
            type: existing.type,
            isTracked: existing.isTracked,
            isSold: existing.isSold,
            salesDescription: existing.salesDescription ?? "",
            salesPrice: String(existing.salesPrice),
            salesAccountId: existing.salesAccountId ? String(existing.salesAccountId) : "",
            salesTaxRate: existing.salesTaxRate,
            isPurchased: existing.isPurchased,
            purchaseDescription: existing.purchaseDescription ?? "",
            purchasePrice: String(existing.purchasePrice),
            purchaseAccountId: existing.purchaseAccountId ? String(existing.purchaseAccountId) : "",
            purchaseTaxRate: existing.purchaseTaxRate,
            inventoryAssetAccountId: existing.inventoryAssetAccountId ? String(existing.inventoryAssetAccountId) : "",
            openingQuantity: String(existing.openingQuantity),
            openingValue: String(existing.openingValue),
            reorderLevel: String(existing.reorderLevel),
            unit: existing.unit ?? "pcs",
            status: existing.status,
        });
    }, [existing, editing]);
    const set = (k, v) => {
        setForm((prev) => ({ ...prev, [k]: v }));
        setErrors((prev) => { const n = { ...prev }; delete n[k]; return n; });
    };
    const validate = () => {
        const errs = {};
        if (!form.code.trim())
            errs.code = "Item code is required";
        if (!form.name.trim())
            errs.name = "Item name is required";
        if (form.isSold && form.salesPrice !== "" && isNaN(Number(form.salesPrice)))
            errs.salesPrice = "Enter a valid price";
        return errs;
    };
    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                code: form.code.trim(),
                name: form.name.trim(),
                description: form.description || undefined,
                type: form.type,
                isTracked: form.isTracked && form.type === "PRODUCT",
                isSold: form.isSold,
                salesDescription: form.salesDescription || undefined,
                salesPrice: Number(form.salesPrice) || 0,
                salesAccountId: form.salesAccountId ? Number(form.salesAccountId) : undefined,
                salesTaxRate: form.salesTaxRate,
                isPurchased: form.isPurchased,
                purchaseDescription: form.purchaseDescription || undefined,
                purchasePrice: Number(form.purchasePrice) || 0,
                purchaseAccountId: form.purchaseAccountId ? Number(form.purchaseAccountId) : undefined,
                purchaseTaxRate: form.purchaseTaxRate,
                inventoryAssetAccountId: form.inventoryAssetAccountId ? Number(form.inventoryAssetAccountId) : undefined,
                openingQuantity: Number(form.openingQuantity) || 0,
                openingValue: Number(form.openingValue) || 0,
                reorderLevel: Number(form.reorderLevel) || 0,
                unit: form.unit || "pcs",
                status: form.status,
            };
            return editing
                ? productServiceService.update(Number(id), payload)
                : productServiceService.create(payload);
        },
        onSuccess: (result) => {
            toast.success(editing ? "Item updated" : "Item created");
            queryClient.invalidateQueries({ queryKey: ["product-services"] });
            navigate(`/products/${result.id}`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || "Unable to save item");
        },
    });
    const handleSubmit = () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            toast.error("Please fix the errors before saving");
            return;
        }
        saveMutation.mutate();
    };
    const TABS = [
        { key: "sales", label: "Sales Information", icon: ShoppingCart },
        { key: "purchases", label: "Purchase Information", icon: Package },
        ...(form.type === "PRODUCT" && form.isTracked
            ? [{ key: "inventory", label: "Inventory Tracking", icon: BarChart3 }]
            : []),
    ];
    return (_jsxs("div", { className: "space-y-5", children: [_jsx(PageHeader, { title: editing ? "Edit Item" : "New Product / Service", subtitle: editing ? `Editing: ${existing?.name ?? "..."}` : "Add a product or service to use in your transactions", actions: _jsxs(_Fragment, { children: [_jsxs(Button, { variant: "outline", onClick: () => navigate(editing ? `/products/${id}` : "/products"), type: "button", children: [_jsx(X, { className: "mr-2 h-4 w-4" }), " Cancel"] }), _jsxs(Button, { onClick: handleSubmit, loading: saveMutation.isPending, type: "button", children: [_jsx(Save, { className: "mr-2 h-4 w-4" }), " ", editing ? "Update Item" : "Save Item"] })] }) }), _jsxs("div", { className: "rounded-xl border-t-2 border-t-gold bg-card p-6 shadow-card", children: [_jsx("h2", { className: "mb-4 font-display text-base font-semibold text-charcoal", children: "Basic Information" }), _jsxs("div", { className: "grid gap-5 md:grid-cols-2", children: [_jsx(Input, { label: "Item Code / SKU", required: true, placeholder: "e.g. RING-22K-001", value: form.code, onChange: (e) => set("code", e.target.value), error: errors.code }), _jsx(Input, { label: "Item Name", required: true, placeholder: "e.g. 22K Gold Ring", value: form.name, onChange: (e) => set("name", e.target.value), error: errors.name }), _jsx(TextArea, { label: "Description", containerClassName: "md:col-span-2", placeholder: "Brief description of the item...", value: form.description, onChange: (e) => set("description", e.target.value) })] }), _jsxs("div", { className: "mt-5", children: [_jsxs("p", { className: "mb-2 text-xs font-medium text-muted", children: ["Item Type ", _jsx("span", { className: "text-ruby", children: "*" })] }), _jsx("div", { className: "flex gap-3", children: [
                                    { v: "PRODUCT", label: "Product", icon: Package, desc: "Physical goods — jewellery, metals, gemstones" },
                                    { v: "SERVICE", label: "Service", icon: Wrench, desc: "Non-physical — making charges, repair, design fees" },
                                ].map(({ v, label, icon: Icon, desc }) => (_jsxs("button", { type: "button", className: `flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${form.type === v
                                        ? "border-gold bg-gold-tint"
                                        : "border-border bg-canvas hover:border-gold/50"}`, onClick: () => { set("type", v); if (v === "SERVICE")
                                        set("isTracked", false); }, children: [_jsx(Icon, { className: `h-6 w-6 ${form.type === v ? "text-gold" : "text-muted"}` }), _jsxs("div", { children: [_jsx("p", { className: `font-semibold ${form.type === v ? "text-charcoal" : "text-muted"}`, children: label }), _jsx("p", { className: "text-xs text-muted", children: desc })] })] }, v))) })] }), form.type === "PRODUCT" && (_jsxs("label", { className: "mt-5 flex items-center gap-3 cursor-pointer group", children: [_jsx("input", { type: "checkbox", className: "h-4 w-4 rounded border-border accent-gold", checked: form.isTracked, onChange: (e) => set("isTracked", e.target.checked) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-charcoal group-hover:text-gold transition-colors", children: "Track inventory for this item" }), _jsx("p", { className: "text-xs text-muted", children: "Maintain quantity on hand. Sales will reduce stock; purchases will increase it." })] })] }))] }), _jsxs("div", { className: "rounded-xl border border-border bg-card shadow-card", children: [_jsx("div", { className: "flex border-b border-border", children: TABS.map(({ key, label, icon: Icon }) => (_jsxs("button", { type: "button", className: `flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all -mb-[1px] ${activeTab === key
                                ? "border-gold text-gold bg-gold-tint/30"
                                : "border-transparent text-muted hover:text-charcoal hover:border-border"}`, onClick: () => setActiveTab(key), children: [_jsx(Icon, { className: "h-4 w-4" }), label] }, key))) }), _jsxs("div", { className: "p-6", children: [activeTab === "sales" && (_jsxs("div", { className: "space-y-5", children: [_jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", className: "h-4 w-4 rounded border-border accent-gold", checked: form.isSold, onChange: (e) => set("isSold", e.target.checked) }), _jsx("span", { className: "text-sm font-medium text-charcoal", children: "I sell this item" })] }), form.isSold && (_jsxs("div", { className: "grid gap-5 md:grid-cols-2", children: [_jsx(TextArea, { label: "Sales Description", containerClassName: "md:col-span-2", placeholder: "Description shown on invoices/quotes...", value: form.salesDescription, onChange: (e) => set("salesDescription", e.target.value) }), _jsx(Input, { label: "Sales Price (\u20B9)", type: "number", placeholder: "0.00", value: form.salesPrice, onChange: (e) => set("salesPrice", e.target.value), error: errors.salesPrice }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-muted", children: "Sales Account" }), _jsxs("select", { className: "h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none", value: form.salesAccountId, onChange: (e) => set("salesAccountId", e.target.value), children: [_jsx("option", { value: "", children: "Select account..." }), incomeAccounts.map((a) => (_jsx("option", { value: a.id, children: a.label }, a.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-muted", children: "Sales Tax Rate" }), _jsx("select", { className: "h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none", value: form.salesTaxRate, onChange: (e) => set("salesTaxRate", Number(e.target.value)), children: TAX_RATES.map((t) => (_jsx("option", { value: t.value, children: t.label }, t.value))) })] })] }))] })), activeTab === "purchases" && (_jsxs("div", { className: "space-y-5", children: [_jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", className: "h-4 w-4 rounded border-border accent-gold", checked: form.isPurchased, onChange: (e) => set("isPurchased", e.target.checked) }), _jsx("span", { className: "text-sm font-medium text-charcoal", children: "I purchase this item" })] }), form.isPurchased && (_jsxs("div", { className: "grid gap-5 md:grid-cols-2", children: [_jsx(TextArea, { label: "Purchase Description", containerClassName: "md:col-span-2", placeholder: "Description shown on purchase orders/bills...", value: form.purchaseDescription, onChange: (e) => set("purchaseDescription", e.target.value) }), _jsx(Input, { label: "Cost Price / Purchase Price (\u20B9)", type: "number", placeholder: "0.00", value: form.purchasePrice, onChange: (e) => set("purchasePrice", e.target.value) }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-muted", children: "Purchase / COGS Account" }), _jsxs("select", { className: "h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none", value: form.purchaseAccountId, onChange: (e) => set("purchaseAccountId", e.target.value), children: [_jsx("option", { value: "", children: "Select account..." }), expenseAccounts.map((a) => (_jsx("option", { value: a.id, children: a.label }, a.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-muted", children: "Purchase Tax Rate" }), _jsx("select", { className: "h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none", value: form.purchaseTaxRate, onChange: (e) => set("purchaseTaxRate", Number(e.target.value)), children: TAX_RATES.map((t) => (_jsx("option", { value: t.value, children: t.label }, t.value))) })] })] }))] })), activeTab === "inventory" && form.isTracked && form.type === "PRODUCT" && (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3", children: [_jsx(Info, { className: "h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" }), _jsx("p", { className: "text-xs text-blue-700", children: "Opening quantity creates an initial stock balance entry. Subsequent purchases and sales will automatically track quantity on hand." })] }), _jsxs("div", { className: "grid gap-5 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-muted", children: "Inventory Asset Account" }), _jsxs("select", { className: "h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none", value: form.inventoryAssetAccountId, onChange: (e) => set("inventoryAssetAccountId", e.target.value), children: [_jsx("option", { value: "", children: "Select asset account..." }), assetAccounts.map((a) => (_jsx("option", { value: a.id, children: a.label }, a.id)))] })] }), _jsx(Input, { label: "Unit of Measurement", placeholder: "e.g. pcs, g, kg, set", value: form.unit, onChange: (e) => set("unit", e.target.value) }), _jsx(Input, { label: "Opening Quantity", type: "number", placeholder: "0", value: form.openingQuantity, onChange: (e) => set("openingQuantity", e.target.value) }), _jsx(Input, { label: "Opening Value (\u20B9)", type: "number", placeholder: "0.00", value: form.openingValue, onChange: (e) => set("openingValue", e.target.value) }), _jsx(Input, { label: "Reorder Level", type: "number", placeholder: "Alert when qty falls below this", value: form.reorderLevel, onChange: (e) => set("reorderLevel", e.target.value) })] })] }))] })] }), _jsx("div", { className: "rounded-xl border border-border bg-card p-5 shadow-sm", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-charcoal", children: "Item Status" }), _jsx("p", { className: "text-xs text-muted", children: "Archived items are hidden from selection in new transactions" })] }), _jsxs("select", { className: "h-10 rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none", value: form.status, onChange: (e) => set("status", e.target.value), children: [_jsx("option", { value: "ACTIVE", children: "Active" }), _jsx("option", { value: "ARCHIVED", children: "Archived" })] })] }) })] }));
};
