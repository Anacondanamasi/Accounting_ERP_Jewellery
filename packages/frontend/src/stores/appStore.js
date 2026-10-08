import { create } from "zustand";
export const useAppStore = create((set) => ({
    sidebarCollapsed: false,
    commandPaletteOpen: false,
    currentFinancialYear: "FY 2024-25",
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    setCurrentFinancialYear: (fy) => set({ currentFinancialYear: fy }),
}));
