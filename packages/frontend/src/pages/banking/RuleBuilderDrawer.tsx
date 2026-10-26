import React, { useState, useEffect } from "react";
import {
  bankRulesService,
  BankRuleItem,
  RuleConditionDef,
  RuleSplitLineDef,
  RulePreviewResult,
} from "@/services/bankRulesService";
import { bankingService, BankAccount } from "@/services/bankingService";

interface RuleBuilderDrawerProps {
  isOpen: boolean;
  rule: BankRuleItem | null;
  initialLine?: any | null; // When created directly from a bank feed line
  accounts?: Array<{ id: number; name: string; code: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const RuleBuilderDrawer: React.FC<RuleBuilderDrawerProps> = ({
  isOpen,
  rule,
  initialLine,
  accounts = [],
  onClose,
  onSuccess,
}) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [applyToDirection, setApplyToDirection] = useState<"MONEY_IN" | "MONEY_OUT">("MONEY_OUT");
  const [scopeAccountType, setScopeAccountType] = useState<"ALL" | "SPECIFIC">("ALL");
  const [bankAccountId, setBankAccountId] = useState<number | "">("");

  // Conditions
  const [matchMode, setMatchMode] = useState<"ALL" | "ANY">("ALL");
  const [conditions, setConditions] = useState<RuleConditionDef[]>([
    { field: "description", operator: "CONTAINS", value: "" },
  ]);

  // Actions
  const [actionType, setActionType] = useState<"CATEGORIZE" | "TRANSFER" | "EXCLUDE">("CATEGORIZE");
  const [transactionType, setTransactionType] = useState("EXPENSE");
  const [payeeExtractMode, setPayeeExtractMode] = useState<"NONE" | "FIXED" | "EXTRACT_FROM_TEXT">("NONE");
  const [targetPayeeName, setTargetPayeeName] = useState("");
  const [targetAccountId, setTargetAccountId] = useState<number | "">("");
  const [targetTaxRate, setTargetTaxRate] = useState<number>(0);
  const [itcEligibility, setItcEligibility] = useState<"ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5">("ELIGIBLE");
  const [targetMemoTemplate, setTargetMemoTemplate] = useState("");
  const [transferAccountId, setTransferAccountId] = useState<number | "">("");
  const [excludeReason, setExcludeReason] = useState("");

  // Splits
  const [hasSplits, setHasSplits] = useState(false);
  const [splitMode, setSplitMode] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [splits, setSplits] = useState<RuleSplitLineDef[]>([
    { position: 0, mode: "PERCENTAGE", value: 50, accountId: 0 },
    { position: 1, mode: "PERCENTAGE", value: 50, accountId: 0 },
  ]);

  // Auto-Add Safety
  const [autoAdd, setAutoAdd] = useState(false);
  const [maxAutoAmount, setMaxAutoAmount] = useState<number | "">("");

  // Live Dry Run Preview
  const [preview, setPreview] = useState<RulePreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBankAccounts();
      initForm();
    }
  }, [isOpen, rule, initialLine]);

  // Keyboard shortcut bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        addCondition();
      }
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setHasSplits(true);
        addSplit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, name, conditions, targetAccountId, splits, autoAdd]);

  // Real-time Dry Run preview debounce
  useEffect(() => {
    if (!isOpen || !name.trim() || conditions.length === 0) return;
    const timer = setTimeout(() => {
      fetchPreview();
    }, 400);
    return () => clearTimeout(timer);
  }, [isOpen, name, applyToDirection, matchMode, conditions, bankAccountId, autoAdd, maxAutoAmount]);

  const loadBankAccounts = async () => {
    try {
      const data = await bankingService.listAccounts();
      setBankAccounts(data);
    } catch (err) {
      console.error("Failed to load bank accounts", err);
    }
  };

  const initForm = () => {
    setError(null);
    setPreview(null);

    if (rule) {
      // Editing existing rule
      setName(rule.name);
      setApplyToDirection(rule.applyToDirection === "MONEY_IN" ? "MONEY_IN" : "MONEY_OUT");
      setScopeAccountType(rule.scopeAccountType);
      setBankAccountId(rule.bankAccountId || "");
      setMatchMode(rule.matchMode);
      try {
        setConditions(JSON.parse(rule.conditionsJson || "[]"));
      } catch {
        setConditions([{ field: "description", operator: "CONTAINS", value: "" }]);
      }
      setActionType(rule.actionType);
      setTransactionType(rule.transactionType || "EXPENSE");
      setPayeeExtractMode(rule.payeeExtractMode);
      setTargetPayeeName(rule.targetPayeeName || "");
      setTargetAccountId(rule.targetAccountId || "");
      setTargetTaxRate(rule.targetTaxRate !== null ? Number(rule.targetTaxRate) : 0);
      setItcEligibility(rule.itcEligibility || "ELIGIBLE");
      setTargetMemoTemplate(rule.targetMemoTemplate || "");
      setTransferAccountId(rule.transferAccountId || "");
      setExcludeReason(rule.excludeReason || "");
      setHasSplits(rule.hasSplits);
      setSplitMode(rule.splitMode || "PERCENTAGE");
      try {
        setSplits(rule.splitsJson ? JSON.parse(rule.splitsJson) : []);
      } catch {
        setSplits([]);
      }
      setAutoAdd(rule.autoAdd);
      setMaxAutoAmount(rule.maxAutoAmount !== null ? Number(rule.maxAutoAmount) : "");
    } else if (initialLine) {
      // Creating from a Bank Feed line
      const isCredit = initialLine.credit > 0 || initialLine.amount > 0;
      setApplyToDirection(isCredit ? "MONEY_IN" : "MONEY_OUT");
      setBankAccountId(initialLine.bankAccountId || "");
      setScopeAccountType(initialLine.bankAccountId ? "SPECIFIC" : "ALL");

      // Suggest rule name and initial condition from description
      const rawText = initialLine.descriptionRaw || "";
      const suggestedKeyword = rawText.split(/[\/\-\s]/).filter((w: string) => w.length > 3)[0] || rawText;
      setName(`Rule for ${suggestedKeyword}`);
      setConditions([
        {
          field: "description",
          operator: "CONTAINS",
          value: suggestedKeyword,
        },
      ]);
      setTargetPayeeName(initialLine.payeeHint || "");
      setPayeeExtractMode(initialLine.payeeHint ? "FIXED" : "EXTRACT_FROM_TEXT");
      setTransactionType(isCredit ? "DEPOSIT" : "EXPENSE");
      setAutoAdd(false);
    } else {
      // Clean new rule
      setName("");
      setApplyToDirection("MONEY_OUT");
      setScopeAccountType("ALL");
      setBankAccountId("");
      setMatchMode("ALL");
      setConditions([{ field: "description", operator: "CONTAINS", value: "" }]);
      setActionType("CATEGORIZE");
      setTransactionType("EXPENSE");
      setPayeeExtractMode("NONE");
      setTargetPayeeName("");
      setTargetAccountId("");
      setTargetTaxRate(0);
      setItcEligibility("ELIGIBLE");
      setTargetMemoTemplate("");
      setTransferAccountId("");
      setExcludeReason("");
      setHasSplits(false);
      setSplits([]);
      setAutoAdd(false);
      setMaxAutoAmount("");
    }
  };

  const fetchPreview = async () => {
    setPreviewLoading(true);
    try {
      const data = await bankRulesService.previewRule({
        name,
        applyToDirection,
        matchMode,
        scopeAccountType,
        bankAccountId: bankAccountId ? Number(bankAccountId) : null,
        conditions: conditions.filter((c) => c.value !== ""),
        actionType,
        transactionType,
        autoAdd,
        maxAutoAmount: maxAutoAmount !== "" ? Number(maxAutoAmount) : null,
      });
      setPreview(data);
    } catch (err) {
      console.error("Preview failed", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const addCondition = () => {
    if (conditions.length >= 10) return;
    setConditions((prev) => [...prev, { field: "description", operator: "CONTAINS", value: "" }]);
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof RuleConditionDef, val: any) => {
    setConditions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addSplit = () => {
    setSplits((prev) => [
      ...prev,
      {
        position: prev.length,
        mode: splitMode,
        value: 0,
        accountId: 0,
        taxRate: 0,
      },
    ]);
  };

  const removeSplit = (index: number) => {
    setSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSplitChange = (index: number, field: keyof RuleSplitLineDef, val: any) => {
    setSplits((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Rule name is required");
      return;
    }
    const validConditions = conditions.filter((c) => c.value !== "");
    if (validConditions.length === 0) {
      setError("At least one condition with a valid value is required");
      return;
    }

    if (actionType === "CATEGORIZE" && !hasSplits && !targetAccountId) {
      setError("Please select a target Category Account or enable Splits");
      return;
    }

    if (actionType === "TRANSFER" && !transferAccountId) {
      setError("Please select destination Bank Account for transfer");
      return;
    }

    if (hasSplits && splitMode === "PERCENTAGE") {
      const totalPct = splits.reduce((acc, s) => acc + (s.mode === "PERCENTAGE" ? Number(s.value) : 0), 0);
      const hasRemainder = splits.some((s) => s.mode === "REMAINDER");
      if (!hasRemainder && Math.abs(totalPct - 100) > 0.01) {
        setError(`Split percentages must equal 100% (currently ${totalPct}%). Adjust or add a Remainder line.`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      applyToDirection,
      matchMode,
      scopeAccountType,
      bankAccountId: bankAccountId ? Number(bankAccountId) : null,
      autoAdd,
      maxAutoAmount: maxAutoAmount !== "" ? Number(maxAutoAmount) : null,
      conditions: validConditions,
      actionType,
      transactionType,
      payeeExtractMode,
      targetPayeeName: targetPayeeName.trim() || undefined,
      targetAccountId: targetAccountId ? Number(targetAccountId) : null,
      targetTaxRate: Number(targetTaxRate) || 0,
      itcEligibility,
      targetMemoTemplate: targetMemoTemplate.trim() || undefined,
      transferAccountId: transferAccountId ? Number(transferAccountId) : null,
      excludeReason: excludeReason.trim() || undefined,
      hasSplits,
      splitMode: hasSplits ? splitMode : null,
      splits: hasSplits ? splits : undefined,
    };

    try {
      if (rule) {
        await bankRulesService.updateRule(rule.id, payload);
      } else {
        await bankRulesService.createRule(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save bank rule");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-opacity">
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {rule ? `Edit Rule: ${rule.name}` : "Create Bank Rule"}
            </h2>
            <p className="text-xs text-slate-500">
              Auto-categorize, tag, split, and confirm incoming bank feed lines
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Section 1: Rule Name & Scope */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rule Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Swiggy Meal Charges / Amazon Supplies"
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Apply to</label>
                <div className="flex rounded border border-slate-300 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setApplyToDirection("MONEY_OUT")}
                    className={`flex-1 py-1.5 font-semibold text-center transition ${
                      applyToDirection === "MONEY_OUT"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Money Out (Expense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyToDirection("MONEY_IN")}
                    className={`flex-1 py-1.5 font-semibold text-center transition ${
                      applyToDirection === "MONEY_IN"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Money In (Deposit)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">In Account(s)</label>
                <select
                  value={bankAccountId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBankAccountId(val ? Number(val) : "");
                    setScopeAccountType(val ? "SPECIFIC" : "ALL");
                  }}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Bank Accounts</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} ({b.accountNoMasked || "..."})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Conditions */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  When a transaction matches
                </span>
                <select
                  value={matchMode}
                  onChange={(e) => setMatchMode(e.target.value as any)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs font-bold text-indigo-700 bg-white"
                >
                  <option value="ALL">ALL of these conditions</option>
                  <option value="ANY">ANY of these conditions</option>
                </select>
              </div>

              <button
                type="button"
                onClick={addCondition}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                title="Add Condition (Alt+C)"
              >
                + Add condition
              </button>
            </div>

            <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
              💡 <strong>Tip:</strong> <em>Description</em> matches the normalized/cleaned narration.{" "}
              <em>Bank text</em> matches the exact raw string imported from the statement.
            </div>

            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200 text-xs">
                  <select
                    value={cond.field}
                    onChange={(e) => handleConditionChange(idx, "field", e.target.value)}
                    className="w-32 rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                  >
                    <option value="description">Description</option>
                    <option value="bankText">Bank text</option>
                    <option value="amount">Amount</option>
                    <option value="reference">Reference / UTR</option>
                    <option value="channel">Channel (UPI/NEFT/POS)</option>
                    <option value="payeeHint">Payee Hint</option>
                    <option value="dayOfMonth">Day of Month</option>
                  </select>

                  <select
                    value={cond.operator}
                    onChange={(e) => handleConditionChange(idx, "operator", e.target.value)}
                    className="w-36 rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                  >
                    <option value="CONTAINS">Contains</option>
                    <option value="DOES_NOT_CONTAIN">Doesn't contain</option>
                    <option value="IS_EXACTLY">Is exactly</option>
                    <option value="STARTS_WITH">Starts with</option>
                    <option value="ENDS_WITH">Ends with</option>
                    <option value="MATCHES_REGEX">Matches regex</option>
                    <option value="EQUALS">Equals</option>
                    <option value="NOT_EQUALS">Doesn't equal</option>
                    <option value="GREATER_THAN">Greater than</option>
                    <option value="LESS_THAN">Less than</option>
                    <option value="BETWEEN">Between</option>
                  </select>

                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) => handleConditionChange(idx, "value", e.target.value)}
                    placeholder="Search value..."
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                  />

                  {cond.operator === "BETWEEN" && (
                    <input
                      type="number"
                      value={cond.value2 || ""}
                      onChange={(e) => handleConditionChange(idx, "value2", Number(e.target.value))}
                      placeholder="Max value"
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                  )}

                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCondition(idx)}
                      className="text-rose-500 hover:text-rose-700 font-bold px-1"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Actions & Assign */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Then assign transaction details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Type</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="TRANSFER">Record as Transfer</option>
                  <option value="CUSTOMER_PAYMENT">Customer Payment</option>
                  <option value="VENDOR_PAYMENT">Vendor Bill Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payee Mode</label>
                <select
                  value={payeeExtractMode}
                  onChange={(e) => setPayeeExtractMode(e.target.value as any)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="NONE">Leave blank</option>
                  <option value="EXTRACT_FROM_TEXT">Auto-extract from narration</option>
                  <option value="FIXED">Set specific payee name</option>
                </select>
              </div>
            </div>

            {payeeExtractMode === "FIXED" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payee Name</label>
                <input
                  type="text"
                  value={targetPayeeName}
                  onChange={(e) => setTargetPayeeName(e.target.value)}
                  placeholder="e.g. Swiggy India / Indian Oil"
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>
            )}

            {/* Category or Splits */}
            {!hasSplits ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Account...</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setHasSplits(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 pb-2"
                  >
                    + Split transaction into multiple lines
                  </button>
                </div>
              </div>
            ) : (
              /* Splits Editor */
              <div className="rounded border border-indigo-200 bg-indigo-50/40 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 uppercase">
                    Split Lines ({splits.length})
                  </span>
                  <div className="flex items-center space-x-2">
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value as any)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs bg-white"
                    >
                      <option value="PERCENTAGE">By Percentage (%)</option>
                      <option value="FIXED_AMOUNT">By Fixed Amount (₹)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setHasSplits(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel Split
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {splits.map((sp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border text-xs">
                      <select
                        value={sp.accountId}
                        onChange={(e) => handleSplitChange(idx, "accountId", Number(e.target.value))}
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                      >
                        <option value={0}>Select Category...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={sp.mode}
                        onChange={(e) => handleSplitChange(idx, "mode", e.target.value)}
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                      >
                        <option value="PERCENTAGE">%</option>
                        <option value="FIXED_AMOUNT">₹</option>
                        <option value="REMAINDER">Remainder</option>
                      </select>

                      {sp.mode !== "REMAINDER" && (
                        <input
                          type="number"
                          step="0.01"
                          value={sp.value || ""}
                          onChange={(e) => handleSplitChange(idx, "value", Number(e.target.value))}
                          placeholder="Value"
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => removeSplit(idx)}
                        className="text-rose-500 hover:text-rose-700 font-bold px-1"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addSplit}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  + Add Split Line
                </button>
              </div>
            )}

            {/* GST & Tax Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST Tax Rate</label>
                <select
                  value={targetTaxRate}
                  onChange={(e) => setTargetTaxRate(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs bg-white"
                >
                  <option value={0}>0% (Nil / Exempt)</option>
                  <option value={3}>3% (Gold & Precious Metals)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18% (Standard GST)</option>
                  <option value={28}>28%</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ITC Eligibility</label>
                <select
                  value={itcEligibility}
                  onChange={(e) => setItcEligibility(e.target.value as any)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs bg-white"
                >
                  <option value="ELIGIBLE">Eligible for Input Tax Credit</option>
                  <option value="INELIGIBLE">Ineligible</option>
                  <option value="BLOCKED_17_5">Blocked Credit u/s 17(5)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Memo Template</label>
              <input
                type="text"
                value={targetMemoTemplate}
                onChange={(e) => setTargetMemoTemplate(e.target.value)}
                placeholder="Optional notes or memo to attach to the posted transaction"
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Section 4: Auto-Add Safety & Ceilings */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  Automatically confirm transactions (Auto-Add)
                </span>
                <span className="text-[11px] text-amber-700">
                  When enabled, matching lines post directly to books without requiring manual click
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoAdd}
                onChange={(e) => setAutoAdd(e.target.checked)}
                className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
            </div>

            {autoAdd && (
              <div className="border-t border-amber-200/60 pt-3">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Safety Guard: Maximum Amount Limit (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  value={maxAutoAmount}
                  onChange={(e) => setMaxAutoAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 50000 (Lines above this will fallback to suggest only)"
                  className="w-full rounded border border-amber-300 px-3 py-1.5 text-xs bg-white"
                />
                <span className="text-[10px] text-amber-700 mt-1 block">
                  🛡️ Protects against accidental bulk auto-posting of unexpectedly large invoices or transfers.
                </span>
              </div>
            )}
          </div>

          {/* Section 5: Live Dry Run Preview */}
          {preview && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  Live Rule Impact
                </span>
                <span className="font-semibold text-indigo-700">
                  {preview.matchedCount} lines match in review
                </span>
              </div>

              {preview.conflicts.length > 0 && (
                <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded">
                  ⚠️ <strong>Conflict Warning:</strong> Higher-priority rule{" "}
                  <strong>"{preview.conflicts[0].ruleName}"</strong> also catches{" "}
                  {preview.conflicts[0].count} of these lines first.
                </div>
              )}

              {preview.sampleMatches.length > 0 && (
                <div className="space-y-1 text-xs">
                  {preview.sampleMatches.slice(0, 3).map((m) => (
                    <div key={m.id} className="flex justify-between bg-white p-2 rounded border border-slate-200">
                      <span className="truncate max-w-[280px] font-mono text-[11px] text-slate-700">
                        {m.description}
                      </span>
                      <span className="font-bold text-slate-900">
                        ₹{Math.abs(m.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Press <kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-700">Ctrl+Enter</kbd> to save
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border rounded hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow"
            >
              {saving ? "Saving..." : rule ? "Update Rule" : "Save Rule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
