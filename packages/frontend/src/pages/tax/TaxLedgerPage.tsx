import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { taxService } from "@/services/taxService";
import { toast } from "sonner";
import {
  FileText,
  Calculator,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Download,
  BookOpen,
  Scale,
} from "lucide-react";

export const TaxLedgerPage = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<"settlement" | "itc_register">("settlement");

  const { data: gstr1, isLoading: loadingGstr1 } = useQuery({
    queryKey: ["tax-ledger-gstr1", month, year],
    queryFn: () => taxService.getGstr1({ month, year }),
  });

  const { data: gstr3b, isLoading: loadingGstr3b, refetch: refetch3b } = useQuery({
    queryKey: ["tax-ledger-gstr3b", month, year],
    queryFn: () => taxService.getGstr3b({ month, year }),
  });

  const { data: itcRegister } = useQuery({
    queryKey: ["itc-register", month, year],
    queryFn: () => taxService.getItcRegister(),
    enabled: activeTab === "itc_register",
  });

  const settleMutation = useMutation({
    mutationFn: () => taxService.postSettlement({ month, year }),
    onSuccess: (data: any) => {
      toast.success(
        `GST Settlement Journal ${data?.journal?.entryNo || ""} posted successfully!`
      );
      refetch3b();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to post GST settlement journal");
    },
  });

  const outwardTaxable = Number(gstr1?.totals?.taxableValue ?? 0);
  const outwardTax = Number(gstr1?.totals?.taxAmount ?? 0);
  const cgstLiability = Number(gstr1?.totals?.cgst ?? 0);
  const sgstLiability = Number(gstr1?.totals?.sgst ?? 0);
  const igstLiability = Number(gstr1?.totals?.igst ?? 0);

  const itc = Number(gstr3b?.itc?.net ?? 0);
  const cgstCredit = Number(gstr3b?.itc?.allOther?.cgst ?? 0);
  const sgstCredit = Number(gstr3b?.itc?.allOther?.sgst ?? 0);
  const igstCredit = Number(gstr3b?.itc?.allOther?.igst ?? 0);

  const netTax = Number(gstr3b?.netTaxPayable ?? outwardTax - itc);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indian GST Ledger & Settlement Center"
        subtitle={`Period: ${String(month).padStart(2, "0")}/${year} • Net Tax Payable ${formatCurrency(netTax)}`}
      />

      {/* Control filters & Tab toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#161a23] p-4 text-white">
        <div className="flex items-center gap-3">
          <label className="text-xs text-white/60">
            Month:
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="ml-2 rounded border border-white/10 bg-[#1e2430] px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-gold"
            >
              {[
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
              ].map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/60">
            Year:
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="ml-2 w-20 rounded border border-white/10 bg-[#1e2430] px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-gold"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("settlement")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "settlement"
                ? "bg-gold text-black"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <Scale className="mr-1.5 inline h-3.5 w-3.5" />
            Set-off & Settlement
          </button>
          <button
            onClick={() => setActiveTab("itc_register")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "itc_register"
                ? "bg-gold text-black"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <BookOpen className="mr-1.5 inline h-3.5 w-3.5" />
            ITC Register
          </button>
        </div>
      </div>

      {activeTab === "settlement" ? (
        <div className="space-y-6">
          {/* Statutory Tax Matrix */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#161a23] p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                1. Output Liability (GSTR-1)
              </span>
              <div className="mt-2 text-2xl font-bold font-mono text-white">
                {formatCurrency(outwardTax)}
              </div>
              <div className="mt-3 divide-y divide-white/5 text-xs font-mono">
                <div className="flex justify-between py-1 text-white/60">
                  <span>CGST (2201):</span>
                  <span>{formatCurrency(cgstLiability)}</span>
                </div>
                <div className="flex justify-between py-1 text-white/60">
                  <span>SGST (2202):</span>
                  <span>{formatCurrency(sgstLiability)}</span>
                </div>
                <div className="flex justify-between py-1 text-white/60">
                  <span>IGST (2203):</span>
                  <span>{formatCurrency(igstLiability)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#161a23] p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                2. Input Tax Credit (ITC)
              </span>
              <div className="mt-2 text-2xl font-bold font-mono text-white">
                {formatCurrency(itc)}
              </div>
              <div className="mt-3 divide-y divide-white/5 text-xs font-mono">
                <div className="flex justify-between py-1 text-white/60">
                  <span>Input CGST (1201):</span>
                  <span>{formatCurrency(cgstCredit)}</span>
                </div>
                <div className="flex justify-between py-1 text-white/60">
                  <span>Input SGST (1202):</span>
                  <span>{formatCurrency(sgstCredit)}</span>
                </div>
                <div className="flex justify-between py-1 text-white/60">
                  <span>Input IGST (1203):</span>
                  <span>{formatCurrency(igstCredit)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#161a23] p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                3. Net Payable in Cash (PMT-06)
              </span>
              <div className="mt-2 text-2xl font-bold font-mono text-gold">
                {formatCurrency(Math.max(0, netTax))}
              </div>
              <p className="mt-2 text-xs text-white/50">
                After Section 49 & Rule 88A set-off hierarchy: IGST credit exhausted first, then CGST & SGST.
              </p>
              <div className="mt-4">
                <button
                  disabled={settleMutation.isPending}
                  onClick={() => settleMutation.mutate()}
                  className="w-full rounded-lg bg-gold py-2 text-xs font-bold text-black shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50"
                >
                  {settleMutation.isPending ? "Posting Settlement..." : "⚡ Post Monthly Settlement Journal"}
                </button>
              </div>
            </div>
          </div>

          {/* Section 49 / Rule 88A Order Explanation Banner */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-xs text-white/70">
            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
              <Scale className="h-4 w-4 text-gold" /> Statutory ITC Utilization Order (Section 49 & Rule 88A)
            </h4>
            <p>
              Under Indian GST Law, <strong>IGST Credit</strong> must be completely utilized against Output IGST, then Output CGST and SGST in any order, <em>before</em> utilizing CGST or SGST credit. Cross-utilization of CGST credit against SGST liability (or vice versa) is strictly prohibited. Clicking "Post Monthly Settlement Journal" automatically generates the double-entry closing journal entry balancing output vs. input tax ledgers.
            </p>
          </div>
        </div>
      ) : (
        /* ITC Register Table */
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#161a23]">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Inward Supplies & ITC Register</h3>
            <span className="text-xs font-mono text-white/60">
              Total Inward Bills: {itcRegister?.rows?.length ?? 0}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#1e2430] uppercase tracking-wider text-white/60 font-semibold">
                <tr>
                  <th className="px-4 py-3">Bill No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Supplier GSTIN</th>
                  <th className="px-4 py-3 text-right">Taxable (₹)</th>
                  <th className="px-4 py-3 text-right">CGST (₹)</th>
                  <th className="px-4 py-3 text-right">SGST (₹)</th>
                  <th className="px-4 py-3 text-right">IGST (₹)</th>
                  <th className="px-4 py-3 text-right">Total (₹)</th>
                  <th className="px-4 py-3 text-center">ITC Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {itcRegister?.rows?.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-bold text-gold">{row.billNo}</td>
                    <td className="px-4 py-2.5 font-sans">{new Date(row.billDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-2.5 font-sans">{row.supplierName || "—"}</td>
                    <td className="px-4 py-2.5">{row.supplierGstin || "Unregistered"}</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(row.taxableAmount)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400">{formatCurrency(row.cgst)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400">{formatCurrency(row.sgst)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400">{formatCurrency(row.igst)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-white">{formatCurrency(row.grandTotal)}</td>
                    <td className="px-4 py-2.5 text-center font-sans">
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400 text-[10px] font-bold">
                        {row.itcEligibility}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
