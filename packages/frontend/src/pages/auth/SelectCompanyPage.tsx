import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const daysRemaining = (trialEndsAt?: string | null) => {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

export const SelectCompanyPage = () => {
  const navigate = useNavigate();
  const companies = useAuthStore((state) => state.companies);
  const switchCompany = useAuthStore((state) => state.switchCompany);

  const activeCompanies = useMemo(
    () => companies.filter((company) => company.membershipStatus === "active"),
    [companies],
  );

  const selectCompany = (companyId: string) => {
    switchCompany(companyId);
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-3xl font-bold text-charcoal">Select company</h1>
      <p className="mt-2 text-sm text-muted">Choose the workspace you want to open.</p>
      <div className="mt-6 space-y-3">
        {activeCompanies.map((company) => {
          const suspended = company.status === "suspended";
          const trialDays = company.status === "trial" ? daysRemaining(company.trialEndsAt) : null;
          return (
            <button
              key={company.id}
              className={`w-full rounded-card border p-4 text-left ${
                suspended ? "cursor-not-allowed bg-slate-100 opacity-70" : "bg-card hover:border-gold"
              }`}
              disabled={suspended}
              onClick={() => selectCompany(company.id)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-charcoal">{company.name}</div>
                  <div className="text-xs text-muted">{company.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border px-2 py-1 text-xs">{company.planName}</span>
                  <span className="rounded-full border px-2 py-1 text-xs capitalize">{company.status}</span>
                  {trialDays !== null ? (
                    <span className="rounded-full border px-2 py-1 text-xs">{trialDays} days left</span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <button
        className="mt-6 rounded-btn bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold/90"
        onClick={() => navigate("/onboarding/create-company")}
        type="button"
      >
        Create new company
      </button>
    </div>
  );
};

