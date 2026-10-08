import type { CompanySummary, UserProfile } from "@jewelledger/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  companies: CompanySummary[];
  currentCompanyId: string | null;
  setAuth: (payload: {
    user: UserProfile;
    token: string;
    refreshToken?: string;
    companies: CompanySummary[];
    currentCompanyId?: string | null;
  }) => void;

  switchCompany: (companyId: string) => void;
  updateCompany: (companyId: string, payload: Partial<CompanySummary>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      companies: [],
      currentCompanyId: null,
      setAuth: ({ user, token, refreshToken, companies, currentCompanyId }) =>
        set({
          user,
          token,
          refreshToken: refreshToken ?? null,
          companies,
          currentCompanyId: currentCompanyId ?? companies[0]?.id ?? null,
        }),
      switchCompany: (companyId) => set({ currentCompanyId: companyId }),
      updateCompany: (companyId, payload) =>
        set((state) => ({
          companies: state.companies.map((c) =>
            c.id === companyId ? { ...c, ...payload } : c
          ),
        })),
      logout: () => set({ user: null, token: null, refreshToken: null, companies: [], currentCompanyId: null }),
    }),
    {
      name: "auth-storage",
    }
  )
);
