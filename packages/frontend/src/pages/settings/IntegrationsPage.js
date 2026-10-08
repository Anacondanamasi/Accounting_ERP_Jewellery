import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { settingsService } from "@/services/settingsService";
const integrationSchema = z.object({
    status: z.enum(["CONNECTED", "DISCONNECTED", "ERROR"]),
    endpoint: z.string().optional(),
    apiKey: z.string().optional(),
});
export const IntegrationsPage = () => {
    const [selected, setSelected] = useState(null);
    const form = useForm({
        resolver: zodResolver(integrationSchema),
        defaultValues: {
            status: "DISCONNECTED",
            endpoint: "",
            apiKey: "",
        },
    });
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["settings-integrations"],
        queryFn: () => settingsService.getIntegrations(),
    });
    const updateMutation = useMutation({
        mutationFn: (payload) => settingsService.updateIntegration(selected.key, payload),
        onSuccess: () => {
            toast.success("Integration updated");
            setSelected(null);
            form.reset();
            void refetch();
        },
        onError: (error) => toast.error(error.response?.data?.error?.message ?? "Unable to update integration"),
    });
    const openEdit = (row) => {
        setSelected(row);
        form.reset({
            status: row.status,
            endpoint: row.endpoint ?? "",
            apiKey: "",
        });
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Integrations", subtitle: "Connect and manage external services" }), isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load integrations.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-3", children: data.map((row) => (_jsxs("div", { className: "rounded-card border-t-2 border-t-gold-light bg-card p-5 shadow-card", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-xl font-semibold", children: row.name }), _jsx("span", { className: `rounded-full px-3 py-1 text-xs ${row.status === "CONNECTED" ? "bg-emerald/10 text-emerald" : row.status === "ERROR" ? "bg-ruby/10 text-ruby" : "bg-gold/10 text-gold"}`, children: row.status })] }), _jsxs("div", { className: "mt-2 space-y-1 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-muted", children: "Key:" }), " ", row.key] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted", children: "Endpoint:" }), " ", row.endpoint ?? "-"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted", children: "API Key:" }), " ", row.apiKeyMasked ?? "-"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted", children: "Configured:" }), " ", row.configuredAt ? new Date(row.configuredAt).toLocaleString("en-IN") : "-"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted", children: "Last Sync:" }), " ", row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString("en-IN") : "-"] })] }), _jsx("button", { className: "mt-3 h-9 rounded-btn border border-border px-3 text-sm", onClick: () => openEdit(row), type: "button", children: "Configure" })] }, row.id))) }), isLoading && data.length === 0 ? _jsx("div", { className: "rounded-card bg-card p-4 shadow-card text-sm text-muted", children: "Loading integrations..." }) : null, selected ? (_jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-charcoal/60 p-4", onClick: (event) => { if (event.currentTarget === event.target)
                    setSelected(null); }, children: _jsxs("form", { className: "w-full max-w-lg rounded-card bg-card p-6 shadow-modal", onSubmit: form.handleSubmit((values) => updateMutation.mutate(values)), children: [_jsxs("h3", { className: "mb-4 font-display text-2xl font-semibold", children: ["Configure ", selected.name] }), _jsxs("div", { className: "grid gap-3", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Status", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("status"), children: [_jsx("option", { value: "CONNECTED", children: "Connected" }), _jsx("option", { value: "DISCONNECTED", children: "Disconnected" }), _jsx("option", { value: "ERROR", children: "Error" })] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Endpoint", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("endpoint") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["API Key", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("apiKey"), placeholder: "Enter new key to rotate" })] })] }), _jsx("div", { className: "mt-2 text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: () => setSelected(null), type: "button", children: "Cancel" }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: updateMutation.isPending, type: "submit", children: updateMutation.isPending ? "Saving..." : "Save" })] })] }) })) : null] }));
};
