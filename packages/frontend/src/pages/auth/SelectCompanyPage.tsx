import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { companyService } from "@/services/companyService";

const daysRemaining = (trialEndsAt?: string | null) => {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

export const SelectCompanyPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companies = useAuthStore((state) => state.companies);
  const switchCompany = useAuthStore((state) => state.switchCompany);

  const activeCompanies = useMemo(
    () => companies.filter((company) => company.membershipStatus === "active"),
    [companies],
  );

  const selectCompany = async (companyId: string) => {
    try {
      const res = await companyService.switch(companyId);
      if (res?.accessToken) {
        useAuthStore.setState({ token: res.accessToken, currentCompanyId: companyId });
      } else {
        switchCompany(companyId);
      }
      queryClient.clear();
      navigate("/");
    } catch {
      switchCompany(companyId);
      navigate("/");
    }
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
                  <div className="font-semibold text-charcoal">{company.name}</div>
                  <div className="text-xs text-muted">Role: {company.role}</div>
                </div>
                <div className="text-right text-xs">
                  <span className="rounded bg-slate-100 px-2 py-1 font-medium capitalize text-slate-700">
                    {company.status}
                  </span>
                  {trialDays !== null && (
                    <div className="mt-1 text-muted">{trialDays} days left in trial</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
