import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "@/lib/nav";
import { usePermissionChecks } from "@/lib/permissions";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";


export const Sidebar = () => {
  const location = useLocation();
  const { currentFinancialYear } = useAppStore();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
    NAV_ITEMS.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.group] = true;
      return acc;
    }, {}),
  );

  const user = useAuthStore((state) => state.user);
  const companies = useAuthStore((state) => state.companies);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);

  const currentCompany = useMemo(
    () => companies.find((c) => c.id === currentCompanyId),
    [companies, currentCompanyId],
  );

  const activePath = location.pathname;
  const { hasPathPermission } = usePermissionChecks();

  const fullName = user?.fullName || "System User";
  const initials = useMemo(
    () =>
      fullName
        .split(" ")
        .map((part) => part[0]?.toUpperCase())
        .slice(0, 2)
        .join(""),
    [fullName],
  );


  return (
    <aside className="watermark-diagonal fixed left-0 top-0 z-30 h-screen w-sidebar overflow-y-auto bg-charcoal text-white">
      <div className="border-b border-white/10 px-5 pb-4 pt-5">
        <div className="mb-2 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gold font-display font-bold text-white">
            JL
          </div>
          <div>
            <div className="font-display text-base font-semibold">JewelLedger Pro</div>
            <div className="text-[11px] text-muted">{currentCompany?.name || "Company Name"}</div>
          </div>
        </div>
      </div>


      <nav className="space-y-2 py-3">
        {NAV_ITEMS.map((group) => {
          const isCollapsed = collapsedGroups[group.group] ?? false;
          return (
            <div key={group.group} className="px-0">
              <button
                className="flex w-full items-center justify-between px-5 pb-1 pt-2 text-left text-[10px] font-semibold tracking-[0.2em] text-muted"
                onClick={() =>
                  setCollapsedGroups((prev) => ({ ...prev, [group.group]: !isCollapsed }))
                }
                type="button"
              >
                {group.group}
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {!isCollapsed && (
                <div className="space-y-[2px]">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePath === item.path;
                    const hasAccess = hasPathPermission(item.path);
                    return (
                      <NavLink
                        key={item.path}
                        to={hasAccess ? item.path : "#"}
                        onClick={(event) => {
                          if (!hasAccess) event.preventDefault();
                        }}
                        title={hasAccess ? undefined : "Contact your admin"}
                        className={`flex items-center gap-2 px-5 py-2 text-sm transition ${
                          isActive
                            ? "border-l-[3px] border-gold bg-gold-tint/90 text-gold"
                            : hasAccess
                              ? "text-white/65 hover:bg-white/5 hover:text-white"
                              : "cursor-not-allowed text-white/35"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {!hasAccess ? <span className="ml-auto text-[10px] text-white/40">Locked</span> : null}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-4 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-gold text-xs font-semibold text-white">
          {initials}
        </div>
          <div className="min-w-0">
          <div className="truncate text-xs font-medium text-white">{fullName}</div>
          <div className="text-[11px] text-muted">{currentCompany?.role ?? "Viewer"}</div>
        </div>
      </div>
    </aside>
  );
};
