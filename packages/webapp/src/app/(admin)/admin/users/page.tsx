"use client";

import { AppShell } from "@/components/layout/app-shell";
import { UserManagement } from "@/components/admin/user-management";

export default function AdminUsersPage() {
  return (
    <AppShell>
      <UserManagement />
    </AppShell>
  );
}
