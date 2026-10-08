import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useAuthStore = create()(persist((set) => ({
    user: null,
    token: null,
    refreshToken: null,
    companies: [],
    currentCompanyId: null,
    setAuth: ({ user, token, refreshToken, companies, currentCompanyId }) => set({
        user,
        token,
        refreshToken: refreshToken ?? null,
        companies,
        currentCompanyId: currentCompanyId ?? companies[0]?.id ?? null,
    }),
    switchCompany: (companyId) => set({ currentCompanyId: companyId }),
    updateCompany: (companyId, payload) => set((state) => ({
        companies: state.companies.map((c) => c.id === companyId ? { ...c, ...payload } : c),
    })),
    logout: () => set({ user: null, token: null, refreshToken: null, companies: [], currentCompanyId: null }),
}), {
    name: "auth-storage",
}));
