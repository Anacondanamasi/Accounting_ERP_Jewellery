import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
const daysRemaining = (trialEndsAt) => {
    if (!trialEndsAt)
        return null;
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};
export const SelectCompanyPage = () => {
    const navigate = useNavigate();
    const companies = useAuthStore((state) => state.companies);
    const switchCompany = useAuthStore((state) => state.switchCompany);
    const activeCompanies = useMemo(() => companies.filter((company) => company.membershipStatus === "active"), [companies]);
    const selectCompany = (companyId) => {
        switchCompany(companyId);
        navigate("/");
    };
    return (_jsxs("div", { className: "mx-auto max-w-3xl p-6", children: [_jsx("h1", { className: "font-display text-3xl font-bold text-charcoal", children: "Select company" }), _jsx("p", { className: "mt-2 text-sm text-muted", children: "Choose the workspace you want to open." }), _jsx("div", { className: "mt-6 space-y-3", children: activeCompanies.map((company) => {
                    const suspended = company.status === "suspended";
                    const trialDays = company.status === "trial" ? daysRemaining(company.trialEndsAt) : null;
                    return (_jsx("button", { className: `w-full rounded-card border p-4 text-left ${suspended ? "cursor-not-allowed bg-slate-100 opacity-70" : "bg-card hover:border-gold"}`, disabled: suspended, onClick: () => selectCompany(company.id), type: "button", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-charcoal", children: company.name }), _jsx("div", { className: "text-xs text-muted", children: company.role })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "rounded-full border px-2 py-1 text-xs", children: company.planName }), _jsx("span", { className: "rounded-full border px-2 py-1 text-xs capitalize", children: company.status }), trialDays !== null ? (_jsxs("span", { className: "rounded-full border px-2 py-1 text-xs", children: [trialDays, " days left"] })) : null] })] }) }, company.id));
                }) }), _jsx("button", { className: "mt-6 rounded-btn bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold/90", onClick: () => navigate("/onboarding/create-company"), type: "button", children: "Create new company" })] }));
};
