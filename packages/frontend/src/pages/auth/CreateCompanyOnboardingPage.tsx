import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { companyService } from "@/services/companyService";
import { useAuthStore } from "@/stores/authStore";

export const CreateCompanyOnboardingPage = () => {
  const navigate = useNavigate();
  const companies = useAuthStore((state) => state.companies);
  const switchCompany = useAuthStore((state) => state.switchCompany);
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    countryCode: "IN",
    currencyCode: "INR",
    fiscalYearStart: "04-01",
    timezone: "Asia/Kolkata",
  });

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(form.name && form.countryCode && form.currencyCode);
    if (step === 2) return Boolean(form.fiscalYearStart && form.timezone);
    return true;
  }, [form, step]);

  const finish = async () => {
    if (!user || !token) return;
    try {
      setLoading(true);
      const createdCompany = await companyService.create(form);
      const updatedCompanies = await companyService.list();
      setAuth({
        user,
        token,
        refreshToken: refreshToken ?? undefined,
        companies: updatedCompanies,
        currentCompanyId: createdCompany.id,
      });
      switchCompany(createdCompany.id);
      toast.success("Company created.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Unable to create company. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-3xl font-bold text-charcoal">Company setup</h1>
      <p className="mt-2 text-sm text-muted">Step {step} of 4</p>
      <div className="mt-6 rounded-card border border-border bg-card p-5">
        {step === 1 ? (
          <div className="space-y-4">
            <input className="h-10 w-full rounded border border-border px-3 text-sm" placeholder="Company name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            <input className="h-10 w-full rounded border border-border px-3 text-sm" placeholder="Legal name (optional)" value={form.legalName} onChange={(event) => setForm((prev) => ({ ...prev, legalName: event.target.value }))} />
            <input className="h-10 w-full rounded border border-border px-3 text-sm" placeholder="Country code (IN/US)" value={form.countryCode} onChange={(event) => setForm((prev) => ({ ...prev, countryCode: event.target.value.toUpperCase() }))} />
            <input className="h-10 w-full rounded border border-border px-3 text-sm" placeholder="Currency code (INR/USD)" value={form.currencyCode} onChange={(event) => setForm((prev) => ({ ...prev, currencyCode: event.target.value.toUpperCase() }))} />
          </div>
        ) : null}
        {step === 2 ? (
          <div className="space-y-4">
            <input className="h-10 w-full rounded border border-border px-3 text-sm" placeholder="Fiscal year start (MM-DD)" value={form.fiscalYearStart} onChange={(event) => setForm((prev) => ({ ...prev, fiscalYearStart: event.target.value }))} />
            <input className="h-10 w-full rounded border border-border px-3 text-sm" placeholder="Timezone" value={form.timezone} onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))} />
          </div>
        ) : null}
        {step === 3 ? (
          <p className="text-sm text-muted">Invite teammates later from Settings → Team.</p>
        ) : null}
        {step === 4 ? (
          <p className="text-sm text-muted">Setup is complete. Continue to dashboard.</p>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button className="rounded border border-border px-3 py-2 text-sm disabled:opacity-50" disabled={step === 1} onClick={() => setStep((prev) => Math.max(1, prev - 1))} type="button">
          Back
        </button>
        {step < 4 ? (
          <button className="rounded-btn bg-gold px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={!canContinue} onClick={() => setStep((prev) => prev + 1)} type="button">
            Next
          </button>
        ) : (
          <button className="rounded-btn bg-gold px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={loading} onClick={finish} type="button">
            {loading ? "Creating..." : "Go to dashboard"}
          </button>
        )}
      </div>
      {companies.length > 0 ? (
        <button className="mt-4 text-sm text-sapphire hover:underline" onClick={() => navigate("/select-company")} type="button">
          Back to company selector
        </button>
      ) : null}
    </div>
  );
};
