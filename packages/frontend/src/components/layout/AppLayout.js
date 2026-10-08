import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../shared/CommandPalette";
import { GlobalShortcuts } from "../shared/GlobalShortcuts";
import { GlobalTooltip } from "../shared/GlobalTooltip";
export const AppLayout = () => {
    const commandPaletteOpen = useAppStore((state) => state.commandPaletteOpen);
    const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen);
    return (_jsxs("div", { className: "min-h-screen bg-canvas", children: [_jsx(GlobalShortcuts, {}), _jsx(GlobalTooltip, {}), _jsx(Sidebar, {}), _jsx(Header, {}), _jsx("main", { className: "pl-sidebar pt-header", children: _jsx("div", { className: "min-h-[calc(100vh-var(--header-h))] p-6", children: _jsx(Outlet, {}) }) }), _jsx(CommandPalette, { open: commandPaletteOpen, onClose: () => setCommandPaletteOpen(false) })] }));
};
