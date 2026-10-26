import React, { useState, useEffect } from "react";
import { fixedAssetService, AssetCategory, TaxBlock } from "@/services/fixedAssetService";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [taxBlocks, setTaxBlocks] = useState<TaxBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [assetCategoryId, setAssetCategoryId] = useState<number | "">("");
  const [taxBlockId, setTaxBlockId] = useState<number | "">("");
  const [dateOfPurchase, setDateOfPurchase] = useState(new Date().toISOString().slice(0, 10));
  const [datePutToUse, setDatePutToUse] = useState(new Date().toISOString().slice(0, 10));
  const [originalCost, setOriginalCost] = useState<number | "">("");
  const [salvagePercentage, setSalvagePercentage] = useState<number>(5.0);
  const [salvageValue, setSalvageValue] = useState<number | "">("");
  const [usefulLifeYears, setUsefulLifeYears] = useState<number | "">(5);
  const [depreciationMethod, setDepreciationMethod] = useState<"SLM" | "WDV">("SLM");
  const [isCwip, setIsCwip] = useState(false);
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [custodian, setCustodian] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [barcodeOrTag, setBarcodeOrTag] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadMasters();
    }
  }, [isOpen]);

  const loadMasters = async () => {
    setLoading(true);
    try {
      const [cats, blocks] = await Promise.all([
        fixedAssetService.listCategories(),
        fixedAssetService.listTaxBlocks(),
      ]);
      setCategories(cats);
      setTaxBlocks(blocks);
      if (cats.length > 0 && !assetCategoryId) {
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
  };

  // Preview annual depreciation estimate
  const annualDepreciationEstimate = React.useMemo(() => {
    const cost = Number(originalCost) || 0;
    const salvage = Number(salvageValue) || 0;
    const life = Number(usefulLifeYears) || 0;
    if (cost <= 0 || life <= 0) return 0;

    if (depreciationMethod === "SLM") {
      return Math.max(0, Math.round(((cost - salvage) / life) * 100) / 100);
    } else {
      // WDV Rate = 1 - (s/c)^(1/n)
      const s = Math.max(0.01, salvage);
      const c = Math.max(s, cost);
      const rate = 1 - Math.pow(s / c, 1 / life);
      return Math.round(cost * rate * 100) / 100;
    }
  }, [originalCost, salvageValue, usefulLifeYears, depreciationMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter asset name");
      return;
    }
    if (!assetCategoryId) {
      setError("Please select an asset category");
      return;
    }
    if (!originalCost || Number(originalCost) <= 0) {
      setError("Please enter a valid original cost");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await fixedAssetService.create({
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
        location: location.trim() || undefined,
        department: department.trim() || undefined,
        custodian: custodian.trim() || undefined,
        serialNo: serialNo.trim() || undefined,
        barcodeOrTag: barcodeOrTag.trim() || undefined,
        description: description.trim() || undefined,
      });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add New Fixed Asset</h2>
            <p className="text-xs text-slate-500">
              Schedule II (Companies Act 2013) & Income Tax Act Compliant Asset Register
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Core Identification */}
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
                placeholder="e.g. Laser Jewellery Engraving Machine 50W"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asset Code (Auto if blank)
              </label>
              <input
                type="text"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                placeholder="e.g. FA-2025-0001"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Classification & Accounting Mappings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asset Category (Schedule II) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={assetCategoryId}
                onChange={(e) => handleCategoryChange(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none"
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
                Income-tax Statutory Block (Section 32)
              </label>
              <select
                value={taxBlockId}
                onChange={(e) => setTaxBlockId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select Statutory Block...</option>
                {taxBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.depreciationRate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates & Cost */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Purchase <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dateOfPurchase}
                onChange={(e) => setDateOfPurchase(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Capitalized Cost (Gross Block ₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={originalCost}
                onChange={(e) => handleCostChange(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Depreciation Parameters & Live Preview */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Companies Act 2013 Depreciation Parameters
              </h3>
              <label className="flex items-center space-x-2 text-xs font-medium text-amber-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCwip}
                  onChange={(e) => setIsCwip(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Hold as Capital Work-in-Progress (CWIP)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Method</label>
                <select
                  value={depreciationMethod}
                  onChange={(e) => setDepreciationMethod(e.target.value as "SLM" | "WDV")}
                  disabled={isCwip}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                >
                  <option value="SLM">Straight Line (SLM)</option>
                  <option value="WDV">Written Down Value (WDV)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Useful Life (Years)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={usefulLifeYears}
                  onChange={(e) => setUsefulLifeYears(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={isCwip}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Residual Floor (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={salvageValue}
                  onChange={(e) => setSalvageValue(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={isCwip}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="rounded-md bg-white border border-indigo-100 p-2 text-center">
                  <span className="block text-[10px] uppercase font-semibold text-indigo-500">
                    Est. Annual Depr.
                  </span>
                  <span className="text-sm font-bold text-indigo-700">
                    ₹{annualDepreciationEstimate.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Location / Branch</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main Showroom, Safe #2"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Manufacturing / QC"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Custodian / Owner</label>
              <input
                type="text"
                value={custodian}
                onChange={(e) => setCustodian(e.target.value)}
                placeholder="e.g. Factory Supervisor"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Serial Number / Model</label>
              <input
                type="text"
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                placeholder="e.g. SN-98234-X"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Barcode / RFID Tag</label>
              <input
                type="text"
                value={barcodeOrTag}
                onChange={(e) => setBarcodeOrTag(e.target.value)}
                placeholder="e.g. TAG-48291"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional specifications or warranty details..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="border-t pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition disabled:opacity-50"
            >
              {saving ? "Saving Asset..." : "Save Asset (Direct Entry)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
