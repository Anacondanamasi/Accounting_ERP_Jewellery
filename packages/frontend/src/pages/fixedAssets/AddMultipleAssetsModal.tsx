import React, { useState, useEffect } from "react";
import { fixedAssetService, AssetCategory } from "@/services/fixedAssetService";

interface AddMultipleAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BulkRow {
  name: string;
  assetCategoryId: number;
  datePutToUse: string;
  originalCost: number;
  usefulLifeYears: number;
  depreciationMethod: "SLM" | "WDV";
  location: string;
  serialNo: string;
}

export const AddMultipleAssetsModal: React.FC<AddMultipleAssetsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<BulkRow[]>([
    {
      name: "",
      assetCategoryId: 0,
      datePutToUse: new Date().toISOString().slice(0, 10),
      originalCost: 0,
      usefulLifeYears: 5,
      depreciationMethod: "SLM",
      location: "",
      serialNo: "",
    },
    {
      name: "",
      assetCategoryId: 0,
      datePutToUse: new Date().toISOString().slice(0, 10),
      originalCost: 0,
      usefulLifeYears: 5,
      depreciationMethod: "SLM",
      location: "",
      serialNo: "",
    },
    {
      name: "",
      assetCategoryId: 0,
      datePutToUse: new Date().toISOString().slice(0, 10),
      originalCost: 0,
      usefulLifeYears: 5,
      depreciationMethod: "SLM",
      location: "",
      serialNo: "",
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const cats = await fixedAssetService.listCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setRows((prev) =>
          prev.map((r) => ({
            ...r,
            assetCategoryId: r.assetCategoryId || cats[0].id,
            usefulLifeYears: cats[0].usefulLifeYears,
            depreciationMethod: cats[0].defaultMethod,
          }))
        );
      }
    } catch (err: any) {
      setError("Failed to load asset categories");
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const defaultCat = categories[0];
    setRows((prev) => [
      ...prev,
      {
        name: "",
        assetCategoryId: defaultCat ? defaultCat.id : 0,
        datePutToUse: new Date().toISOString().slice(0, 10),
        originalCost: 0,
        usefulLifeYears: defaultCat ? defaultCat.usefulLifeYears : 5,
        depreciationMethod: defaultCat ? defaultCat.defaultMethod : "SLM",
        location: "",
        serialNo: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof BulkRow, val: any) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };

      if (field === "assetCategoryId") {
        const cat = categories.find((c) => c.id === Number(val));
        if (cat) {
          copy[index].usefulLifeYears = cat.usefulLifeYears;
          copy[index].depreciationMethod = cat.defaultMethod;
        }
      }
      return copy;
    });
  };

  const handleSubmit = async () => {
    const validRows = rows.filter((r) => r.name.trim() && Number(r.originalCost) > 0);
    if (validRows.length === 0) {
      setError("Please fill in at least one valid row with Name and Cost > 0");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = validRows.map((r) => ({
        name: r.name.trim(),
        assetCategoryId: Number(r.assetCategoryId),
        dateOfPurchase: r.datePutToUse,
        datePutToUse: r.datePutToUse,
        originalCost: Number(r.originalCost),
        usefulLifeYears: Number(r.usefulLifeYears),
        depreciationMethod: r.depreciationMethod,
        location: r.location.trim() || undefined,
        serialNo: r.serialNo.trim() || undefined,
      }));

      await fixedAssetService.bulkCreate(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to import assets");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add Multiple Assets (Bulk Entry)</h2>
            <p className="text-xs text-slate-500">
              Quickly register multiple fixed assets in a single batch
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="px-3 py-2 w-8">#</th>
                  <th className="px-3 py-2">Asset Name *</th>
                  <th className="px-3 py-2">Category *</th>
                  <th className="px-3 py-2">Put To Use *</th>
                  <th className="px-3 py-2">Cost (₹) *</th>
                  <th className="px-3 py-2">Life (Y)</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Serial No</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400 text-center font-medium">{idx + 1}</td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleRowChange(idx, "name", e.target.value)}
                        placeholder="e.g. Dell Latitude 7420"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={row.assetCategoryId}
                        onChange={(e) => handleRowChange(idx, "assetCategoryId", Number(e.target.value))}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="date"
                        value={row.datePutToUse}
                        onChange={(e) => handleRowChange(idx, "datePutToUse", e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={row.originalCost || ""}
                        onChange={(e) => handleRowChange(idx, "originalCost", Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1 w-16">
                      <input
                        type="number"
                        step="0.5"
                        value={row.usefulLifeYears}
                        onChange={(e) => handleRowChange(idx, "usefulLifeYears", Number(e.target.value))}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1 w-20">
                      <select
                        value={row.depreciationMethod}
                        onChange={(e) => handleRowChange(idx, "depreciationMethod", e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="SLM">SLM</option>
                        <option value="WDV">WDV</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={row.location}
                        onChange={(e) => handleRowChange(idx, "location", e.target.value)}
                        placeholder="Showroom"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={row.serialNo}
                        onChange={(e) => handleRowChange(idx, "serialNo", e.target.value)}
                        placeholder="SN-1234"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold"
                          title="Remove row"
                        >
                          &times;
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={addRow}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition"
            >
              + Add Another Row
            </button>
            <div className="text-xs text-slate-500">
              Total Valid Rows:{" "}
              <strong className="text-slate-800">
                {rows.filter((r) => r.name.trim() && Number(r.originalCost) > 0).length}
              </strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-slate-50 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition disabled:opacity-50"
          >
            {saving ? "Importing Assets..." : "Import All Assets"}
          </button>
        </div>
      </div>
    </div>
  );
};
