import { Bell, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { api } from "@/lib/axios";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { companyService } from "@/services/companyService";


const labelFromPath = (path: string): string =>
  path
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

  const currentCompany = useMemo(
    () => companies.find((company) => company.id === currentCompanyId),
    [companies, currentCompanyId],
  );

  const initials = useMemo(() => {
    if (!user?.fullName) return "??";
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
      } catch {
        setUnread(0);
      }
    };
    loadUnreadCount();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandPaletteOpen]);

  const queryClient = useQueryClient();

  const handleCompanyChange = async (newCompanyId: string) => {
    if (!newCompanyId || newCompanyId === currentCompanyId) return;
    try {
      queryClient.clear();
      switchCompany(newCompanyId);
      await companyService.switch(newCompanyId);
      toast.success("Switched organisation");
    } catch (err) {
      console.error("Failed to switch organisation:", err);
    }
  };

  return (
    <header className="fixed right-0 top-0 z-20 flex h-header items-center justify-between border-b border-border bg-card px-6" style={{ left: "var(--sidebar-w)" }}>
      <div className="text-sm font-medium text-charcoal">{breadcrumb}</div>
      <button
        className="flex w-[380px] items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2 text-left text-sm text-muted"
        onClick={() => setCommandPaletteOpen(true)}
        type="button"
      >
        <Search className="h-4 w-4" />
        Search invoices, customers, items, accounts...
        <span className="ml-auto rounded bg-white px-2 py-[2px] font-mono text-[11px] text-slate-500">
          Cmd+K
        </span>
      </button>
      <div className="flex items-center gap-4">
        <select
          className="h-9 rounded border border-border bg-white px-2 text-xs text-charcoal"
          value={currentCompanyId ?? ""}
          onChange={(event) => void handleCompanyChange(event.target.value)}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <span className="rounded-full border border-border px-2 py-1 text-xs capitalize">
          {currentCompany?.role ?? "viewer"}
        </span>
        <div className="text-sm text-muted">{format(new Date(), "dd MMM yyyy")}</div>
        <button className="relative rounded-full p-2 hover:bg-slate-100" type="button">
          <Bell className="h-5 w-5 text-charcoal" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 rounded-full bg-ruby px-1.5 text-[10px] text-white">
              {unread}
            </span>
          )}
        </button>
        <div className="grid h-8 w-8 place-items-center rounded-full bg-gold text-xs font-semibold text-white">
          {initials}
        </div>

      </div>
    </header>
  );
};
