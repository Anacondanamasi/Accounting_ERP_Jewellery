import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  bankRulesService,
  BankRuleItem,
} from "@/services/bankRulesService";
import { bankingService, BankAccount } from "@/services/bankingService";
import { RuleBuilderDrawer } from "./RuleBuilderDrawer";

export const BankRulesPage: React.FC = () => {
  const [rules, setRules] = useState<BankRuleItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [accountFilter, setAccountFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<BankRuleItem | null>(null);

  // Apply Now Dialog
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [confirmAutoAdd, setConfirmAutoAdd] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<any | null>(null);

  useEffect(() => {
    loadData();
    loadBankAccounts();
  }, [directionFilter, accountFilter, statusFilter]);

  // Global keyboard shortcuts: Ctrl+Shift+R or N to add rule
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        loadData();
      }
      if (e.key.toLowerCase() === "n" && !isDrawerOpen && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
        openCreate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await bankRulesService.listRules({
        direction: directionFilter !== "ALL" ? directionFilter : undefined,
        bankAccountId: accountFilter ? Number(accountFilter) : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setRules(data);
    } catch (err) {
      console.error("Failed to load rules", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const data = await bankingService.listAccounts();
      setBankAccounts(data);
    } catch (err) {
      console.error("Failed to load accounts", err);
    }
  };

  const openCreate = () => {
    setSelectedRule(null);
    setIsDrawerOpen(true);
  };

  const openEdit = (rule: BankRuleItem) => {
    setSelectedRule(rule);
    setIsDrawerOpen(true);
  };

  const handleDuplicate = async (rule: BankRuleItem) => {
    try {
      const copy = {
        name: `${rule.name} (Copy)`,
        applyToDirection: rule.applyToDirection,
        matchMode: rule.matchMode,
        scopeAccountType: rule.scopeAccountType,
        bankAccountId: rule.bankAccountId,
        conditions: JSON.parse(rule.conditionsJson || "[]"),
        actionType: rule.actionType,
        transactionType: rule.transactionType,
        payeeExtractMode: rule.payeeExtractMode,
        targetPayeeName: rule.targetPayeeName,
        targetAccountId: rule.targetAccountId,
        targetTaxRate: rule.targetTaxRate,
        itcEligibility: rule.itcEligibility,
        isRcm: rule.isRcm,
        targetMemoTemplate: rule.targetMemoTemplate,
        autoAdd: false, // Copies default to non-auto-add for safety
      };
      await bankRulesService.createRule(copy);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to copy rule");
    }
  };

  const handleToggleEnable = async (rule: BankRuleItem) => {
    try {
      await bankRulesService.updateRule(rule.id, { isEnabled: !rule.isEnabled });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to toggle rule");
    }
  };

  const handleDelete = async (rule: BankRuleItem) => {
    if (!window.confirm(`Are you sure you want to delete bank rule '${rule.name}'?`)) return;
    try {
      await bankRulesService.deleteRule(rule.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to delete rule");
    }
  };

  const handleUndoAll = async (rule: BankRuleItem) => {
    if (
      !window.confirm(
        `Undo all transactions auto-added by rule '${rule.name}'? This will revert their accounting effect and return lines to 'For review'.`
      )
    )
      return;
    try {
      const res = await bankRulesService.undoAllByRule(rule.id);
      alert(`Successfully undid ${res.undoneCount} auto-added transactions`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to undo rule applications");
    }
  };

  const handleMovePriority = async (index: number, direction: "UP" | "DOWN") => {
    const newIdx = direction === "UP" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= rules.length) return;

    const reordered = [...rules];
    const temp = reordered[index];
    reordered[index] = reordered[newIdx];
    reordered[newIdx] = temp;

    setRules(reordered);
    try {
      await bankRulesService.reorderRules(reordered.map((r) => r.id));
    } catch (err) {
      console.error("Failed to save reorder", err);
      loadData();
    }
  };

  const handleAddStarterRules = async () => {
    if (!window.confirm("Add suggested Indian banking starter rules (Bank charges, GST/TDS challans, ATM drawings, Interest)?")) return;
    try {
      const res = await bankRulesService.seedStarterRules();
      alert(`Added ${res.length} starter rules!`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to seed starter rules");
    }
  };

  const handleExport = async () => {
    try {
      const data = await bankRulesService.exportRules();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bank_rules_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to export rules");
    }
  };

  const handleApplyNow = async () => {
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await bankRulesService.applyRulesNow({
        bankAccountId: accountFilter ? Number(accountFilter) : undefined,
        confirmAutoAdd,
      });
      setApplyResult(res);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to apply rules");
    } finally {
      setApplying(false);
    }
  };

  // Metrics for Insights Strip
  const activeCount = rules.filter((r) => r.isEnabled).length;
  const autoAddCount = rules.filter((r) => r.isEnabled && r.autoAdd).length;
  const unusedCount = rules.filter((r) => r.usageCount === 0).length;
  const highOverrideCount = rules.filter((r) => r.overrideCount >= 3).length;

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bank Rules</h1>
          <p className="text-xs text-slate-500">
            Rules apply automatically on statement import and bank feed sync in priority order
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm hover:bg-indigo-100 transition"
          >
            ⚡ Apply Rules Now
          </button>
          <button
            onClick={handleAddStarterRules}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
          >
            📚 Add Suggested Rules
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
          >
            📥 Export Rules
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow hover:bg-indigo-700 transition"
          >
            + New Rule
          </button>
        </div>
      </div>

      {/* Effectiveness Insights Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Rules
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{activeCount}</div>
          <span className="text-[11px] text-slate-400">Total configured: {rules.length}</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Auto-Add Enabled
          </span>
          <div className="mt-1 text-2xl font-bold text-amber-800">{autoAddCount}</div>
          <span className="text-[11px] text-amber-600">Posts directly to books</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Unused Rules
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-700">{unusedCount}</div>
          <span className="text-[11px] text-slate-400">0 lines matched so far</span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
            Often Overridden
          </span>
          <div className="mt-1 text-2xl font-bold text-rose-800">{highOverrideCount}</div>
          <span className="text-[11px] text-rose-600">Consider refining conditions</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules by name..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
          >
            <option value="ALL">All Directions</option>
            <option value="MONEY_OUT">Money Out (Expense)</option>
            <option value="MONEY_IN">Money In (Deposit)</option>
          </select>

          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
          >
            <option value="">All Bank Accounts</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading bank rules...</div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl font-bold mb-3">
              ⚡
            </div>
            <h3 className="text-base font-semibold text-slate-800">No bank rules found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Create rules to automatically categorize routine bank lines, or start with our suggested Indian banking rule library.
            </p>
            <button
              onClick={handleAddStarterRules}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow hover:bg-indigo-700 transition"
            >
              📚 Add Suggested Rules
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="px-3 py-3 w-16 text-center">Priority</th>
                  <th className="px-4 py-3">Rule Name</th>
                  <th className="px-4 py-3">Applies To</th>
                  <th className="px-4 py-3">Conditions</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-3 py-3 text-center">Auto-Add</th>
                  <th className="px-3 py-3 text-center">Usage</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rules.map((r, idx) => {
                  let conds: any[] = [];
                  try {
                    conds = JSON.parse(r.conditionsJson || "[]");
                  } catch {}

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition ${
                        !r.isEnabled ? "bg-slate-50/50 opacity-60" : ""
                      }`}
                    >
                      {/* Priority Up/Down */}
                      <td className="px-3 py-3 text-center font-mono font-bold text-slate-500">
                        <div className="flex items-center justify-center space-x-1">
                          <span>{idx + 1}</span>
                          <div className="flex flex-col">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMovePriority(idx, "UP")}
                              className="text-[9px] hover:text-indigo-600 disabled:opacity-20"
                            >
                              ▲
                            </button>
                            <button
                              disabled={idx === rules.length - 1}
                              onClick={() => handleMovePriority(idx, "DOWN")}
                              className="text-[9px] hover:text-indigo-600 disabled:opacity-20"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Rule Name */}
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="hover:text-indigo-600 cursor-pointer" onClick={() => openEdit(r)}>
                          {r.name}
                        </div>
                        {r.hasSplits && (
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                            Split ({r.splitMode})
                          </span>
                        )}
                      </td>

                      {/* Direction & Account */}
                      <td className="px-4 py-3 text-slate-600">
                        <div>
                          {r.applyToDirection === "MONEY_OUT" ? (
                            <span className="text-rose-600 font-semibold">Money Out</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">Money In</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {r.scopeAccountType === "ALL" ? "All Accounts" : "Specific Account"}
                        </span>
                      </td>

                      {/* Conditions Summary */}
                      <td className="px-4 py-3 text-slate-600 max-w-xs">
                        <div className="truncate">
                          {conds.map((c, i) => (
                            <span key={i} className="inline-block bg-slate-100 rounded px-1.5 py-0.5 text-[10px] mr-1">
                              {c.field} {c.operator.toLowerCase()} "{c.value}"
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Action Summary */}
                      <td className="px-4 py-3 text-slate-700">
                        <div>
                          <strong className="text-slate-900">{r.transactionType || r.actionType}</strong>
                          {r.targetPayeeName && ` • ${r.targetPayeeName}`}
                        </div>
                        {r.targetTaxRate !== null && r.targetTaxRate !== undefined && r.targetTaxRate > 0 && (
                          <span className="text-[10px] text-indigo-600">GST {r.targetTaxRate}%</span>
                        )}
                      </td>

                      {/* Auto-Add Badge */}
                      <td className="px-3 py-3 text-center">
                        {r.autoAdd ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            ⚡ Auto-Add
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Suggest
                          </span>
                        )}
                      </td>

                      {/* Usage Count */}
                      <td className="px-3 py-3 text-center font-mono font-medium text-slate-700">
                        {r.usageCount}
                      </td>

                      {/* Status Toggle */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleToggleEnable(r)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                            r.isEnabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {r.isEnabled ? "ON" : "OFF"}
                        </button>
                      </td>

                      {/* Action Menu */}
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(r)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded"
                        >
                          Copy
                        </button>
                        {r.autoAdd && (
                          <button
                            onClick={() => handleUndoAll(r)}
                            className="px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 rounded"
                            title="Undo all auto-added lines by this rule"
                          >
                            Undo All
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(r)}
                          className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      <RuleBuilderDrawer
        isOpen={isDrawerOpen}
        rule={selectedRule}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={loadData}
      />

      {/* Apply Rules Now Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Apply Bank Rules Now</h3>
            <p className="text-xs text-slate-500">
              This will evaluate all active rules in priority order against all current 'For review' bank lines.
            </p>

            <div className="flex items-center space-x-2 text-xs p-3 bg-amber-50 rounded border border-amber-200 text-amber-800">
              <input
                type="checkbox"
                id="confirmAuto"
                checked={confirmAutoAdd}
                onChange={(e) => setConfirmAutoAdd(e.target.checked)}
                className="rounded border-slate-300 text-amber-600"
              />
              <label htmlFor="confirmAuto" className="font-semibold cursor-pointer">
                Confirm & execute Auto-Add for qualifying rules
              </label>
            </div>

            {applyResult && (
              <div className="p-3 bg-slate-50 rounded border text-xs space-y-1">
                <div>
                  Lines Scanned: <strong>{applyResult.totalScanned}</strong>
                </div>
                <div>
                  Recognized by Rule: <strong className="text-indigo-600">{applyResult.recognizedCount}</strong>
                </div>
                <div>
                  Auto-Added to Books: <strong className="text-emerald-600">{applyResult.autoAddedCount}</strong>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 border-t pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsApplyModalOpen(false);
                  setApplyResult(null);
                }}
                className="px-4 py-2 border rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleApplyNow}
                disabled={applying}
                className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 shadow"
              >
                {applying ? "Applying..." : "Run Rules Engine"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
