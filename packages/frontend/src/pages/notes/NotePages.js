import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { customerService } from "@/services/customerService";
import { noteService } from "@/services/noteService";
import { supplierService } from "@/services/supplierService";
const LINE_DEFAULT = { description: "", quantity: 1, rate: 0, gstPct: 3 };
const noteLineSchema = z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    rate: z.coerce.number().min(0, "Rate cannot be negative"),
    gstPct: z.coerce.number().min(0).max(100),
});
const noteFormSchema = z.object({
    date: z.string().min(1, "Date is required"),
    partyId: z.string().min(1, "Party is required"),
    referenceNo: z.string().optional(),
    reason: z.string().optional(),
    lines: z.array(noteLineSchema).min(1, "At least one line item is required"),
});
const col = createColumnHelper();
const NOTE_CONFIG = {
    credit: {
        title: "Credit Notes",
        singular: "Credit Note",
        listPath: "/credit-notes",
        createPath: "/credit-notes/new",
        partyLabel: "Customer",
        partyType: "CUSTOMER",
        list: () => noteService.credit.list(),
        getById: (id) => noteService.credit.getById(id),
        save: (id, payload) => id ? noteService.credit.update(id, payload) : noteService.credit.create(payload),
    },
    debit: {
        title: "Debit Notes",
        singular: "Debit Note",
        listPath: "/debit-notes",
        createPath: "/debit-notes/new",
        partyLabel: "Supplier",
        partyType: "SUPPLIER",
        list: () => noteService.debit.list(),
        getById: (id) => noteService.debit.getById(id),
        save: (id, payload) => id ? noteService.debit.update(id, payload) : noteService.debit.create(payload),
    },
};
const toNumber = (value) => Number(value ?? 0);
const lineTotal = (line) => {
    const amount = toNumber(line.quantity) * toNumber(line.rate);
    const tax = (amount * toNumber(line.gstPct)) / 100;
    return amount + tax;
};
export const NoteListPage = ({ kind }) => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({});
    const config = NOTE_CONFIG[kind];
    const { data: notes = [], isLoading, refetch } = useQuery({
        queryKey: [kind, "notes"],
        queryFn: config.list,
    });
    const { data: customers = [] } = useQuery({
        queryKey: ["customers-list", kind],
        queryFn: () => customerService.list(),
        enabled: kind === "credit",
    });
    const { data: suppliers = [] } = useQuery({
        queryKey: ["suppliers-list", kind],
        queryFn: () => supplierService.list(),
        enabled: kind === "debit",
    });
    const partyMap = useMemo(() => {
        if (kind === "credit") {
            return new Map(customers.map((row) => [row.id, row.name]));
        }
        return new Map(suppliers.map((row) => [row.id, row.name]));
    }, [customers, kind, suppliers]);
    const filteredRows = useMemo(() => {
        const search = (filters.search ?? "").toLowerCase();
        const status = filters.status ?? "";
        const from = filters.from ? new Date(filters.from) : null;
        const to = filters.to ? new Date(filters.to) : null;
        return notes.filter((row) => {
            const partyId = kind === "credit" ? row.customerId : row.supplierId;
            const partyName = partyMap.get(partyId ?? "") ?? "";
            const haystack = `${row.noteNo} ${partyName} ${row.referenceNo ?? ""} ${row.reason ?? ""}`.toLowerCase();
            const date = new Date(row.date);
            const matchesSearch = search ? haystack.includes(search) : true;
            const matchesStatus = status ? row.status === status : true;
            const matchesFrom = from ? date >= from : true;
            const matchesTo = to ? date <= to : true;
            return matchesSearch && matchesStatus && matchesFrom && matchesTo;
        });
    }, [filters.from, filters.search, filters.status, filters.to, kind, notes, partyMap]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: config.title, subtitle: `${filteredRows.length} records`, actions: (_jsxs(_Fragment, { children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => void refetch(), type: "button", children: "Refresh" }), _jsxs("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => navigate(config.createPath), type: "button", children: ["+ New ", config.singular] })] })) }), _jsx(FilterBar, { filters: [
                    { key: "search", type: "search", label: "Search" },
                    { key: "from", type: "date", label: "From" },
                    { key: "to", type: "date", label: "To" },
                    {
                        key: "status",
                        type: "select",
                        label: "Status",
                        options: [
                            { label: "Draft", value: "DRAFT" },
                            { label: "Posted", value: "POSTED" },
                            { label: "Void", value: "VOID" },
                        ],
                    },
                ], values: filters, onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({}) }), _jsx(DataTable, { columns: [
                    col.accessor("noteNo", { header: "Note No" }),
                    col.accessor("date", { header: "Date", cell: (info) => formatDate(info.getValue(), "display") }),
                    col.display({
                        id: "party",
                        header: config.partyLabel,
                        cell: ({ row }) => {
                            const partyId = kind === "credit" ? row.original.customerId : row.original.supplierId;
                            return partyMap.get(partyId ?? "") ?? "-";
                        },
                    }),
                    col.accessor("referenceNo", { header: "Reference", cell: (info) => info.getValue() ?? "-" }),
                    col.accessor("grandTotal", {
                        header: "Total",
                        cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(toNumber(info.getValue())) }),
                    }),
                    col.accessor("status", { header: "Status", cell: (info) => _jsx(StatusBadge, { status: info.getValue() }) }),
                    col.display({
                        id: "actions",
                        header: "Actions",
                        cell: ({ row }) => (_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => navigate(`${config.listPath}/${row.original.id}/edit`), type: "button", children: "Edit" })),
                    }),
                ], data: filteredRows, loading: isLoading, onRowClick: (row) => navigate(`${config.listPath}/${row.id}/edit`) })] }));
};
export const NoteFormPage = ({ kind }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const editing = Boolean(id);
    const config = NOTE_CONFIG[kind];
    const form = useForm({
        resolver: zodResolver(noteFormSchema),
        defaultValues: {
            date: formatDate(new Date(), "input"),
            partyId: "",
            referenceNo: "",
            reason: "",
            lines: [LINE_DEFAULT],
        },
    });
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    });
    const { data: existing } = useQuery({
        queryKey: [kind, "note", id],
        queryFn: () => config.getById(id),
        enabled: editing,
    });
    const { data: customers = [] } = useQuery({
        queryKey: ["customers-list", kind, "form"],
        queryFn: () => customerService.list(),
        enabled: kind === "credit",
    });
    const { data: suppliers = [] } = useQuery({
        queryKey: ["suppliers-list", kind, "form"],
        queryFn: () => supplierService.list(),
        enabled: kind === "debit",
    });
    const saveMutation = useMutation({
        mutationFn: async (payload) => {
            const request = {
                date: payload.date,
                partyType: config.partyType,
                customerId: config.partyType === "CUSTOMER" ? payload.partyId : null,
                supplierId: config.partyType === "SUPPLIER" ? payload.partyId : null,
                referenceNo: payload.referenceNo?.trim() || null,
                reason: payload.reason?.trim() || null,
                lines: payload.lines.map((line) => ({
                    description: line.description.trim(),
                    quantity: toNumber(line.quantity),
                    rate: toNumber(line.rate),
                    gstPct: toNumber(line.gstPct),
                })),
            };
            return config.save(id, request);
        },
        onSuccess: () => {
            toast.success(editing ? `${config.singular} updated` : `${config.singular} created`);
            navigate(config.listPath);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.error?.message ?? `Unable to save ${config.singular.toLowerCase()}`);
        },
    });
    const partyOptions = useMemo(() => {
        const source = kind === "credit" ? customers : suppliers;
        return source.map((row) => ({
            value: row.id,
            label: row.name,
            meta: row.gstin || row.mobile || "",
        }));
    }, [customers, kind, suppliers]);
    const values = form.watch("lines");
    const totals = values.reduce((acc, line) => {
        const amount = toNumber(line.quantity) * toNumber(line.rate);
        const tax = (amount * toNumber(line.gstPct)) / 100;
        acc.subTotal += amount;
        acc.taxTotal += tax;
        acc.grandTotal += amount + tax;
        return acc;
    }, { subTotal: 0, taxTotal: 0, grandTotal: 0 });
    useEffect(() => {
        if (!existing || !editing)
            return;
        form.reset({
            date: formatDate(existing.date, "input"),
            partyId: kind === "credit" ? existing.customerId ?? "" : existing.supplierId ?? "",
            referenceNo: existing.referenceNo ?? "",
            reason: existing.reason ?? "",
            lines: existing.lines.length > 0
                ? existing.lines.map((line) => ({
                    description: line.description,
                    quantity: toNumber(line.quantity),
                    rate: toNumber(line.rate),
                    gstPct: toNumber(line.gstPct),
                }))
                : [LINE_DEFAULT],
        });
    }, [editing, existing, form, kind]);
    const onSubmit = form.handleSubmit(async (payload) => {
        await saveMutation.mutateAsync(payload);
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: editing ? `Edit ${config.singular}` : `New ${config.singular}`, subtitle: existing?.noteNo ? `Note No: ${existing.noteNo}` : undefined, actions: (_jsxs(_Fragment, { children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => navigate(config.listPath), type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: saveMutation.isPending, onClick: () => onSubmit(), type: "button", children: "Save" })] })) }), _jsxs("form", { className: "space-y-4", onSubmit: onSubmit, children: [_jsxs("div", { className: "grid gap-4 rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card md:grid-cols-3", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Date", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", ...form.register("date") })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-1 text-xs text-muted", children: config.partyLabel }), _jsx(SearchableSelect, { onChange: (value) => form.setValue("partyId", value), options: partyOptions, value: form.watch("partyId") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Reference No", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("referenceNo") })] }), _jsxs("label", { className: "text-xs text-muted md:col-span-3", children: ["Reason", _jsx("textarea", { className: "mt-1 min-h-20 w-full rounded border border-border px-3 py-2 text-sm", ...form.register("reason") })] })] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h2", { className: "font-display text-xl font-semibold text-charcoal", children: "Line Items" }), _jsxs("button", { className: "inline-flex h-9 items-center gap-2 rounded-btn border border-border px-3 text-sm", onClick: () => append({ ...LINE_DEFAULT }), type: "button", children: [_jsx(Plus, { className: "h-4 w-4" }), " Add Row"] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid gap-2 px-3 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid-cols-12", children: [_jsx("div", { className: "md:col-span-4", children: "Description" }), _jsx("div", { className: "md:col-span-2", children: "Qty" }), _jsx("div", { className: "md:col-span-2", children: "Rate" }), _jsx("div", { className: "md:col-span-1", children: "GST %" }), _jsx("div", { className: "md:col-span-2 text-right", children: "Line Total" }), _jsx("div", { className: "md:col-span-1 text-center", children: "Action" })] }), fields.map((field, index) => (_jsxs("div", { className: "grid gap-2 rounded border border-border p-3 md:grid-cols-12", children: [_jsx("input", { className: "h-9 rounded border border-border px-2 text-xs md:col-span-4", ...form.register(`lines.${index}.description`) }), _jsx("input", { className: "h-9 rounded border border-border px-2 text-xs md:col-span-2", step: "0.001", type: "number", ...form.register(`lines.${index}.quantity`, { valueAsNumber: true }) }), _jsx("input", { className: "h-9 rounded border border-border px-2 text-xs md:col-span-2", step: "0.01", type: "number", ...form.register(`lines.${index}.rate`, { valueAsNumber: true }) }), _jsx("input", { className: "h-9 rounded border border-border px-2 text-xs md:col-span-1", step: "0.01", type: "number", ...form.register(`lines.${index}.gstPct`, { valueAsNumber: true }) }), _jsx("div", { className: "flex h-9 items-center justify-end px-2 text-xs font-mono md:col-span-2", children: formatCurrency(lineTotal(values[index])) }), _jsx("button", { className: "grid h-9 place-items-center rounded border border-ruby text-ruby md:col-span-1", onClick: () => remove(index), type: "button", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }, field.id)))] })] }), _jsx("div", { className: "ml-auto w-full max-w-md rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Sub Total" }), _jsx("span", { className: "font-mono", children: formatCurrency(totals.subTotal) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Tax Total" }), _jsx("span", { className: "font-mono", children: formatCurrency(totals.taxTotal) })] }), _jsxs("div", { className: "flex justify-between font-semibold", children: [_jsx("span", { children: "Grand Total" }), _jsx("span", { className: "font-mono text-gold", children: formatCurrency(totals.grandTotal) })] })] }) })] })] }));
};
