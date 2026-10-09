"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/common/button";

interface NavItem {
  href: string;
  label: string;
}

const userNav: NavItem[] = [{ href: "/dashboard", label: "Dashboard" }];
const adminNav: NavItem[] = [
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/admin/users", label: "Users" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, email, signOut } = useAuth();
  const nav = role === "admin" ? [...adminNav, ...userNav] : userNav;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm text-slate-500">HKS Accounting</p>
            <h1 className="text-lg font-semibold text-slate-900">Control Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-slate-500 md:block">{email}</p>
            <Button
              variant="secondary"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-3">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
