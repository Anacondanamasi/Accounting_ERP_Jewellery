"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminDashboardPage() {
  return (
    <AppShell>
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">Admin Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">
            This area is protected by role checks in middleware and Supabase RLS.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "User Management",
              body: "CRUD operations, role updates, and access control checks.",
              href: "/admin/users"
            },
            {
              title: "Feature Parity Mapping",
              body: "Map each mobile screen to a web route and shared service.",
              href: "/dashboard"
            },
            {
              title: "Supabase Governance",
              body: "RLS-first architecture with no direct privileged key exposure.",
              href: "/dashboard"
            }
          ].map((card) => (
            <article key={card.title} className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{card.body}</p>
              <Link
                href={card.href}
                className="mt-3 inline-block text-sm font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Open
              </Link>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
