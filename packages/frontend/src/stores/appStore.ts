import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  shortcutsHelpOpen: boolean;
  tallyMode: boolean;
  currentFinancialYear: string;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsHelpOpen: (open: boolean) => void;
  setTallyMode: (enabled: boolean) => void;
  setCurrentFinancialYear: (fy: string) => void;
}

const getStoredTallyMode = (): boolean => {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("app_tally_mode");
  return stored !== null ? stored === "true" : true;
};

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  shortcutsHelpOpen: false,
  tallyMode: getStoredTallyMode(),
  currentFinancialYear: "FY 2024-25",
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsHelpOpen: (open) => set({ shortcutsHelpOpen: open }),
  setTallyMode: (enabled) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("app_tally_mode", String(enabled));
    }
    set({ tallyMode: enabled });
  },
  setCurrentFinancialYear: (fy) => set({ currentFinancialYear: fy }),
}));
