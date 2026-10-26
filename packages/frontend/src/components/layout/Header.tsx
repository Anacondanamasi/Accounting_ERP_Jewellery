
import { Bell, Search, LogOut, User, Building2, Lock, Keyboard } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { api } from "@/lib/axios";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { companyService } from "@/services/companyService";
import { triggerWorkstationLock } from "@/components/auth/WorkstationLockModal";


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
  const setShortcutsHelpOpen = useAppStore((state) => state.setShortcutsHelpOpen);
  const user = useAuthStore((state) => state.user);
  const companies = useAuthStore((state) => state.companies);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const switchCompany = useAuthStore((state) => state.switchCompany);

  const currentCompany = useMemo(
    () => companies.find((company) => company.id === currentCompanyId),
    [companies, currentCompanyId],
  );

  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleHeaderLogout = () => {
    setProfileMenuOpen(false);
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <header className="fixed right-0 top-0 z-20 flex h-header items-center justify-between border-b border-border bg-card px-6 print:hidden" style={{ left: "var(--sidebar-w)" }}>
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
        <button
          onClick={() => triggerWorkstationLock()}
          className="relative rounded-full p-2 text-muted hover:bg-slate-100 hover:text-charcoal transition-colors"
          type="button"
          title="Lock Workstation (PIN lock)"
        >
          <Lock className="h-4 w-4" />
        </button>
        <button className="relative rounded-full p-2 hover:bg-slate-100" type="button">
          <Bell className="h-5 w-5 text-charcoal" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 rounded-full bg-ruby px-1.5 text-[10px] text-white">
              {unread}
            </span>
          )}
        </button>
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full bg-gold text-xs font-semibold text-white cursor-pointer hover:ring-2 hover:ring-gold/50 transition-all"
            title="User account menu"
          >
            {initials}
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-card border border-border bg-white shadow-modal z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="border-b border-border px-4 py-2.5">
                <div className="font-medium text-xs text-charcoal truncate">{user?.fullName || "User"}</div>
                <div className="text-[11px] text-muted truncate">{user?.email}</div>
                <div className="mt-1 inline-block rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gold">
                  {currentCompany?.role ?? "viewer"}
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/settings/company");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs text-charcoal hover:bg-slate-50 transition-colors"
                >
                  <Building2 className="h-4 w-4 text-muted" />
                  Organisation Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/settings/team");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs text-charcoal hover:bg-slate-50 transition-colors"
                >
                  <User className="h-4 w-4 text-muted" />
                  Team & Permissions
                </button>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    triggerWorkstationLock();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-charcoal hover:bg-slate-50 transition-colors"
                >
                  <Lock className="h-4 w-4 text-gold" />
                  Lock Workstation
                </button>
                <button
                  type="button"
                  onClick={handleHeaderLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-ruby hover:bg-ruby/5 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-ruby" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
