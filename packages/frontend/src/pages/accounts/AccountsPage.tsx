import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Keyboard,
  Layers,
  Loader2,
  Lock,
  Pencil,
  PieChart,
  Plus,
  Scale,
  Search,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/formatters";
import { accountsService } from "@/services/accountsService";
import { AccountFormModal } from "./AccountFormModal";
import { AccountGroupModal } from "./AccountGroupModal";
import { BankAccountFormModal } from "./BankAccountFormModal";

interface AccountRow {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  heading: string;
  group: string;
  groupId?: number | null;
  type: string;
  taxCode?: string | null;
  openingBalance: number;
  currentBalance?: number;
  totalDebit?: number;
  totalCredit?: number;
  transactionCount?: number;
  isActive: boolean;
  isControlAccount?: boolean;
}

interface AccountGroup {
  id: number;
  name: string;
  heading: string;
  type: string;
  isActive: boolean;
}

interface ImportRow {
  code: string;
  name: string;
  description: string;
  type: string;
  group: string;
  openingBalance: number;
  taxCode: string;
  isActive: boolean;
}

const TABS = ["All Accounts", "Assets", "Liabilities", "Equity", "Expenses", "Revenue", "Archive", "Groups"] as const;
type TabType = typeof TABS[number];

const EXPORT_HEADERS = [
  "code",
  "name",
  "heading",
  "group",
  "type",
  "taxCode",
  "openingBalance",
  "currentBalance",
  "transactionCount",
  "isActive",
  "description",
];

const IMPORT_TEMPLATE =
  "code,name,type,group,openingBalance,taxCode,isActive,description\n1200,Sample Asset,Current Asset,Current Assets,0,Tax Exempt (0%),true,Imported account\n";

const accountTypeFallback = (type: string) => type || "Expense";

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
};

