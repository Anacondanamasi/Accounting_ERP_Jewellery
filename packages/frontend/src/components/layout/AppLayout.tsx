import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../shared/CommandPalette";
import { GlobalShortcuts } from "../shared/GlobalShortcuts";
import { GlobalTooltip } from "../shared/GlobalTooltip";
import { WorkstationLockModal } from "../auth/WorkstationLockModal";
import { KeyboardShortcutsModal } from "../shortcuts/KeyboardShortcutsModal";

export const AppLayout = () => {
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const commandPaletteOpen = useAppStore((state) => state.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen);

  return (
    <div key={currentCompanyId ?? "no-org"} className="min-h-screen bg-canvas print:bg-white print:min-h-0">
      <GlobalShortcuts />
      <GlobalTooltip />
      <Sidebar />
      <Header />
      <main className="pl-sidebar pt-header print:p-0 print:m-0">
        <div className="min-h-[calc(100vh-var(--header-h))] p-6 print:p-0 print:m-0 print:min-h-0">
          <Outlet />
        </div>
      </main>
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <KeyboardShortcutsModal />
      <WorkstationLockModal />
    </div>
  );
};
