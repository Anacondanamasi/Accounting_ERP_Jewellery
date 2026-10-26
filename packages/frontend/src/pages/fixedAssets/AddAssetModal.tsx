import React, { useState, useEffect, useMemo } from "react";
import { fixedAssetService, AssetCategory, TaxBlock, FixedAssetItem } from "@/services/fixedAssetService";

interface AddAssetModalProps {
  isOpen: boolean;
  assetToEdit?: FixedAssetItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  assetToEdit,
  onClose,
  onSuccess,
}) => {
  const isEditMode = Boolean(assetToEdit);

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [taxBlocks, setTaxBlocks] = useState<TaxBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Tabs
  const [activeFormTab, setActiveFormTab] = useState<"GENERAL" | "COST_GST" | "DEPRECIATION" | "TRACKING">("GENERAL");

  // Form state
  const [name, setName] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [assetCategoryId, setAssetCategoryId] = useState<number | "">("");
  const [taxBlockId, setTaxBlockId] = useState<number | "">("");
  const [status, setStatus] = useState<string>("ACTIVE");
  const [isCwip, setIsCwip] = useState(false);

  // Cost & Dates
  const [dateOfPurchase, setDateOfPurchase] = useState(new Date().toISOString().slice(0, 10));
  const [datePutToUse, setDatePutToUse] = useState(new Date().toISOString().slice(0, 10));
  const [originalCost, setOriginalCost] = useState<number | "">("");
  const [billInvoiceNo, setBillInvoiceNo] = useState("");
  const [billDate, setBillDate] = useState("");
  const [vendorName, setVendorName] = useState("");

  // GST & Capital Goods ITC
  const [gstRate, setGstRate] = useState<number>(18);
  const [itcEligibility, setItcEligibility] = useState<"ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5">("ELIGIBLE");
  const [eligibleItcGst, setEligibleItcGst] = useState<number>(0);
  const [blockedItcGst, setBlockedItcGst] = useState<number>(0);

  // Depreciation
  const [salvagePercentage, setSalvagePercentage] = useState<number>(5.0);
  const [salvageValue, setSalvageValue] = useState<number | "">("");
  const [usefulLifeYears, setUsefulLifeYears] = useState<number | "">(5);
  const [depreciationMethod, setDepreciationMethod] = useState<"SLM" | "WDV">("SLM");

  // Location & Physical Custody
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [custodian, setCustodian] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [barcodeOrTag, setBarcodeOrTag] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadMasters();
      initForm();
    }
  }, [isOpen, assetToEdit]);

  const initForm = () => {
    setError(null);
    setActiveFormTab("GENERAL");

    if (assetToEdit) {
      setName(assetToEdit.name);
      setAssetCode(assetToEdit.assetCode);
      setAssetCategoryId(assetToEdit.assetCategoryId);
      setTaxBlockId(assetToEdit.taxBlockId || "");
      setStatus(assetToEdit.status);
      setIsCwip(assetToEdit.isCwip || assetToEdit.status === "CWIP");
      setDateOfPurchase(assetToEdit.dateOfPurchase ? assetToEdit.dateOfPurchase.slice(0, 10) : "");
      setDatePutToUse(assetToEdit.datePutToUse ? assetToEdit.datePutToUse.slice(0, 10) : "");
      setOriginalCost(assetToEdit.originalCost);
      setSalvageValue(assetToEdit.salvageValue);
      setUsefulLifeYears(assetToEdit.usefulLifeYears);
      setDepreciationMethod(assetToEdit.depreciationMethod);
      setLocation(assetToEdit.location || "");
      setDepartment(assetToEdit.department || "");
      setCustodian(assetToEdit.custodian || "");
      setSerialNo(assetToEdit.serialNo || "");
      setBarcodeOrTag(assetToEdit.barcodeOrTag || "");
      setDescription(assetToEdit.description || "");
      setEligibleItcGst(assetToEdit.eligibleItcGst || 0);
      setBlockedItcGst(assetToEdit.blockedItcGst || 0);
    } else {
      setName("");
      setAssetCode("");
      setStatus("ACTIVE");
      setIsCwip(false);
      setDateOfPurchase(new Date().toISOString().slice(0, 10));
      setDatePutToUse(new Date().toISOString().slice(0, 10));
      setOriginalCost("");
      setSalvagePercentage(5.0);
      setSalvageValue("");
      setUsefulLifeYears(5);
      setDepreciationMethod("SLM");
      setLocation("");
      setDepartment("");
      setCustodian("");
      setSerialNo("");
      setBarcodeOrTag("");
      setDescription("");
      setBillInvoiceNo("");
      setBillDate("");
      setVendorName("");
      setGstRate(18);
      setItcEligibility("ELIGIBLE");
      setEligibleItcGst(0);
      setBlockedItcGst(0);
    }
  };

  const loadMasters = async () => {
    setLoading(true);
    try {
      const [cats, blocks] = await Promise.all([
        fixedAssetService.listCategories(),
        fixedAssetService.listTaxBlocks(),
      ]);
      setCategories(cats);
      setTaxBlocks(blocks);
      if (cats.length > 0 && !assetToEdit && !assetCategoryId) {
        handleCategoryChange(cats[0].id, cats);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load master data");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (catId: number, catList = categories) => {
    setAssetCategoryId(catId);
    const cat = catList.find((c) => c.id === catId);
    if (cat) {
      setUsefulLifeYears(cat.usefulLifeYears);
      setDepreciationMethod(cat.defaultMethod);
      setSalvagePercentage(cat.residualPercentage || 5.0);
      if (cat.taxBlockId) setTaxBlockId(cat.taxBlockId);
      recalcSalvage(originalCost, cat.residualPercentage || 5.0);
    }
  };

  const recalcSalvage = (costVal: number | "", pct: number) => {
    if (costVal !== "" && Number(costVal) > 0) {
      const sal = Math.round(((Number(costVal) * pct) / 100) * 100) / 100;
      setSalvageValue(sal);
    }
  };

  const handleCostChange = (val: string) => {
    const num = val === "" ? "" : Number(val);
    setOriginalCost(num);
    recalcSalvage(num, salvagePercentage);

    if (num !== "" && Number(num) > 0) {
      const calcGst = Math.round(((Number(num) * gstRate) / 100) * 100) / 100;
      if (itcEligibility === "ELIGIBLE") {
        setEligibleItcGst(calcGst);
        setBlockedItcGst(0);
      } else {
        setEligibleItcGst(0);
        setBlockedItcGst(calcGst);
      }
    }
  };

  // Preview annual and monthly depreciation estimates
  const depreciationMath = useMemo(() => {
    const cost = Number(originalCost) || 0;
    const salvage = Number(salvageValue) || 0;
    const life = Number(usefulLifeYears) || 0;
    if (cost <= 0 || life <= 0) return { annual: 0, monthly: 0, ratePercent: 0 };

    if (depreciationMethod === "SLM") {
      const depreciableBase = Math.max(0, cost - salvage);
      const annual = Math.round((depreciableBase / life) * 100) / 100;
      const rate = Math.round(((cost > 0 ? annual / cost : 0) * 100) * 100) / 100;
      return {
        annual,
        monthly: Math.round((annual / 12) * 100) / 100,
        ratePercent: rate,
      };
    } else {
      const s = Math.max(0.01, salvage);
      const c = Math.max(s, cost);
      const rate = 1 - Math.pow(s / c, 1 / life);
      const annual = Math.round(cost * rate * 100) / 100;
      return {
        annual,
        monthly: Math.round((annual / 12) * 100) / 100,
        ratePercent: Math.round(rate * 10000) / 100,
      };
    }
  }, [originalCost, salvageValue, usefulLifeYears, depreciationMethod]);

  // Check 180-day rule for put to use date
  const isLessThan180DaysInYear = useMemo(() => {
    if (!datePutToUse) return false;
    const d = new Date(datePutToUse);
    const m = d.getMonth(); // 0 = Jan, 9 = Oct
    const day = d.getDate();
    // In India, put to use after Oct 3 in any FY is < 180 days (Oct 4 to March 31)
    if (m === 9 && day >= 4) return true;
    if (m === 10 || m === 11 || m === 0 || m === 1 || m === 2) return true;
    return false;
  }, [datePutToUse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter asset name");
      setActiveFormTab("GENERAL");
      return;
    }
    if (!assetCategoryId) {
      setError("Please select an asset category (Schedule II)");
      setActiveFormTab("GENERAL");
      return;
    }
    if (!originalCost || Number(originalCost) <= 0) {
      setError("Please enter a valid original capitalized cost (₹)");
      setActiveFormTab("COST_GST");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim(),
        assetCode: assetCode.trim() || undefined,
        assetCategoryId: Number(assetCategoryId),
        taxBlockId: taxBlockId ? Number(taxBlockId) : null,
        dateOfPurchase,
        datePutToUse,
        originalCost: Number(originalCost),
        salvageValue: salvageValue !== "" ? Number(salvageValue) : undefined,
        residualPercentage: salvagePercentage,
        usefulLifeYears: Number(usefulLifeYears),
        depreciationMethod,
        isCwip,
        status: isCwip ? "CWIP" : status,
        location: location.trim() || undefined,
        department: department.trim() || undefined,
        custodian: custodian.trim() || undefined,
        serialNo: serialNo.trim() || undefined,
        barcodeOrTag: barcodeOrTag.trim() || undefined,
        description: description.trim() || undefined,
        billInvoiceNo: billInvoiceNo.trim() || undefined,
        billDate: billDate || undefined,
        eligibleItcGst: Number(eligibleItcGst) || 0,
        blockedItcGst: Number(blockedItcGst) || 0,
      };

      if (isEditMode && assetToEdit) {
        await fixedAssetService.update(assetToEdit.id, payload);
      } else {
        await fixedAssetService.create(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save asset");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏛️</span>
              <h2 className="text-xl font-bold text-slate-900">
                {isEditMode ? `Edit Fixed Asset: ${assetToEdit?.assetCode}` : "Add New Fixed Asset"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Companies Act 2013 (Schedule II) & Income-tax Act (Section 32) Double-Entry Compliant
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>

        {/* Tab Selector Strip */}
        <div className="flex border-b border-slate-200 bg-slate-100/50 px-6 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveFormTab("GENERAL")}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeFormTab === "GENERAL"
                ? "border-indigo-600 text-indigo-700 bg-white rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>1. Asset & Category</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormTab("COST_GST")}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeFormTab === "COST_GST"
                ? "border-indigo-600 text-indigo-700 bg-white rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>2. Purchase, Cost & GST</span>
            {isLessThan180DaysInYear && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Put to use <180 days" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveFormTab("DEPRECIATION")}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeFormTab === "DEPRECIATION"
                ? "border-indigo-600 text-indigo-700 bg-white rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>3. Depreciation Schedule</span>
            <span className="rounded bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2">
              {depreciationMethod}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormTab("TRACKING")}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeFormTab === "TRACKING"
                ? "border-indigo-600 text-indigo-700 bg-white rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>4. Custody & Tracking</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* TAB 1: General & Classification */}
          {activeFormTab === "GENERAL" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fiber Laser Gold Engraving Machine 50W"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Full official asset description for statutory register and insurance schedule.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Code / Tag
                  </label>
                  <input
                    type="text"
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    placeholder="Auto-generated if blank (e.g. PLM-2026-0001)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Unique alphanumeric code per CARO 2020.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Schedule II Category (Companies Act 2013) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={assetCategoryId}
                    onChange={(e) => handleCategoryChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none font-medium"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.usefulLifeYears}y, {c.defaultMethod})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Income-tax Act Statutory Block (Section 32)
                  </label>
                  <select
                    value={taxBlockId}
                    onChange={(e) => setTaxBlockId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Block...</option>
                    {taxBlocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.depreciationRate}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Asset Lifecycle Status</label>
                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      !isCwip && status === "ACTIVE"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-900"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status_radio"
                      checked={!isCwip && status === "ACTIVE"}
                      onChange={() => {
                        setIsCwip(false);
                        setStatus("ACTIVE");
                      }}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold">Active Asset</div>
                      <div className="text-[10px] text-slate-500">Put to use, depreciates periodically</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      isCwip
                        ? "border-amber-500 bg-amber-50/50 text-amber-900"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status_radio"
                      checked={isCwip}
                      onChange={() => {
                        setIsCwip(true);
                        setStatus("CWIP");
                      }}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold">CWIP (Work-in-Progress)</div>
                      <div className="text-[10px] text-slate-500">Under construction, no depreciation</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      status === "DISPOSED"
                        ? "border-rose-500 bg-rose-50/50 text-rose-900"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status_radio"
                      checked={status === "DISPOSED"}
                      onChange={() => {
                        setIsCwip(false);
                        setStatus("DISPOSED");
                      }}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="text-xs font-bold">Disposed / Scrapped</div>
                      <div className="text-[10px] text-slate-500">Retired or sold from books</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Purchase, Cost & GST */}
          {activeFormTab === "COST_GST" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Purchase <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfPurchase}
                    onChange={(e) => setDateOfPurchase(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Put to Use <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={datePutToUse}
                    onChange={(e) => setDatePutToUse(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capitalized Gross Cost (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={originalCost}
                    onChange={(e) => handleCostChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 180 Days Alert */}
              {isLessThan180DaysInYear && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <div>
                    <strong>Income-tax Section 32 Alert: Put to use after October 3 (&lt; 180 days)</strong>
                    <p className="mt-0.5 text-[11px] text-amber-800">
                      Under Indian tax law, assets put to use for less than 180 days in the year of acquisition are restricted to 50% of the normal statutory depreciation rate for that financial year.
                    </p>
                  </div>
                </div>
              )}

              {/* Source Document Details */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Supplier / Purchase Invoice Details (Audit Trail)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Supplier / Vendor Name</label>
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="e.g. Mehta Laser Tech Pvt Ltd"
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Supplier Invoice / Bill No.</label>
                    <input
                      type="text"
                      value={billInvoiceNo}
                      onChange={(e) => setBillInvoiceNo(e.target.value)}
                      placeholder="e.g. INV-2024-0091"
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* GST & Capital Goods Treatment */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  GST & Capital Goods Input Tax Credit (ITC)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">GST Tax Rate</label>
                    <select
                      value={gstRate}
                      onChange={(e) => {
                        const r = Number(e.target.value);
                        setGstRate(r);
                        if (originalCost) {
                          const calc = Math.round(((Number(originalCost) * r) / 100) * 100) / 100;
                          if (itcEligibility === "ELIGIBLE") {
                            setEligibleItcGst(calc);
                            setBlockedItcGst(0);
                          } else {
                            setEligibleItcGst(0);
                            setBlockedItcGst(calc);
                          }
                        }
                      }}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="0">0% (Exempt)</option>
                      <option value="5">5% (Special Equipment)</option>
                      <option value="12">12%</option>
                      <option value="18">18% (Standard Machinery)</option>
                      <option value="28">28% (Motor Vehicles)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Capital Goods ITC Treatment
                    </label>
                    <select
                      value={itcEligibility}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setItcEligibility(val);
                        if (originalCost) {
                          const calc = Math.round(((Number(originalCost) * gstRate) / 100) * 100) / 100;
                          if (val === "ELIGIBLE") {
                            setEligibleItcGst(calc);
                            setBlockedItcGst(0);
                          } else {
                            setEligibleItcGst(0);
                            setBlockedItcGst(calc);
                          }
                        }
                      }}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="ELIGIBLE">Eligible ITC (Claimed in GSTR-3B - Excluded from Gross Asset Cost)</option>
                      <option value="INELIGIBLE">Ineligible / Composition (Capitalized into Gross Asset Cost)</option>
                      <option value="BLOCKED_17_5">Blocked u/s 17(5) (e.g. Passenger Vehicles - Capitalized into Cost)</option>
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                  <span>Eligible ITC Claimed: <strong className="text-emerald-700 font-mono">₹{eligibleItcGst.toLocaleString("en-IN")}</strong></span>
                  <span>Blocked ITC Capitalized: <strong className="text-amber-800 font-mono">₹{blockedItcGst.toLocaleString("en-IN")}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Depreciation Schedule */}
          {activeFormTab === "DEPRECIATION" && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Schedule II (Companies Act 2013) Parameters
                  </h3>
                  {isCwip && (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      CWIP Active: Depreciation Frozen
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Depreciation Method</label>
                    <select
                      value={depreciationMethod}
                      onChange={(e) => setDepreciationMethod(e.target.value as "SLM" | "WDV")}
                      disabled={isCwip}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 font-semibold"
                    >
                      <option value="SLM">Straight Line Method (SLM)</option>
                      <option value="WDV">Written Down Value (WDV)</option>
                    </select>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {depreciationMethod === "SLM"
                        ? "Uniform annual charge over useful life"
                        : "Accelerated charge declining over useful life"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Useful Life (Years)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={usefulLifeYears}
                      onChange={(e) => setUsefulLifeYears(e.target.value === "" ? "" : Number(e.target.value))}
                      disabled={isCwip}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 font-mono"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">Pre-filled from Schedule II standard.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Residual / Salvage Floor (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={salvageValue}
                      onChange={(e) => setSalvageValue(e.target.value === "" ? "" : Number(e.target.value))}
                      disabled={isCwip}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 font-mono"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">Default 5% statutory residual floor.</p>
                  </div>
                </div>

                {/* Math Live Preview Cards */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Annual Depr.
                    </span>
                    <span className="text-base font-bold font-mono text-indigo-900">
                      ₹{depreciationMath.annual.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Monthly Depr.
                    </span>
                    <span className="text-base font-bold font-mono text-indigo-900">
                      ₹{depreciationMath.monthly.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Derived Rate
                    </span>
                    <span className="text-base font-bold font-mono text-indigo-900">
                      {depreciationMath.ratePercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Tracking & Custody */}
          {activeFormTab === "TRACKING" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Branch</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Main Showroom, Safe Vault #1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Manufacturing / Quality Lab"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Custodian / In-Charge</label>
                  <input
                    type="text"
                    value={custodian}
                    onChange={(e) => setCustodian(e.target.value)}
                    placeholder="e.g. Ramesh Sharma (Head Karigar)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number / Machine ID</label>
                  <input
                    type="text"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    placeholder="e.g. SN-882910-X"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode / RFID Tag ID</label>
                  <input
                    type="text"
                    value={barcodeOrTag}
                    onChange={(e) => setBarcodeOrTag(e.target.value)}
                    placeholder="e.g. TAG-49201"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Technical Specifications</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Warranty terms, maintenance schedule, or supplier contact details..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              * Required fields for Schedule II & Income-tax Act registration.
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? "Saving Asset..." : isEditMode ? "Save Changes" : "Save Asset (Direct Entry)"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
