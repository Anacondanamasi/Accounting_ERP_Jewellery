import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceFormSchema } from "@jewelledger/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, Tag, Trash2, Save, Send } from "lucide-react";
import { QuickCustomerModal } from "@/components/shared/QuickCustomerModal";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { invoiceService } from "@/services/invoiceService";
import { customerService } from "@/services/customerService";
import { inventoryService } from "@/services/inventoryService";
import { useInvoiceCalc } from "@/hooks/useInvoiceCalc";
import { useProductServiceLookup } from "@/hooks/useProductServiceLookup";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
const defaultLine = {
    sku: "",
    description: "",
    karat: "22K",
    grossWt: 0,
    netWt: 0,
    stoneWt: 0,
    makingType: "PER_GRAM",
    makingRate: 0,
    ratePerGram: 0,
    discountPct: 0,
    gstPct: 3,
    hsnCode: "7113",
    huid: "",
};
export const InvoiceFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const editing = Boolean(id);
    const [rates, setRates] = useState(null);
    // Track which line has an active P&S product selected (for UI highlight)
    const [lineProductMap, setLineProductMap] = useState({});
    const queryClient = useQueryClient();
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [customerModalInitialName, setCustomerModalInitialName] = useState("");
    const { register, control, handleSubmit, setValue, clearErrors, watch, reset, formState: { errors, isSubmitting }, } = useForm({
        resolver: zodResolver(invoiceFormSchema),
        mode: "onChange",
        defaultValues: {
            invoiceDate: new Date().toISOString().slice(0, 10),
            dueDate: new Date().toISOString().slice(0, 10),
            customerId: 0,
            salespersonId: null,
            placeOfSupply: "Gujarat",
            notes: "",
            terms: "",
            lines: [defaultLine],
        },
    });
    const { fields, append, remove } = useFieldArray({
        control,
        name: "lines",
    });
    const lineValues = useWatch({
        control,
        name: "lines",
    });
    const totals = useInvoiceCalc(lineValues || []);
    const { data: customers = [] } = useQuery({
        queryKey: ["customers-list"],
        queryFn: () => customerService.list(),
    });
    const { data: items = [] } = useQuery({
        queryKey: ["items-list"],
        queryFn: () => inventoryService.listItems(),
    });
    // Products & Services master lookup for line item auto-fill
    const { productOptions, buildAutofill, searchProducts } = useProductServiceLookup("sales");
    const { data: nextNo } = useQuery({
        queryKey: ["invoice-next-number"],
        queryFn: invoiceService.getNextNumber,
    });
    const { data: existing } = useQuery({
        queryKey: ["invoice", id],
        queryFn: () => invoiceService.getById(Number(id)),
        enabled: editing,
    });
    useEffect(() => {
        inventoryService.getTodayRates().then(setRates).catch(() => { });
    }, []);
    const customerOptions = customers.map((c) => ({
        value: c.id,
        label: c.name,
        meta: c.gstin ? `GST: ${c.gstin}` : c.mobile,
    }));
    const itemOptions = items.map((i) => ({
        value: i.sku,
        label: `${i.sku} - ${i.name}`,
        meta: `${i.karat} | ${i.netWt}g`,
    }));
    const saveMutation = useMutation({
        mutationFn: async (payload) => editing ? invoiceService.update(Number(id), payload) : invoiceService.create(payload),
        onSuccess: (record) => {
            toast.success(editing ? "Invoice updated" : "Invoice created");
            navigate(`/invoices/${record.id}`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Unable to save invoice");
        },
    });
    const openInvoicePdf = async (invoiceId, print = false) => {
        try {
            const blob = await invoiceService.getPdf(invoiceId);
            const url = URL.createObjectURL(blob);
            const opened = window.open(url, "_blank");
            if (!opened) {
                const link = document.createElement("a");
                link.href = url;
                link.download = `invoice-${invoiceId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                return;
            }
            if (print && opened) {
                opened.addEventListener("load", () => {
                    opened.print();
                });
            }
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
        catch (error) {
            console.error("PDF generation error:", error);
            toast.error("Failed to generate PDF. Please try again.");
        }
    };
    const saveAndPdfMutation = useMutation({
        mutationFn: async (payload) => {
            const record = editing ? await invoiceService.update(Number(id), payload) : await invoiceService.create(payload);
            return record;
        },
        onSuccess: async (record) => {
            toast.success("Invoice saved");
            try {
                await openInvoicePdf(record.id, true);
            }
            catch {
                toast.error("Saved, but unable to open PDF");
            }
            navigate(`/invoices/${record.id}`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Unable to save invoice");
        },
    });
    const saveAndPostMutation = useMutation({
        mutationFn: async (payload) => {
            const record = editing ? await invoiceService.update(Number(id), payload) : await invoiceService.create(payload);
            return invoiceService.post(record.id);
        },
        onSuccess: (record) => {
            toast.success("Invoice posted successfully");
            navigate(`/invoices/${record.id}`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Unable to post invoice");
        },
    });
    useEffect(() => {
        if (!existing || !editing)
            return;
        reset({
            invoiceDate: existing.invoiceDate,
            dueDate: existing.dueDate,
            customerId: existing.customerId,
            salespersonId: existing.salespersonId ?? null,
            placeOfSupply: "Gujarat",
            notes: existing.notes ?? "",
            terms: existing.terms ?? "",
            lines: existing.lines,
        });
    }, [editing, existing, reset]);
    const onSelectSKU = (index, sku, item) => {
        const selectedItem = item || items.find((i) => i.sku === sku);
        if (selectedItem) {
            const line = watch(`lines.${index}`);
            setValue(`lines.${index}`, {
                ...line,
                sku: String(selectedItem.sku),
                description: selectedItem.name,
                karat: selectedItem.karat,
                grossWt: Number(selectedItem.grossWt),
                netWt: Number(selectedItem.netWt),
                stoneWt: Number(selectedItem.stoneWt),
                makingType: selectedItem.makingType,
                makingRate: Number(selectedItem.makingRate),
                ratePerGram: rates ? (selectedItem.karat === "22K" ? rates.karat22 : rates.karat18) : 0,
            });
        }
    };
    /**
     * Auto-fill a line item from the Products & Services master.
     * Populates: description, gstPct (from salesTaxRate), ratePerGram (as reference price).
     * The jewellery-specific fields (weight, karat, making) are left for manual entry.
     */
    const onSelectProductService = (index, productId, payload) => {
        if (!payload)
            return;
        const autofill = buildAutofill(payload);
        const line = watch(`lines.${index}`);
        setValue(`lines.${index}`, {
            ...line,
            description: autofill.description,
            gstPct: autofill.gstPct,
            hsnCode: autofill.hsnCode || "7113",
            // Only set ratePerGram if this is a service item (no weight) or user hasn't set it
            ...(payload.type === "SERVICE" || line.ratePerGram === 0
                ? { ratePerGram: autofill.ratePerGram }
                : {}),
        }, { shouldValidate: true });
        // Track which P&S item is selected for this line (store ID string for SearchableSelect value)
        setLineProductMap((prev) => ({ ...prev, [index]: String(payload.id) }));
        toast.success(`Auto-filled from "${autofill._productName}"`, { duration: 1500 });
    };
    const onInvalid = (formErrors) => {
        console.error("Form Errors:", formErrors);
        const errorCount = Object.keys(formErrors).length;
        if (errorCount > 0) {
            toast.error(`Please correct ${errorCount} errors in the form.`);
            // Scroll to first error
            const firstErrorKey = Object.keys(formErrors)[0];
            const element = document.getElementsByName(firstErrorKey)[0];
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                element.focus();
            }
        }
    };
    const onSubmit = handleSubmit(async (values) => {
        await saveMutation.mutateAsync(values);
    }, onInvalid);
    const onSaveAndPost = handleSubmit(async (values) => {
        await saveAndPostMutation.mutateAsync(values);
    }, onInvalid);
    const onSaveAndPdf = handleSubmit(async (values) => {
        await saveAndPdfMutation.mutateAsync(values);
    }, onInvalid);
    const onPrintCurrent = async () => {
        if (!id)
            return;
        await openInvoicePdf(Number(id), true);
    };
    const busy = saveMutation.isPending || saveAndPostMutation.isPending || saveAndPdfMutation.isPending || isSubmitting;
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: editing ? "Edit Invoice" : "New Sales Invoice", subtitle: `Invoice No: ${existing?.invoiceNo ?? nextNo?.invoiceNo ?? "..."}`, actions: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", onClick: () => navigate("/invoices"), type: "button", children: "Cancel" }), _jsxs(Button, { variant: "outline", loading: busy, onClick: () => onSubmit(), type: "button", children: [_jsx(Save, { className: "mr-2 h-4 w-4" }), "Save Draft"] }), editing ? (_jsxs(Button, { variant: "outline", onClick: () => void onPrintCurrent(), type: "button", children: [_jsx(Printer, { className: "mr-2 h-4 w-4" }), "Print PDF"] })) : (_jsxs(Button, { variant: "outline", loading: busy, onClick: () => onSaveAndPdf(), type: "button", children: [_jsx(Printer, { className: "mr-2 h-4 w-4" }), "Save & Print PDF"] })), _jsxs(Button, { loading: busy, onClick: () => onSaveAndPost(), type: "button", children: [_jsx(Send, { className: "mr-2 h-4 w-4" }), "Save & Post"] })] }) }), _jsxs("form", { className: "space-y-4", onSubmit: onSubmit, noValidate: true, children: [_jsxs("div", { className: "grid gap-6 rounded-card border-t-2 border-t-gold bg-card p-8 shadow-card md:grid-cols-4", children: [_jsx(Input, { label: "Invoice Date", type: "date", required: true, error: errors.invoiceDate?.message, ...register("invoiceDate") }), _jsx(Input, { label: "Due Date", type: "date", required: true, error: errors.dueDate?.message, ...register("dueDate") }), _jsxs("div", { className: "md:col-span-2", children: [_jsxs("p", { className: "mb-1 text-xs font-medium text-muted", children: ["Customer ", _jsx("span", { className: "ml-1 text-ruby font-bold", children: "*" })] }), _jsx("input", { type: "hidden", ...register("customerId", { valueAsNumber: true }) }), _jsx(SearchableSelect, { loadOptions: async (query) => {
                                            const data = await customerService.list({ search: query });
                                            return data.map((c) => ({
                                                value: String(c.id),
                                                label: c.name,
                                                meta: c.gstin ? `GST: ${c.gstin}` : c.mobile,
                                            }));
                                        }, onChange: (value) => {
                                            setValue("customerId", Number(value), { shouldValidate: true });
                                            clearErrors("customerId");
                                        }, options: customerOptions.map(o => ({ ...o, value: String(o.value) })), value: String(watch("customerId") || ""), placeholder: "Select or search customer...", onAddNew: (query) => {
                                            setCustomerModalInitialName(query);
                                            setIsCustomerModalOpen(true);
                                        }, addNewLabel: "Create customer" }), errors.customerId && (_jsx("p", { className: "mt-1 text-xs text-ruby animate-in fade-in slide-in-from-top-1", children: "Please select a valid customer" }))] }), _jsx(Input, { label: "Place of Supply", required: true, error: errors.placeOfSupply?.message, ...register("placeOfSupply") }), _jsx(TextArea, { label: "Internal Notes", containerClassName: "md:col-span-3", placeholder: "Add any internal notes here...", ...register("notes") })] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold bg-card p-6 shadow-card", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between px-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display text-2xl font-semibold text-charcoal", children: "Line Items" }), _jsx("p", { className: "text-xs text-muted", children: "Add products or services to this invoice" })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => append({ ...defaultLine }), type: "button", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " Add Row"] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-2 px-3 pb-2 text-[10px] font-bold text-muted md:grid-cols-12 uppercase tracking-widest border-b border-border", children: [_jsx("div", { className: "md:col-span-2", children: "Product / SKU" }), _jsx("div", { className: "md:col-span-1", children: "Karat" }), _jsx("div", { className: "md:col-span-1 text-right", children: "Gross (g)" }), _jsx("div", { className: "md:col-span-1 text-right", children: "Net (g)" }), _jsx("div", { className: "md:col-span-2 text-right", children: "Rate / g" }), _jsx("div", { className: "md:col-span-1 text-right", children: "Making" }), _jsx("div", { className: "md:col-span-1 text-right", children: "Disc%" }), _jsx("div", { className: "md:col-span-1 text-right", children: "GST%" }), _jsx("div", { className: "md:col-span-1 text-right pr-4", children: "Total" }), _jsx("div", { className: "md:col-span-1 text-center" })] }), fields.map((field, index) => (_jsxs("div", { className: "group grid gap-3 rounded-lg border border-border p-3 md:grid-cols-12 items-start transition-colors hover:border-gold/30 hover:bg-gold-tint/10", children: [_jsxs("div", { className: "md:col-span-2 space-y-2", children: [_jsx("input", { type: "hidden", ...register(`lines.${index}.sku`) }), _jsx("input", { type: "hidden", ...register(`lines.${index}.stoneWt`, { valueAsNumber: true }) }), _jsx("input", { type: "hidden", ...register(`lines.${index}.makingType`) }), _jsx("input", { type: "hidden", ...register(`lines.${index}.hsnCode`) }), _jsx("input", { type: "hidden", ...register(`lines.${index}.huid`) }), _jsx(SearchableSelect, { loadOptions: async (query) => {
                                                            const data = await inventoryService.listItems({ search: query });
                                                            return data.map((i) => ({
                                                                value: String(i.sku),
                                                                label: `${i.sku} - ${i.name}`,
                                                                meta: `${i.karat} | ${i.netWt}g`,
                                                                payload: i,
                                                            }));
                                                        }, onChange: (val, option) => {
                                                            setValue(`lines.${index}.sku`, String(val), { shouldValidate: true });
                                                            onSelectSKU(index, String(val), option.payload);
                                                        }, options: itemOptions.map(o => ({ ...o, value: String(o.value) })), placeholder: "Search SKU...", value: String(watch(`lines.${index}.sku`) || ""), error: errors.lines?.[index]?.sku?.message }), _jsxs("div", { className: "relative", children: [_jsx(SearchableSelect, { loadOptions: searchProducts, onChange: (val, option) => {
                                                                    onSelectProductService(index, String(val), option?.payload);
                                                                }, options: productOptions, placeholder: "\uD83D\uDCE6 Pick product/service...", value: lineProductMap[index] || "" }), lineProductMap[index] && (_jsxs("div", { className: "mt-0.5 flex items-center gap-1 text-[9px] text-gold font-semibold uppercase tracking-wide", children: [_jsx(Tag, { className: "h-2.5 w-2.5" }), productOptions.find((o) => o.value === lineProductMap[index])?.label || "Selected"] }))] }), _jsx("input", { className: "w-full bg-transparent text-[10px] text-muted focus:outline-none", placeholder: "Short description...", ...register(`lines.${index}.description`) })] }), _jsx("div", { className: "md:col-span-1", children: _jsxs("select", { className: "h-9 w-full rounded border border-border bg-white px-1 text-xs focus:border-gold focus:ring-gold", ...register(`lines.${index}.karat`), children: [_jsx("option", { value: "24K", children: "24K" }), _jsx("option", { value: "22K", children: "22K" }), _jsx("option", { value: "18K", children: "18K" }), _jsx("option", { value: "14K", children: "14K" })] }) }), _jsx("div", { className: "md:col-span-1", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold", type: "number", step: "0.001", ...register(`lines.${index}.grossWt`, { valueAsNumber: true }) }) }), _jsx("div", { className: "md:col-span-1", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold", type: "number", step: "0.001", ...register(`lines.${index}.netWt`, { valueAsNumber: true }) }) }), _jsx("div", { className: "md:col-span-2", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-right text-xs font-mono focus:border-gold focus:ring-gold", type: "number", step: "0.01", ...register(`lines.${index}.ratePerGram`, { valueAsNumber: true }) }) }), _jsx("div", { className: "md:col-span-1", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold", type: "number", step: "0.01", ...register(`lines.${index}.makingRate`, { valueAsNumber: true }) }) }), _jsx("div", { className: "md:col-span-1", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold", type: "number", step: "0.01", ...register(`lines.${index}.discountPct`, { valueAsNumber: true }) }) }), _jsx("div", { className: "md:col-span-1", children: _jsx("input", { className: "h-9 w-full rounded border border-border px-2 text-right text-xs focus:border-gold focus:ring-gold", type: "number", step: "0.01", ...register(`lines.${index}.gstPct`, { valueAsNumber: true }) }) }), _jsx("div", { className: "h-9 flex items-center justify-end px-3 text-xs font-mono font-bold text-charcoal md:col-span-1 bg-canvas rounded border border-border", children: formatCurrency(totals.lineTotals[index]?.total ?? 0) }), _jsx("div", { className: "md:col-span-1 flex justify-center", children: _jsx("button", { className: "grid h-8 w-8 place-items-center rounded-full border border-border text-muted hover:border-ruby hover:bg-ruby hover:text-white transition-all", onClick: () => remove(index), type: "button", title: "Remove item", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) }) }), errors.lines?.[index] && (_jsx("div", { className: "md:col-span-12 px-2 pb-1", children: _jsx("p", { className: "text-[10px] text-ruby italic", children: Object.values(errors.lines[index] || {})
                                                        .map((err) => err?.message)
                                                        .filter(Boolean)
                                                        .join(", ") || "Invalid data in this row. Please check weights and rates." }) }))] }, field.id))), fields.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 bg-canvas/30 rounded-lg border-2 border-dashed border-border", children: [_jsx("p", { className: "text-sm text-muted", children: "No line items added yet." }), _jsxs(Button, { variant: "ghost", size: "sm", className: "mt-2 text-gold", onClick: () => append({ ...defaultLine }), children: [_jsx(Plus, { className: "mr-1 h-3 w-3" }), " Add your first item"] })] }))] })] }), _jsxs("div", { className: "grid gap-6 md:grid-cols-2", children: [_jsx("div", { className: "rounded-card border border-border bg-card p-6 shadow-sm", children: _jsx(TextArea, { label: "Terms and Conditions", placeholder: "Specify payment terms, return policy, etc.", rows: 4, ...register("terms") }) }), _jsxs("div", { className: "rounded-card border-t-4 border-t-gold bg-charcoal p-8 text-white shadow-card", children: [_jsx("h3", { className: "mb-6 font-display text-xl font-medium text-gold-light", children: "Summary" }), _jsxs("div", { className: "space-y-4 text-sm", children: [_jsxs("div", { className: "flex justify-between border-b border-white/10 pb-2", children: [_jsx("span", { className: "text-white/60", children: "Sub Total" }), _jsx("span", { className: "font-mono font-medium", children: formatCurrency(totals.subTotal) })] }), _jsxs("div", { className: "flex justify-between border-b border-white/10 pb-2 text-ruby-light", children: [_jsx("span", { className: "text-white/60", children: "Discount" }), _jsxs("span", { className: "font-mono", children: ["-", formatCurrency(totals.discount)] })] }), _jsxs("div", { className: "flex justify-between border-b border-white/10 pb-2", children: [_jsx("span", { className: "text-white/60", children: "Taxable Amount" }), _jsx("span", { className: "font-mono", children: formatCurrency(totals.taxableAmount) })] }), _jsxs("div", { className: "flex justify-between border-b border-white/10 pb-2", children: [_jsx("span", { className: "text-white/60", children: "GST (3%)" }), _jsx("span", { className: "font-mono", children: formatCurrency(totals.taxTotal) })] }), _jsxs("div", { className: "flex justify-between pt-4", children: [_jsx("span", { className: "text-lg font-bold text-gold-light", children: "Grand Total" }), _jsx("span", { className: "font-mono text-2xl font-bold text-gold", children: formatCurrency(totals.grandTotal) })] })] })] })] })] }), isCustomerModalOpen && (_jsx(QuickCustomerModal, { initialName: customerModalInitialName, onClose: () => setIsCustomerModalOpen(false), onSuccess: (newCustomer) => {
                    // Update react-hook-form value
                    setValue("customerId", Number(newCustomer.id), { shouldValidate: true });
                    clearErrors("customerId");
                    // Re-fetch customer list to ensure the new one is available in the dropdown
                    queryClient.invalidateQueries({ queryKey: ["customers"] });
                    setIsCustomerModalOpen(false);
                } }))] }));
};
