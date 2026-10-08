import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  currentFinancialYear: string;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCurrentFinancialYear: (fy: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  currentFinancialYear: "FY 2024-25",
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setCurrentFinancialYear: (fy) => set({ currentFinancialYear: fy }),
}));
