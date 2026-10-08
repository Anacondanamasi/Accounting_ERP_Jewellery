import { useAuthStore } from "@/stores/authStore";
const permissionForPath = (path) => {
    if (path.startsWith("/journal"))
        return "journal.view";
    if (path.startsWith("/invoices"))
        return "invoice.view";
    if (path.startsWith("/bills"))
        return "bill.view";
    if (path.startsWith("/banking"))
        return "bank.view";
    if (path.startsWith("/payroll"))
        return "payroll.view";
    if (path.startsWith("/reports"))
        return "report.view";
    if (path.startsWith("/settings/company"))
        return "settings.company.update";
    if (path.startsWith("/settings/users") || path.startsWith("/settings/team"))
        return "user_management.view";
    return null;
};
export const usePermissionChecks = () => {
    const companies = useAuthStore((state) => state.companies);
    const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
    const currentCompany = companies.find((company) => company.id === currentCompanyId);
    const permissions = currentCompany?.permissions ?? [];
    const role = (currentCompany?.role ?? "").toLowerCase();
    const hasRoleBypass = role === "owner" || role === "admin";
    const hasPermission = (code) => hasRoleBypass || permissions.includes(code);
    const hasPathPermission = (path) => {
        const code = permissionForPath(path);
        if (!code)
            return true;
        return hasPermission(code);
    };
    return {
        hasPermission,
        hasPathPermission,
    };
};
