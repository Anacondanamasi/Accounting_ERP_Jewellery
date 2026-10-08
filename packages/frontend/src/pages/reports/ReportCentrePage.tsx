import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";

const reportLinks = [
  { title: "Profit & Loss", path: "/profit-loss", description: "Revenue, expenses and net profit overview." },
  { title: "Trial Balance", path: "/trial-balance", description: "Ledger balances before period closing." },
  { title: "Balance Sheet", path: "/balance-sheet", description: "Assets, liabilities and capital position." },
  { title: "Cash Flow", path: "/cash-flow", description: "Operating, investing and financing cash movement." },
  { title: "Day Book", path: "/day-book", description: "Voucher-wise daily transaction register." },
  { title: "GST Returns", path: "/tax/gst", description: "Return status and tax summary statements." },
];

export const ReportCentrePage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <PageHeader title="Report Centre" subtitle="Open core financial and statutory reports" />
      <div className="rounded-card border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gold-tint text-charcoal">
            <tr>
              <th className="border-b border-border px-3 py-2 text-left font-semibold">Report</th>
              <th className="border-b border-border px-3 py-2 text-left font-semibold">Description</th>
              <th className="border-b border-border px-3 py-2 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {reportLinks.map((report) => (
              <tr key={report.path} className="border-b border-border/60">
                <td className="px-3 py-2 font-medium">{report.title}</td>
                <td className="px-3 py-2 text-muted">{report.description}</td>
                <td className="px-3 py-2">
                  <button className="rounded border border-border px-3 py-1 text-xs" onClick={() => navigate(report.path)} type="button">
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
