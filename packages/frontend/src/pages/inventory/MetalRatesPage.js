import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { inventoryService } from "@/services/inventoryService";
import { z } from "zod";
const col = createColumnHelper();
const manualRateSchema = z.object({
    date: z.string().min(1),
    karat24: z.coerce.number().positive(),
    karat22: z.coerce.number().positive(),
    karat18: z.coerce.number().positive(),
    karat14: z.coerce.number().positive(),
    silver: z.coerce.number().positive(),
    reason: z.string().min(3),
});
export const MetalRatesPage = () => {
    const form = useForm({
        resolver: zodResolver(manualRateSchema),
        defaultValues: {
            date: new Date().toISOString().slice(0, 10),
            karat24: 0,
            karat22: 0,
            karat18: 0,
            karat14: 0,
            silver: 0,
            reason: "",
        },
    });
    const { data: today, isLoading: loadingToday, refetch: refetchToday } = useQuery({
        queryKey: ["metal-rates-today"],
        queryFn: () => inventoryService.getTodayRates(),
    });
    const { data: history = [], isLoading: loadingHistory, isError, refetch } = useQuery({
        queryKey: ["metal-rates-history"],
        queryFn: () => inventoryService.getRateHistory({ from: "2025-02-01", to: "2025-04-30" }),
    });
    const { data: chart = [] } = useQuery({
        queryKey: ["metal-rates-chart"],
        queryFn: () => inventoryService.getRateChart({ months: 12 }),
    });
    const refreshMutation = useMutation({
        mutationFn: () => inventoryService.refreshRates(),
        onSuccess: () => {
            toast.success("Live rates refreshed");
            void refetchToday();
            void refetch();
        },
        onError: () => toast.error("Unable to refresh rates"),
    });
    const createMutation = useMutation({
        mutationFn: (payload) => inventoryService.createRateEntry({
            date: payload.date,
            karat24: payload.karat24,
            karat22: payload.karat22,
            karat18: payload.karat18,
            karat14: payload.karat14,
            silver: payload.silver,
            source: "MANUAL",
            overrideReason: payload.reason,
        }),
        onSuccess: () => {
            toast.success("Manual override saved");
            form.reset({ ...form.getValues(), reason: "" });
            void refetchToday();
            void refetch();
        },
        onError: () => toast.error("Unable to save override"),
    });
    const changeVsYesterday = useMemo(() => {
        if (history.length < 2)
            return null;
        const latest = history[history.length - 1];
        const prev = history[history.length - 2];
        const pct = (curr, old) => (old === 0 ? 0 : Number((((curr - old) / old) * 100).toFixed(2)));
        return {
            k24: pct(latest.karat24, prev.karat24),
            k22: pct(latest.karat22, prev.karat22),
            k18: pct(latest.karat18, prev.karat18),
            k14: pct(latest.karat14, prev.karat14),
            silver: pct(latest.silver, prev.silver),
        };
    }, [history]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Metal Rate Master", subtitle: "Live rates, 90-day history, and manual override controls", actions: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => refreshMutation.mutate(), type: "button", children: refreshMutation.isPending ? "Refreshing..." : "Refresh Live Rates" }) }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-xl font-semibold", children: "Live Rates" }), _jsx("span", { className: "rounded-full bg-emerald/10 px-3 py-1 text-xs text-emerald", children: "MCX API: Connected (Mock)" })] }), loadingToday || !today ? (_jsx("p", { className: "text-sm text-muted", children: "Loading rates..." })) : (_jsx("div", { className: "grid gap-3 md:grid-cols-5 text-sm", children: [
                            { label: "24K", value: today.karat24, pct: changeVsYesterday?.k24 },
                            { label: "22K", value: today.karat22, pct: changeVsYesterday?.k22 },
                            { label: "18K", value: today.karat18, pct: changeVsYesterday?.k18 },
                            { label: "14K", value: today.karat14, pct: changeVsYesterday?.k14 },
                            { label: "Silver", value: today.silver, pct: changeVsYesterday?.silver },
                        ].map((row) => (_jsxs("div", { className: "rounded border border-border p-3", children: [_jsx("div", { className: "text-muted", children: row.label }), _jsxs("div", { className: "font-mono text-lg", children: [formatCurrency(row.value), "/g"] }), _jsxs("div", { className: `text-xs ${(row.pct ?? 0) >= 0 ? "text-emerald" : "text-ruby"}`, children: [(row.pct ?? 0) >= 0 ? "+" : "", row.pct ?? 0, "% vs yesterday"] })] }, row.label))) }))] }), _jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-3 font-display text-xl font-semibold", children: "12-Month Trend" }), _jsx("div", { className: "h-80", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: chart, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "date", hide: true }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Line, { type: "monotone", dataKey: "karat24", stroke: "#C9922A", strokeWidth: 2, dot: false }), _jsx(Line, { type: "monotone", dataKey: "karat22", stroke: "#1E7B5E", strokeWidth: 2, dot: false }), _jsx(Line, { type: "monotone", dataKey: "silver", stroke: "#2563EB", strokeWidth: 2, dot: false })] }) }) })] }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load rate history.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsx(DataTable, { columns: [
                    col.accessor("date", { header: "Date" }),
                    col.accessor("karat24", { header: "24K", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("karat22", { header: "22K", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("karat18", { header: "18K", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("karat14", { header: "14K", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("silver", { header: "Silver", cell: (info) => _jsx("span", { className: "font-mono", children: formatCurrency(info.getValue()) }) }),
                    col.accessor("source", { header: "Source" }),
                ], data: history.slice(-90).reverse(), loading: loadingHistory }), _jsxs("form", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-3", onSubmit: form.handleSubmit((values) => createMutation.mutate(values)), children: [_jsx("h3", { className: "md:col-span-3 font-display text-xl font-semibold", children: "Manual Rate Override" }), _jsxs("label", { className: "text-xs text-muted", children: ["Date", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "date", ...form.register("date") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["24K", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("karat24", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["22K", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("karat22", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["18K", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("karat18", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["14K", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("karat14", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Silver", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", step: "0.01", ...form.register("silver", { valueAsNumber: true }) })] }), _jsxs("label", { className: "text-xs text-muted md:col-span-3", children: ["Reason", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("reason") })] }), _jsx("div", { className: "md:col-span-3 text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message }), _jsx("div", { className: "md:col-span-3", children: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: createMutation.isPending, type: "submit", children: createMutation.isPending ? "Saving..." : "Save Override" }) })] })] }));
};
