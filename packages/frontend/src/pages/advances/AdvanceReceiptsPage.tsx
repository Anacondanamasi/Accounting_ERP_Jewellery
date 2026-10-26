import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { advanceService } from "@/services/advanceService";
import { paymentService } from "@/services/paymentService";
import { customerService } from "@/services/customerService";
import { accountsService } from "@/services/accountsService";
import { PERIOD_PRESETS, getDatesForPeriod } from "@/lib/periodUtils";
import { useMemo, useState } from "react";
import {
  Wallet,
  Plus,
  Download,
  Printer,
  Search,
  X,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

interface PaymentReceipt {
  id: number;
  customerId: number;
  invoiceId?: number | null;
  type: string;
  date: string;
  mode: string;
  amount: number;
  reference?: string | null;
  notes?: string | null;
  customer?: { id: number; name: string; code: string; mobile?: string | null; phone?: string | null } | null;
  invoice?: { id: number; invoiceNo: string; grandTotal: number; balanceDue: number } | null;
  depositAccount?: { id: number; code: string; name: string; group: string } | null;
  adjustedAmount?: number;
  unallocatedAmount?: number;
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

export const AdvanceReceiptsPage = () => {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<PaymentReceipt | null>(null);
  const [allocateAdvance, setAllocateAdvance] = useState<PaymentReceipt | null>(null);

  // Filters
  const initialDates = getDatesForPeriod("all_time");
  const [period, setPeriod] = useState("all_time");
  const [range, setRange] = useState(initialDates);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form
  const createForm = useForm({
    defaultValues: {
      customerId: "",
      accountId: "",
      invoiceId: "",
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      mode: "BANK_TRANSFER",
      reference: "",
      notes: "",
    },
  });

  const selectedFormCustomerId = createForm.watch("customerId");

  // Allocation Form
  const allocateForm = useForm({
    defaultValues: {
      invoiceId: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
    },
  });

  // Data queries
  const {
    data: receipts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<PaymentReceipt[]>({
    queryKey: [
      "advances-receipts",
      range.from,
      range.to,
      selectedCustomerId,
      selectedMode,
      selectedType,
    ],
    queryFn: () =>
      advanceService.list({
        from: range.from,
        to: range.to,
        customerId: selectedCustomerId || undefined,
        mode: selectedMode || undefined,
        type: selectedType === "ALL" ? undefined : selectedType,
      }),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-for-receipts"],
    queryFn: () => accountsService.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-selector-adv"],
    queryFn: () => customerService.list({}),
  });

  // Open invoices for selected customer in create modal
  const { data: customerInvoices = [] } = useQuery({
    queryKey: ["adv-customer-invoices", selectedFormCustomerId],
    queryFn: () => customerService.getInvoices(Number(selectedFormCustomerId)),
    enabled: Boolean(selectedFormCustomerId),
  });

  // Open invoices for allocate modal
  const { data: allocateInvoices = [] } = useQuery({
    queryKey: ["adv-allocate-invoices", allocateAdvance?.customerId],
    queryFn: () => customerService.getInvoices(Number(allocateAdvance?.customerId)),
    enabled: Boolean(allocateAdvance?.customerId),
  });

  // Filtered Cash/Bank Accounts
  const cashBankAccounts = useMemo(() => {
    const list = (accounts ?? []).filter(isCashOrBankAcc);
    if (list.length > 0) return list;
    // Fallback if no specific matches: any Asset account
    return (accounts ?? []).filter((a: any) =>
      String(a?.type || "").toLowerCase().includes("asset"),
    );
  }, [accounts]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editingReceipt
        ? paymentService.update(editingReceipt.id, payload)
        : advanceService.create(payload),
    onSuccess: () => {
      toast.success(
        editingReceipt
          ? "Payment receipt updated successfully"
          : "Payment receipt recorded successfully",
      );
      createForm.reset();
      setIsCreateModalOpen(false);
      setEditingReceipt(null);
      void refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save payment receipt");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: number) => paymentService.delete(paymentId),
    onSuccess: () => {
      toast.success("Payment receipt deleted successfully");
      setIsCreateModalOpen(false);
      setEditingReceipt(null);
      void refetch();
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete payment receipt");
    },
  });

  const handleEditReceipt = (receipt: PaymentReceipt) => {
    setEditingReceipt(receipt);
    createForm.reset({
      customerId: String(receipt.customerId || ""),
      accountId: receipt.depositAccount?.id ? String(receipt.depositAccount.id) : "",
      invoiceId: receipt.invoiceId ? String(receipt.invoiceId) : "",
      date: new Date(receipt.date).toISOString().slice(0, 10),
      amount: Number(receipt.amount),
      mode: receipt.mode,
      reference: receipt.reference || "",
      notes: receipt.notes || "",
    });
    setIsCreateModalOpen(true);
  };

  const applyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      advanceService.apply(id, payload),
    onSuccess: () => {
      toast.success("Payment allocated to invoice successfully");
      allocateForm.reset();
      setAllocateAdvance(null);
      void refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message ?? "Unable to apply advance to invoice");
    },
  });

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
    setSelectedCustomerId("");
    setSelectedMode("");
    setSelectedType("ALL");
    setSearchQuery("");
  };

  // Filtered receipts
  const displayReceipts = useMemo(() => {
    if (!searchQuery.trim()) return receipts;
    const q = searchQuery.toLowerCase();
    return receipts.filter((r) => {
      const custName = r.customer?.name?.toLowerCase() || "";
      const custCode = r.customer?.code?.toLowerCase() || "";
      const invNo = r.invoice?.invoiceNo?.toLowerCase() || "";
      const ref = r.reference?.toLowerCase() || "";
      const notes = r.notes?.toLowerCase() || "";
      const mode = r.mode?.toLowerCase() || "";
      const amt = String(r.amount);
      const acc = r.depositAccount?.name?.toLowerCase() || "";
      return (
        custName.includes(q) ||
        custCode.includes(q) ||
        invNo.includes(q) ||
        ref.includes(q) ||
        notes.includes(q) ||
        mode.includes(q) ||
        amt.includes(q) ||
        acc.includes(q)
      );
    });
  }, [receipts, searchQuery]);

  // KPI calculations
  const totalAmount = useMemo(
    () => displayReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [displayReceipts],
  );

  const unallocatedTotal = useMemo(
    () =>
      displayReceipts
        .filter((r) => r.type === "ADVANCE_RECEIPT")
        .reduce((sum, r) => sum + Number(r.unallocatedAmount || 0), 0),
    [displayReceipts],
  );

  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return displayReceipts
      .filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      })
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [displayReceipts]);

  // Export to CSV
  const handleExportCSV = () => {
    if (displayReceipts.length === 0) {
      toast.info("No receipts to export");
      return;
    }
    const headers = [
      "Receipt ID",
      "Date",
      "Customer Code",
      "Customer Name",
      "Type",
      "Payment Mode",
      "Deposit Account",
      "Allocated Invoice",
      "Amount",
      "Unallocated Balance",
      "Reference / Notes",
    ];
    const rows = displayReceipts.map((r) => [
      r.id,
      formatDate(r.date),
      r.customer?.code || "",
      `"${r.customer?.name || "Customer"}"`,
      r.type === "ADVANCE_RECEIPT" ? "Advance Receipt" : "Invoice Receipt",
      r.mode,
      `"${r.depositAccount?.name || "-"}"`,
      r.invoice?.invoiceNo || (r.type === "ADVANCE_RECEIPT" ? "Unallocated" : "-"),
      r.amount.toFixed(2),
      (r.unallocatedAmount || 0).toFixed(2),
      `"${(r.reference || r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payment_Receipts_${range.from}_to_${range.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Payment Receipts"
          subtitle="Customer advances, invoice receipts and payment collections"
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
              setEditingReceipt(null);
              createForm.reset({
                customerId: "",
                accountId: cashBankAccounts[0]?.id ? String(cashBankAccounts[0].id) : "",
                invoiceId: "",
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
            <Plus className="h-4 w-4" /> + New Receipt
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Receipts
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald/10 text-emerald">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald">
            {formatCurrency(totalAmount)}
          </div>
          <p className="mt-1 text-xs text-muted">Across {displayReceipts.length} transactions</p>
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
          <p className="mt-1 text-xs text-muted">Received in current month</p>
        </div>

        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Available Advances
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gold/15 text-gold">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-gold-dark">
            {formatCurrency(unallocatedTotal)}
          </div>
          <p className="mt-1 text-xs text-muted">Unapplied advance liability</p>
        </div>

        <div className="rounded-card border border-border bg-card p-5 shadow-card transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Count
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-charcoal">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-charcoal">
            {displayReceipts.length}
          </div>
          <p className="mt-1 text-xs text-muted">Recorded payment vouchers</p>
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

          {/* Customer Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
            >
              <option value="">All Customers</option>
              {(customers ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
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
                placeholder="Search by customer, invoice, notes or amount..."
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
                onClick={() => setSelectedType("ADVANCE_RECEIPT")}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedType === "ADVANCE_RECEIPT"
                    ? "bg-white text-charcoal shadow-sm font-bold"
                    : "text-muted hover:text-charcoal"
                }`}
              >
                Advances
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("RECEIPT")}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedType === "RECEIPT"
                    ? "bg-white text-charcoal shadow-sm font-bold"
                    : "text-muted hover:text-charcoal"
                }`}
              >
                Invoices
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

      {/* Receipts Table */}
      <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
        <div className="border-b border-border bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Payment Receipts List
          </h3>
          <span className="text-xs text-muted font-medium">
            Showing {displayReceipts.length} entries
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
                  Receipt #
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Customer
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Mode
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Deposit Account
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Allocation Status
                </th>
                <th className="border-b border-border px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Amount (₹)
                </th>
                <th className="border-b border-border px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Reference / Notes
                </th>
                <th className="border-b border-border px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted">
                    Loading payment receipts...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-ruby">
                    <p className="font-semibold text-slate-700">Failed to load payment receipts</p>
                    <button
                      onClick={() => void refetch()}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-gold-metallic font-semibold underline hover:text-gold-dark"
                    >
                      Retry loading
                    </button>
                  </td>
                </tr>
              ) : displayReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted">
                    <Wallet className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-base font-semibold text-slate-600">No payment receipts found</p>
                    <p className="text-xs text-muted mt-1">
                      {searchQuery
                        ? "Try clearing your search query or filters."
                        : "Click '+ New Receipt' above to record your first customer payment."}
                    </p>
                  </td>
                </tr>
              ) : (
                displayReceipts.map((row) => {
                  const isAdvance = row.type === "ADVANCE_RECEIPT";
                  const unallocated = row.unallocatedAmount ?? (isAdvance ? row.amount : 0);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleEditReceipt(row)}
                      className="hover:bg-gold-tint/15 cursor-pointer transition-colors group"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>

                      {/* Receipt ID */}
                      <td className="px-4 py-3 font-mono font-bold text-xs text-charcoal whitespace-nowrap">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 group-hover:text-gold-dark transition-colors">
                          {isAdvance ? `ADV-${row.id}` : `RCPT-${row.id}`}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 font-medium text-charcoal">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal">
                            {row.customer?.name || "Customer"}
                          </span>
                          {row.customer?.code && (
                            <span className="text-[10px] font-mono font-bold bg-gold/15 text-charcoal px-1.5 py-0.5 rounded border border-gold/30">
                              {row.customer.code}
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

                      {/* Deposit Account */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-700">
                        {row.depositAccount ? (
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-muted" />
                            <span className="font-medium text-charcoal">
                              {row.depositAccount.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted italic">Bank / Cash</span>
                        )}
                      </td>

                      {/* Allocation Status */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {row.invoice ? (
                          <Link
                            to={`/invoices/${row.invoice.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-sapphire hover:underline inline-flex items-center gap-1"
                            title="View Sales Invoice"
                          >
                            <span>Inv #{row.invoice.invoiceNo}</span>
                          </Link>
                        ) : isAdvance ? (
                          unallocated > 0 ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                              Advance (₹{formatCurrency(unallocated)} unapplied)
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                              ✓ Fully Applied
                            </span>
                          )
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>

                      {/* Reference / Notes */}
                      <td className="px-4 py-3 text-xs text-muted max-w-xs truncate" title={row.reference || row.notes || ""}>
                        {row.reference || row.notes || "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {isAdvance && unallocated > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAllocateAdvance(row);
                                allocateForm.reset({
                                  invoiceId: "",
                                  amount: unallocated,
                                  date: new Date().toISOString().slice(0, 10),
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded bg-gold px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-gold/90 transition-colors"
                            >
                              Allocate <ArrowRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Integrated Accounting Total Footer */}
            {displayReceipts.length > 0 && (
              <tfoot className="border-t-2 border-b-2 border-border bg-gold-tint/40 font-bold text-sm sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={6} className="px-4 py-3 font-bold uppercase tracking-wider text-charcoal">
                    Total Collections
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold text-emerald whitespace-nowrap">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-xs text-muted">
                    {displayReceipts.length} vouchers recorded
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* CREATE PAYMENT RECEIPT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-card bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold font-display text-charcoal">
                  {editingReceipt ? `Edit Payment Receipt (#${editingReceipt.id})` : "Record Payment Receipt"}
                </h3>
                <p className="text-xs text-muted">
                  {editingReceipt
                    ? "Update receipt amount, payment mode, deposit account or reference"
                    : "Receive advance or payment from customer and credit accounts"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editingReceipt && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReceipt(null);
                      createForm.reset({
                        customerId: "",
                        accountId: cashBankAccounts[0]?.id ? String(cashBankAccounts[0].id) : "",
                        invoiceId: "",
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
                    setEditingReceipt(null);
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
                if (!values.customerId) {
                  toast.error("Please select a customer");
                  return;
                }
                if (!values.accountId) {
                  toast.error("Please select a Bank or Cash deposit account");
                  return;
                }

                saveMutation.mutate({
                  customerId: Number(values.customerId),
                  accountId: Number(values.accountId),
                  invoiceId: values.invoiceId ? Number(values.invoiceId) : null,
                  date: values.date,
                  amount,
                  mode: values.mode,
                  reference: values.reference || undefined,
                  notes: values.notes || undefined,
                });
              })}
            >
              {/* Select Customer */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Customer <span className="text-ruby">*</span>
                </label>
                <SearchableSelect
                  onChange={(val) => {
                    createForm.setValue("customerId", val);
                    createForm.setValue("invoiceId", "");
                  }}
                  options={(customers ?? []).map((c: any) => ({
                    value: String(c.id),
                    label: `${c.code} - ${c.name}`,
                    meta: c.mobile || c.phone || "",
                  }))}
                  placeholder="Search customer by name or code..."
                  value={createForm.watch("customerId")}
                />
              </div>

              {/* Deposit To (Bank/Cash Account) - FIXED DROPDOWN */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Deposit To (Bank / Cash Account) <span className="text-ruby">*</span>
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
                  Funds will be debited to this liquid ledger account
                </p>
              </div>

              {/* Allocate to Invoice (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Allocate to Open Invoice (Optional)
                </label>
                <SearchableSelect
                  onChange={(val) => {
                    createForm.setValue("invoiceId", val);
                    const inv = (customerInvoices ?? []).find((i: any) => String(i.id) === String(val));
                    if (inv && Number(createForm.watch("amount")) === 0) {
                      createForm.setValue("amount", Number(inv.balanceDue));
                    }
                  }}
                  options={(customerInvoices ?? [])
                    .filter((inv: any) => Number(inv.balanceDue) > 0)
                    .map((inv: any) => ({
                      value: String(inv.id),
                      label: `${inv.invoiceNo} · Due: ${formatCurrency(inv.balanceDue)}`,
                      meta: inv.date ? formatDate(inv.date) : "",
                    }))}
                  placeholder={
                    selectedFormCustomerId
                      ? "Select an open invoice (or leave blank for advance)"
                      : "Select a customer first to view open invoices"
                  }
                  value={createForm.watch("invoiceId")}
                />
                {createForm.watch("invoiceId") ? (
                  <p className="mt-1 text-[11px] text-emerald font-medium">
                    ✓ Payment will be immediately credited against this invoice.
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted">
                    Leaving this empty records an unallocated Customer Advance receipt.
                  </p>
                )}
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Receipt Date <span className="text-ruby">*</span>
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
                    className="h-10 w-full rounded border border-border bg-white px-3 text-sm font-mono font-bold text-emerald focus:border-gold focus:outline-none"
                    {...createForm.register("amount", { valueAsNumber: true })}
                  />
                </div>
              </div>

              {/* Payment Mode */}
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
                  <option value="CASH">Cash in Hand</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              {/* Reference / Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Reference / UTR / Cheque #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678 or Cheque #987654"
                  className="h-10 w-full rounded border border-border bg-white px-3 text-sm text-charcoal focus:border-gold focus:outline-none"
                  {...createForm.register("reference")}
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  {editingReceipt && (
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to delete payment receipt #${editingReceipt.id}? This will permanently remove the record, reverse the accounting journal entries, and restore any linked invoice balance.`
                          )
                        ) {
                          deleteMutation.mutate(editingReceipt.id);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 h-10 rounded-btn border border-ruby/30 bg-ruby/5 px-4 text-xs font-bold text-ruby hover:bg-ruby hover:text-white transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleteMutation.isPending ? "Deleting..." : "Delete Receipt"}
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
                    {saveMutation.isPending ? "Saving..." : editingReceipt ? "Update Receipt" : "Save Receipt"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE ADVANCE MODAL */}
      {allocateAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-card bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold font-display text-charcoal">
                  Allocate Advance to Invoice
                </h3>
                <p className="text-xs text-muted">
                  Apply unallocated customer advance against an open sales invoice
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllocateAdvance(null)}
                className="rounded-full p-1 text-muted hover:text-charcoal hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted font-medium">Customer:</span>
                <span className="font-bold text-charcoal">{allocateAdvance.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-medium">Original Advance Amount:</span>
                <span className="font-mono font-bold text-charcoal">{formatCurrency(allocateAdvance.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-medium">Unallocated Balance:</span>
                <span className="font-mono font-bold text-emerald">
                  {formatCurrency(allocateAdvance.unallocatedAmount ?? allocateAdvance.amount)}
                </span>
              </div>
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={allocateForm.handleSubmit((values) => {
                const amount = Number(values.amount);
                const maxAllowed = allocateAdvance.unallocatedAmount ?? allocateAdvance.amount;
                if (!values.invoiceId) {
                  toast.error("Please select an invoice to allocate");
                  return;
                }
                if (amount <= 0 || amount > maxAllowed) {
                  toast.error(`Amount must be between 1 and ${formatCurrency(maxAllowed)}`);
                  return;
                }

                applyMutation.mutate({
                  id: allocateAdvance.id,
                  payload: {
                    invoiceId: Number(values.invoiceId),
                    amount,
                    date: values.date,
                  },
                });
              })}
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Select Open Invoice <span className="text-ruby">*</span>
                </label>
                <SearchableSelect
                  onChange={(val) => {
                    allocateForm.setValue("invoiceId", val);
                    const inv = (allocateInvoices ?? []).find((i: any) => String(i.id) === String(val));
                    if (inv) {
                      const maxAllowed = allocateAdvance.unallocatedAmount ?? allocateAdvance.amount;
                      const optimalAmount = Math.min(maxAllowed, Number(inv.balanceDue));
                      allocateForm.setValue("amount", optimalAmount);
                    }
                  }}
                  options={(allocateInvoices ?? [])
                    .filter((inv: any) => Number(inv.balanceDue) > 0)
                    .map((inv: any) => ({
                      value: String(inv.id),
                      label: `${inv.invoiceNo} · Due: ${formatCurrency(inv.balanceDue)}`,
                      meta: inv.date ? formatDate(inv.date) : "",
                    }))}
                  placeholder="Select open invoice..."
                  value={allocateForm.watch("invoiceId")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Allocation Date <span className="text-ruby">*</span>
                  </label>
                  <input
                    type="date"
                    className="h-10 w-full rounded border border-border bg-white px-3 text-sm font-mono text-charcoal focus:border-gold focus:outline-none"
                    {...allocateForm.register("date")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Amount to Apply (₹) <span className="text-ruby">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="h-10 w-full rounded border border-border bg-white px-3 text-sm font-mono font-bold text-emerald focus:border-gold focus:outline-none"
                    {...allocateForm.register("amount", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAllocateAdvance(null)}
                  className="h-10 rounded-btn border border-border bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending}
                  className="h-10 rounded-btn bg-gold px-6 text-sm font-bold text-white shadow hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  {applyMutation.isPending ? "Applying..." : "Confirm Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
