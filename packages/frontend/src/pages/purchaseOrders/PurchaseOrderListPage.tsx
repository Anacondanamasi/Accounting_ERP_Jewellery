import { useNavigate } from "react-router-dom";
import { Plus, ClipboardList, Clock, CheckCircle, TruckIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";

const MOCK_POS = [
  { id: 1, number: "PO-001", supplier: "Bullion Traders Ltd", amount: "₹5,24,000", date: "2026-05-28", delivery: "2026-06-11", status: "sent" },
  { id: 2, number: "PO-002", supplier: "Gold Wire Suppliers", amount: "₹1,88,500", date: "2026-05-25", delivery: "2026-06-08", status: "draft" },
  { id: 3, number: "PO-003", supplier: "Gems & Co", amount: "₹3,10,000", date: "2026-05-20", delivery: "2026-06-03", status: "received" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", color: "bg-blue-50 text-blue-600" },
  received: { label: "Received", color: "bg-emerald-50 text-emerald-600" },
};

export const PurchaseOrderListPage = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Create and track orders sent to your suppliers"
        actions={
          <Button onClick={() => navigate("/purchase-orders/new")} id="new-po-btn">
            <Plus className="mr-2 h-4 w-4" /> New Purchase Order
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Draft", value: "1", icon: ClipboardList, color: "bg-slate-50 border-slate-200 text-slate-600" },
          { label: "Sent", value: "1", icon: Clock, color: "bg-blue-50 border-blue-200 text-blue-600" },
          { label: "Received", value: "1", icon: TruckIcon, color: "bg-emerald-50 border-emerald-200 text-emerald-600" },
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

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas text-left text-[11px] font-semibold uppercase tracking-widest text-muted">
              <th className="px-5 py-3">PO #</th>
              <th className="px-5 py-3">Supplier</th>
              <th className="px-5 py-3">Order Date</th>
              <th className="px-5 py-3">Expected Delivery</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MOCK_POS.map((po) => {
              const cfg = STATUS_CONFIG[po.status];
              return (
                <tr key={po.id} className="transition-colors hover:bg-canvas/60">
                  <td className="px-5 py-3 font-medium text-charcoal">{po.number}</td>
                  <td className="px-5 py-3 text-muted">{po.supplier}</td>
                  <td className="px-5 py-3 text-muted">{po.date}</td>
                  <td className="px-5 py-3 text-muted">{po.delivery}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-charcoal">{po.amount}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </td>
                  <td className="px-5 py-3">
                    <button className="text-xs text-sapphire hover:underline" onClick={() => navigate(`/purchase-orders/${po.id}/edit`)} type="button">Edit</button>
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
