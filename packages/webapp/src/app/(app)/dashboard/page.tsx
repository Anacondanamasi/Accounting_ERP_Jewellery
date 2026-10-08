"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { role, email, isLoading } = useAuth();

  return (
    <AppShell>
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">User Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isLoading ? "Loading session..." : `Signed in as ${email ?? "Unknown user"}`}
          </p>
          <p className="mt-1 text-sm text-slate-600">Role: {role}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Active Session", value: isLoading ? "..." : "Live" },
            { label: "Supabase Auth", value: "Connected" },
            { label: "Role Access", value: role.toUpperCase() }
          ].map((item) => (
            <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
            </article>
          ))}
        </div>

        {role === "admin" ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Admin Shortcuts</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
              >
                Open Admin Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-900 hover:bg-slate-200"
              >
                Manage Users
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
