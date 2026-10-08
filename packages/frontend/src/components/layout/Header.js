import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { api } from "@/lib/axios";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { QuickCreateMenu } from "@/components/shared/QuickCreateMenu";
const labelFromPath = (path) => path
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("-", " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ") || "Dashboard";
export const Header = () => {
    const location = useLocation();
    const breadcrumb = useMemo(() => labelFromPath(location.pathname), [location.pathname]);
    const [unread, setUnread] = useState(0);
    const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen);
    const user = useAuthStore((state) => state.user);
    const companies = useAuthStore((state) => state.companies);
    const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
    const switchCompany = useAuthStore((state) => state.switchCompany);
    const currentCompany = useMemo(() => companies.find((company) => company.id === currentCompanyId), [companies, currentCompanyId]);
    const initials = useMemo(() => {
        if (!user?.fullName)
            return "??";
        return user.fullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }, [user]);
    useEffect(() => {
        const loadUnreadCount = async () => {
            try {
                const response = await api.get("/notifications/unread-count");
                setUnread(response.data.data.count ?? 0);
            }
            catch {
                setUnread(0);
            }
        };
        loadUnreadCount();
    }, []);
    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setCommandPaletteOpen(true);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [setCommandPaletteOpen]);
    return (_jsxs("header", { className: "fixed right-0 top-0 z-20 flex h-header items-center justify-between border-b border-border bg-card px-6", style: { left: "var(--sidebar-w)" }, children: [_jsx("div", { className: "text-sm font-medium text-charcoal", children: breadcrumb }), _jsxs("button", { className: "flex w-[380px] items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2 text-left text-sm text-muted", onClick: () => setCommandPaletteOpen(true), type: "button", children: [_jsx(Search, { className: "h-4 w-4" }), "Search invoices, customers, items, accounts...", _jsx("span", { className: "ml-auto rounded bg-white px-2 py-[2px] font-mono text-[11px] text-slate-500", children: "Cmd+K" })] }), _jsx(QuickCreateMenu, {}), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("select", { className: "h-9 rounded border border-border bg-white px-2 text-xs text-charcoal", value: currentCompanyId ?? "", onChange: (event) => switchCompany(event.target.value), children: companies.map((company) => (_jsx("option", { value: company.id, children: company.name }, company.id))) }), _jsx("span", { className: "rounded-full border border-border px-2 py-1 text-xs capitalize", children: currentCompany?.role ?? "viewer" }), _jsx("div", { className: "text-sm text-muted", children: format(new Date(), "dd MMM yyyy") }), _jsxs("button", { className: "relative rounded-full p-2 hover:bg-slate-100", type: "button", children: [_jsx(Bell, { className: "h-5 w-5 text-charcoal" }), unread > 0 && (_jsx("span", { className: "absolute right-1 top-1 rounded-full bg-ruby px-1.5 text-[10px] text-white", children: unread }))] }), _jsx("div", { className: "grid h-8 w-8 place-items-center rounded-full bg-gold text-xs font-semibold text-white", children: initials })] })] }));
};
