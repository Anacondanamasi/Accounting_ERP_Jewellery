import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";

const matrix: Record<string, string[]> = {
  ADMIN: ["*"],
  OWNER: ["*"],
  MANAGER: ["read:*", "write:inventory.adjustments.approve"],
  ACCOUNTANT: ["read:*", "write:journal", "write:invoices", "write:bills"],
  SALES: ["read:customers", "read:invoices", "write:customers", "write:invoices"],
  VIEW_ONLY: ["read:*"],
  VIEWER: ["read:*"],
};

export const usePermission = () => {
  const role = useAuthStore((state) => {
    const comp = state.companies.find((c) => c.id === state.currentCompanyId) ?? state.companies[0];
    return (comp?.role ?? "VIEW_ONLY").toUpperCase();
  });

  return useMemo(
    () => ({
      can: (action: "read" | "write" | "delete" | "approve", module: string): boolean => {
        const rules = matrix[role] ?? [];
        return (
          rules.includes("*") ||
          rules.includes(`${action}:*`) ||
          rules.includes(`${action}:${module}`)
        );
      },
    }),
    [role],
  );
};
