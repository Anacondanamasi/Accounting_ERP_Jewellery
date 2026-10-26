import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { settingsService, type CompanySettings, type NumberSeries } from "@/services/settingsService";
import { SettingsCenterPanel } from "./SettingsCenterPanel";
import { FinancialYearSettingsTab } from "./FinancialYearSettingsTab";
import { AdvanceConfigTab } from "./AdvanceConfigTab";
import { GstSettingsTab } from "./GstSettingsTab";
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

type CompanyInput = z.infer<typeof companySchema>;

export const CompanySettingsPage = () => {
  const updateCompany = useAuthStore((state) => state.updateCompany);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const [activeTab, setActiveTab] = useState<"profile" | "financial-years" | "advance-config" | "gst-tax" | "advanced">("profile");

  const form = useForm<CompanyInput>({
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
    queryKey: ["settings-company", currentCompanyId],
    queryFn: () => settingsService.getCompanySettings(),
  });

  const { data: series = [], refetch: refetchSeries } = useQuery({
    queryKey: ["settings-number-series", currentCompanyId],
    queryFn: () => settingsService.getNumberSeries(),
  });

  useEffect(() => {
    if (company) {
      form.reset({
        companyName: (company as any).name ?? "",
        legalName: (company as any).legalName ?? "",
        gstin: company.gstin ?? "",
        pan: (company as any).pan ?? "",
        email: (company as any).email ?? "",
        phone: (company as any).phone ?? "",
        website: (company as any).website ?? "",
        addressLine1: (company as any).addressLine1 ?? "",
        addressLine2: (company as any).addressLine2 ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        pinCode: (company as any).pinCode ?? "",
        country: (company as any).country ?? "India",
        fiscalYearStartMonth: (company as any).fiscalYearStartMonth ?? 4,
        weightUnit: (company as any).weightUnit ?? "g",
        currency: (company as any).currency ?? "INR",
        timezone: (company as any).timezone ?? "Asia/Kolkata",
      });
    }
  }, [company, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: CompanyInput) => {
      const { companyName, ...rest } = payload;
      return settingsService.updateCompanySettings({ ...(company as any), name: companyName, ...rest });
    },
    onSuccess: (_, variables) => {
      toast.success("Company settings saved");
      if (currentCompanyId) {
        updateCompany(currentCompanyId, { name: variables.companyName });
      }
      void refetch();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(error.response?.data?.error?.message ?? "Unable to save company settings");
    },
  });

  const updateSeriesMutation = useMutation({
    mutationFn: (row: NumberSeries) => settingsService.updateNumberSeries(row.type, {
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

  return (
    <div className="space-y-4">
      <PageHeader title="Company Settings" subtitle="Master profile, fiscal defaults, and advanced configurations" />

      <div className="flex gap-4 border-b border-border">
        <button
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "profile" ? "border-b-2 border-gold text-charcoal" : "text-muted hover:text-charcoal"}`}
          onClick={() => setActiveTab("profile")}
          type="button"
        >
          General Profile & Series
        </button>
        <button
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "financial-years" ? "border-b-2 border-gold text-charcoal" : "text-muted hover:text-charcoal"}`}
          onClick={() => setActiveTab("financial-years")}
          type="button"
        >
          Financial Year & Closing
        </button>
        <button
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "advance-config" ? "border-b-2 border-gold text-charcoal" : "text-muted hover:text-charcoal"}`}
          onClick={() => setActiveTab("advance-config")}
          type="button"
        >
          Advance Config & PIN Lock
        </button>
        <button
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "gst-tax" ? "border-b-2 border-gold text-charcoal" : "text-muted hover:text-charcoal"}`}
          onClick={() => setActiveTab("gst-tax")}
          type="button"
        >
          GST & Tax Setup
        </button>
        <button
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "advanced" ? "border-b-2 border-gold text-charcoal" : "text-muted hover:text-charcoal"}`}
          onClick={() => setActiveTab("advanced")}
          type="button"
        >
          Advanced Settings Center
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {isError ? (
            <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 text-sm text-ruby">
              Failed to load company settings.
              <button className="ml-3 underline" onClick={() => void refetch()} type="button">Retry</button>
            </div>
          ) : null}

          <form className="rounded-card border border-border bg-card p-6 shadow-card" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            <h3 className="mb-3 font-display text-xl font-semibold">Company Profile</h3>
            {isLoading ? <p className="text-sm text-muted">Loading settings...</p> : null}

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs text-muted">Company Name<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("companyName")} /></label>
              <label className="text-xs text-muted md:col-span-2">Legal Name<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("legalName")} /></label>
              <label className="text-xs text-muted">GSTIN<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("gstin")} /></label>
              <label className="text-xs text-muted">PAN<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("pan")} /></label>
              <label className="text-xs text-muted">Email<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("email")} /></label>
              <label className="text-xs text-muted">Phone<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("phone")} /></label>
              <label className="text-xs text-muted">Website<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("website")} /></label>
              <label className="text-xs text-muted md:col-span-2">Address Line 1<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("addressLine1")} /></label>
              <label className="text-xs text-muted md:col-span-2">Address Line 2<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("addressLine2")} /></label>
              <label className="text-xs text-muted">City<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("city")} /></label>
              <label className="text-xs text-muted">State<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("state")} /></label>
              <label className="text-xs text-muted">PIN Code<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("pinCode")} /></label>
              <label className="text-xs text-muted">Country<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("country")} /></label>
              <label className="text-xs text-muted">FY Start Month<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("fiscalYearStartMonth", { valueAsNumber: true })}>{Array.from({ length: 12 }).map((_, idx) => <option key={idx + 1} value={idx + 1}>{idx + 1}</option>)}</select></label>
              <label className="text-xs text-muted">Weight Unit<select className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("weightUnit")}><option value="g">Grams</option><option value="tola">Tola</option></select></label>
              <label className="text-xs text-muted">Currency<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm bg-slate-100" readOnly {...form.register("currency")} /></label>
              <label className="text-xs text-muted">Timezone<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" {...form.register("timezone")} /></label>
            </div>

            <div className="mt-2 text-xs text-ruby">{Object.values(form.formState.errors)[0]?.message as string}</div>

            <div className="mt-4 flex justify-end">
              <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white disabled:opacity-50" disabled={saveMutation.isPending} type="submit">{saveMutation.isPending ? "Saving..." : "Save Company Settings"}</button>
            </div>
          </form>

          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <h3 className="mb-3 font-display text-xl font-semibold">Number Series</h3>
            <div className="space-y-3">
              {series.map((row) => (
                <div key={row.id} className="grid gap-2 rounded border border-border p-3 md:grid-cols-6">
                  <div className="text-xs text-muted">
                    Type
                    <div className="mt-1 font-medium text-charcoal">{row.type.toUpperCase()}</div>
                  </div>
                  <label className="text-xs text-muted">Prefix<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" defaultValue={row.prefix} onChange={(event) => { row.prefix = event.target.value; }} /></label>
                  <label className="text-xs text-muted">Suffix<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" defaultValue={row.suffix} onChange={(event) => { row.suffix = event.target.value; }} /></label>
                  <label className="text-xs text-muted">Padding<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" defaultValue={row.padding} onChange={(event) => { row.padding = Number(event.target.value); }} /></label>
                  <label className="text-xs text-muted">Current<input className="mt-1 h-10 w-full rounded border border-border px-3 text-sm" type="number" defaultValue={row.currentValue} onChange={(event) => { row.currentValue = Number(event.target.value); }} /></label>
                  <div className="flex items-end justify-end">
                    <button className="h-10 rounded-btn border border-border px-3 text-sm" onClick={() => updateSeriesMutation.mutate(row)} type="button">Update</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "financial-years" && (
        <div className="animate-in fade-in duration-300">
          <FinancialYearSettingsTab />
        </div>
      )}

      {activeTab === "advance-config" && (
        <div className="animate-in fade-in duration-300">
          <AdvanceConfigTab />
        </div>
      )}

      {activeTab === "gst-tax" && (
        <div className="animate-in fade-in duration-300">
          <GstSettingsTab />
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="animate-in fade-in duration-300">
          <SettingsCenterPanel />
        </div>
      )}
    </div>
  );
};
