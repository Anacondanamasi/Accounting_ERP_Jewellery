import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { paymentService } from "@/services/paymentService";
import { billService } from "@/services/billService";
import { supplierService } from "@/services/supplierService";
import { accountsService } from "@/services/accountsService";
import { PERIOD_PRESETS, getDatesForPeriod } from "@/lib/periodUtils";
import { useMemo, useState } from "react";
import {
  CreditCard,
  Plus,
  Download,
  Printer,
  Search,
  X,
  Building,
  TrendingDown,
  Clock,
  Wallet,
  Receipt,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

interface SupplierPayment {
  id: number;
  supplierId: number;
  billId?: number | null;
  type: string;
  date: string;
  mode: string;
  amount: number;
  reference?: string | null;
  notes?: string | null;
  supplier?: { id: number; name: string; code: string; mobile?: string | null; phone?: string | null } | null;
  bill?: {
    id: number;
    billNo: string;
    date: string;
    dueDate: string;
    grandTotal: number;
    balanceDue: number;
  } | null;
  paidFromAccount?: { id: number; code: string; name: string; group: string } | null;
}

const isCashOrBankAcc = (acc: any): boolean => {
  const type = String(acc?.type || "").toLowerCase();
  const group = String(acc?.group || "").toLowerCase();
  const name = String(acc?.name || "").toLowerCase();
  const code = String(acc?.code || "").toLowerCase();
  const text = `${code} ${name} ${group} ${type}`;

  return (
    type === "bank" ||
    group.includes("bank") ||
    group.includes("cash") ||
    group.includes("asset") ||
    type.includes("asset")
  ) && /(cash|bank|vault|petty|upi|card|current account|savings|hdfc|sbi|icici|axis)/.test(text);
};

export const AdvancePaymentsPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);

  // Filters
  const initialDates = getDatesForPeriod("all_time");
  const [period, setPeriod] = useState("all_time");
  const [range, setRange] = useState(initialDates);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form
  const createForm = useForm({
    defaultValues: {
      supplierId: "",
      accountId: "",
      billId: "",
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      mode: "BANK_TRANSFER",
      reference: "",
      notes: "",
    },
  });

  const selectedFormSupplierId = createForm.watch("supplierId");

  // Queries
  const {
    data: payments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<SupplierPayment[]>({
    queryKey: [
      "supplier-payments",
      range.from,
      range.to,
      selectedSupplierId,
      selectedMode,
      selectedType,
    ],
    queryFn: () =>
      paymentService.listSupplierPayments({
        from: range.from,
        to: range.to,
        supplierId: selectedSupplierId || undefined,
        mode: selectedMode || undefined,
        type: selectedType === "ALL" ? undefined : selectedType,
      }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list-payments"],
    queryFn: () => supplierService.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-for-supplier-payments"],
    queryFn: () => accountsService.list(),
  });

  // Open bills for selected supplier
  const { data: billsData } = useQuery({
    queryKey: ["bills-for-payments", selectedFormSupplierId],
    queryFn: () => billService.list({ supplierId: selectedFormSupplierId || undefined }),
    enabled: Boolean(selectedFormSupplierId),
  });

  const openBills = useMemo(() => {
    return (billsData?.rows ?? []).filter((b: any) => Number(b.balanceDue) > 0);
  }, [billsData]);

  // Cash / Bank accounts
  const cashBankAccounts = useMemo(() => {
    const list = (accounts ?? []).filter(isCashOrBankAcc);
    if (list.length > 0) return list;
    return (accounts ?? []).filter((a: any) =>
      String(a?.type || "").toLowerCase().includes("asset"),
    );
  }, [accounts]);

  // Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editingPayment
        ? paymentService.update(editingPayment.id, payload)
        : paymentService.createSupplierPayment(payload),
    onSuccess: () => {
      toast.success(
        editingPayment
          ? "Supplier payment updated successfully"
          : "Supplier payment recorded successfully",
      );
      createForm.reset();
      setIsCreateModalOpen(false);
      setEditingPayment(null);
      void refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save payment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: number) => paymentService.delete(paymentId),
    onSuccess: () => {
      toast.success("Payment voucher deleted successfully");
      setIsCreateModalOpen(false);
      setEditingPayment(null);
      void refetch();
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete payment voucher");
    },
  });

  const handleEditPayment = (payment: SupplierPayment) => {
    setEditingPayment(payment);
    createForm.reset({
      supplierId: String(payment.supplierId || ""),
      accountId: payment.paidFromAccount?.id ? String(payment.paidFromAccount.id) : "",
      billId: payment.billId ? String(payment.billId) : "",
      date: new Date(payment.date).toISOString().slice(0, 10),
      amount: Number(payment.amount),
      mode: payment.mode,
      reference: payment.reference || "",
      notes: payment.notes || "",
    });
    setIsCreateModalOpen(true);
  };

  // Filter handlers
  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (val !== "custom") {
      const dates = getDatesForPeriod(val);
      setRange(dates);
    }
  };

  const handleManualDateChange = (field: "from" | "to", val: string) => {
    setPeriod("custom");
    setRange((prev) => ({ ...prev, [field]: val }));
  };

  const handleResetFilters = () => {
    const dates = getDatesForPeriod("all_time");
    setPeriod("all_time");
    setRange(dates);
    setSelectedSupplierId("");
    setSelectedMode("");
    setSelectedType("ALL");
    setSearchQuery("");
  };

  // Filtered rows
  const displayPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter((p) => {
      const suppName = p.supplier?.name?.toLowerCase() || "";
      const suppCode = p.supplier?.code?.toLowerCase() || "";
      const billNo = p.bill?.billNo?.toLowerCase() || "";
      const ref = p.reference?.toLowerCase() || "";
      const notes = p.notes?.toLowerCase() || "";
      const mode = p.mode?.toLowerCase() || "";
      const amt = String(p.amount);
      const acc = p.paidFromAccount?.name?.toLowerCase() || "";
      return (
        suppName.includes(q) ||
        suppCode.includes(q) ||
        billNo.includes(q) ||
        ref.includes(q) ||
        notes.includes(q) ||
        mode.includes(q) ||
        amt.includes(q) ||
        acc.includes(q)
      );
    });
  }, [payments, searchQuery]);

  // KPIs
  const totalAmount = useMemo(
    () => displayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [displayPayments],
  );

  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return displayPayments
      .filter((p) => {
        const d = new Date(p.date);
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [displayPayments]);

  const advancePaymentsTotal = useMemo(
    () =>
      displayPayments
        .filter((p) => p.type === "ADVANCE_PAYMENT")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [displayPayments],
  );

  // Export CSV
  const handleExportCSV = () => {
    if (displayPayments.length === 0) {
      toast.info("No payments to export");
      return;
    }
    const headers = [
      "Payment ID",
      "Date",
      "Supplier Code",
      "Supplier Name",
      "Type",
      "Payment Mode",
      "Paid From Account",
      "Bill No",
      "Amount",
      "Reference / Notes",
    ];
    const rows = displayPayments.map((p) => [
      p.id,
      formatDate(p.date),
      p.supplier?.code || "",
      `"${p.supplier?.name || "Supplier"}"`,
      p.type === "ADVANCE_PAYMENT" ? "Supplier Advance" : "Bill Payment",
      p.mode,
      `"${p.paidFromAccount?.name || "-"}"`,
      p.bill?.billNo || (p.type === "ADVANCE_PAYMENT" ? "Advance" : "-"),
      p.amount.toFixed(2),
      `"${(p.reference || p.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Supplier_Payments_${range.from}_to_${range.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Advance & Supplier Payments"
          subtitle="Record supplier-side payments, advances and bill disbursements"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            type="button"
            className="flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={handleExportCSV}
            type="button"
            className="flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-medium text-charcoal hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => {
              setEditingPayment(null);
              createForm.reset({
                supplierId: "",
                accountId: cashBankAccounts[0]?.id ? String(cashBankAccounts[0].id) : "",
                billId: "",
                date: new Date().toISOString().slice(0, 10),
                amount: 0,
                mode: "BANK_TRANSFER",
                reference: "",
                notes: "",
              });
              setIsCreateModalOpen(true);
            }}
            type="button"
            className="flex h-10 items-center gap-2 rounded-btn bg-gold px-5 text-sm font-bold text-white shadow hover:bg-gold/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> + New Payment
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Disbursed
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-ruby/10 text-ruby">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-ruby">
            {formatCurrency(totalAmount)}
          </div>
          <p className="mt-1 text-xs text-muted">Across {displayPayments.length} disbursements</p>
        </div>

        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              This Month
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-sapphire/10 text-sapphire">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-charcoal">
            {formatCurrency(thisMonthTotal)}
          </div>
          <p className="mt-1 text-xs text-muted">Paid in current month</p>
        </div>

        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Supplier Advances
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gold/15 text-gold">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-gold-dark">
            {formatCurrency(advancePaymentsTotal)}
          </div>
          <p className="mt-1 text-xs text-muted">Advance asset balance</p>
        </div>

        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Vouchers
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-charcoal">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-charcoal">
            {displayPayments.length}
          </div>
          <p className="mt-1 text-xs text-muted">Recorded payment transactions</p>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="rounded-card border border-border bg-card p-5 shadow-card space-y-4">
        <div className="grid gap-4 md:grid-cols-12">
          {/* Period Preset */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Select Period
            </label>
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm font-medium text-charcoal focus:border-gold focus:outline-none"
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              From Date
            </label>
            <input
              type="date"
              value={range.from}
              onChange={(e) => handleManualDateChange("from", e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              To Date
            </label>
            <input
              type="date"
              value={range.to}
              onChange={(e) => handleManualDateChange("to", e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
            />
          </div>

          {/* Supplier Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Supplier
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
            >
              <option value="">All Suppliers</option>
              {(suppliers ?? []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Filter */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
            >
              <option value="">All Modes</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card</option>
            </select>
          </div>
        </div>

        {/* Row 2: Search + Type + Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search by supplier, bill #, notes or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded border border-border bg-white pl-9 pr-3 py-1.5 text-xs text-charcoal placeholder-muted focus:border-gold focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setSelectedType("ALL")}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedType === "ALL" ? "bg-white text-charcoal shadow-sm font-bold" : "text-muted hover:text-charcoal"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("PAYMENT")}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedType === "PAYMENT"
                    ? "bg-white text-charcoal shadow-sm font-bold"
                    : "text-muted hover:text-charcoal"
                }`}
              >
                Bill Payments
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("ADVANCE_PAYMENT")}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedType === "ADVANCE_PAYMENT"
                    ? "bg-white text-charcoal shadow-sm font-bold"
                    : "text-muted hover:text-charcoal"
                }`}
              >
                Advances
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-muted hover:text-charcoal underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
        <div className="border-b border-border bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Disbursement Vouchers
          </h3>
          <span className="text-xs text-muted font-medium">
            Showing {displayPayments.length} entries
          </span>
        </div>

        <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gold-tint text-charcoal shadow-sm">
              <tr>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Date
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Payment #
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Supplier
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Mode
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Paid From Account
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Bill / Purpose
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Bill Date
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Amount (₹)
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Reference / Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted">
                    Loading supplier payments...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-ruby">
                    <p className="font-semibold text-slate-700">Failed to load supplier payments</p>
                    <button
                      onClick={() => void refetch()}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-gold-metallic font-semibold underline hover:text-gold-dark"
                    >
                      Retry loading
                    </button>
                  </td>
                </tr>
              ) : displayPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted">
                    <Receipt className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-base font-semibold text-slate-600">No supplier payments found</p>
                    <p className="text-xs text-muted mt-1">
                      {searchQuery
                        ? "Try clearing your search query or filters."
                        : "Click '+ New Payment' above to record a payment to a supplier."}
                    </p>
                  </td>
                </tr>
              ) : (
                displayPayments.map((row) => {
                  const isAdvance = row.type === "ADVANCE_PAYMENT";

                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleEditPayment(row)}
                      className="hover:bg-gold-tint/15 cursor-pointer transition-colors group"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>

                      {/* Payment # */}
                      <td className="px-4 py-3 font-mono font-bold text-xs text-charcoal whitespace-nowrap">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 group-hover:text-gold-dark transition-colors">
                          {isAdvance ? `SADV-${row.id}` : `PAY-${row.id}`}
                        </span>
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-3 font-medium text-charcoal">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal">
                            {row.supplier?.name || "Supplier"}
                          </span>
                          {row.supplier?.code && (
                            <span className="text-[10px] font-mono font-bold bg-gold/15 text-charcoal px-1.5 py-0.5 rounded border border-gold/30">
                              {row.supplier.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mode */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.mode === "CASH" ? (
                            "💵 Cash"
                          ) : row.mode === "UPI" ? (
                            "📱 UPI"
                          ) : row.mode === "BANK_TRANSFER" ? (
                            "🏦 Bank Transfer"
                          ) : row.mode === "CHEQUE" ? (
                            "📑 Cheque"
                          ) : (
                            row.mode
                          )}
                        </span>
                      </td>

                      {/* Paid From Account */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-700">
                        {row.paidFromAccount ? (
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-muted" />
                            <span className="font-medium text-charcoal">
                              {row.paidFromAccount.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted italic">Bank / Cash</span>
                        )}
                      </td>

                      {/* Bill / Allocation */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {row.bill ? (
                          <Link
                            to={`/bills/${row.bill.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-sapphire hover:underline inline-flex items-center gap-1"
                            title="View Purchase Bill"
                          >
                            <span>Bill #{row.bill.billNo}</span>
                          </Link>
                        ) : isAdvance ? (
                          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold-dark border border-gold/30">
                            Supplier Advance
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Bill Date */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {row.bill?.date ? formatDate(row.bill.date) : "—"}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-ruby whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 text-xs text-muted max-w-xs truncate" title={row.reference || row.notes || ""}>
                        {row.reference || row.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer */}
            {displayPayments.length > 0 && (
              <tfoot className="border-t-2 border-b-2 border-border bg-gold-tint/40 font-bold text-sm sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={7} className="px-4 py-3 font-bold uppercase tracking-wider text-charcoal">
                    Total Disbursements
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold text-ruby whitespace-nowrap">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {displayPayments.length} payments recorded
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* CREATE PAYMENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-card bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold font-display text-charcoal">
                  {editingPayment ? `Edit Supplier Payment (#${editingPayment.id})` : "Record Supplier Payment"}
                </h3>
                <p className="text-xs text-muted">
                  {editingPayment
                    ? "Update disbursement amount, payment mode, account or reference"
                    : "Disburse payments against purchase bills or pay supplier advances"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editingPayment && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPayment(null);
                      createForm.reset({
                        supplierId: "",
                        accountId: cashBankAccounts[0]?.id ? String(cashBankAccounts[0].id) : "",
                        billId: "",
                        date: new Date().toISOString().slice(0, 10),
                        amount: 0,
                        mode: "BANK_TRANSFER",
                        reference: "",
                        notes: "",
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold-dark hover:bg-gold/25 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Create New
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingPayment(null);
                  }}
                  className="rounded-full p-1 text-muted hover:text-charcoal hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={createForm.handleSubmit((values) => {
                const amount = Number(values.amount);
                if (amount <= 0) {
                  toast.error("Amount must be greater than zero");
                  return;
                }
                if (!values.supplierId) {
                  toast.error("Please select a supplier");
                  return;
                }
                if (!values.accountId) {
                  toast.error("Please select a Bank or Cash account to pay from");
                  return;
                }

                saveMutation.mutate({
                  supplierId: Number(values.supplierId),
                  accountId: Number(values.accountId),
                  billId: values.billId ? Number(values.billId) : null,
                  date: values.date,
                  amount,
                  mode: values.mode,
                  reference: values.reference || undefined,
                  notes: values.notes || undefined,
                });
              })}
            >
              {/* Select Supplier */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Supplier <span className="text-ruby">*</span>
                </label>
                <SearchableSelect
                  onChange={(val) => {
                    createForm.setValue("supplierId", val);
                    createForm.setValue("billId", "");
                  }}
                  options={(suppliers ?? []).map((s: any) => ({
                    value: String(s.id),
                    label: `${s.code} - ${s.name}`,
                    meta: s.mobile || s.phone || "",
                  }))}
                  placeholder="Search supplier by name or code..."
                  value={createForm.watch("supplierId")}
                />
              </div>

              {/* Paid From (Bank/Cash Account) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Paid From (Bank / Cash Account) <span className="text-ruby">*</span>
                </label>
                <SearchableSelect
                  onChange={(val) => createForm.setValue("accountId", val)}
                  options={cashBankAccounts.map((acc: any) => ({
                    value: String(acc.id),
                    label: `${acc.code} - ${acc.name}`,
                    meta: acc.group || acc.type || "Asset",
                  }))}
                  placeholder="Select Bank or Cash account..."
                  value={createForm.watch("accountId")}
                />
                <p className="mt-1 text-[11px] text-muted">
                  Funds will be credited (disbursed) from this account
                </p>
              </div>

              {/* Allocate to Purchase Bill */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Allocate to Purchase Bill (Optional)
                </label>
                <SearchableSelect
                  onChange={(val) => {
                    createForm.setValue("billId", val);
                    const bill = openBills.find((b: any) => String(b.id) === String(val));
                    if (bill && Number(createForm.watch("amount")) === 0) {
                      createForm.setValue("amount", Number(bill.balanceDue));
                    }
                  }}
                  options={openBills.map((b: any) => ({
                    value: String(b.id),
                    label: `${b.billNo} · Due: ${formatCurrency(b.balanceDue)}`,
                    meta: b.date ? formatDate(b.date) : "",
                  }))}
                  placeholder={
                    selectedFormSupplierId
                      ? "Select an open bill (or leave blank for advance)"
                      : "Select a supplier first to view open bills"
                  }
                  value={createForm.watch("billId")}
                />
                {createForm.watch("billId") ? (
                  <p className="mt-1 text-[11px] text-emerald font-medium">
                    ✓ Payment will be immediately deducted from this bill's balance due.
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted">
                    Leaving this empty records an unallocated Supplier Advance.
                  </p>
                )}
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Payment Date <span className="text-ruby">*</span>
                  </label>
                  <input
                    type="date"
                    className="h-10 w-full rounded border border-border bg-white px-3 text-sm font-mono text-charcoal focus:border-gold focus:outline-none"
                    {...createForm.register("date")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Amount (₹) <span className="text-ruby">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="h-10 w-full rounded border border-border bg-white px-3 text-sm font-mono font-bold text-ruby focus:border-gold focus:outline-none"
                    {...createForm.register("amount", { valueAsNumber: true })}
                  />
                </div>
              </div>

              {/* Mode */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Payment Mode <span className="text-ruby">*</span>
                </label>
                <select
                  className="h-10 w-full rounded border border-border bg-white px-3 text-sm font-medium text-charcoal focus:border-gold focus:outline-none"
                  {...createForm.register("mode")}
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Reference / UTR / Cheque #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98765432 or Cheque #123456"
                  className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
                  {...createForm.register("reference")}
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  {editingPayment && (
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to delete payment voucher #${editingPayment.id}? This will permanently remove the record, reverse the accounting journal entries, and restore any linked bill balance.`
                          )
                        ) {
                          deleteMutation.mutate(editingPayment.id);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 h-10 rounded-btn border border-ruby/30 bg-ruby/5 px-4 text-xs font-bold text-ruby hover:bg-ruby hover:text-white transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleteMutation.isPending ? "Deleting..." : "Delete Payment"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="h-10 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="h-10 rounded-btn bg-gold px-6 text-sm font-bold text-white shadow hover:bg-gold/90 transition-colors disabled:opacity-50"
                  >
                    {saveMutation.isPending ? "Saving..." : editingPayment ? "Update Payment" : "Save Payment"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
