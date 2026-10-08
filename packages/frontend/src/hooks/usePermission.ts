import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";

const matrix: Record<string, string[]> = {
  ADMIN: ["*"],
  MANAGER: ["read:*", "write:inventory.adjustments.approve"],
  ACCOUNTANT: ["read:*", "write:journal", "write:invoices", "write:bills"],
  SALES: ["read:customers", "read:invoices", "write:customers", "write:invoices"],
  VIEW_ONLY: ["read:*"],
};

export const usePermission = () => {
  const role = useAuthStore((state) => state.user?.role ?? "VIEW_ONLY");
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
