import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Globe,
  Layers,
  Lock,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Users2,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export const LandingPage = () => {
  const token = useAuthStore((state) => state.token);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1a1d23] font-body selection:bg-gold/20 selection:text-charcoal">
      {/* ── Navigation Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#e8e2d5]/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold font-display text-sm font-bold tracking-wider text-white shadow-md shadow-gold/20">
              HKS
            </div>
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-charcoal">
                HKS Accounting
              </span>
              <span className="ml-2 hidden rounded-full bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold sm:inline-block">
                Enterprise Cloud
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted hover:text-charcoal transition-colors">
              Features
            </a>
            <a href="#multi-tenancy" className="text-sm font-medium text-muted hover:text-charcoal transition-colors">
              Multi-Entity
            </a>
            <a href="#comparison" className="text-sm font-medium text-muted hover:text-charcoal transition-colors">
              Compare
            </a>
            <a href="#faq" className="text-sm font-medium text-muted hover:text-charcoal transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {token ? (
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-btn bg-gold px-5 text-sm font-medium text-white shadow-sm hover:bg-gold-light transition-all"
              >
                Go to App
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex h-10 items-center justify-center rounded-btn px-4 text-sm font-medium text-charcoal hover:bg-black/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-10 items-center justify-center rounded-btn bg-gold px-5 text-sm font-medium text-white shadow-sm shadow-gold/25 hover:bg-gold/90 transition-all hover:scale-[1.02]"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36">
        <div className="pointer-events-none absolute -top-40 right-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -right-20 -z-10 h-[400px] w-[400px] rounded-full bg-emerald/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-tint px-4 py-1.5 text-xs font-semibold text-gold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Sparkles className="h-4 w-4" /> Next-Gen Cloud Accounting with Full Multi-Tenant Isolation
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-charcoal max-w-4xl mx-auto leading-[1.1]">
            Financial Clarity & Intelligent Accounting for{" "}
            <span className="bg-gradient-to-r from-gold to-[#a27116] bg-clip-text text-transparent">
              Modern Enterprises
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            Manage multi-company ledgers, GST-compliant invoicing, jewelry bullion valuation, and automated reconciliation inside one blazing-fast, isolated platform.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-btn bg-gold px-7 text-base font-medium text-white shadow-lg shadow-gold/25 hover:bg-gold/90 transition-all hover:scale-105"
            >
              Start 14-Day Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-btn border border-border bg-white px-7 text-base font-medium text-charcoal shadow-sm hover:bg-slate-50 transition-all"
            >
              Sign In to Organisation
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted">
            No credit card required • Instant tenant setup • Full Xero & QuickBooks migration support
          </p>

          {/* Interactive Hero Preview Board */}
          <div className="mt-14 rounded-2xl border border-border/80 bg-white/70 p-3 shadow-2xl shadow-black/5 backdrop-blur-xl">
            <div className="rounded-xl border border-border/60 bg-white p-6 sm:p-8 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl font-bold text-charcoal">Mehta Jewellers Pvt Ltd</span>
                    <span className="rounded-full bg-emerald/10 px-2.5 py-0.5 text-xs font-semibold text-emerald">
                      Active Organisation
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">Multi-Entity Cloud Switcher • Current FY 2026-2027 • Currency: INR (₹)</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-border bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                    Role: Organisation Owner
                  </span>
                  <span className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-white shadow-sm">
                    Live Data Scoped
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50/80 p-4 border border-border/40">
                  <span className="text-xs text-muted font-medium">Total Receivables</span>
                  <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-charcoal">₹ 42,85,900</div>
                  <span className="text-[11px] text-emerald font-semibold">↑ 14.2% vs last month</span>
                </div>
                <div className="rounded-lg bg-slate-50/80 p-4 border border-border/40">
                  <span className="text-xs text-muted font-medium">Total Payables</span>
                  <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-charcoal">₹ 18,40,250</div>
                  <span className="text-[11px] text-muted">7 bills due this week</span>
                </div>
                <div className="rounded-lg bg-slate-50/80 p-4 border border-border/40">
                  <span className="text-xs text-muted font-medium">Bullion Stock (24K Gold)</span>
                  <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-charcoal">1,450.25 g</div>
                  <span className="text-[11px] text-gold font-semibold">Live market valuation</span>
                </div>
                <div className="rounded-lg bg-slate-50/80 p-4 border border-border/40">
                  <span className="text-xs text-muted font-medium">Net Profit (YTD)</span>
                  <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-emerald">₹ 14,75,400</div>
                  <span className="text-[11px] text-emerald font-semibold">Healthy gross margins</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Architecture & Multi-Tenancy (GEO Optimized Content) ── */}
      <section id="multi-tenancy" className="border-t border-border bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-charcoal">
              Engineered for Multi-Company Groups & Professional Advisors
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted">
              Unlike traditional single-tenant accounting systems, HKS Accounting allows external accountants and multi-brand founders to switch seamlessly across dozens of business entities without data leaks.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-[#faf8f5] p-8 shadow-sm hover:border-gold/40 transition-colors">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-gold/10 text-gold mb-6">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-charcoal">Instant Organisation Switching</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Switch between your retail outlet, wholesale division, and manufacturing firm with one click. Memory cache is instantly purged on each switch to guarantee zero data leakage between client entities.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-[#faf8f5] p-8 shadow-sm hover:border-gold/40 transition-colors">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-sapphire/10 text-sapphire mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-charcoal">Strict Tenant Isolation & Security</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Every ledger, invoice, and customer record carries mandatory organisation scoping. Enforced database indexes and server-side RBAC ensure complete protection against unauthorized cross-tenant queries.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-[#faf8f5] p-8 shadow-sm hover:border-gold/40 transition-colors">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald/10 text-emerald mb-6">
                <Users2 className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-charcoal">Granular Roles & Advisor Access</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Assign tailored permissions: Owner, Admin, Accountant, Bookkeeper, Standard User, Read-Only, or External Advisor. Safeguard sensitive records with strict last-owner transfer enforcement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Accounting Features ── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/60 px-3 py-1 text-xs font-semibold text-slate-700 mb-3">
              Comprehensive Financial Engine
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-charcoal">
              Everything Your Accounting Team Demands
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FileSpreadsheet,
                title: "Real-Time Double-Entry Ledger",
                desc: "Compliant general ledger with automatic debit/credit balancing, trial balance, profit & loss, and balance sheets.",
              },
              {
                icon: Receipt,
                title: "Tax & GST Ready Invoicing",
                desc: "Generate professional tax invoices, credit notes, and debit notes with HSN codes, multi-tax breakdowns, and customer ledgers.",
              },
              {
                icon: Scale,
                title: "Precious Metals & Jewelry Inventory",
                desc: "Integrated karigar tracking, metal rates (24K, 22K, 18K), weight calculations, and item master management.",
              },
              {
                icon: Zap,
                title: "High-Speed Keyset Pagination",
                desc: "Designed to handle 100K+ transactions, invoices, and audit logs with p95 latency under 200ms.",
              },
              {
                icon: Database,
                title: "Comprehensive Audit Trail",
                desc: "Every record mutation captures actor identity, IP address, old values, new values, and immutable timestamps.",
              },
              {
                icon: Globe,
                title: "Multi-Currency & Fiscal Calendars",
                desc: "Configure regional fiscal years (April-March, January-December), multiple currencies, and timezone support per organisation.",
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="rounded-xl border border-border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/10 text-gold mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-charcoal">{f.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison Table (SEO & Decision Maker Content) ── */}
      <section id="comparison" className="border-t border-border bg-white py-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-charcoal">
              Why Teams Choose HKS Accounting
            </h2>
            <p className="mt-3 text-sm text-muted">
              Built for businesses that have outgrown rigid single-entity desktop tools or overpriced cloud accounting packages.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-xs font-semibold text-charcoal">
                  <th className="py-4 px-6">Capability</th>
                  <th className="py-4 px-6 text-gold font-bold">HKS Accounting</th>
                  <th className="py-4 px-6 text-muted">Traditional Desktop ERP</th>
                  <th className="py-4 px-6 text-muted">Legacy Cloud Accounting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Multi-Tenant Switching", "Instant, zero data leak", "Not supported", "Separate logins required"],
                  ["Precious Metal Valuation", "Native 24k/22k rates", "Requires manual Excel", "Generic inventory only"],
                  ["Full Audit Trail Logging", "Immutable IP & diffs", "Limited / Local files", "Basic activity logs"],
                  ["High-Performance Indexing", "100K+ user optimized", "Slow on large databases", "Restricted rate limits"],
                  ["Fine-Grained Permissions", "Role & action based", "All or nothing", "Expensive add-on tiers"],
                ].map(([feature, hks, desktop, cloud], i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6 font-medium text-charcoal">{feature}</td>
                    <td className="py-3.5 px-6 font-semibold text-gold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald" /> {hks}
                    </td>
                    <td className="py-3.5 px-6 text-muted">{desktop}</td>
                    <td className="py-3.5 px-6 text-muted">{cloud}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ Section (GEO & Search LLM Friendly) ── */}
      <section id="faq" className="border-t border-border py-24 bg-[#faf8f5]">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-charcoal">Frequently Asked Questions</h2>
            <p className="mt-3 text-sm text-muted">
              Everything you need to know about self-registration, team invites, and multi-tenant security.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {[
              {
                q: "What is HKS Accounting?",
                a: "HKS Accounting is a high-performance, multi-tenant cloud accounting and ERP software engineered for businesses requiring robust financial ledgers, GST compliance, bullion/jewelry inventory tracking, and seamless multi-company management.",
              },
              {
                q: "Can one user belong to multiple companies and switch between them?",
                a: "Yes. Just like in Xero or QuickBooks, a single user identity can belong to multiple organisations with distinct roles. Switching between organisations takes one click and immediately purges local caches to guarantee data isolation.",
              },
              {
                q: "How does the team invitation system work?",
                a: "Organisation owners and admins can invite team members by email with specific roles (Admin, Accountant, Bookkeeper, Viewer, etc.). Invitations use secure SHA-256 hashed single-use tokens valid for 7 days.",
              },
              {
                q: "Is there protection against removing the last organisation owner?",
                a: "Yes. HKS Accounting enforces strict last-owner protection. An owner role cannot be demoted or removed without first transferring company ownership to another registered team member.",
              },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <h3 className="font-display text-lg font-bold text-charcoal">{faq.q}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-charcoal text-white/80 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-xs font-bold text-white">
              HKS
            </div>
            <span className="font-display text-lg font-bold text-white">HKS Accounting</span>
          </div>
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} HKS Accounting. All rights reserved. Cloud Accounting & Multi-Tenant ERP.
          </p>
          <div className="flex items-center gap-6 text-xs text-white/60">
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
