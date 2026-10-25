import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../shared/CommandPalette";
import { GlobalShortcuts } from "../shared/GlobalShortcuts";
import { GlobalTooltip } from "../shared/GlobalTooltip";

export const AppLayout = () => {
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const commandPaletteOpen = useAppStore((state) => state.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen);

  return (
    <div key={currentCompanyId ?? "no-org"} className="min-h-screen bg-canvas">
      <GlobalShortcuts />
      <GlobalTooltip />
      <Sidebar />
      <Header />
      <main className="pl-sidebar pt-header">
        <div className="min-h-[calc(100vh-var(--header-h))] p-6">
          <Outlet />
        </div>
      </main>
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
};
