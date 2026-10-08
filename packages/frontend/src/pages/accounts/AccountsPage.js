import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Building2, CheckCircle2, Download, FileDown, FileText, Keyboard, Layers, Loader2, Lock, Pencil, Plus, Search, Upload, X, } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { accountsService } from "@/services/accountsService";
import { AccountFormModal } from "./AccountFormModal";
import { AccountGroupModal } from "./AccountGroupModal";
import { BankAccountFormModal } from "./BankAccountFormModal";
const TABS = ["All Accounts", "Assets", "Liabilities", "Equity", "Expenses", "Revenue", "Archive", "Groups"];
const EXPORT_HEADERS = ["code", "name", "heading", "group", "type", "taxCode", "openingBalance", "isActive", "description"];
const IMPORT_TEMPLATE = "code,name,type,group,openingBalance,taxCode,isActive,description\n1200,Sample Asset,Current Asset,Current Assets,0,Tax Exempt (0%),true,Imported account\n";
const accountTypeFallback = (type) => type || "Expense";
const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement))
        return false;
    const tagName = target.tagName.toLowerCase();
    return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
};
const downloadFile = (fileName, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};
const escapeCsv = (value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const exportAccountsCsv = (rows) => {
    const csv = [
        EXPORT_HEADERS.join(","),
        ...rows.map((row) => EXPORT_HEADERS.map((key) => escapeCsv(row[key])).join(",")),
    ].join("\n");
    downloadFile(`chart-of-accounts-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
};
const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const exportAccountsPdf = (rows) => {
    const printWindow = window.open("", "_blank", "width=1120,height=760");
    if (!printWindow) {
        toast.error("Allow pop-ups to export the PDF");
        return;
    }
    const bodyRows = rows
        .map((row) => `
        <tr>
          <td>${escapeHtml(row.code)}</td>
          <td><strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.description || "")}</span></td>
          <td>${escapeHtml(row.group)}</td>
          <td>${escapeHtml(row.type)}</td>
          <td>${escapeHtml(row.taxCode || "Tax Exempt (0%)")}</td>
          <td class="right">${escapeHtml(formatCurrency(row.openingBalance))}</td>
        </tr>`)
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
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Chart of Accounts</h1>
            <p>${rows.length} account${rows.length === 1 ? "" : "s"} exported on ${new Date().toLocaleDateString()}</p>
          </div>
          <p>JewelLedger Pro</p>
        </header>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Group</th>
              <th>Type</th>
              <th>Tax Rate</th>
              <th class="right">YTD</th>
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
const parseCsv = (text) => {
    const rows = [];
    let current = "";
    let row = [];
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];
        if (char === '"' && quoted && next === '"') {
            current += '"';
            index += 1;
        }
        else if (char === '"') {
            quoted = !quoted;
        }
        else if (char === "," && !quoted) {
            row.push(current.trim());
            current = "";
        }
        else if ((char === "\n" || char === "\r") && !quoted) {
            if (char === "\r" && next === "\n")
                index += 1;
            row.push(current.trim());
            if (row.some(Boolean))
                rows.push(row);
            row = [];
            current = "";
        }
        else {
            current += char;
        }
    }
    row.push(current.trim());
    if (row.some(Boolean))
        rows.push(row);
    return rows;
};
const normalizeHeader = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const buildImportRows = (text) => {
    const [headerRow, ...dataRows] = parseCsv(text);
    if (!headerRow || dataRows.length === 0)
        return { rows: [], errors: ["CSV needs a header row and at least one account row."] };
    const headers = headerRow.map(normalizeHeader);
    const pick = (row, names) => {
        const index = headers.findIndex((header) => names.includes(header));
        return index >= 0 ? row[index] ?? "" : "";
    };
    const errors = [];
    const rows = dataRows
        .map((row, index) => {
        const code = pick(row, ["code", "accountcode"]);
        const name = pick(row, ["name", "accountname"]);
        if (!code || !name)
            errors.push(`Row ${index + 2}: code and name are required.`);
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
    const queryClient = useQueryClient();
    const searchInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState("All Accounts");
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importText, setImportText] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [selectedGroupData, setSelectedGroupData] = useState(null);
    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ["accounts"],
        queryFn: () => accountsService.list({}),
    });
    const { data: groups = [] } = useQuery({
        queryKey: ["account-groups"],
        queryFn: () => accountsService.listGroups(),
    });
    const importPreview = useMemo(() => buildImportRows(importText), [importText]);
    const filteredAccounts = useMemo(() => {
        let filtered = accounts;
        if (activeTab === "Archive") {
            filtered = filtered.filter((account) => !account.isActive);
        }
        else {
            filtered = filtered.filter((account) => account.isActive);
            if (activeTab !== "All Accounts" && activeTab !== "Groups") {
                filtered = filtered.filter((account) => account.heading === activeTab.toUpperCase());
            }
        }
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter((account) => account.code?.toLowerCase().includes(lowerQuery) ||
                account.name?.toLowerCase().includes(lowerQuery) ||
                account.group?.toLowerCase().includes(lowerQuery) ||
                account.type?.toLowerCase().includes(lowerQuery));
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
    const openEditModal = (account) => {
        setSelectedAccount(account);
        setIsModalOpen(true);
    };
    const toggleSelected = (accountId) => {
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
        mutationFn: async (rows) => {
            let createdCount = 0;
            let updatedCount = 0;
            const failures = [];
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
                    }
                    else {
                        await accountsService.create(payload);
                        createdCount += 1;
                    }
                }
                catch (error) {
                    failures.push(`${row.code}: ${error?.response?.data?.error?.message ?? "Import failed"}`);
                }
            }
            return { createdCount, updatedCount, failures };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            if (result.failures.length > 0) {
                toast.error(`${result.failures.length} row${result.failures.length === 1 ? "" : "s"} failed. ${result.failures[0]}`);
            }
            else {
                toast.success(`${result.createdCount} created, ${result.updatedCount} updated`);
                setIsImportOpen(false);
                setImportText("");
            }
        },
    });
    useEffect(() => {
        const handleKeyDown = (event) => {
            const key = event.key.toLowerCase();
            const modifier = event.metaKey || event.ctrlKey;
            if (modifier && key === "k") {
                event.preventDefault();
                searchInputRef.current?.focus();
                return;
            }
            if (isEditableTarget(event.target))
                return;
            if (key === "/") {
                event.preventDefault();
                searchInputRef.current?.focus();
                return;
            }
            if (!event.altKey)
                return;
            const shortcuts = {
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
    const handleFileChange = async (file) => {
        if (!file)
            return;
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
    return (_jsxs("div", { className: "mx-auto flex max-w-[1360px] flex-col gap-5 px-4 pb-8 pt-5 sm:px-6", children: [_jsxs("section", { className: "rounded-card border border-border bg-card shadow-card", children: [_jsxs("div", { className: "flex flex-col gap-4 border-b border-border px-5 py-5 lg:flex-row lg:items-end lg:justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted", children: [_jsx("span", { children: "Settings" }), _jsx("span", { children: "/" }), _jsx("span", { children: "Ledger" })] }), _jsx("h1", { className: "font-display text-3xl font-bold text-charcoal", children: "Chart of accounts" }), _jsxs("p", { className: "mt-1 text-sm text-muted", children: [accounts.length, " accounts, ", groups.length, " groups. Use shortcuts or tab through every action."] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs("button", { "aria-label": "Add account", className: "inline-flex h-10 items-center gap-2 rounded-btn bg-charcoal px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-charcoal/90 focus:outline-none focus:ring-2 focus:ring-charcoal focus:ring-offset-2", onClick: openAddModal, title: "Add Account (Alt+A)", type: "button", children: [_jsx(Plus, { className: "h-4 w-4" }), "Add Account"] }), _jsxs("button", { "aria-label": "Add bank account", className: "inline-flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-semibold text-charcoal shadow-sm transition-colors hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: () => setIsBankModalOpen(true), title: "Add Bank Account (Alt+B)", type: "button", children: [_jsx(Building2, { className: "h-4 w-4 text-gold" }), "Add Bank"] }), _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-semibold text-charcoal shadow-sm transition-colors hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: () => setIsImportOpen(true), title: "Bulk Import CSV (Alt+I)", type: "button", children: [_jsx(Upload, { className: "h-4 w-4 text-sapphire" }), "Import CSV"] }), _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-semibold text-charcoal shadow-sm transition-colors hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: handleExportCsv, title: "Export CSV (Alt+E)", type: "button", children: [_jsx(Download, { className: "h-4 w-4 text-emerald" }), "Export CSV"] }), _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-semibold text-charcoal shadow-sm transition-colors hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: handleExportPdf, title: "Export PDF (Alt+P)", type: "button", children: [_jsx(FileText, { className: "h-4 w-4 text-ruby" }), "Export PDF"] })] })] }), _jsxs("div", { className: "grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center", children: [_jsx("div", { className: "flex gap-2 overflow-x-auto pb-1", role: "tablist", "aria-label": "Account filters", children: TABS.map((tab) => (_jsxs("button", { "aria-selected": activeTab === tab, className: `h-9 shrink-0 rounded-btn px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 ${activeTab === tab ? "bg-gold text-white shadow-sm" : "border border-border bg-white text-charcoal hover:bg-canvas"}`, onClick: () => setActiveTab(tab), role: "tab", title: tab === "Groups" ? "Groups (Alt+G)" : tab, type: "button", children: [tab === "Archive" && _jsx(Archive, { className: "mr-2 inline h-3.5 w-3.5" }), tab] }, tab))) }), _jsxs("div", { className: "relative min-w-0 sm:min-w-[360px]", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" }), _jsx("input", { "aria-label": "Search accounts", className: "h-10 w-full rounded-btn border border-border bg-white pl-10 pr-24 text-sm outline-none transition-colors placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/20", onChange: (event) => setSearchQuery(event.target.value), placeholder: "Search code, name, group or type", ref: searchInputRef, title: "Search (/ or Ctrl+K)", value: searchQuery }), _jsx("kbd", { className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted", children: "Ctrl K" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 border-t border-border bg-canvas/60 px-5 py-3 text-sm text-muted", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Keyboard, { className: "h-4 w-4" }), _jsx("span", { children: "Hover actions for shortcuts. Selected rows export first." })] }), _jsx("div", { className: "font-medium text-charcoal", children: selectedRows.length > 0 ? `${selectedRows.length} selected` : `${activeRows.length} visible` })] })] }), activeTab === "Groups" ? (_jsxs("section", { className: "rounded-card border border-border bg-card shadow-card", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display text-xl font-bold", children: "Account groups" }), _jsx("p", { className: "text-sm text-muted", children: "Group accounts by type and reporting heading." })] }), _jsxs("button", { className: "inline-flex h-9 items-center gap-2 rounded-btn bg-gold px-3 text-sm font-semibold text-white shadow-sm hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: () => {
                                    setSelectedGroupData(null);
                                    setIsGroupModalOpen(true);
                                }, title: "Add Group", type: "button", children: [_jsx(Plus, { className: "h-4 w-4" }), "Add Group"] })] }), _jsx("div", { className: "max-h-[60vh] overflow-auto", children: _jsxs("table", { className: "w-full min-w-[720px] border-collapse text-sm", children: [_jsx("thead", { className: "sticky top-0 z-10 bg-gold-tint text-left text-xs uppercase tracking-wide text-muted", children: _jsxs("tr", { children: [_jsx("th", { className: "border-b border-border px-4 py-3", children: "Group Name" }), _jsx("th", { className: "border-b border-border px-4 py-3", children: "Account Type" }), _jsx("th", { className: "border-b border-border px-4 py-3", children: "Heading" }), _jsx("th", { className: "border-b border-border px-4 py-3 text-right", children: "Actions" })] }) }), _jsxs("tbody", { children: [groups.map((group) => (_jsxs("tr", { className: "border-b border-border/70 hover:bg-canvas/70", children: [_jsx("td", { className: "px-4 py-3 font-semibold text-charcoal", children: group.name }), _jsx("td", { className: "px-4 py-3 text-slate-600", children: group.type }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600", children: group.heading }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs("button", { className: "inline-flex h-8 items-center gap-2 rounded-btn border border-border px-3 text-xs font-semibold text-charcoal hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: () => {
                                                            setSelectedGroupData(group);
                                                            setIsGroupModalOpen(true);
                                                        }, title: "Edit group", type: "button", children: [_jsx(Pencil, { className: "h-3.5 w-3.5" }), "Edit"] }) })] }, group.id))), groups.length === 0 && (_jsx("tr", { children: _jsx("td", { className: "px-4 py-12 text-center text-muted", colSpan: 4, children: "No groups created yet." }) }))] })] }) })] })) : (_jsx("section", { className: "overflow-hidden rounded-card border border-border bg-card shadow-card", children: _jsx("div", { className: "max-h-[64vh] overflow-auto", children: _jsxs("table", { className: "w-full min-w-[1040px] border-collapse text-sm", children: [_jsx("thead", { className: "sticky top-0 z-10 bg-gold-tint text-left text-xs uppercase tracking-wide text-muted", children: _jsxs("tr", { children: [_jsx("th", { className: "w-12 border-b border-border px-4 py-3", children: _jsx("input", { "aria-label": "Select all visible accounts", checked: allVisibleSelected, className: "h-4 w-4 rounded border-border text-gold focus:ring-gold", onChange: toggleAllVisible, type: "checkbox" }) }), _jsx("th", { className: "border-b border-border px-4 py-3", children: "Code" }), _jsx("th", { className: "border-b border-border px-4 py-3", children: "Name" }), _jsx("th", { className: "border-b border-border px-4 py-3", children: "Group" }), _jsx("th", { className: "border-b border-border px-4 py-3", children: "Type" }), _jsx("th", { className: "border-b border-border px-4 py-3", children: "Tax Rate" }), _jsx("th", { className: "border-b border-border px-4 py-3 text-right", children: "YTD" }), _jsx("th", { className: "border-b border-border px-4 py-3 text-right", children: "Actions" })] }) }), _jsxs("tbody", { children: [isLoading && (_jsx("tr", { children: _jsxs("td", { className: "px-4 py-12 text-center text-muted", colSpan: 8, children: [_jsx(Loader2, { className: "mx-auto mb-2 h-5 w-5 animate-spin text-gold" }), "Loading accounts..."] }) })), !isLoading &&
                                        activeRows.map((account) => (_jsxs("tr", { className: "border-b border-border/70 transition-colors hover:bg-canvas/70", children: [_jsx("td", { className: "px-4 py-3", children: account.isControlAccount ? (_jsx(Lock, { className: "h-4 w-4 text-muted", "aria-label": "Control account" })) : (_jsx("input", { "aria-label": `Select ${account.name}`, checked: selectedIds.includes(account.id), className: "h-4 w-4 rounded border-border text-gold focus:ring-gold", onChange: () => toggleSelected(account.id), type: "checkbox" })) }), _jsx("td", { className: "px-4 py-3 font-bold text-charcoal", children: account.code }), _jsxs("td", { className: "px-4 py-3", children: [_jsx("button", { className: "text-left font-semibold text-sapphire hover:underline focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: () => openEditModal(account), title: "Edit account", type: "button", children: account.name }), account.description && _jsx("div", { className: "mt-0.5 max-w-[340px] truncate text-xs text-muted", children: account.description })] }), _jsx("td", { className: "px-4 py-3 text-slate-600", children: account.group || "Ungrouped" }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600", children: account.type }) }), _jsx("td", { className: "px-4 py-3 text-slate-600", children: account.taxCode || "Tax Exempt (0%)" }), _jsx("td", { className: "px-4 py-3 text-right font-semibold text-sapphire", children: formatCurrency(account.openingBalance) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs("button", { className: "inline-flex h-8 items-center gap-2 rounded-btn border border-border px-3 text-xs font-semibold text-charcoal hover:bg-white focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: () => openEditModal(account), title: "Edit account", type: "button", children: [_jsx(Pencil, { className: "h-3.5 w-3.5" }), "Edit"] }) })] }, account.id))), !isLoading && activeRows.length === 0 && (_jsx("tr", { children: _jsxs("td", { className: "px-4 py-14 text-center text-muted", colSpan: 8, children: [_jsx(Layers, { className: "mx-auto mb-3 h-8 w-8 text-gold" }), "No accounts match this view."] }) }))] })] }) }) })), isImportOpen && (_jsx("div", { className: "fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm", children: _jsxs("section", { className: "flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-card border border-border bg-card shadow-modal", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-border px-6 py-5", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display text-2xl font-bold text-charcoal", children: "Bulk import accounts" }), _jsx("p", { className: "mt-1 text-sm text-muted", children: "CSV columns: code, name, type, group, openingBalance, taxCode, isActive, description." })] }), _jsx("button", { className: "grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold", onClick: () => setIsImportOpen(false), title: "Close", type: "button", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "grid min-h-0 flex-1 gap-4 overflow-auto p-6 lg:grid-cols-[1fr_320px]", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("input", { accept: ".csv,text/csv", className: "hidden", onChange: (event) => handleFileChange(event.target.files?.[0]), ref: fileInputRef, type: "file" }), _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm font-semibold hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: () => fileInputRef.current?.click(), type: "button", children: [_jsx(FileDown, { className: "h-4 w-4 text-sapphire" }), "Choose CSV"] }), _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn border border-border px-4 text-sm font-semibold hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: () => downloadFile("accounts-import-template.csv", IMPORT_TEMPLATE, "text/csv;charset=utf-8"), type: "button", children: [_jsx(Download, { className: "h-4 w-4 text-emerald" }), "Template"] })] }), _jsx("textarea", { className: "h-64 w-full resize-none rounded-btn border border-border bg-white p-3 font-mono text-xs outline-none focus:border-gold focus:ring-2 focus:ring-gold/20", onChange: (event) => setImportText(event.target.value), placeholder: IMPORT_TEMPLATE, value: importText }), importPreview.errors.length > 0 && (_jsx("div", { className: "rounded-btn border border-ruby/20 bg-ruby/5 px-3 py-2 text-sm text-ruby", children: importPreview.errors[0] }))] }), _jsxs("aside", { className: "rounded-card border border-border bg-canvas/70 p-4", children: [_jsx("h3", { className: "font-semibold text-charcoal", children: "Import preview" }), _jsxs("div", { className: "mt-4 grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "rounded-btn bg-white p-3", children: [_jsx("div", { className: "text-2xl font-bold text-charcoal", children: importPreview.rows.length }), _jsx("div", { className: "text-xs text-muted", children: "valid rows" })] }), _jsxs("div", { className: "rounded-btn bg-white p-3", children: [_jsx("div", { className: "text-2xl font-bold text-charcoal", children: importPreview.errors.length }), _jsx("div", { className: "text-xs text-muted", children: "issues" })] })] }), _jsxs("div", { className: "mt-4 max-h-52 space-y-2 overflow-auto", children: [importPreview.rows.slice(0, 8).map((row) => (_jsxs("div", { className: "rounded-btn bg-white px-3 py-2 text-sm", children: [_jsxs("div", { className: "font-semibold text-charcoal", children: [row.code, " - ", row.name] }), _jsxs("div", { className: "text-xs text-muted", children: [row.type || "Expense", " / ", row.group || "Ungrouped"] })] }, `${row.code}-${row.name}`))), importPreview.rows.length === 0 && _jsx("p", { className: "text-sm text-muted", children: "Paste or choose a CSV to preview rows." })] })] })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm text-muted", children: [_jsx(CheckCircle2, { className: "h-4 w-4 text-emerald" }), "Existing account codes will be updated; new codes will be created."] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm font-semibold hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2", onClick: () => setIsImportOpen(false), type: "button", children: "Cancel" }), _jsxs("button", { className: "inline-flex h-10 items-center gap-2 rounded-btn bg-gold px-4 text-sm font-bold text-white shadow-sm hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-60", disabled: importMutation.isPending, onClick: runImport, type: "button", children: [importMutation.isPending && _jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Import Accounts"] })] })] })] }) })), _jsx(AccountFormModal, { initialData: selectedAccount, isOpen: isModalOpen, onClose: () => setIsModalOpen(false), onCreateGroup: () => {
                    setSelectedGroupData(null);
                    setIsGroupModalOpen(true);
                } }), _jsx(BankAccountFormModal, { isOpen: isBankModalOpen, onClose: () => setIsBankModalOpen(false) }), _jsx(AccountGroupModal, { initialData: selectedGroupData, isOpen: isGroupModalOpen, onClose: () => setIsGroupModalOpen(false) })] }));
};
