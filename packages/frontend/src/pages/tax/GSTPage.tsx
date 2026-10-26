import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  BarChart3,
  ExternalLink,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Building,
  HelpCircle,
  FileCheck,
  Percent,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { taxService } from "@/services/taxService";
import {
  MONTHS,
  QUARTERS,
  FINANCIAL_YEARS,
  downloadCSV,
  downloadJSON,
  buildGstr2bReconciliation,
  readFilingStatus,
  saveFilingStatus,
  GSTR1_STEPS,
  GSTR3B_STEPS,
  type ReconciliationRow,
} from "@/lib/gstUtils";

export const GSTPage = () => {
  // Period filter states
  const [financialYear, setFinancialYear] = useState<string>("2025-26");
  const [frequency, setFrequency] = useState<"monthly" | "quarterly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState<number>(4); // April default
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q1");
  const [activeTab, setActiveTab] = useState<"gstr1" | "gstr3b" | "gstr2b" | "tds" | "guide">("gstr1");

  // GSTR-2B reconciliation state
  const [reconciliationRows, setReconciliationRows] = useState<ReconciliationRow[]>([]);
  const [reconciliationFileName, setReconciliationFileName] = useState<string>("");
  const [twoBFilter, setTwoBFilter] = useState<"all" | "matched" | "amount_mismatch" | "book_only" | "twob_only">("all");
  const [twoBSearch, setTwoBSearch] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extract base year from FY (e.g., "2025-26" -> 2025)
  const baseYear = useMemo(() => {
    const parts = financialYear.split("-");
    return Number(parts[0]) || 2025;
  }, [financialYear]);

  // If month is Jan, Feb, Mar (months 1, 2, 3), it falls in the second calendar year of the FY
  const queryYear = useMemo(() => {
    if (frequency === "monthly") {
      return selectedMonth >= 1 && selectedMonth <= 3 ? baseYear + 1 : baseYear;
    }
    return selectedQuarter === "Q4" ? baseYear + 1 : baseYear;
  }, [frequency, selectedMonth, selectedQuarter, baseYear]);

  const queryParams = useMemo(() => {
    if (frequency === "monthly") {
      return { month: selectedMonth, year: queryYear };
    }
    return { quarter: selectedQuarter, year: baseYear };
  }, [frequency, selectedMonth, selectedQuarter, queryYear, baseYear]);

  const periodKey = useMemo(() => {
    return frequency === "monthly"
      ? `${financialYear}_M${selectedMonth}`
      : `${financialYear}_${selectedQuarter}`;
  }, [financialYear, frequency, selectedMonth, selectedQuarter]);

  // Filing status
  const [filingStatus, setFilingStatus] = useState(() => readFilingStatus(periodKey));

  const handleStatusChange = (update: Parameters<typeof saveFilingStatus>[1]) => {
    saveFilingStatus(periodKey, update);
    setFilingStatus(readFilingStatus(periodKey));
    toast.success("Filing status updated");
  };

  // Queries
  const {
    data: gstr1,
    isLoading: gstr1Loading,
    isError: gstr1Error,
    refetch: refetchGstr1,
  } = useQuery({
    queryKey: ["tax-gstr1", queryParams],
    queryFn: () => taxService.getGstr1(queryParams),
  });

  const {
    data: gstr3b,
    isLoading: gstr3bLoading,
    isError: gstr3bError,
    refetch: refetchGstr3b,
  } = useQuery({
    queryKey: ["tax-gstr3b", queryParams],
    queryFn: () => taxService.getGstr3b(queryParams),
  });

  const {
    data: purchasesData,
    isLoading: purchasesLoading,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: ["tax-purchases-2b", queryParams],
    queryFn: () => taxService.getPurchasesFor2B(queryParams),
  });

  const {
    data: tdsData,
    isLoading: tdsLoading,
    refetch: refetchTds,
  } = useQuery({
    queryKey: ["tax-tds"],
    queryFn: () => taxService.getTdsSummary(),
  });

  // KPI calculations
  const totalTaxable = gstr1?.totals.taxableValue ?? 0;
  const totalTax = gstr1?.totals.taxAmount ?? 0;
  const eligibleItc = gstr3b?.itc.eligible ?? 0;
  const netPayable = gstr3b?.netTaxPayable ?? 0;
  const invoiceCount = gstr1?.totals.invoiceCount ?? 0;

  // Handle GSTR-2B JSON Upload
  const handle2BUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReconciliationFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const rows = buildGstr2bReconciliation(
          json,
          purchasesData?.purchases || [],
          purchasesData?.periodPurchases || []
        );
        setReconciliationRows(rows);
        toast.success(`GSTR-2B loaded: ${rows.length} reconciliation entries processed`);
      } catch (err) {
        toast.error("Invalid GSTR-2B JSON file. Please ensure it was downloaded from gst.gov.in.");
      }
    };
    reader.readAsText(file);
  };

  // Filtered GSTR-2B rows
  const filtered2BRows = useMemo(() => {
    return reconciliationRows.filter((row) => {
      if (twoBFilter !== "all" && row.status !== twoBFilter) return false;
      if (twoBSearch.trim()) {
        const q = twoBSearch.toLowerCase();
        return (
          row.supplier.toLowerCase().includes(q) ||
          row.ctin.toLowerCase().includes(q) ||
          row.invoiceNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reconciliationRows, twoBFilter, twoBSearch]);

  const twoBStats = useMemo(() => {
    const matched = reconciliationRows.filter((r) => r.status === "matched");
    const mismatch = reconciliationRows.filter((r) => r.status === "amount_mismatch");
    const bookOnly = reconciliationRows.filter((r) => r.status === "book_only");
    const twoBOnly = reconciliationRows.filter((r) => r.status === "twob_only");

    return {
      matchedCount: matched.length,
      matchedItc: matched.reduce((s, r) => s + r.bookIgst + r.bookCgst + r.bookSgst, 0),
      mismatchCount: mismatch.length,
      bookOnlyCount: bookOnly.length,
      bookOnlyItc: bookOnly.reduce((s, r) => s + r.bookIgst + r.bookCgst + r.bookSgst, 0),
      twoBOnlyCount: twoBOnly.length,
      twoBOnlyItc: twoBOnly.reduce((s, r) => s + r.twoBIgst + r.twoBCgst + r.twoBSgst, 0),
    };
  }, [reconciliationRows]);

  // Export handlers
  const handleExportGstr1Json = () => {
    if (!gstr1 || gstr1.totals.invoiceCount === 0) {
      toast.warning("No invoices found for this return period");
      return;
    }

    const b2bMap: Record<string, any> = {};
    (gstr1.b2b || []).forEach((row) => {
      if (!b2bMap[row.gstin]) {
        b2bMap[row.gstin] = { ctin: row.gstin, inv: [] };
      }
      b2bMap[row.gstin].inv.push({
        inum: row.invoiceNo,
        idt: new Date(row.invoiceDate).toLocaleDateString("en-GB").replace(/\//g, "-"),
        val: row.total,
        pos: row.pos,
        rchrg: row.reverseCharge || "N",
        inv_typ: "R",
        itms: [
          {
            num: 1,
            itm_det: {
              rt: row.taxableValue > 0 ? Math.round(((row.taxAmount) / row.taxableValue) * 100) : 3,
              txval: row.taxableValue,
              iamt: row.igst,
              camt: row.cgst,
              samt: row.sgst,
              csamt: 0,
            },
          },
        ],
      });
    });

    const payload = {
      gstin: gstr1.company.gstin || "27AAAAA0000A1Z5",
      fp: gstr1.period.fp,
      cur_gt: 0,
      b2b: Object.values(b2bMap),
      b2cl: (gstr1.b2cl || []).map((row) => ({
        pos: row.pos,
        inv: [
          {
            inum: row.invoiceNo,
            idt: new Date(row.invoiceDate).toLocaleDateString("en-GB").replace(/\//g, "-"),
            val: row.total,
            itms: [{ num: 1, itm_det: { rt: 3, txval: row.taxableValue, iamt: row.igst, csamt: 0 } }],
          },
        ],
      })),
      b2cs: (gstr1.b2cs || []).map((row) => ({
        sply_ty: row.supplyType,
        pos: row.pos,
        typ: "OE",
        rt: row.rate,
        txval: row.taxableValue,
        iamt: row.igst,
        camt: row.cgst,
        samt: row.sgst,
        csamt: 0,
      })),
      cdnr: (gstr1.cdn || []).filter((c) => c.gstin && c.gstin.length === 15).map((c) => ({
        ctin: c.gstin,
        nt: [{
          ntty: c.noteType === "CREDIT" ? "C" : "D",
          nt_num: c.noteNo,
          nt_dt: new Date(c.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
          inum: c.referenceNo || "-",
          idt: new Date(c.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
          val: c.total,
          itms: [{ num: 1, itm_det: { rt: 3, txval: c.taxableValue, iamt: 0, camt: c.taxAmount / 2, samt: c.taxAmount / 2, csamt: 0 } }],
        }],
      })),
      cdnur: (gstr1.cdn || []).filter((c) => !c.gstin || c.gstin.length < 15).map((c) => ({
        typ: "B2CL",
        nt_num: c.noteNo,
        nt_dt: new Date(c.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
        inum: c.referenceNo || "-",
        idt: new Date(c.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
        val: c.total,
        itms: [{ num: 1, itm_det: { rt: 3, txval: c.taxableValue, iamt: 0, camt: c.taxAmount / 2, samt: c.taxAmount / 2, csamt: 0 } }],
      })),
      hsn: {
        data: (gstr1.hsn || []).map((h, i) => ({
          num: i + 1,
          hsn_sc: h.hsnCode,
          desc: h.description,
          uqc: h.uqc,
          qty: h.qty,
          val: h.totalValue,
          txval: h.taxableValue,
          iamt: h.igst,
          camt: h.cgst,
          samt: h.sgst,
          csamt: 0,
        })),
      },
      doc_issue: {
        doc_det: (gstr1.docIssue || []).map((d) => ({
          doc_num: d.docType,
          doc_typ: d.name,
          docs: [{ num: 1, from: d.from, to: d.to, totnum: d.totalCount, canc: d.cancelledCount, net_issue: d.netIssued }],
        })),
      },
    };

    downloadJSON(`GSTR1_${gstr1.company.gstin || "PORTAL"}_${gstr1.period.fp}.json`, payload);
    toast.success("GSTR-1 JSON downloaded successfully for GST Offline Tool");
  };

  const handleExportB2BCSV = () => {
    if (!gstr1?.b2b.length) {
      toast.warning("No B2B invoices to export");
      return;
    }
    const headers = ["GSTIN", "Receiver Name", "Invoice Number", "Invoice Date", "Invoice Value", "Place of Supply", "Reverse Charge", "Invoice Type", "Taxable Value", "Rate", "CGST", "SGST", "IGST"];
    const rows = gstr1.b2b.map((r) => [
      r.gstin,
      r.customerName,
      r.invoiceNo,
      new Date(r.invoiceDate).toLocaleDateString("en-IN"),
      r.total,
      r.pos,
      r.reverseCharge,
      "Regular",
      r.taxableValue,
      r.taxableValue > 0 ? Math.round((r.taxAmount / r.taxableValue) * 100) : 3,
      r.cgst,
      r.sgst,
      r.igst,
    ]);
    downloadCSV(`GSTR1_B2B_${gstr1.period.fp}.csv`, headers, rows);
    toast.success("B2B CSV exported");
  };

  const handleExportHSNCSV = () => {
    if (!gstr1?.hsn.length) {
      toast.warning("No HSN data to export");
      return;
    }
    const headers = ["HSN", "Description", "UQC", "Total Quantity", "Total Value", "Taxable Value", "Integrated Tax", "Central Tax", "State Tax", "Cess"];
    const rows = gstr1.hsn.map((h) => [
      h.hsnCode,
      h.description,
      h.uqc,
      h.qty,
      h.totalValue,
      h.taxableValue,
      h.igst,
      h.cgst,
      h.sgst,
      0,
    ]);
    downloadCSV(`GSTR1_HSN_${gstr1.period.fp}.csv`, headers, rows);
    toast.success("HSN Summary CSV exported");
  };

  const handleExportReconciliationCSV = () => {
    if (!filtered2BRows.length) {
      toast.warning("No reconciliation rows to export");
      return;
    }
    const headers = ["Status", "Supplier Name", "Supplier GSTIN", "Invoice Number", "Date", "2B Value", "Book Value", "Difference", "2B Taxable", "Book Taxable", "2B IGST", "2B CGST", "2B SGST", "ITC Available"];
    const rows = filtered2BRows.map((r) => [
      r.status.toUpperCase(),
      r.supplier,
      r.ctin,
      r.invoiceNumber,
      r.date ? new Date(r.date).toLocaleDateString("en-IN") : "-",
      r.twoBVal,
      r.bookVal,
      r.valDiff,
      r.twoBTaxable,
      r.bookTaxable,
      r.twoBIgst,
      r.twoBCgst,
      r.twoBSgst,
      r.itcAvailable ? "YES" : "NO",
    ]);
    downloadCSV(`GSTR2B_Reconciliation_${gstr1?.period.fp || "PERIOD"}.csv`, headers, rows);
    toast.success("GSTR-2B Reconciliation Report exported");
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="GST Returns & Compliance"
        subtitle="Full Indian GST Compliance Suite: GSTR-1, GSTR-3B, GSTR-2B Reconciliation & Portal Filing Guide"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                void refetchGstr1();
                void refetchGstr3b();
                void refetchPurchases();
                void refetchTds();
                toast.success("GST data refreshed");
              }}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal shadow-sm hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={handleExportGstr1Json}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-gold px-4 text-xs font-bold text-white shadow hover:bg-gold-dark transition-all"
            >
              <Upload className="h-4 w-4" />
              Export GSTR-1 JSON
            </button>
          </div>
        }
      />

      {/* Period Selector & Filing Status Banner */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Period Selector Bar */}
        <div className="rounded-card border border-border bg-card p-4 shadow-card lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold text-charcoal">
                {gstr1?.company.name || "Jewellery Company"}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                GSTIN: {gstr1?.company.gstin || "NOT SET"}
              </span>
              <span className="text-xs text-muted">
                State: {gstr1?.company.state} ({gstr1?.company.stateCode})
              </span>
            </div>

            {/* Frequency Toggle */}
            <div className="flex items-center rounded-btn bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFrequency("monthly")}
                className={`rounded px-2.5 py-1 transition-all ${
                  frequency === "monthly" ? "bg-white text-charcoal shadow" : "text-muted hover:text-charcoal"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setFrequency("quarterly")}
                className={`rounded px-2.5 py-1 transition-all ${
                  frequency === "quarterly" ? "bg-white text-charcoal shadow" : "text-muted hover:text-charcoal"
                }`}
              >
                Quarterly (QRMP)
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* FY Selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted">FY:</label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="h-8 rounded border border-border bg-white px-2.5 text-xs font-semibold text-charcoal shadow-sm focus:border-gold focus:outline-none"
              >
                {FINANCIAL_YEARS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>

            {/* Month or Quarter Selector */}
            {frequency === "monthly" ? (
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-muted">Month:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-8 rounded border border-border bg-white px-2.5 text-xs font-semibold text-charcoal shadow-sm focus:border-gold focus:outline-none"
                >
                  {MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-muted">Quarter:</label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="h-8 rounded border border-border bg-white px-2.5 text-xs font-semibold text-charcoal shadow-sm focus:border-gold focus:outline-none"
                >
                  {QUARTERS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted">Return Period:</span>
              <span className="rounded bg-gold/10 px-2 py-0.5 font-mono text-xs font-bold text-gold-dark">
                {gstr1?.period.periodLabel || "Current"}
              </span>
            </div>
          </div>
        </div>

        {/* Filing Tracker Card */}
        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Filing Status</span>
            <FileCheck className="h-4 w-4 text-emerald" />
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-charcoal">GSTR-1</span>
              <button
                type="button"
                onClick={() => {
                  const nowFiled = !filingStatus.gstr1Filed;
                  const arn = nowFiled ? window.prompt("Enter GSTR-1 ARN (optional):") || "" : "";
                  handleStatusChange({
                    gstr1Filed: nowFiled,
                    gstr1Arn: arn,
                    gstr1Date: nowFiled ? new Date().toISOString() : undefined,
                  });
                }}
                className={`rounded-full px-2.5 py-0.5 text-2xs font-bold transition-all ${
                  filingStatus.gstr1Filed
                    ? "bg-emerald/15 text-emerald hover:bg-emerald/25"
                    : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                }`}
              >
                {filingStatus.gstr1Filed ? "FILED" : "PENDING (Click to mark)"}
              </button>
            </div>
            {filingStatus.gstr1Arn && (
              <div className="font-mono text-2xs text-muted truncate">ARN: {filingStatus.gstr1Arn}</div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-charcoal">GSTR-3B</span>
              <button
                type="button"
                onClick={() => {
                  const nowFiled = !filingStatus.gstr3bFiled;
                  const arn = nowFiled ? window.prompt("Enter GSTR-3B ARN (optional):") || "" : "";
                  handleStatusChange({
                    gstr3bFiled: nowFiled,
                    gstr3bArn: arn,
                    gstr3bDate: nowFiled ? new Date().toISOString() : undefined,
                  });
                }}
                className={`rounded-full px-2.5 py-0.5 text-2xs font-bold transition-all ${
                  filingStatus.gstr3bFiled
                    ? "bg-emerald/15 text-emerald hover:bg-emerald/25"
                    : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                }`}
              >
                {filingStatus.gstr3bFiled ? "FILED" : "PENDING (Click to mark)"}
              </button>
            </div>
            {filingStatus.gstr3bArn && (
              <div className="font-mono text-2xs text-muted truncate">ARN: {filingStatus.gstr3bArn}</div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <div className="text-2xs font-bold uppercase tracking-wider text-muted">Outward Invoices</div>
          <div className="mt-1 font-display text-2xl font-bold text-charcoal">{invoiceCount}</div>
          <div className="mt-1 text-2xs text-muted">Approved & Posted sales</div>
        </div>

        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <div className="text-2xs font-bold uppercase tracking-wider text-muted">Taxable Value</div>
          <div className="mt-1 font-mono text-xl font-bold text-charcoal">{formatCurrency(totalTaxable)}</div>
          <div className="mt-1 text-2xs text-muted">Outward jewellery sales</div>
        </div>

        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <div className="text-2xs font-bold uppercase tracking-wider text-muted">Total Output Tax</div>
          <div className="mt-1 font-mono text-xl font-bold text-charcoal">{formatCurrency(totalTax)}</div>
          <div className="mt-1 text-2xs text-muted">CGST + SGST + IGST</div>
        </div>

        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <div className="text-2xs font-bold uppercase tracking-wider text-muted">Eligible ITC</div>
          <div className="mt-1 font-mono text-xl font-bold text-emerald">{formatCurrency(eligibleItc)}</div>
          <div className="mt-1 text-2xs text-muted">Input credit from purchases</div>
        </div>

        <div className="rounded-card border border-gold/30 bg-gold/5 p-4 shadow-card">
          <div className="text-2xs font-bold uppercase tracking-wider text-gold-dark">Net Cash Payable</div>
          <div className="mt-1 font-mono text-xl font-bold text-gold-dark">{formatCurrency(netPayable)}</div>
          <div className="mt-1 text-2xs text-gold-dark/80">After Rule 88A set-off</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-1">
        {[
          { id: "gstr1", label: "GSTR-1 Outward Supplies", icon: BarChart3 },
          { id: "gstr3b", label: "GSTR-3B Summary & ITC Set-off", icon: FileText },
          { id: "gstr2b", label: "GSTR-2B Reconciliation Engine", icon: CheckCircle2 },
          { id: "tds", label: "TDS / TCS Compliance (Sec 194Q)", icon: Percent },
          { id: "guide", label: "Portal Filing Guide", icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-1.5 rounded-t-btn px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                active
                  ? "border-gold bg-card text-charcoal shadow-sm"
                  : "border-transparent text-muted hover:text-charcoal hover:bg-slate-50"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-gold" : "text-muted"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GSTR-1 */}
      {/* ========================================================================= */}
      {activeTab === "gstr1" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-slate-50 p-3">
            <span className="text-xs font-bold text-charcoal">Filing Export Tools:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportGstr1Json}
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-gold px-3 text-xs font-bold text-white shadow hover:bg-gold-dark transition-all"
              >
                <Upload className="h-3.5 w-3.5" />
                GSTR-1 JSON (GST Offline Tool)
              </button>
              <button
                onClick={handleExportB2BCSV}
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal hover:bg-slate-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                B2B CSV
              </button>
              <button
                onClick={handleExportHSNCSV}
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-border bg-white px-3 text-xs font-semibold text-charcoal hover:bg-slate-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                HSN Summary CSV
              </button>
            </div>
          </div>

          {/* Table 4A: B2B Invoices */}
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-display text-base font-bold text-charcoal">
                  Table 4A — B2B Invoices (Registered Customers)
                </h4>
                <p className="text-2xs text-muted">
                  Supplies to registered buyers with 15-digit GSTIN. Auto-populates buyer's GSTR-2B.
                </p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                {gstr1?.b2b.length ?? 0} invoices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50 font-bold text-muted">
                    <th className="p-2.5">GSTIN</th>
                    <th className="p-2.5">Customer Name</th>
                    <th className="p-2.5">Invoice No</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">POS</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5 text-right">Taxable Value</th>
                    <th className="p-2.5 text-right">CGST</th>
                    <th className="p-2.5 text-right">SGST</th>
                    <th className="p-2.5 text-right">IGST</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {gstr1Loading ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-muted">
                        Loading B2B invoices...
                      </td>
                    </tr>
                  ) : !gstr1?.b2b.length ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-muted">
                        No B2B invoices recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    gstr1.b2b.map((r, i) => (
                      <tr key={r.invoiceNo || i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-charcoal">{r.gstin}</td>
                        <td className="p-2.5 font-medium">{r.customerName}</td>
                        <td className="p-2.5 font-mono text-gold-dark font-semibold">{r.invoiceNo}</td>
                        <td className="p-2.5 text-muted">{new Date(r.invoiceDate).toLocaleDateString("en-IN")}</td>
                        <td className="p-2.5 font-mono">{r.pos}</td>
                        <td className="p-2.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-2xs font-bold ${
                              r.supplyType === "INTER" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {r.supplyType}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(r.taxableValue)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(r.cgst)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(r.sgst)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(r.igst)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-charcoal">{formatCurrency(r.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tables 5 & 7: B2C Large & Small */}
          <div className="grid gap-4 xl:grid-cols-2">
            {/* Table 5: B2C Large */}
            <div className="rounded-card border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-display text-base font-bold text-charcoal">
                    Table 5 — B2C Large Invoices
                  </h4>
                  <p className="text-2xs text-muted">
                    Inter-state supplies to unregistered persons exceeding ₹1,00,000.
                  </p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                  {gstr1?.b2cl.length ?? 0}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 font-bold text-muted">
                      <th className="p-2">Invoice No</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">POS</th>
                      <th className="p-2 text-right">Taxable</th>
                      <th className="p-2 text-right">IGST</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {!gstr1?.b2cl.length ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted">
                          No inter-state B2C invoices &gt; ₹1 Lakh.
                        </td>
                      </tr>
                    ) : (
                      gstr1.b2cl.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-gold-dark">{r.invoiceNo}</td>
                          <td className="p-2 text-muted">{new Date(r.invoiceDate).toLocaleDateString("en-IN")}</td>
                          <td className="p-2 font-mono">{r.pos}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(r.taxableValue)}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(r.igst)}</td>
                          <td className="p-2 text-right font-mono font-bold">{formatCurrency(r.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 7: B2C Small */}
            <div className="rounded-card border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-display text-base font-bold text-charcoal">
                    Table 7 — B2C Small (Aggregated)
                  </h4>
                  <p className="text-2xs text-muted">
                    Intra-state sales & inter-state sales &lt;= ₹1L grouped by POS and Rate.
                  </p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                  {gstr1?.b2cs.length ?? 0} groups
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 font-bold text-muted">
                      <th className="p-2">POS</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Rate %</th>
                      <th className="p-2 text-right">Taxable</th>
                      <th className="p-2 text-right">CGST</th>
                      <th className="p-2 text-right">SGST</th>
                      <th className="p-2 text-right">IGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {!gstr1?.b2cs.length ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-muted">
                          No B2C small sales recorded.
                        </td>
                      </tr>
                    ) : (
                      gstr1.b2cs.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-semibold">{r.pos}</td>
                          <td className="p-2">{r.supplyType}</td>
                          <td className="p-2 font-mono font-semibold">{r.rate}%</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(r.taxableValue)}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(r.cgst)}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(r.sgst)}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(r.igst)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Table 12: HSN Summary */}
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-display text-base font-bold text-charcoal">
                  Table 12 — HSN-wise Summary of Outward Supplies
                </h4>
                <p className="text-2xs text-muted">
                  Mandatory reporting: HSN 7113 (Gold/Diamond Jewellery), 7108 (Gold Bullion), 7106 (Silver), 9988 (Job Work).
                </p>
              </div>
              <button
                onClick={handleExportHSNCSV}
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded border border-border px-2.5 text-2xs font-semibold text-charcoal hover:bg-slate-100"
              >
                <Download className="h-3 w-3" />
                Export HSN CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50 font-bold text-muted">
                    <th className="p-2.5">HSN Code</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">UQC</th>
                    <th className="p-2.5 text-right">Total Qty (Grams/Pcs)</th>
                    <th className="p-2.5 text-right">Taxable Value</th>
                    <th className="p-2.5 text-center">Rate</th>
                    <th className="p-2.5 text-right">CGST</th>
                    <th className="p-2.5 text-right">SGST</th>
                    <th className="p-2.5 text-right">IGST</th>
                    <th className="p-2.5 text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!gstr1?.hsn.length ? (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-muted">
                        No HSN summary data available.
                      </td>
                    </tr>
                  ) : (
                    gstr1.hsn.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-charcoal">{h.hsnCode}</td>
                        <td className="p-2.5 font-medium">{h.description}</td>
                        <td className="p-2.5 font-mono">{h.uqc}</td>
                        <td className="p-2.5 text-right font-mono font-semibold">{h.qty.toFixed(3)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(h.taxableValue)}</td>
                        <td className="p-2.5 text-center font-mono">{h.rate}%</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(h.cgst)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(h.sgst)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(h.igst)}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(h.totalValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 13: Documents Issued */}
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <h4 className="mb-2 font-display text-base font-bold text-charcoal">
              Table 13 — Documents Issued During the Period
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50 font-bold text-muted">
                    <th className="p-2.5">Nature of Document</th>
                    <th className="p-2.5 font-mono">From Serial No</th>
                    <th className="p-2.5 font-mono">To Serial No</th>
                    <th className="p-2.5 text-right">Total Issued</th>
                    <th className="p-2.5 text-right">Cancelled</th>
                    <th className="p-2.5 text-right">Net Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!gstr1?.docIssue.length ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted">
                        No documents recorded.
                      </td>
                    </tr>
                  ) : (
                    gstr1.docIssue.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-charcoal">{d.name}</td>
                        <td className="p-2.5 font-mono text-muted">{d.from}</td>
                        <td className="p-2.5 font-mono text-muted">{d.to}</td>
                        <td className="p-2.5 text-right font-mono">{d.totalCount}</td>
                        <td className="p-2.5 text-right font-mono text-ruby">{d.cancelledCount}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald">{d.netIssued}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GSTR-3B */}
      {/* ========================================================================= */}
      {activeTab === "gstr3b" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Table 3.1: Outward Supplies */}
            <div className="rounded-card border border-border bg-card p-5 shadow-card">
              <h4 className="mb-3 font-display text-base font-bold text-charcoal">
                3.1 Details of Outward Supplies & Inward Reverse Charge
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">(a) Outward Taxable Supplies (net of notes)</span>
                  <span className="font-mono font-bold text-charcoal">
                    {formatCurrency(gstr3b?.outward.taxableValue ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">Central Tax (CGST)</span>
                  <span className="font-mono">{formatCurrency(gstr3b?.outward.cgst ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">State/UT Tax (SGST)</span>
                  <span className="font-mono">{formatCurrency(gstr3b?.outward.sgst ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">Integrated Tax (IGST)</span>
                  <span className="font-mono">{formatCurrency(gstr3b?.outward.igst ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-sm font-bold">
                  <span className="text-charcoal">Total Output Tax Liability</span>
                  <span className="font-mono text-charcoal">
                    {formatCurrency(gstr3b?.outward.taxAmount ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Table 4: Eligible ITC */}
            <div className="rounded-card border border-border bg-card p-5 shadow-card">
              <h4 className="mb-3 font-display text-base font-bold text-charcoal">
                4. Eligible Input Tax Credit (ITC)
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">(A)(5) All Other ITC (Purchase Bills)</span>
                  <span className="font-mono font-bold text-emerald">
                    {formatCurrency(gstr3b?.itc.eligible ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">Central Tax (CGST) Input Credit</span>
                  <span className="font-mono">{formatCurrency(gstr3b?.itc.cgst ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">State/UT Tax (SGST) Input Credit</span>
                  <span className="font-mono">{formatCurrency(gstr3b?.itc.sgst ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">Integrated Tax (IGST) Input Credit</span>
                  <span className="font-mono">{formatCurrency(gstr3b?.itc.igst ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-sm font-bold">
                  <span className="text-charcoal">Net ITC Available</span>
                  <span className="font-mono text-emerald">
                    {formatCurrency(gstr3b?.itc.net ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table 6.1: Section 49 / Rule 88A ITC Set-Off Engine */}
          <div className="rounded-card border border-gold/30 bg-gold/5 p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-display text-base font-bold text-charcoal">
                  6.1 Payment of Tax (Section 49 & Rule 88A ITC Set-Off Engine)
                </h4>
                <p className="text-2xs text-muted">
                  Official GST Law priority: IGST ITC offsets IGST, then CGST/SGST. CGST ITC offsets CGST, then IGST. SGST offsets SGST, then IGST.
                </p>
              </div>
              <span className="rounded bg-gold/20 px-2 py-0.5 font-mono text-xs font-bold text-gold-dark">
                Auto Computed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gold/20 font-bold text-charcoal">
                    <th className="p-2.5">Tax Head</th>
                    <th className="p-2.5 text-right">Tax Liability</th>
                    <th className="p-2.5 text-right">ITC Set-off (Used)</th>
                    <th className="p-2.5 text-right font-bold text-gold-dark">Net Cash to Pay</th>
                    <th className="p-2.5 text-right text-emerald">Remaining ITC Carried</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  <tr>
                    <td className="p-2.5 font-bold">Integrated Tax (IGST)</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(gstr3b?.outward.igst ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald">{formatCurrency(gstr3b?.setOff.used.igst ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-gold-dark">{formatCurrency(gstr3b?.setOff.payable.igst ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald">{formatCurrency(gstr3b?.setOff.carry.igst ?? 0)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Central Tax (CGST)</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(gstr3b?.outward.cgst ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald">{formatCurrency(gstr3b?.setOff.used.cgst ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-gold-dark">{formatCurrency(gstr3b?.setOff.payable.cgst ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald">{formatCurrency(gstr3b?.setOff.carry.cgst ?? 0)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">State/UT Tax (SGST)</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(gstr3b?.outward.sgst ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald">{formatCurrency(gstr3b?.setOff.used.sgst ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-gold-dark">{formatCurrency(gstr3b?.setOff.payable.sgst ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald">{formatCurrency(gstr3b?.setOff.carry.sgst ?? 0)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gold/30 font-bold">
                    <td className="p-2.5 text-charcoal">Total Cash Challan Required</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(gstr3b?.outward.taxAmount ?? 0)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald">
                      {formatCurrency(
                        (gstr3b?.setOff.used.igst ?? 0) + (gstr3b?.setOff.used.cgst ?? 0) + (gstr3b?.setOff.used.sgst ?? 0)
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono text-base text-gold-dark">
                      {formatCurrency(gstr3b?.netTaxPayable ?? 0)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald">
                      {formatCurrency(
                        (gstr3b?.setOff.carry.igst ?? 0) + (gstr3b?.setOff.carry.cgst ?? 0) + (gstr3b?.setOff.carry.sgst ?? 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GSTR-2B RECONCILIATION */}
      {/* ========================================================================= */}
      {activeTab === "gstr2b" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Upload and Guidance Header */}
          <div className="rounded-card border-2 border-dashed border-border bg-slate-50 p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-gold" />
            <h4 className="mt-2 font-display text-base font-bold text-charcoal">
              Upload GSTR-2B JSON from GST Portal
            </h4>
            <p className="mx-auto mt-1 max-w-xl text-xs text-muted">
              Download your official monthly GSTR-2B JSON statement from{" "}
              <a href="https://gst.gov.in" target="_blank" rel="noreferrer" className="text-gold underline">
                gst.gov.in
              </a>{" "}
              (Returns Dashboard &gt; GSTR-2B &gt; Download JSON) and upload it here to reconcile automatically against your purchase bills.
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handle2BUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-gold px-4 text-xs font-bold text-white shadow hover:bg-gold-dark transition-all"
              >
                <Upload className="h-4 w-4" />
                Select GSTR-2B JSON File
              </button>
              {reconciliationFileName && (
                <span className="font-mono text-xs font-semibold text-charcoal">
                  Loaded: {reconciliationFileName}
                </span>
              )}
            </div>
          </div>

          {/* Reconciliation Stats Strip */}
          {reconciliationRows.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-card border border-emerald/30 bg-emerald/5 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald">Matched Invoices</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                </div>
                <div className="mt-1 font-display text-xl font-bold text-emerald">
                  {twoBStats.matchedCount}
                </div>
                <div className="mt-0.5 font-mono text-xs text-muted">
                  ITC: {formatCurrency(twoBStats.matchedItc)}
                </div>
              </div>

              <div className="rounded-card border border-amber-300 bg-amber-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700">Amount Mismatch</span>
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                </div>
                <div className="mt-1 font-display text-xl font-bold text-amber-700">
                  {twoBStats.mismatchCount}
                </div>
                <div className="mt-0.5 text-xs text-muted">Values differ &gt; ₹1</div>
              </div>

              <div className="rounded-card border border-ruby/30 bg-ruby/5 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ruby">In Books Only</span>
                  <ShieldAlert className="h-4 w-4 text-ruby" />
                </div>
                <div className="mt-1 font-display text-xl font-bold text-ruby">
                  {twoBStats.bookOnlyCount}
                </div>
                <div className="mt-0.5 font-mono text-xs text-ruby/80">
                  Unfiled by Supplier: {formatCurrency(twoBStats.bookOnlyItc)}
                </div>
              </div>

              <div className="rounded-card border border-purple-200 bg-purple-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700">In 2B Only</span>
                  <FileText className="h-4 w-4 text-purple-700" />
                </div>
                <div className="mt-1 font-display text-xl font-bold text-purple-700">
                  {twoBStats.twoBOnlyCount}
                </div>
                <div className="mt-0.5 font-mono text-xs text-purple-700/80">
                  Unclaimed ITC: {formatCurrency(twoBStats.twoBOnlyItc)}
                </div>
              </div>
            </div>
          )}

          {/* Reconciliation Table & Filter Toolbar */}
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
                  <input
                    type="text"
                    value={twoBSearch}
                    onChange={(e) => setTwoBSearch(e.target.value)}
                    placeholder="Search Supplier, GSTIN, Invoice No..."
                    className="h-8 rounded border border-border pl-8 pr-3 text-xs focus:border-gold focus:outline-none w-64"
                  />
                </div>

                <div className="flex items-center rounded bg-slate-100 p-0.5 text-2xs font-semibold">
                  {(["all", "matched", "amount_mismatch", "book_only", "twob_only"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTwoBFilter(filter)}
                      className={`rounded px-2.5 py-1 uppercase transition-all ${
                        twoBFilter === filter ? "bg-white text-charcoal shadow" : "text-muted hover:text-charcoal"
                      }`}
                    >
                      {filter.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {reconciliationRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportReconciliationCSV}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-border px-3 text-xs font-semibold text-charcoal hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Reconciliation CSV
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50 font-bold text-muted">
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Supplier Name</th>
                    <th className="p-2.5">Supplier GSTIN</th>
                    <th className="p-2.5">Invoice No</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5 text-right">2B Invoice Val</th>
                    <th className="p-2.5 text-right">Book Value</th>
                    <th className="p-2.5 text-right">Variance</th>
                    <th className="p-2.5 text-center">ITC Eligible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!reconciliationRows.length ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted">
                        No GSTR-2B file uploaded yet. Choose your GSTR-2B JSON file above to run automatic reconciliation.
                      </td>
                    </tr>
                  ) : !filtered2BRows.length ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-muted">
                        No invoices match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filtered2BRows.map((row, idx) => {
                      const badgeClass =
                        row.status === "matched"
                          ? "bg-emerald/15 text-emerald"
                          : row.status === "amount_mismatch"
                          ? "bg-amber-100 text-amber-700"
                          : row.status === "book_only"
                          ? "bg-ruby/15 text-ruby"
                          : "bg-purple-100 text-purple-700";

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${badgeClass}`}>
                              {row.status.replace("_", " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="p-2.5 font-medium">{row.supplier || "Supplier"}</td>
                          <td className="p-2.5 font-mono font-bold text-charcoal">{row.ctin}</td>
                          <td className="p-2.5 font-mono text-gold-dark font-semibold">{row.invoiceNumber}</td>
                          <td className="p-2.5 text-muted">{row.date ? new Date(row.date).toLocaleDateString("en-IN") : "-"}</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(row.twoBVal)}</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(row.bookVal)}</td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            {row.valDiff > 0 ? (
                              <span className={row.status === "matched" ? "text-emerald" : "text-ruby"}>
                                ₹{row.valDiff.toFixed(2)}
                              </span>
                            ) : (
                              "₹0.00"
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {row.itcAvailable ? (
                              <span className="text-emerald">YES</span>
                            ) : (
                              <span className="text-ruby">NO</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TDS / TCS COMPLIANCE */}
      {/* ========================================================================= */}
      {activeTab === "tds" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-display text-base font-bold text-charcoal">
                  Section 194Q & 206C(1H) Compliance Tracker (₹50 Lakh Threshold)
                </h4>
                <p className="text-2xs text-muted">
                  Section 194Q requires a buyer with turnover &gt; ₹10 Cr to deduct 0.1% TDS on aggregate purchase of goods from a supplier exceeding ₹50,00,000 in a FY.
                </p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                {tdsData?.totals.vendorsOverThreshold ?? 0} suppliers crossed ₹50L
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50 font-bold text-muted">
                    <th className="p-2.5">Supplier Name</th>
                    <th className="p-2.5">GSTIN</th>
                    <th className="p-2.5">Section</th>
                    <th className="p-2.5 text-right">Total Purchases in FY</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">TDS Rate</th>
                    <th className="p-2.5 text-right font-bold text-charcoal">TDS Deductible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tdsLoading ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted">
                        Calculating TDS & threshold metrics...
                      </td>
                    </tr>
                  ) : !tdsData?.rows.length ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted">
                        No purchase bills found for TDS calculation.
                      </td>
                    </tr>
                  ) : (
                    tdsData.rows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium">{r.vendorName}</td>
                        <td className="p-2.5 font-mono font-bold text-charcoal">{r.gstin || "-"}</td>
                        <td className="p-2.5 text-muted">{r.section}</td>
                        <td className="p-2.5 text-right font-mono font-semibold">{formatCurrency(r.purchaseAmount)}</td>
                        <td className="p-2.5 text-center">
                          {r.thresholdCrossed ? (
                            <span className="rounded-full bg-ruby/15 px-2 py-0.5 text-2xs font-bold text-ruby">
                              &gt; ₹50L CROSSED
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-muted">
                              Within Threshold
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono">{r.tdsRate}%</td>
                        <td className="p-2.5 text-right font-mono font-bold text-charcoal">
                          {formatCurrency(r.tdsAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PORTAL FILING GUIDE */}
      {/* ========================================================================= */}
      {activeTab === "guide" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* GSTR-1 Guide */}
            <div className="rounded-card border border-border bg-card p-6 shadow-card">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <BarChart3 className="h-5 w-5 text-gold" />
                <h4 className="font-display text-lg font-bold text-charcoal">
                  GSTR-1 Step-by-Step Portal Guide
                </h4>
              </div>

              <div className="space-y-4">
                {GSTR1_STEPS.map((s) => (
                  <div key={s.step} className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 font-mono text-xs font-bold text-gold-dark">
                      {s.step}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-charcoal">{s.title}</div>
                      <div className="mt-1 text-2xs leading-relaxed text-muted">{s.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GSTR-3B Guide */}
            <div className="rounded-card border border-border bg-card p-6 shadow-card">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <FileText className="h-5 w-5 text-gold" />
                <h4 className="font-display text-lg font-bold text-charcoal">
                  GSTR-3B Step-by-Step Portal Guide
                </h4>
              </div>

              <div className="space-y-4">
                {GSTR3B_STEPS.map((s) => (
                  <div key={s.step} className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald/15 font-mono text-xs font-bold text-emerald">
                      {s.step}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-charcoal">{s.title}</div>
                      <div className="mt-1 text-2xs leading-relaxed text-muted">{s.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default GSTPage;
