import { useNavigate } from "react-router-dom";
import { FileText, Plus, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";

const MOCK_QUOTES = [
  { id: 1, number: "QT-001", customer: "Ravi Jewellers", amount: "₹1,24,500", date: "2026-05-28", expiry: "2026-06-28", status: "sent" },
  { id: 2, number: "QT-002", customer: "Meera Gold House", amount: "₹88,000", date: "2026-05-25", expiry: "2026-06-25", status: "draft" },
  { id: 3, number: "QT-003", customer: "Sharma Jewels", amount: "₹2,10,000", date: "2026-05-20", expiry: "2026-06-20", status: "accepted" },
  { id: 4, number: "QT-004", customer: "Gold Palace", amount: "₹54,800", date: "2026-05-15", expiry: "2026-05-29", status: "expired" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-50 text-blue-600", icon: Send },
  accepted: { label: "Accepted", color: "bg-emerald-50 text-emerald-600", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-50 text-red-600", icon: XCircle },
};

export const QuoteListPage = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        subtitle="Create and manage customer quotations"
        actions={
          <Button onClick={() => navigate("/quotes/new")} id="new-quote-btn">
            <Plus className="mr-2 h-4 w-4" /> New Quote
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Draft", value: "1", icon: FileText, color: "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Sent", value: "1", icon: Send, color: "bg-blue-50 border-blue-200 text-blue-600" },
          { label: "Accepted", value: "1", icon: CheckCircle, color: "bg-emerald-50 border-emerald-200 text-emerald-600" },
          { label: "Expired", value: "1", icon: XCircle, color: "bg-red-50 border-red-200 text-red-600" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`flex items-center gap-3 rounded-xl border p-4 ${stat.color}`}>
              <Icon className="h-6 w-6 opacity-70" />
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs opacity-70">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas text-left text-[11px] font-semibold uppercase tracking-widest text-muted">
              <th className="px-5 py-3">Quote #</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Expiry</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MOCK_QUOTES.map((q) => {
              const cfg = STATUS_CONFIG[q.status];
              const Icon = cfg.icon;
              return (
                <tr key={q.id} className="transition-colors hover:bg-canvas/60">
                  <td className="px-5 py-3 font-medium text-charcoal">{q.number}</td>
                  <td className="px-5 py-3 text-muted">{q.customer}</td>
                  <td className="px-5 py-3 text-muted">{q.date}</td>
                  <td className="px-5 py-3 text-muted">{q.expiry}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-charcoal">{q.amount}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      className="text-xs text-sapphire hover:underline"
                      onClick={() => navigate(`/quotes/${q.id}/edit`)}
                      type="button"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