const getTypeBadgeClass = (heading?: string, type?: string) => {
  const normH = String(heading || "").toUpperCase();
  const normT = String(type || "").toUpperCase();

  if (normH === "ASSETS" || normT.includes("ASSET")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (normH === "LIABILITIES" || normT.includes("LIABIL")) {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  if (normH === "EQUITY" || normT.includes("EQUITY")) {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  if (normH === "REVENUE" || normT.includes("REVENUE") || normT.includes("INCOME")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (normH === "EXPENSES" || normT.includes("EXPENSE") || normT.includes("COGS")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const formatLedgerBalance = (amount?: number, typeOrHeading?: string) => {
  const num = Number(amount ?? 0);
  const norm = String(typeOrHeading || "").toLowerCase();
  const isDebitNature = norm.includes("asset") || norm.includes("expense") || norm.includes("cogs");

  const abs = Math.abs(num);
  let side = "";
  if (num > 0) {
    side = isDebitNature ? "Dr" : "Cr";
  } else if (num < 0) {
    side = isDebitNature ? "Cr" : "Dr";
  }
  return {
    formatted: formatCurrency(abs),
    side,
    raw: num,
  };
};

const downloadFile = (fileName: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const exportAccountsCsv = (rows: AccountRow[]) => {
  const csv = [
    EXPORT_HEADERS.join(","),
    ...rows.map((row) => EXPORT_HEADERS.map((key) => escapeCsv(row[key as keyof AccountRow])).join(",")),
  ].join("\n");
  downloadFile(`chart-of-accounts-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const exportAccountsPdf = (rows: AccountRow[]) => {
  const printWindow = window.open("", "_blank", "width=1120,height=760");
  if (!printWindow) {
    toast.error("Allow pop-ups to export the PDF");
    return;
  }

  const bodyRows = rows
    .map((row) => {
      const bal = formatLedgerBalance(row.currentBalance ?? row.openingBalance, row.type || row.heading);
      return `
        <tr>
          <td>${escapeHtml(row.code)}</td>
          <td><strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.description || "")}</span></td>
          <td>${escapeHtml(row.group)}</td>
          <td>${escapeHtml(row.type)}</td>
          <td>${escapeHtml(row.taxCode || "Tax Exempt (0%)")}</td>
          <td class="right">${escapeHtml(formatCurrency(row.openingBalance))}</td>
          <td class="right font-bold">${escapeHtml(bal.formatted)} ${bal.side}</td>
        </tr>`;
    })
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Chart of Accounts</title>
        <style>
          @page { margin: 18mm; }
          * { box-sizing: border-box; }
          body { color: #1a1d23; font-family: Inter, Arial, sans-serif; margin: 0; }
          header { align-items: flex-end; border-bottom: 2px solid #c9922a; display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; }
          h1 { font-size: 24px; margin: 0; }
          p { color: #6b7280; margin: 4px 0 0; }
          table { border-collapse: collapse; font-size: 12px; width: 100%; }
          th { background: #fdf8ee; color: #1a1d23; text-align: left; }
          th, td { border-bottom: 1px solid #ede8df; padding: 9px 8px; vertical-align: top; }
          span { color: #64748b; font-size: 11px; }
          .right { text-align: right; white-space: nowrap; }
          .font-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Chart of Accounts</h1>
            <p>${rows.length} account${rows.length === 1 ? "" : "s"} exported on ${new Date().toLocaleDateString()}</p>
          </div>
          <p>HKS Accounting</p>
        </header>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Group</th>
              <th>Type</th>
              <th>Tax Rate</th>
              <th class="right">Opening Bal</th>
              <th class="right">Current Bal</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const buildImportRows = (text: string) => {
  const [headerRow, ...dataRows] = parseCsv(text);
  if (!headerRow || dataRows.length === 0) return { rows: [], errors: ["CSV needs a header row and at least one account row."] };

  const headers = headerRow.map(normalizeHeader);
  const pick = (row: string[], names: string[]) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? row[index] ?? "" : "";
  };

  const errors: string[] = [];
  const rows = dataRows
    .map((row, index) => {
      const code = pick(row, ["code", "accountcode"]);
      const name = pick(row, ["name", "accountname"]);
      if (!code || !name) errors.push(`Row ${index + 2}: code and name are required.`);

      return {
        code,
        name,
        description: pick(row, ["description", "notes"]),
        type: pick(row, ["type", "accounttype"]),
        group: pick(row, ["group", "accountgroup"]),
        openingBalance: Number(pick(row, ["openingbalance", "balance", "ytd"]) || 0),
        taxCode: pick(row, ["taxcode", "taxrate", "tax"]),
        isActive: !["false", "no", "0", "archived"].includes(pick(row, ["isactive", "active", "status"]).toLowerCase()),
      };
    })
    .filter((row) => row.code && row.name);

  return { rows, errors };
};

export const AccountsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>("All Accounts");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(null);
  const [selectedGroupData, setSelectedGroupData] = useState<AccountGroup | null>(null);

  const { data: accounts = [], isLoading } = useQuery<AccountRow[]>({
    queryKey: ["accounts"],
    queryFn: () => accountsService.list({}),
  });

  const { data: groups = [] } = useQuery<AccountGroup[]>({
    queryKey: ["account-groups"],
    queryFn: () => accountsService.listGroups(),
  });

  // KPI Calculations across all active accounts
  const summaryMetrics = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let ytdRevenue = 0;
    let ytdExpenses = 0;
    let activeCount = 0;

    for (const acc of accounts) {
      if (!acc.isActive) continue;
      activeCount += 1;
      const bal = Number(acc.currentBalance ?? acc.openingBalance ?? 0);
      const h = (acc.heading || "").toUpperCase();
      const t = (acc.type || "").toUpperCase();
      const g = (acc.group || "").toUpperCase();

      if (h === "ASSETS" || t.includes("ASSET") || g.includes("ASSET")) {
        totalAssets += bal;
      } else if (h === "LIABILITIES" || t.includes("LIABIL") || g.includes("LIABIL")) {
        totalLiabilities += bal;
      } else if (h === "EQUITY" || t.includes("EQUITY") || g.includes("EQUITY") || g.includes("CAPITAL")) {
        totalEquity += bal;
      } else if (h === "REVENUE" || t.includes("REVENUE") || t.includes("INCOME") || g.includes("INCOME")) {
        ytdRevenue += bal;
      } else if (h === "EXPENSES" || t.includes("EXPENSE") || g.includes("EXPENSE") || t.includes("COGS")) {
        ytdExpenses += bal;
      }
    }

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      ytdRevenue,
      ytdExpenses,
      activeCount,
    };
  }, [accounts]);

  // Tab count badges
  const tabCounts = useMemo(() => {
    const counts: Record<TabType, number> = {
      "All Accounts": 0,
      Assets: 0,
      Liabilities: 0,
      Equity: 0,
      Expenses: 0,
      Revenue: 0,
      Archive: 0,
      Groups: groups.length,
    };

    for (const acc of accounts) {
      if (!acc.isActive) {
        counts["Archive"] += 1;
        continue;
      }
      counts["All Accounts"] += 1;
      const h = (acc.heading || "").toUpperCase();
      const t = (acc.type || "").toUpperCase();
      const g = (acc.group || "").toUpperCase();

      if (h === "ASSETS" || t.includes("ASSET") || g.includes("ASSET")) counts["Assets"] += 1;
      else if (h === "LIABILITIES" || t.includes("LIABIL") || g.includes("LIABIL")) counts["Liabilities"] += 1;
      else if (h === "EQUITY" || t.includes("EQUITY") || g.includes("CAPITAL")) counts["Equity"] += 1;
      else if (h === "REVENUE" || t.includes("REVENUE") || t.includes("INCOME") || g.includes("INCOME")) counts["Revenue"] += 1;
      else if (h === "EXPENSES" || t.includes("EXPENSE") || g.includes("EXPENSE") || t.includes("COGS")) counts["Expenses"] += 1;
    }

    return counts;
  }, [accounts, groups]);

  const importPreview = useMemo(() => buildImportRows(importText), [importText]);

  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

    if (activeTab === "Archive") {
      filtered = filtered.filter((account) => !account.isActive);
    } else {
      filtered = filtered.filter((account) => account.isActive);
      if (activeTab !== "All Accounts" && activeTab !== "Groups") {
        const tabUpper = activeTab.toUpperCase();
        filtered = filtered.filter((account) => {
          if (activeTab === "Equity") {
            return (
              account.heading === "EQUITY" ||
              account.type?.toLowerCase() === "equity" ||
              account.group?.toLowerCase() === "equity" ||
              account.group?.toLowerCase().includes("capital")
            );
          }
          return (
            account.heading === tabUpper ||
            account.type?.toUpperCase().includes(tabUpper) ||
            account.group?.toUpperCase().includes(tabUpper)
          );
        });
      }
    }

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          account.code?.toLowerCase().includes(lowerQuery) ||
          account.name?.toLowerCase().includes(lowerQuery) ||
          account.group?.toLowerCase().includes(lowerQuery) ||
          account.type?.toLowerCase().includes(lowerQuery) ||
          account.description?.toLowerCase().includes(lowerQuery),
      );
    }

    return filtered;
  }, [accounts, activeTab, searchQuery]);

  const activeRows = activeTab === "Groups" ? [] : filteredAccounts;
  const selectableRows = activeRows.filter((account) => !account.isControlAccount);
  const selectedRows = activeRows.filter((account) => selectedIds.includes(account.id));
  const exportRows = selectedRows.length > 0 ? selectedRows : activeRows;
  const allVisibleSelected = selectableRows.length > 0 && selectableRows.every((account) => selectedIds.includes(account.id));

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => activeRows.some((account) => account.id === id)));
  }, [activeRows]);

  const openAddModal = () => {
    setSelectedAccount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (account: AccountRow) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const openLedger = (account: AccountRow) => {
    navigate(`/ledger/${account.id}`);
  };

  const toggleSelected = (accountId: number) => {
    setSelectedIds((current) => (current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId]));
  };

  const toggleAllVisible = () => {
    setSelectedIds(allVisibleSelected ? [] : selectableRows.map((account) => account.id));
  };

  const handleExportCsv = () => {
    if (exportRows.length === 0) {
      toast.error("No accounts to export");
      return;
    }
    exportAccountsCsv(exportRows);
    toast.success(`${exportRows.length} account${exportRows.length === 1 ? "" : "s"} exported to CSV`);
  };

  const handleExportPdf = () => {
    if (exportRows.length === 0) {
      toast.error("No accounts to export");
      return;
    }
    exportAccountsPdf(exportRows);
  };

  const importMutation = useMutation({
    mutationFn: async (rows: ImportRow[]) => {
      let createdCount = 0;
      let updatedCount = 0;
      const failures: string[] = [];

      for (const row of rows) {
        try {
          const existing = accounts.find((account) => account.code.toLowerCase() === row.code.toLowerCase());
          const group = groups.find((item) => item.name.toLowerCase() === row.group.toLowerCase());
          const payload = {
            code: row.code,
            name: row.name,
            description: row.description || null,
            groupId: group?.id ?? null,
            type: group?.type ?? accountTypeFallback(row.type),
            openingBalance: Number.isFinite(row.openingBalance) ? row.openingBalance : 0,
            taxCode: row.taxCode || "Tax Exempt (0%)",
            isActive: row.isActive,
          };

          if (existing) {
            await accountsService.update(existing.id, payload);
            updatedCount += 1;
          } else {
            await accountsService.create(payload);
            createdCount += 1;
          }
        } catch (error: any) {
          failures.push(`${row.code}: ${error?.response?.data?.error?.message ?? "Import failed"}`);
        }
      }

      return { createdCount, updatedCount, failures };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      if (result.failures.length > 0) {
        toast.error(`${result.failures.length} row${result.failures.length === 1 ? "" : "s"} failed. ${result.failures[0]}`);
      } else {
        toast.success(`${result.createdCount} created, ${result.updatedCount} updated`);
        setIsImportOpen(false);
        setImportText("");
      }
    },
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (isEditableTarget(event.target)) return;

      if (key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!event.altKey) return;

      const shortcuts: Record<string, () => void> = {
        a: openAddModal,
        b: () => setIsBankModalOpen(true),
        i: () => setIsImportOpen(true),
        e: handleExportCsv,
        p: handleExportPdf,
        g: () => setActiveTab("Groups"),
      };

      if (shortcuts[key]) {
        event.preventDefault();
        shortcuts[key]();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRows, exportRows, groups, accounts]);

  const handleFileChange = async (file?: File) => {
    if (!file) return;
    setImportText(await file.text());
  };

  const runImport = () => {
    if (importPreview.errors.length > 0) {
      toast.error(importPreview.errors[0]);
      return;
    }
    if (importPreview.rows.length === 0) {
      toast.error("Add CSV rows before importing");
      return;
    }
    importMutation.mutate(importPreview.rows);
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 pb-12 pt-5 sm:px-6">
      {/* Top Header Card */}
      <section className="rounded-card border border-border bg-card shadow-card">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <span>Accounting</span>
              <span>/</span>
              <span>General Ledger</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-charcoal">Chart of Accounts</h1>
            <p className="mt-1 text-sm text-muted">
              Click any account row or code to immediately open and inspect its General Ledger. {accounts.length} accounts configured.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              aria-label="Add account"
              className="inline-flex h-10 items-center gap-2 rounded-btn bg-charcoal px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-charcoal/90 focus:outline-none focus:ring-2 focus:ring-charcoal focus:ring-offset-2"
              onClick={openAddModal}
              title="Add Account (Alt+A)"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </button>
            <button
              aria-label="Add bank account"
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-semibold text-charcoal shadow-sm transition-colors hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
              onClick={() => setIsBankModalOpen(true)}
              title="Add Bank Account (Alt+B)"
              type="button"
            >
              <Building2 className="h-4 w-4 text-gold" />
              Add Bank
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-semibold text-charcoal shadow-sm transition-colors hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
              onClick={() => setIsImportOpen(true)}
              title="Bulk Import CSV (Alt+I)"
              type="button"
            >
              <Upload className="h-4 w-4 text-sapphire" />
              Import CSV
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-semibold text-charcoal shadow-sm transition-colors hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
              onClick={handleExportCsv}
              title="Export CSV (Alt+E)"
              type="button"
            >
              <Download className="h-4 w-4 text-emerald" />
              Export CSV
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-semibold text-charcoal shadow-sm transition-colors hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
              onClick={handleExportPdf}
              title="Export PDF (Alt+P)"
              type="button"
            >
              <FileText className="h-4 w-4 text-ruby" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Live KPI Summary Overview Cards */}
        <div className="grid grid-cols-2 gap-3 border-b border-border bg-canvas/30 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Total Assets</span>
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="mt-1 font-display text-base font-bold text-blue-700 sm:text-lg">
              {formatCurrency(summaryMetrics.totalAssets)}
              <span className="ml-1 text-xs font-semibold text-muted">Dr</span>
            </div>
            <div className="text-[11px] text-muted">{tabCounts.Assets} accounts</div>
          </div>

          <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Liabilities</span>
              <CreditCard className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="mt-1 font-display text-base font-bold text-amber-700 sm:text-lg">
              {formatCurrency(summaryMetrics.totalLiabilities)}
              <span className="ml-1 text-xs font-semibold text-muted">Cr</span>
            </div>
            <div className="text-[11px] text-muted">{tabCounts.Liabilities} accounts</div>
          </div>

          <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Equity</span>
              <Scale className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="mt-1 font-display text-base font-bold text-purple-700 sm:text-lg">
              {formatCurrency(summaryMetrics.totalEquity)}
              <span className="ml-1 text-xs font-semibold text-muted">Cr</span>
            </div>
            <div className="text-[11px] text-muted">{tabCounts.Equity} accounts</div>
          </div>

          <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>YTD Revenue</span>
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 font-display text-base font-bold text-emerald-700 sm:text-lg">
              {formatCurrency(summaryMetrics.ytdRevenue)}
            </div>
            <div className="text-[11px] text-muted">{tabCounts.Revenue} income accts</div>
          </div>

          <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>YTD Expenses</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
            </div>
            <div className="mt-1 font-display text-base font-bold text-rose-700 sm:text-lg">
              {formatCurrency(summaryMetrics.ytdExpenses)}
            </div>
            <div className="text-[11px] text-muted">{tabCounts.Expenses} expense accts</div>
          </div>

          <div className="rounded-btn border border-border/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Active Accounts</span>
              <Layers className="h-3.5 w-3.5 text-charcoal" />
            </div>
            <div className="mt-1 font-display text-base font-bold text-charcoal sm:text-lg">
              {summaryMetrics.activeCount}
            </div>
            <div className="text-[11px] text-muted">{groups.length} groups total</div>
          </div>
        </div>

        {/* Tab Selection & Search Bar */}
        <div className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Account filters">
            {TABS.map((tab) => {
              const count = tabCounts[tab];
              return (
                <button
                  aria-selected={activeTab === tab}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-btn px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 ${
                    activeTab === tab
                      ? "bg-gold text-white shadow-sm"
                      : "border border-border bg-white text-charcoal hover:bg-canvas"
                  }`}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  title={tab === "Groups" ? "Groups (Alt+G)" : tab}
                  type="button"
                >
                  {tab === "Archive" && <Archive className="h-3.5 w-3.5" />}
                  <span>{tab}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      activeTab === tab ? "bg-white/25 text-white" : "bg-canvas text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-0 sm:min-w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              aria-label="Search accounts"
              className="h-10 w-full rounded-btn border border-border bg-white pl-10 pr-24 text-sm outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search code, name, group or type..."
              ref={searchInputRef}
              title="Search (/ or Ctrl+K)"
              value={searchQuery}
            />
            {searchQuery ? (
              <button
                className="absolute right-9 top-1/2 -translate-y-1/2 text-muted hover:text-charcoal"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted">
              Ctrl K
            </kbd>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-canvas/60 px-5 py-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-sapphire" />
            <span>Tip: Click on any account name or code to open its full General Ledger.</span>
          </div>
          <div className="font-semibold text-charcoal">
            {selectedRows.length > 0 ? `${selectedRows.length} selected for export` : `${activeRows.length} accounts displayed`}
          </div>
        </div>
      </section>

      {/* Main Table / Groups View */}
      {activeTab === "Groups" ? (
        <section className="rounded-card border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-bold">Account Groups</h2>
              <p className="text-sm text-muted">Group accounts by type and reporting heading.</p>
            </div>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-btn bg-gold px-3 text-sm font-semibold text-white shadow-sm hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
              onClick={() => {
                setSelectedGroupData(null);
                setIsGroupModalOpen(true);
              }}
              title="Add Group"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add Group
            </button>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-gold-tint text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="border-b border-border px-4 py-3">Group Name</th>
                  <th className="border-b border-border px-4 py-3">Account Type</th>
                  <th className="border-b border-border px-4 py-3">Heading</th>
                  <th className="border-b border-border px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr className="border-b border-border/70 hover:bg-canvas/70" key={group.id}>
                    <td className="px-4 py-3 font-semibold text-charcoal">{group.name}</td>
                    <td className="px-4 py-3 text-slate-600">{group.type}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{group.heading}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="inline-flex h-8 items-center gap-2 rounded-btn border border-border px-3 text-xs font-semibold text-charcoal hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
                        onClick={() => {
                          setSelectedGroupData(group);
                          setIsGroupModalOpen(true);
                        }}
                        title="Edit group"
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {groups.length === 0 && (
                  <tr>
                    <td className="px-4 py-12 text-center text-muted" colSpan={4}>
                      No groups created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="max-h-[64vh] overflow-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-gold-tint text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="w-12 border-b border-border px-4 py-3">
                    <input
                      aria-label="Select all visible accounts"
                      checked={allVisibleSelected}
                      className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
                      onChange={toggleAllVisible}
                      type="checkbox"
                    />
                  </th>
                  <th className="border-b border-border px-4 py-3">Account Code</th>
                  <th className="border-b border-border px-4 py-3">Account Name & Description</th>
                  <th className="border-b border-border px-4 py-3">Group</th>
                  <th className="border-b border-border px-4 py-3">Type</th>
                  <th className="border-b border-border px-4 py-3">Tax Rate</th>
                  <th className="border-b border-border px-4 py-3 text-right">Opening Bal</th>
                  <th className="border-b border-border px-4 py-3 text-right">Current Balance</th>
                  <th className="border-b border-border px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td className="px-4 py-12 text-center text-muted" colSpan={9}>
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-gold" />
                      Loading chart of accounts...
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  activeRows.map((account) => {
                    const balanceInfo = formatLedgerBalance(
                      account.currentBalance !== undefined ? account.currentBalance : account.openingBalance,
                      account.type || account.heading,
                    );
                    const typeBadgeClass = getTypeBadgeClass(account.heading, account.type);

                    return (
                      <tr
                        className="group border-b border-border/70 transition-colors hover:bg-amber-50/40 cursor-pointer"
                        key={account.id}
                        onClick={() => openLedger(account)}
                        title={`Click to view General Ledger for ${account.name} (${account.code})`}
                      >
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {account.isControlAccount ? (
                            <Lock className="h-4 w-4 text-muted" aria-label="Control account" />
                          ) : (
                            <input
                              aria-label={`Select ${account.name}`}
                              checked={selectedIds.includes(account.id)}
                              className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
                              onChange={() => toggleSelected(account.id)}
                              type="checkbox"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="font-mono font-bold text-sapphire hover:text-gold hover:underline focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLedger(account);
                            }}
                            title={`Open General Ledger for ${account.code}`}
                            type="button"
                          >
                            {account.code}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              className="text-left font-semibold text-charcoal hover:text-sapphire hover:underline focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLedger(account);
                              }}
                              title={`Open General Ledger for ${account.name}`}
                              type="button"
                            >
                              {account.name}
                            </button>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sapphire" title="Open General Ledger">
                              <ExternalLink className="h-3 w-3" />
                            </span>
                            {account.isControlAccount && (
                              <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                <Lock className="h-2.5 w-2.5" /> System Control
                              </span>
                            )}
                          </div>
                          {account.description && (
                            <div className="mt-0.5 max-w-[340px] truncate text-xs text-muted">{account.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{account.group || "Ungrouped"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeBadgeClass}`}>
                            {account.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{account.taxCode || "Tax Exempt (0%)"}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                          {formatCurrency(account.openingBalance)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-mono text-sm font-bold text-charcoal">
                            {balanceInfo.formatted}
                            {balanceInfo.side && (
                              <span
                                className={`ml-1 text-[11px] font-semibold ${
                                  balanceInfo.side === "Dr" ? "text-blue-700" : "text-amber-700"
                                }`}
                              >
                                {balanceInfo.side}
                              </span>
                            )}
                          </div>
                          {account.transactionCount !== undefined && account.transactionCount > 0 && (
                            <div className="text-[10px] text-muted">
                              {account.transactionCount} {account.transactionCount === 1 ? "entry" : "entries"}
                            </div>
                          )}
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-gold/10 px-2.5 text-xs font-semibold text-charcoal hover:bg-gold hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
                              onClick={() => openLedger(account)}
                              title={`Open General Ledger for ${account.name}`}
                              type="button"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Ledger
                            </button>
                            <button
                              className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-border px-2.5 text-xs font-semibold text-charcoal hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold"
                              onClick={() => openEditModal(account)}
                              title="Edit account details"
                              type="button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {!isLoading && activeRows.length === 0 && (
                  <tr>
                    <td className="px-4 py-14 text-center text-muted" colSpan={9}>
                      <Layers className="mx-auto mb-3 h-8 w-8 text-gold" />
                      No accounts match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm">
          <section className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-card border border-border bg-card shadow-modal">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-charcoal">Bulk import accounts</h2>
                <p className="mt-1 text-sm text-muted">CSV columns: code, name, type, group, openingBalance, taxCode, isActive, description.</p>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold"
                onClick={() => setIsImportOpen(false)}
                title="Close"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <input
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => handleFileChange(event.target.files?.[0])}
                    ref={fileInputRef}
                    type="file"
                  />
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm font-semibold hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <FileDown className="h-4 w-4 text-sapphire" />
                    Choose CSV
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm font-semibold hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
                    onClick={() => downloadFile("accounts-import-template.csv", IMPORT_TEMPLATE, "text/csv;charset=utf-8")}
                    type="button"
                  >
                    <Download className="h-4 w-4 text-emerald" />
                    Template
                  </button>
                </div>

                <textarea
                  className="h-64 w-full resize-none rounded-btn border border-border bg-white p-3 font-mono text-xs outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder={IMPORT_TEMPLATE}
                  value={importText}
                />

                {importPreview.errors.length > 0 && (
                  <div className="rounded-btn border border-ruby/20 bg-ruby/5 px-3 py-2 text-sm text-ruby">{importPreview.errors[0]}</div>
                )}
              </div>

              <aside className="rounded-card border border-border bg-canvas/70 p-4">
                <h3 className="font-semibold text-charcoal">Import preview</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-btn bg-white p-3">
                    <div className="text-2xl font-bold text-charcoal">{importPreview.rows.length}</div>
                    <div className="text-xs text-muted">valid rows</div>
                  </div>
                  <div className="rounded-btn bg-white p-3">
                    <div className="text-2xl font-bold text-charcoal">{importPreview.errors.length}</div>
                    <div className="text-xs text-muted">issues</div>
                  </div>
                </div>
                <div className="mt-4 max-h-52 space-y-2 overflow-auto">
                  {importPreview.rows.slice(0, 8).map((row) => (
                    <div className="rounded-btn bg-white px-3 py-2 text-sm" key={`${row.code}-${row.name}`}>
                      <div className="font-semibold text-charcoal">{row.code} - {row.name}</div>
                      <div className="text-xs text-muted">{row.type || "Expense"} / {row.group || "Ungrouped"}</div>
                    </div>
                  ))}
                  {importPreview.rows.length === 0 && <p className="text-sm text-muted">Paste or choose a CSV to preview rows.</p>}
                </div>
              </aside>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
              <div className="flex items-center gap-2 text-sm text-muted">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                Existing account codes will be updated; new codes will be created.
              </div>
              <div className="flex gap-2">
                <button
                  className="h-10 rounded-btn border border-border px-4 text-sm font-semibold hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
                  onClick={() => setIsImportOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-btn bg-gold px-4 text-sm font-bold text-white shadow-sm hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-60"
                  disabled={importMutation.isPending}
                  onClick={runImport}
                  type="button"
                >
                  {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import Accounts
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <AccountFormModal
        initialData={selectedAccount}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateGroup={() => {
          setSelectedGroupData(null);
          setIsGroupModalOpen(true);
        }}
      />
      <BankAccountFormModal isOpen={isBankModalOpen} onClose={() => setIsBankModalOpen(false)} />
      <AccountGroupModal initialData={selectedGroupData} isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
    </div>
  );
};
