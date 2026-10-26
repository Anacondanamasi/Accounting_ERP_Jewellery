import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  FileSpreadsheet,
  Check,
  Undo2,
  Ban,
  Layers,
  Sparkles,
  ArrowLeftRight,
  Building2,
  DollarSign,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  bankingService,
  type BankAccount,
  type BankFeedLine,
  type MatchCandidate,
} from "@/services/bankingService";
import { accountsService } from "@/services/accountsService";
import { BankingTabs } from "./BankingTabs";
import { RuleBuilderDrawer } from "./RuleBuilderDrawer";
import type { BankRuleItem } from "@/services/bankRulesService";

export const BankFeedPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [accountId, setAccountId] = useState<number>(Number(searchParams.get("accountId") || 1));
  const [activeTab, setActiveTab] = useState<"FOR_REVIEW" | "CATEGORIZED" | "EXCLUDED">("FOR_REVIEW");
  const [searchQuery, setSearchQuery] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState("ALL");
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([]);
  const [expandedLineId, setExpandedLineId] = useState<number | null>(null);
  const [ruleFilter, setRuleFilter] = useState("ALL");
  const [isRuleDrawerOpen, setIsRuleDrawerOpen] = useState(false);
  const [ruleDrawerLine, setRuleDrawerLine] = useState<BankFeedLine | null>(null);
  const [ruleDrawerRule, setRuleDrawerRule] = useState<BankRuleItem | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [forceImportDuplicates, setForceImportDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded panel state for the active line
  const [panelMode, setPanelMode] = useState<"CATEGORIZE" | "MATCH" | "TRANSFER">("CATEGORIZE");
  const [catType, setCatType] = useState<string>("EXPENSE");
  const [catPayee, setCatPayee] = useState<string>("");
  const [catAccountId, setCatAccountId] = useState<number>(0);
  const [catTaxRate, setCatTaxRate] = useState<number>(0);
  const [catMemo, setCatMemo] = useState<string>("");
  const [targetBankAccId, setTargetBankAccId] = useState<number>(0);
  const [selectedCandidate, setSelectedCandidate] = useState<MatchCandidate | null>(null);

  // Fetch Bank Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => bankingService.listAccounts(),
  });

  // Keep accountId valid
  useEffect(() => {
    if (accounts.length > 0 && !accounts.some((a) => Number(a.id) === accountId)) {
      setAccountId(Number(accounts[0].id));
    }
  }, [accounts, accountId]);

  // Fetch Feed Lines
  const {
    data: feedData,
    isLoading: loadingFeed,
    refetch: refetchFeed,
  } = useQuery({
    queryKey: ["bank-feed", accountId, activeTab, searchQuery, txnTypeFilter, ruleFilter],
    queryFn: () =>
      bankingService.listFeedLines(accountId, {
        status: activeTab,
        search: searchQuery || undefined,
        txnType: txnTypeFilter === "ALL" ? undefined : txnTypeFilter,
        ruleFilter: ruleFilter === "ALL" ? undefined : ruleFilter,
      }),
    enabled: Boolean(accountId),
  });

  // Fetch Chart of Accounts for categorization dropdown
  const { data: coaAccounts = [] } = useQuery({
    queryKey: ["coa-accounts"],
    queryFn: () => accountsService.list(),
  });

  // Fetch matches when a line is expanded in MATCH mode
  const { data: matchCandidates = [], isLoading: loadingMatches } = useQuery({
    queryKey: ["bank-feed-matches", accountId, expandedLineId],
    queryFn: () => bankingService.getFeedLineMatches(accountId, expandedLineId!),
    enabled: Boolean(expandedLineId) && panelMode === "MATCH",
  });

  const lines = feedData?.lines || [];
  const counts = feedData?.counts || { forReview: 0, categorized: 0, excluded: 0, total: 0 };
  const currentBank = feedData?.bankAccount || accounts.find((a) => Number(a.id) === accountId);

  // Toggle expand line & prefill suggestions
  const handleToggleExpand = (line: BankFeedLine) => {
    if (expandedLineId === line.id) {
      setExpandedLineId(null);
    } else {
      setExpandedLineId(line.id);
      setCatType(line.suggestedType || (line.credit > 0 ? "DEPOSIT" : "EXPENSE"));
      setCatPayee(line.payeeHint || "");
      setCatAccountId(line.suggestedAccountId || (coaAccounts[0]?.id ? Number(coaAccounts[0].id) : 0));
      setCatTaxRate(line.suggestedTaxRate || 0);
      setCatMemo(line.notes || line.descriptionRaw);
      setPanelMode("CATEGORIZE");
      setSelectedCandidate(null);
    }
  };

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile) throw new Error("Please select a file to upload");
      return bankingService.uploadStatement(accountId, uploadFile, forceImportDuplicates);
    },
    onSuccess: (data) => {
      toast.success(`Import complete! ${data.importedRows} rows imported, ${data.duplicateRows} duplicates skipped.`);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      void refetchFeed();
      void queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to upload statement");
    },
  });

  // Categorize & Add Mutation
  const categorizeMutation = useMutation({
    mutationFn: (lineId: number) => {
      return bankingService.categorizeFeedLine(accountId, lineId, {
        type: catType as any,
        payee: catPayee,
        accountId: catAccountId,
        taxRate: catTaxRate,
        memo: catMemo,
        targetBankAccountId: catType === "TRANSFER" ? targetBankAccId : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Transaction posted to ledger");
      setExpandedLineId(null);
      void refetchFeed();
      void queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to categorize transaction"),
  });

  // Match Mutation
  const matchMutation = useMutation({
    mutationFn: (lineId: number) => {
      if (!selectedCandidate) throw new Error("Please select a matching document");
      return bankingService.matchFeedLine(accountId, lineId, [
        {
          documentType: selectedCandidate.documentType,
          documentId: selectedCandidate.documentId,
          amount: selectedCandidate.openBalance,
        },
      ]);
    },
    onSuccess: () => {
      toast.success("Transaction matched to existing record");
      setExpandedLineId(null);
      void refetchFeed();
      void queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to match transaction"),
  });

  // Exclude Mutation
  const excludeMutation = useMutation({
    mutationFn: (lineId: number) => bankingService.excludeFeedLine(accountId, lineId, "Excluded by user"),
    onSuccess: () => {
      toast.success("Transaction excluded");
      setExpandedLineId(null);
      void refetchFeed();
      void queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to exclude transaction"),
  });

  // Undo Mutation
  const undoMutation = useMutation({
    mutationFn: (lineId: number) => bankingService.undoFeedLine(accountId, lineId),
    onSuccess: () => {
      toast.success("Restored line back to For Review");
      void refetchFeed();
      void queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to undo transaction"),
  });

  // 1-Click Quick Add with Suggested values
  const handleQuickAdd = (line: BankFeedLine) => {
    const defaultAccId = line.suggestedAccountId || (coaAccounts[0]?.id ? Number(coaAccounts[0].id) : 0);
    categorizeMutation.mutate(line.id);
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedLineIds.length === lines.length) {
      setSelectedLineIds([]);
    } else {
      setSelectedLineIds(lines.map((l) => l.id));
    }
  };


  // Keyboard shortcut listener: R (create rule from line) & Ctrl+Shift+R (rules page)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        navigate("/banking/rules");
        return;
      }
      if (e.key === "r" || e.key === "R") {
        const targetLine = expandedLineId
          ? lines.find((l) => l.id === expandedLineId)
          : selectedLineIds.length > 0
          ? lines.find((l) => l.id === selectedLineIds[0])
          : null;
        if (targetLine) {
          e.preventDefault();
          setRuleDrawerLine(targetLine);
          setRuleDrawerRule(null);
          setIsRuleDrawerOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedLineId, selectedLineIds, lines, navigate]);

  const toggleSelectLine = (id: number) => {
    setSelectedLineIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-4 pb-20">
      <PageHeader
        title="Bank Transactions (Bank Feed)"
        subtitle="Review, categorize, and reconcile statement lines with single-click ledger posting"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/banking/rules")}
              type="button"
              className="text-amber-800 border-amber-300 hover:bg-amber-50"
              title="Manage Bank Automation Rules (Ctrl+Shift+R)"
            >
              <Sparkles className="mr-1.5 h-4 w-4 text-amber-600" />
              Bank Rules
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bankingService.downloadTemplate(accountId, "xlsx")}
              type="button"
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" />
              Download Template (.xlsx)
            </Button>
            <Button
              size="sm"
              className="bg-gold hover:bg-gold-dark text-white font-semibold shadow-sm"
              onClick={() => setIsUploadModalOpen(true)}
              type="button"
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Upload Statement
            </Button>
          </div>
        }
      />

      <BankingTabs />

      {/* ── Top Strip: Account Selector & Balance Card ────────────────────── */}
      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-4 rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">Active Bank Account</label>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm font-semibold text-charcoal focus:border-gold outline-none"
            value={accountId}
            onChange={(e) => {
              const val = Number(e.target.value);
              setAccountId(val);
              setSearchParams({ accountId: String(val) });
            }}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bankName} - {acc.accountName} ({acc.accountNoMasked || "••" + String(acc.id)})
              </option>
            ))}
          </select>
          <p className="mt-2 text-[11px] text-muted">
            IFSC: {currentBank?.ifsc || "—"} · Type: {currentBank?.accountType || "CURRENT"}
          </p>
        </div>

        {/* Balance Strip */}
        <div className="md:col-span-8 rounded-xl border border-border bg-card p-4 shadow-sm grid grid-cols-3 gap-4 divide-x divide-border">
          <div className="px-2">
            <span className="text-xs font-medium text-muted">Bank Statement Balance</span>
            <div className="mt-1 text-2xl font-bold font-mono text-charcoal">
              {formatCurrency(currentBank?.bankBalance || 0)}
            </div>
            <p className="mt-1 text-[11px] text-muted">As per latest imported statement</p>
          </div>

          <div className="px-4">
            <span className="text-xs font-medium text-muted">In HKS Books Balance</span>
            <div className="mt-1 text-2xl font-bold font-mono text-sapphire-dark">
              {formatCurrency(currentBank?.bookBalance || 0)}
            </div>
            <p className="mt-1 text-[11px] text-muted">Posted double-entry ledger position</p>
          </div>

          <div className="px-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-muted">To Review</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-gold/15 px-3 py-1 font-mono text-xl font-bold text-gold">
                  {counts.forReview}
                </span>
                <span className="text-xs text-muted">lines pending</span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/banking/reconcile?accountId=${accountId}`)}
              className="mt-2 text-left text-xs font-semibold text-sapphire hover:underline flex items-center gap-1"
            >
              Go to Reconcile Wizard <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Feed Controls & 3 Tabs ──────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-border bg-slate-50/50 px-4">
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("FOR_REVIEW");
                setSelectedLineIds([]);
                setExpandedLineId(null);
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "FOR_REVIEW"
                  ? "border-gold text-gold bg-white rounded-t-lg shadow-xs"
                  : "border-transparent text-muted hover:text-charcoal"
              }`}
            >
              <span>For review</span>
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">
                {counts.forReview}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("CATEGORIZED");
                setSelectedLineIds([]);
                setExpandedLineId(null);
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "CATEGORIZED"
                  ? "border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-xs"
                  : "border-transparent text-muted hover:text-charcoal"
              }`}
            >
              <span>Categorized</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                {counts.categorized}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("EXCLUDED");
                setSelectedLineIds([]);
                setExpandedLineId(null);
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "EXCLUDED"
                  ? "border-slate-600 text-slate-800 bg-white rounded-t-lg shadow-xs"
                  : "border-transparent text-muted hover:text-charcoal"
              }`}
            >
              <span>Excluded</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                {counts.excluded}
              </span>
            </button>
          </div>

          <div className="text-xs text-muted">
            Showing {lines.length} of {counts.total} transactions
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white p-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description, payee, or UTR reference..."
                className="h-9 w-full rounded-lg border border-border bg-slate-50/50 pl-9 pr-3 text-xs focus:border-gold outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={ruleFilter}
              onChange={(e) => setRuleFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-charcoal outline-none font-medium"
            >
              <option value="ALL">All Rules / Normal</option>
              <option value="WITH_RULE">Rule Recognized</option>
              <option value="AUTO_ADDED">Auto-Added by Rule</option>
              <option value="SUGGESTED">Suggested by Rule</option>
            </select>
            <select
              value={txnTypeFilter}
              onChange={(e) => setTxnTypeFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-charcoal outline-none"
            >
              <option value="ALL">All transactions</option>
              <option value="MONEY_IN">Money In (Received)</option>
              <option value="MONEY_OUT">Money Out (Spent)</option>
            </select>

            {/* Bulk actions */}
            {selectedLineIds.length > 0 && activeTab === "FOR_REVIEW" && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-border">
                <span className="text-xs font-semibold text-charcoal">{selectedLineIds.length} selected</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    selectedLineIds.forEach((id) => excludeMutation.mutate(id));
                    setSelectedLineIds([]);
                  }}
                >
                  <Ban className="mr-1 h-3.5 w-3.5" /> Exclude
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={lines.length > 0 && selectedLineIds.length === lines.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-gold focus:ring-gold"
                  />
                </th>
                <th className="w-24 px-3 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="w-40 px-3 py-3">Payee</th>
                <th className="w-44 px-3 py-3">Category / Match</th>
                <th className="w-28 px-3 py-3 text-right">Spent</th>
                <th className="w-28 px-3 py-3 text-right">Received</th>
                <th className="w-28 px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {loadingFeed ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-muted">
                    Loading bank transactions...
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <p className="text-base font-semibold text-charcoal">No transactions in this view</p>
                    <p className="mt-1 text-xs text-muted">
                      {activeTab === "FOR_REVIEW"
                        ? "You're all caught up! Upload a bank statement to bring in new lines."
                        : `No ${activeTab.toLowerCase()} transactions found.`}
                    </p>
                    {activeTab === "FOR_REVIEW" && (
                      <Button
                        size="sm"
                        className="mt-4 bg-gold hover:bg-gold-dark text-white"
                        onClick={() => setIsUploadModalOpen(true)}
                      >
                        <Upload className="mr-1.5 h-4 w-4" /> Upload Statement
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const isExpanded = expandedLineId === line.id;
                  const isMoneyIn = line.credit > 0;
                  const isSelected = selectedLineIds.includes(line.id);

                  return (
                    <tr key={line.id} className="group">
                      <td colSpan={8} className="p-0">
                        {/* Main Row */}
                        <div
                          className={`flex items-center py-2.5 transition-colors cursor-pointer border-b border-border ${
                            isExpanded
                              ? "bg-gold-tint/15 border-gold/40"
                              : isSelected
                              ? "bg-slate-50"
                              : "hover:bg-slate-50/80"
                          }`}
                          onClick={() => handleToggleExpand(line)}
                        >
                          <div
                            className="w-10 px-4 text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectLine(line.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectLine(line.id)}
                              className="rounded border-border text-gold focus:ring-gold"
                            />
                          </div>

                          <div className="w-24 px-3 font-mono text-muted text-[11px]">
                            {formatDate(line.txnDate)}
                          </div>

                          <div className="px-4 flex-1 min-w-0">
                            <div className="font-medium text-charcoal truncate" title={line.descriptionRaw}>
                              {line.descriptionRaw}
                            </div>
                            {line.reference && (
                              <div className="text-[10px] text-muted font-mono truncate">
                                Ref: {line.reference}
                              </div>
                            )}
                            {line.ruleApplications && line.ruleApplications.length > 0 && line.ruleApplications[0] ? (
                              (() => {
                                const app = line.ruleApplications[0];
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/banking/rules?highlight=${app.ruleId}`);
                                    }}
                                    className={`inline-flex items-center gap-1 mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold border transition-all ${
                                      line.ruleMode === "AUTO_ADDED"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                        : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                                    }`}
                                    title={`Rule: ${app.rule?.name || app.ruleId} (${line.ruleMode === "AUTO_ADDED" ? "Auto-Added" : "Suggested"}). Click to view rule.`}
                                  >
                                    <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                                    <span>{app.rule?.name || `Rule #${line.ruleId}`}</span>
                                    {line.ruleMode === "AUTO_ADDED" && (
                                      <span className="text-[8px] uppercase tracking-wide bg-emerald-200/60 text-emerald-900 rounded px-1 ml-0.5 font-bold">Auto</span>
                                    )}
                                  </button>
                                );
                              })()
                            ) : line.ruleId ? (
                              <span className="inline-flex items-center gap-1 mt-0.5 rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-semibold text-amber-700 border border-amber-200">
                                <Sparkles className="h-2.5 w-2.5" /> Rule #{line.ruleId}
                              </span>
                            ) : null}
                          </div>

                          <div className="w-40 px-3 truncate text-muted text-xs">
                            {line.payeeHint || "—"}
                          </div>

                          <div className="w-44 px-3 truncate">
                            {line.status === "CATEGORIZED" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                                <CheckCircle2 className="h-3 w-3" /> Categorized
                              </span>
                            ) : line.status === "EXCLUDED" ? (
                              <span className="text-slate-400 italic text-[11px]">Excluded</span>
                            ) : line.suggestedType ? (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                {line.suggestedType}
                              </span>
                            ) : (
                              <span className="text-muted italic text-[11px]">Uncategorized</span>
                            )}
                          </div>

                          <div className="w-28 px-3 text-right font-mono font-bold text-charcoal">
                            {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                          </div>

                          <div className="w-28 px-3 text-right font-mono font-bold text-emerald-700">
                            {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                          </div>

                          <div
                            className="w-28 px-4 text-center flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {line.status === "FOR_REVIEW" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs font-bold border-gold text-gold hover:bg-gold hover:text-white transition-all shadow-xs"
                                onClick={() => handleQuickAdd(line)}
                                loading={categorizeMutation.isPending && expandedLineId === line.id}
                              >
                                Add
                              </Button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => undoMutation.mutate(line.id)}
                                className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-charcoal hover:underline"
                                title="Restore to For Review"
                              >
                                <Undo2 className="h-3 w-3" /> Undo
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleExpand(line)}
                              className="rounded p-1 text-muted hover:bg-slate-200 transition-colors"
                              title="Expand line details"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Inline Expand Panel */}
                        {isExpanded && (
                          <div className="bg-canvas/50 p-6 border-b-2 border-gold/40 animate-fade-in">
                            <div className="max-w-4xl mx-auto rounded-xl border border-border bg-white p-6 shadow-md">
                              {/* Mode Selector */}
                              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-charcoal">
                                    <input
                                      type="radio"
                                      name={`mode-${line.id}`}
                                      checked={panelMode === "CATEGORIZE"}
                                      onChange={() => setPanelMode("CATEGORIZE")}
                                      className="text-gold focus:ring-gold"
                                    />
                                    Categorize
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-charcoal">
                                    <input
                                      type="radio"
                                      name={`mode-${line.id}`}
                                      checked={panelMode === "MATCH"}
                                      onChange={() => setPanelMode("MATCH")}
                                      className="text-gold focus:ring-gold"
                                    />
                                    Find Match
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-charcoal">
                                    <input
                                      type="radio"
                                      name={`mode-${line.id}`}
                                      checked={panelMode === "TRANSFER"}
                                      onChange={() => setPanelMode("TRANSFER")}
                                      className="text-gold focus:ring-gold"
                                    />
                                    Record as Transfer
                                  </label>
                                </div>

                                <div className="text-xs font-mono text-muted">
                                  Amount:{" "}
                                  <strong className={isMoneyIn ? "text-emerald-700" : "text-charcoal"}>
                                    {formatCurrency(isMoneyIn ? line.credit : line.debit)}
                                  </strong>
                                </div>
                              </div>

                              {/* MODE 1: Categorize */}
                              {panelMode === "CATEGORIZE" && (
                                <div className="grid gap-4 md:grid-cols-3">
                                  <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                      Transaction Type
                                    </label>
                                    <select
                                      className="mt-1 h-9 w-full rounded border border-border bg-white px-2 text-xs focus:border-gold outline-none"
                                      value={catType}
                                      onChange={(e) => setCatType(e.target.value)}
                                    >
                                      {isMoneyIn ? (
                                        <>
                                          <option value="DEPOSIT">Deposit</option>
                                          <option value="CUSTOMER_PAYMENT">Customer Payment Received</option>
                                          <option value="JOURNAL">General Journal</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="EXPENSE">Expense</option>
                                          <option value="VENDOR_PAYMENT">Vendor Bill Payment</option>
                                          <option value="JOURNAL">General Journal</option>
                                        </>
                                      )}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                      Payee / Party
                                    </label>
                                    <input
                                      type="text"
                                      value={catPayee}
                                      onChange={(e) => setCatPayee(e.target.value)}
                                      placeholder="Who received/sent this?"
                                      className="mt-1 h-9 w-full rounded border border-border px-3 text-xs focus:border-gold outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                      Category / GL Account <span className="text-ruby">*</span>
                                    </label>
                                    <select
                                      className="mt-1 h-9 w-full rounded border border-border bg-white px-2 text-xs focus:border-gold outline-none font-medium"
                                      value={catAccountId}
                                      onChange={(e) => setCatAccountId(Number(e.target.value))}
                                    >
                                      {coaAccounts.map((acc: any) => (
                                        <option key={acc.id} value={acc.id}>
                                          {acc.code} - {acc.name} ({acc.group || acc.type})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                      GST Tax Code
                                    </label>
                                    <select
                                      className="mt-1 h-9 w-full rounded border border-border bg-white px-2 text-xs focus:border-gold outline-none"
                                      value={catTaxRate}
                                      onChange={(e) => setCatTaxRate(Number(e.target.value))}
                                    >
                                      <option value="0">No Tax (0%)</option>
                                      <option value="0.25">GST 0.25% (Rough Stones / Bullion)</option>
                                      <option value="3">GST 3% (Jewellery Standard)</option>
                                      <option value="5">GST 5% (Job Work / Services)</option>
                                      <option value="12">GST 12%</option>
                                      <option value="18">GST 18% (Bank Charges / Repairs)</option>
                                      <option value="28">GST 28%</option>
                                    </select>
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                      Memo / Narration
                                    </label>
                                    <input
                                      type="text"
                                      value={catMemo}
                                      onChange={(e) => setCatMemo(e.target.value)}
                                      placeholder="Add notes..."
                                      className="mt-1 h-9 w-full rounded border border-border px-3 text-xs focus:border-gold outline-none"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* MODE 2: Match Candidates */}
                              {panelMode === "MATCH" && (
                                <div className="space-y-3">
                                  {loadingMatches ? (
                                    <p className="py-6 text-center text-xs text-muted">Searching open invoices and bills...</p>
                                  ) : matchCandidates.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-muted">
                                      No exact matches found for ₹{formatCurrency(isMoneyIn ? line.credit : line.debit)}.
                                      <br />
                                      You can categorize this transaction or search manually.
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                                      {matchCandidates.map((cand) => (
                                        <label
                                          key={`${cand.documentType}-${cand.documentId}`}
                                          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                                            selectedCandidate?.documentId === cand.documentId ? "bg-gold/10" : ""
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="radio"
                                              name="candidate"
                                              checked={selectedCandidate?.documentId === cand.documentId}
                                              onChange={() => setSelectedCandidate(cand)}
                                              className="text-gold focus:ring-gold"
                                            />
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-charcoal">
                                                  {cand.documentType} #{cand.documentNumber}
                                                </span>
                                                <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                                  {cand.confidence}% match
                                                </span>
                                              </div>
                                              <p className="text-[11px] text-muted">
                                                {cand.partyName ? `${cand.partyName} · ` : ""}Dated {cand.date} · {cand.matchReason}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="text-right font-mono">
                                            <div className="text-xs font-bold text-charcoal">{formatCurrency(cand.openBalance)}</div>
                                            <div className="text-[10px] text-muted">Balance Due</div>
                                          </div>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* MODE 3: Contra Transfer */}
                              {panelMode === "TRANSFER" && (
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                      {isMoneyIn ? "Transferred From Account" : "Transferred To Account"}
                                    </label>
                                    <select
                                      className="mt-1 h-9 w-full rounded border border-border bg-white px-2 text-xs focus:border-gold outline-none font-semibold"
                                      value={targetBankAccId}
                                      onChange={(e) => setTargetBankAccId(Number(e.target.value))}
                                    >
                                      <option value="0">Select target account...</option>
                                      {accounts
                                        .filter((a) => Number(a.id) !== accountId)
                                        .map((acc) => (
                                          <option key={acc.id} value={acc.id}>
                                            {acc.bankName} - {acc.accountName}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                      Transfer Memo
                                    </label>
                                    <input
                                      type="text"
                                      value={catMemo}
                                      onChange={(e) => setCatMemo(e.target.value)}
                                      placeholder="Internal Contra Transfer..."
                                      className="mt-1 h-9 w-full rounded border border-border px-3 text-xs focus:border-gold outline-none"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Footer Actions of the panel */}
                              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                                <div className="text-[11px] text-muted font-mono truncate max-w-md">
                                  Raw: {line.descriptionRaw}
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => excludeMutation.mutate(line.id)}
                                    type="button"
                                    className="text-ruby hover:bg-ruby/5"
                                  >
                                    <Ban className="mr-1 h-3.5 w-3.5" /> Exclude
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRuleDrawerLine(line);
                                      setRuleDrawerRule(null);
                                      setIsRuleDrawerOpen(true);
                                    }}
                                    type="button"
                                    className="text-amber-800 border-amber-300 hover:bg-amber-50"
                                    title="Create a reusable automation rule from this statement line (Press R)"
                                  >
                                    <Sparkles className="mr-1 h-3.5 w-3.5 text-amber-600" /> Create Rule from Line
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setExpandedLineId(null)}
                                    type="button"
                                  >
                                    Cancel
                                  </Button>

                                  {panelMode === "MATCH" ? (
                                    <Button
                                      size="sm"
                                      className="bg-gold hover:bg-gold-dark text-white font-bold"
                                      onClick={() => matchMutation.mutate(line.id)}
                                      disabled={!selectedCandidate || matchMutation.isPending}
                                    >
                                      Confirm Match
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="bg-gold hover:bg-gold-dark text-white font-bold"
                                      onClick={() => categorizeMutation.mutate(line.id)}
                                      loading={categorizeMutation.isPending}
                                    >
                                      <Check className="mr-1.5 h-3.5 w-3.5" /> Post & Add to Ledger
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
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

      {/* ── Upload Statement Modal ───────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUploadModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
            <h2 className="font-display text-lg font-bold text-charcoal">Upload Bank Statement</h2>
            <p className="mt-1 text-xs text-muted">
              Upload your bank statement (.xlsx or .csv) for {currentBank?.bankName}. All lines will appear in your Bank Feed inbox.
            </p>

            <div
              className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-8 cursor-pointer hover:border-gold hover:bg-gold-tint/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-gold" />
              <p className="mt-2 text-sm font-semibold text-charcoal">
                {uploadFile ? uploadFile.name : "Click to select statement file"}
              </p>
              <p className="text-xs text-muted">Supports Excel (.xlsx) and CSV</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
                }}
              />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="forceDuplicates"
                checked={forceImportDuplicates}
                onChange={(e) => setForceImportDuplicates(e.target.checked)}
                className="rounded border-border text-gold focus:ring-gold"
              />
              <label htmlFor="forceDuplicates" className="text-xs text-muted select-none">
                Import duplicates anyway (override deduplication hash protection)
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => bankingService.downloadTemplate(accountId, "xlsx")}
                className="text-xs font-semibold text-gold hover:underline flex items-center gap-1"
              >
                <Download className="h-3.5 w-3.5" /> Download Template
              </button>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-gold hover:bg-gold-dark text-white font-bold"
                  disabled={!uploadFile || uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate()}
                  loading={uploadMutation.isPending}
                >
                  Import Transactions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <RuleBuilderDrawer
        isOpen={isRuleDrawerOpen}
        rule={ruleDrawerRule}
        initialLine={ruleDrawerLine}
        accounts={coaAccounts.map((a: any) => ({ id: Number(a.id), name: a.name, code: a.code }))}
        onClose={() => {
          setIsRuleDrawerOpen(false);
          setRuleDrawerLine(null);
          setRuleDrawerRule(null);
        }}
        onSuccess={() => {
          setIsRuleDrawerOpen(false);
          setRuleDrawerLine(null);
          setRuleDrawerRule(null);
          void refetchFeed();
        }}
      />
    </div>
  );
};
