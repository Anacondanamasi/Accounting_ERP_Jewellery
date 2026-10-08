import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { settingsService } from "@/services/settingsService";
import { SettingsCenterPanel } from "./SettingsCenterPanel";
import { useAuthStore } from "@/stores/authStore";
const companySchema = z.object({
    companyName: z.string().min(2, "Company Name is required"),
    legalName: z.string().optional(),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    email: z.string().email().or(z.literal("")).optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pinCode: z.string().optional(),
    country: z.string().optional(),
    fiscalYearStartMonth: z.coerce.number().min(1).max(12).default(4),
    weightUnit: z.enum(["g", "tola"]).default("g"),
    currency: z.literal("INR").default("INR"),
    timezone: z.string().optional(),
});
export const CompanySettingsPage = () => {
    const updateCompany = useAuthStore((state) => state.updateCompany);
    const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
    const [activeTab, setActiveTab] = useState("profile");
    const form = useForm({
        resolver: zodResolver(companySchema),
        defaultValues: {
            companyName: "",
            legalName: "",
            gstin: "",
            pan: "",
            email: "",
            phone: "",
            website: "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            state: "",
            pinCode: "",
            country: "India",
            fiscalYearStartMonth: 4,
            weightUnit: "g",
            currency: "INR",
            timezone: "Asia/Kolkata",
        },
    });
    const { data: company, isLoading, isError, refetch } = useQuery({
        queryKey: ["settings-company"],
        queryFn: () => settingsService.getCompanySettings(),
    });
    const { data: series = [], refetch: refetchSeries } = useQuery({
        queryKey: ["settings-number-series"],
        queryFn: () => settingsService.getNumberSeries(),
    });
    useEffect(() => {
        if (company) {
            form.reset({
                companyName: company.name ?? "",
                legalName: company.legalName ?? "",
                gstin: company.gstin ?? "",
                pan: company.pan ?? "",
                email: company.email ?? "",
                phone: company.phone ?? "",
                website: company.website ?? "",
                addressLine1: company.addressLine1 ?? "",
                addressLine2: company.addressLine2 ?? "",
                city: company.city ?? "",
                state: company.state ?? "",
                pinCode: company.pinCode ?? "",
                country: company.country ?? "India",
                fiscalYearStartMonth: company.fiscalYearStartMonth ?? 4,
                weightUnit: company.weightUnit ?? "g",
                currency: company.currency ?? "INR",
                timezone: company.timezone ?? "Asia/Kolkata",
            });
        }
    }, [company, form]);
    const saveMutation = useMutation({
        mutationFn: (payload) => {
            const { companyName, ...rest } = payload;
            return settingsService.updateCompanySettings({ ...company, name: companyName, ...rest });
        },
        onSuccess: (_, variables) => {
            toast.success("Company settings saved");
            if (currentCompanyId) {
                updateCompany(currentCompanyId, { name: variables.companyName });
            }
            void refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message ?? "Unable to save company settings");
        },
    });
    const updateSeriesMutation = useMutation({
        mutationFn: (row) => settingsService.updateNumberSeries(row.type, {
            prefix: row.prefix,
            suffix: row.suffix,
            padding: row.padding,
            currentValue: row.currentValue,
            resetPerFy: row.resetPerFy,
        }),
        onSuccess: () => {
            toast.success("Number series updated");
            void refetchSeries();
        },
        onError: () => toast.error("Unable to update number series"),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Company Settings", subtitle: "Master profile, fiscal defaults, and advanced configurations" }), _jsxs("div", { className: "flex gap-4 border-b border-border", children: [_jsx("button", { className: `pb-2 text-sm font-semibold transition-colors ${activeTab === "profile" ? "border-b-2 border-gold text-charcoal" : "text-muted hover:text-charcoal"}`, onClick: () => setActiveTab("profile"), type: "button", children: "General Profile & Series" }), _jsx("button", { className: `pb-2 text-sm font-semibold transition-colors ${activeTab === "advanced" ? "border-b-2 border-gold text-charcoal" : "text-muted hover:text-charcoal"}`, onClick: () => setActiveTab("advanced"), type: "button", children: "Advanced Settings Center" })] }), activeTab === "profile" && (_jsxs("div", { className: "space-y-4 animate-in fade-in duration-300", children: [isError ? (_jsxs("div", { className: "rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby", children: ["Failed to load company settings.", _jsx("button", { className: "ml-3 underline", onClick: () => void refetch(), type: "button", children: "Retry" })] })) : null, _jsxs("form", { className: "rounded-card border border-border bg-card p-6 shadow-card", onSubmit: form.handleSubmit((values) => saveMutation.mutate(values)), children: [_jsx("h3", { className: "mb-3 font-display text-xl font-semibold", children: "Company Profile" }), isLoading ? _jsx("p", { className: "text-sm text-muted", children: "Loading settings..." }) : null, _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("label", { className: "text-xs text-muted", children: ["Company Name", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("companyName") })] }), _jsxs("label", { className: "text-xs text-muted md:col-span-2", children: ["Legal Name", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("legalName") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["GSTIN", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("gstin") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["PAN", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("pan") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Email", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("email") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Phone", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("phone") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Website", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("website") })] }), _jsxs("label", { className: "text-xs text-muted md:col-span-2", children: ["Address Line 1", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("addressLine1") })] }), _jsxs("label", { className: "text-xs text-muted md:col-span-2", children: ["Address Line 2", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("addressLine2") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["City", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("city") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["State", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("state") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["PIN Code", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("pinCode") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Country", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("country") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["FY Start Month", _jsx("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("fiscalYearStartMonth", { valueAsNumber: true }), children: Array.from({ length: 12 }).map((_, idx) => _jsx("option", { value: idx + 1, children: idx + 1 }, idx + 1)) })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Weight Unit", _jsxs("select", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("weightUnit"), children: [_jsx("option", { value: "g", children: "Grams" }), _jsx("option", { value: "tola", children: "Tola" })] })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Currency", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm bg-slate-100", readOnly: true, ...form.register("currency") })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Timezone", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", ...form.register("timezone") })] })] }), _jsx("div", { className: "mt-2 text-xs text-ruby", children: Object.values(form.formState.errors)[0]?.message }), _jsx("div", { className: "mt-4 flex justify-end", children: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50", disabled: saveMutation.isPending, type: "submit", children: saveMutation.isPending ? "Saving..." : "Save Company Settings" }) })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-6 shadow-card", children: [_jsx("h3", { className: "mb-3 font-display text-xl font-semibold", children: "Number Series" }), _jsx("div", { className: "space-y-3", children: series.map((row) => (_jsxs("div", { className: "grid gap-2 rounded border border-border p-3 md:grid-cols-6", children: [_jsxs("div", { className: "text-xs text-muted", children: ["Type", _jsx("div", { className: "mt-1 font-medium text-charcoal", children: row.type.toUpperCase() })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Prefix", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", defaultValue: row.prefix, onChange: (event) => { row.prefix = event.target.value; } })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Suffix", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", defaultValue: row.suffix, onChange: (event) => { row.suffix = event.target.value; } })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Padding", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", defaultValue: row.padding, onChange: (event) => { row.padding = Number(event.target.value); } })] }), _jsxs("label", { className: "text-xs text-muted", children: ["Current", _jsx("input", { className: "mt-1 h-10 w-full rounded border border-border px-3 text-sm", type: "number", defaultValue: row.currentValue, onChange: (event) => { row.currentValue = Number(event.target.value); } })] }), _jsx("div", { className: "flex items-end justify-end", children: _jsx("button", { className: "h-10 rounded-btn border border-border px-3 text-sm", onClick: () => updateSeriesMutation.mutate(row), type: "button", children: "Update" }) })] }, row.id))) })] })] })), activeTab === "advanced" && (_jsx("div", { className: "animate-in fade-in duration-300", children: _jsx(SettingsCenterPanel, {}) }))] }));
};
