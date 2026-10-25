import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { KPICard } from "@/components/shared/KPICard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import { supplierService } from "@/services/supplierService";
import { Truck, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { SupplierFormModal } from "./SupplierFormModal";

type TabKey = "ledger" | "bills" | "payments" | "notes";

const toN = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const fmtDate = (v: unknown) => {
  if (!v) return "";
  try { return format(new Date(String(v)), "dd-MM-yyyy"); } catch { return ""; }
};

const dueBadge = (dueInDays: number | null) => {
  if (dueInDays === null) return null;
  if (dueInDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ruby/10 px-2 py-0.5 text-[11px] font-semibold text-ruby">
        <Clock className="h-3 w-3" />
        {Math.abs(dueInDays)}d overdue
      </span>
    );
  }
  if (dueInDays === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        Due today
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
      in {dueInDays}d
    </span>
  );
};

export const SupplierDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("ledger");
  const [search, setSearch] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);

  /* ── ESC: return to ledger tab or suppliers list ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (tab !== "ledger") setTab("ledger");
      else navigate("/suppliers");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab, navigate]);

  const { data: detail, isLoading, isError, refetch } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => supplierService.getById(id),
  });
  const { data: ledger } = useQuery({
    queryKey: ["supplier-ledger", id],
    queryFn: () => supplierService.getLedger(id, {}),
    enabled: Boolean(id),
  });
  const { data: bills } = useQuery({
    queryKey: ["supplier-bills", id],
    queryFn: () => supplierService.getBills(id),
    enabled: Boolean(id),
  });

  const payments = useMemo(
    () =>
      (bills ?? []).flatMap((bill: any) =>
        (bill.payments ?? []).map((payment: any) => ({ ...payment, billNo: bill.billNo }))
      ),
    [bills],
  );

  const ledgerRows: any[] = useMemo(() => {
    const rows = ledger?.rows ?? [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r: any) =>
        r.number?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q) ||
        r.reference?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q),
    );
  }, [ledger, search]);

  if (isError) {
    return (
      <EmptyState
        actionLabel="Back to list"
        description="The requested supplier could not be loaded."
        icon={Truck}
        onAction={() => navigate("/suppliers")}
        title="Supplier not found"
      />
    );
  }

  if (isLoading || !detail) {
    return <div className="rounded-card bg-card p-6 shadow-card">Loading supplier...</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={detail.name}
        subtitle={`${detail.code} · ${detail.city ?? "—"} · ${detail.category ?? "—"}`}
        actions={
          <>
            <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => navigate("/suppliers")} type="button">
              Back
            </button>
            <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={() => setEditModalOpen(true)} type="button">
              Edit
            </button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 xl:grid-cols-4">
        <KPICard title="Total Purchases"  value={formatCurrency(toN(ledger?.totalInvoiced ?? detail.totalBusiness))} />
        <KPICard title="Outstanding"      value={formatCurrency(toN(ledger?.totalOutstanding ?? detail.outstanding))} trendDirection={toN(detail.outstanding) > 0 ? "up" : "down"} />
        <KPICard title="Total Paid"       value={formatCurrency(toN(ledger?.totalPaid ?? 0))} />
        <KPICard title="Closing Balance"  value={formatCurrency(toN(ledger?.closingBalance ?? 0))} />
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-2">
        {([["ledger","Ledger"],["bills","Bills"],["payments","Payments"],["notes","Notes"]] as const).map(([key, label]) => (
          <button
            key={key}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${tab === key ? "bg-gold text-white" : "bg-slate-100 text-charcoal hover:bg-slate-200"}`}
            onClick={() => setTab(key)}
            type="button"
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-[11px] italic text-muted">Press Esc to go back</span>
      </div>

      {/* ── LEDGER tab ─────────────────────────────────────────────── */}
      {tab === "ledger" && (
        <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
          {/* Search bar */}
          <div className="border-b border-border px-4 py-3">
            <input
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              placeholder="Search by number, type, reference, status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-gold/5 text-left">
                <tr>
                  {["Type","Number","Reference","Issue Date","Due Date","Due in Days","Paid Date","Paid","Due","Total","Status",""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledgerRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted">
                      No transactions found.
                    </td>
                  </tr>
                )}
                {ledgerRows.map((row: any, i: number) => {
                  const isBill = row.type === "Bill";
                  const isDebitNote = row.type === "Purchase Debit Note";
                  const isOverdue = row.status === "OVERDUE";

                  return (
                    <tr
                      key={i}
                      className={`border-t border-border/60 transition-colors ${row.sourcePath ? "hover:bg-gold/5 cursor-pointer" : ""} ${isOverdue ? "bg-ruby/5" : ""}`}
                      onClick={() => row.sourcePath && navigate(row.sourcePath)}
                    >
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-xs ${isDebitNote ? "text-ruby" : isBill ? "text-charcoal" : row.type === "Journal Entry" ? "text-sapphire font-bold" : "text-emerald-600"}`}>
                          {row.type}
                        </span>
                      </td>

                      {/* Number */}
                      <td className="px-4 py-3">
                        {row.sourcePath ? (
                          <button
                            className="font-mono text-xs font-semibold text-sapphire underline underline-offset-2 hover:text-sapphire/70"
                            onClick={(e) => { e.stopPropagation(); navigate(row.sourcePath); }}
                            type="button"
                          >
                            {row.number}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-charcoal">{row.number}</span>
                        )}
                      </td>

                      {/* Reference */}
                      <td className="px-4 py-3 text-xs text-muted">{row.reference || "—"}</td>

                      {/* Issue Date */}
                      <td className="px-4 py-3 tabular-nums text-xs">{fmtDate(row.issueDate)}</td>

                      {/* Due Date */}
                      <td className={`px-4 py-3 tabular-nums text-xs ${isOverdue ? "text-ruby font-semibold" : ""}`}>
                        {row.dueDate ? fmtDate(row.dueDate) : "—"}
                      </td>

                      {/* Due in Days */}
                      <td className="px-4 py-3">{dueBadge(row.dueInDays)}</td>

                      {/* Paid Date */}
                      <td className="px-4 py-3 tabular-nums text-xs text-muted">{row.paidDate ? fmtDate(row.paidDate) : "—"}</td>

                      {/* Paid */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-xs font-semibold text-emerald-600">
                          {toN(row.paid) > 0 ? formatCurrency(toN(row.paid)) : "—"}
                        </span>
                      </td>

                      {/* Due amount */}
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-xs font-semibold ${toN(row.due) < 0 ? "text-ruby" : toN(row.due) > 0 ? "text-amber-600" : "text-muted"}`}>
                          {toN(row.due) < 0 ? `(${formatCurrency(Math.abs(toN(row.due)))})` : toN(row.due) > 0 ? formatCurrency(toN(row.due)) : "—"}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-xs font-bold ${isDebitNote ? "text-ruby" : "text-charcoal"}`}>
                          {formatCurrency(toN(row.total))}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {row.status ? <StatusBadge status={row.status} /> : null}
                      </td>

                      {/* Link icon */}
                      <td className="px-4 py-3 text-right">
                        {row.sourcePath && (
                          <ExternalLink className="h-3.5 w-3.5 text-muted hover:text-sapphire cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(row.sourcePath); }} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary footer */}
              {ledgerRows.length > 0 && (
                <tfoot className="bg-gold/8 font-bold text-sm border-t-2 border-border">
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted">
                      Closing Balance
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">
                      {formatCurrency(ledger?.totalPaid ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-600">
                      {formatCurrency(ledger?.totalOutstanding ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-charcoal">
                      {formatCurrency(Math.abs(toN(ledger?.closingBalance)))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Showing count */}
          <div className="border-t border-border px-4 py-2 text-[11px] text-muted">
            Showing {ledgerRows.length} of {ledger?.rows?.length ?? 0} item{(ledger?.rows?.length ?? 0) !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* ── BILLS tab ────────────────────────────────────────────── */}
      {tab === "bills" && (
        <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-gold/5">
                <tr>
                  {["Bill No","Date","Due Date","Status","Total","Balance"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(bills ?? []).map((bill: any) => (
                  <tr key={bill.id} className="border-t border-border/60 hover:bg-gold/5 cursor-pointer" onClick={() => navigate(`/bills/${bill.id}/edit`)}>
                    <td className="px-4 py-3">
                      <button className="font-mono text-sm font-semibold text-sapphire underline" type="button">{bill.billNo}</button>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-xs">{fmtDate(bill.date)}</td>
                    <td className="px-4 py-3 tabular-nums text-xs">{fmtDate(bill.dueDate)}</td>
                    <td className="px-4 py-3"><StatusBadge status={bill.status} /></td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold">{formatCurrency(bill.grandTotal)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-amber-600">{formatCurrency(bill.balanceDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAYMENTS tab ────────────────────────────────────────────── */}
      {tab === "payments" && (
        <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gold/5">
                <tr>
                  {["Date","Bill No","Mode","Reference","Amount"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((pmt: any) => (
                  <tr key={pmt.id} className="border-t border-border/60 hover:bg-gold/5">
                    <td className="px-4 py-3 tabular-nums text-xs">{fmtDate(pmt.date)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{pmt.billNo}</td>
                    <td className="px-4 py-3 text-xs">{pmt.mode}</td>
                    <td className="px-4 py-3 text-xs text-muted">{pmt.reference || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-emerald-600">{formatCurrency(pmt.amount)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No payments recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── NOTES tab ───────────────────────────────────────────────── */}
      {tab === "notes" && (
        <div className="rounded-card border border-border bg-card p-6 shadow-card">
          <h3 className="mb-2 font-display text-xl font-semibold">Internal Notes</h3>
          <p className="text-sm text-muted">{detail.notes || "No notes available for this supplier."}</p>
        </div>
      )}

      <SupplierFormModal
        open={editModalOpen}
        initialData={detail}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => {
          void refetch();
        }}
      />
    </div>
  );
};

