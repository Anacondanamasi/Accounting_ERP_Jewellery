import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency } from "@/lib/formatters";
import { schemeService } from "@/services/schemeService";
import { customerService } from "@/services/customerService";
const enrollSchema = z.object({
    schemeId: z.coerce.number(),
    customerId: z.coerce.number(),
    enrollDate: z.string().min(1, "Enroll date is required"),
    monthlyAmt: z.coerce.number().positive(),
    totalInstallments: z.coerce.number().int().positive(),
});
const col = createColumnHelper();
export const SchemeMembersPage = () => {
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const form = useForm({
        resolver: zodResolver(enrollSchema),
        defaultValues: {
            enrollDate: new Date().toISOString().slice(0, 10),
            totalInstallments: 11,
        },
    });
    const { data: members = [], isLoading, refetch } = useQuery({
        queryKey: ["scheme-members"],
        queryFn: () => schemeService.listMembers(),
    });
    const { data: schemes = [] } = useQuery({
        queryKey: ["schemes-list"],
        queryFn: () => schemeService.list(),
    });
    const { data: customers = [] } = useQuery({
        queryKey: ["customers-list"],
        queryFn: () => customerService.list({}),
    });
    const enrollMutation = useMutation({
        mutationFn: (payload) => schemeService.enrollMember(payload),
        onSuccess: () => {
            toast.success("Member enrolled successfully");
            setIsEnrollModalOpen(false);
            form.reset();
            void refetch();
        },
        onError: (err) => toast.error(err?.response?.data?.error?.message ?? "Failed to enroll member"),
    });
    const payMutation = useMutation({
        mutationFn: (id) => schemeService.payInstallment(id),
        onSuccess: () => {
            toast.success("Installment paid");
            void refetch();
        },
        onError: (err) => toast.error(err?.response?.data?.error?.message ?? "Failed to pay installment"),
    });
    return (_jsxs("div", { className: "space-y-4 animate-in fade-in duration-500", children: [_jsx(PageHeader, { title: "Scheme Members", subtitle: "Manage active gold scheme enrollments and collections", actions: _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn bg-gold px-4 text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all", onClick: () => setIsEnrollModalOpen(true), type: "button", children: [_jsx(UserPlus, { className: "h-4 w-4" }), " Enroll New Member"] }) }), _jsx("div", { className: "rounded-card border-t-2 border-t-gold bg-card shadow-card overflow-hidden", children: _jsx(DataTable, { columns: [
                        col.accessor("customer.name", {
                            header: "Member Name",
                            cell: (info) => _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "font-bold text-charcoal", children: info.getValue() }), _jsx("span", { className: "text-[10px] text-muted", children: info.row.original.customer?.mobile })] }),
                        }),
                        col.accessor("scheme.name", {
                            header: "Scheme",
                            cell: (info) => _jsx("span", { className: "px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold uppercase", children: info.getValue() }),
                        }),
                        col.accessor("monthlyAmt", {
                            header: "Monthly Amt",
                            cell: (info) => _jsx("span", { className: "font-mono font-semibold", children: formatCurrency(info.getValue()) }),
                        }),
                        col.accessor("paidInstallments", {
                            header: "Progress",
                            cell: (info) => {
                                const paid = info.getValue();
                                const total = info.row.original.totalInstallments;
                                const pct = (paid / total) * 100;
                                return (_jsxs("div", { className: "w-full max-w-[100px]", children: [_jsxs("div", { className: "flex justify-between text-[10px] mb-1 font-bold", children: [_jsxs("span", { children: [paid, "/", total] }), _jsxs("span", { children: [Math.round(pct), "%"] })] }), _jsx("div", { className: "h-1.5 w-full bg-slate-100 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-gold transition-all", style: { width: `${pct}%` } }) })] }));
                            },
                        }),
                        col.accessor("totalDeposited", {
                            header: "Total Saved",
                            cell: (info) => _jsx("span", { className: "font-mono font-bold text-emerald", children: formatCurrency(info.getValue()) }),
                        }),
                        col.accessor("status", {
                            header: "Status",
                            cell: (info) => {
                                const status = info.getValue();
                                const cls = status === "ACTIVE" ? "bg-emerald/10 text-emerald" : status === "MATURED" ? "bg-gold/10 text-gold" : "bg-ruby/10 text-ruby";
                                return _jsx("span", { className: `rounded-full px-3 py-1 text-[10px] font-bold ${cls}`, children: status });
                            },
                        }),
                        col.display({
                            id: "actions",
                            cell: (info) => (_jsxs("button", { className: "inline-flex h-8 items-center gap-2 rounded border border-gold/30 bg-gold/5 px-3 text-xs font-bold text-gold hover:bg-gold/10 transition-colors disabled:opacity-50", disabled: info.row.original.status !== "ACTIVE" || payMutation.isPending, onClick: () => payMutation.mutate(info.row.original.id), children: [_jsx(CreditCard, { className: "h-3.5 w-3.5" }), " Pay"] })),
                        }),
                    ], data: members, isLoading: isLoading }) }), isEnrollModalOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-md rounded-card bg-card p-6 shadow-card border-t-4 border-t-gold", children: [_jsx("h2", { className: "mb-4 font-display text-xl font-bold", children: "Enroll New Member" }), _jsxs("form", { className: "space-y-4", onSubmit: form.handleSubmit((v) => enrollMutation.mutate(v)), children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-wider text-muted", children: "Customer" }), _jsx(SearchableSelect, { onChange: (val) => form.setValue("customerId", val, { shouldValidate: true }), options: customers.map((c) => ({ value: c.id, label: c.name, meta: c.mobile })), value: form.watch("customerId") })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-wider text-muted", children: "Scheme" }), _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none", ...form.register("schemeId"), children: [_jsx("option", { value: "", children: "Select Scheme" }), schemes.map((s) => _jsxs("option", { value: s.id, children: [s.name, " (", formatCurrency(s.monthlyMin), " - ", formatCurrency(s.monthlyMax), ")"] }, s.id))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-wider text-muted", children: "Monthly Amt" }), _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none", type: "number", ...form.register("monthlyAmt") })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-wider text-muted", children: "Duration (Mos)" }), _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none", type: "number", ...form.register("totalInstallments") })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-wider text-muted", children: "Enroll Date" }), _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm focus:border-gold outline-none", type: "date", ...form.register("enrollDate") })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { className: "h-10 flex-1 rounded-btn border border-border text-sm font-medium hover:bg-slate-50 transition-colors", onClick: () => setIsEnrollModalOpen(false), type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 flex-1 rounded-btn bg-gold text-sm font-bold text-white shadow-lg hover:bg-gold-dark transition-all disabled:opacity-50", disabled: enrollMutation.isPending, children: enrollMutation.isPending ? "Enrolling..." : "Enroll Member" })] })] })] }) }))] }));
};
