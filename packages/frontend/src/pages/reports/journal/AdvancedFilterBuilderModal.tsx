import React, { useState } from "react";
import { X, Plus, Trash2, Filter, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { FieldCatalogItem } from "@/services/journalReportService";

export interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fieldCatalog: FieldCatalogItem[];
  onApplyFilters: (logic: "AND" | "OR", rows: FilterRow[]) => void;
  initialRows?: FilterRow[];
  initialLogic?: "AND" | "OR";
}

export const AdvancedFilterBuilderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  fieldCatalog,
  onApplyFilters,
  initialRows = [],
  initialLogic = "AND",
}) => {
  const [logic, setLogic] = useState<"AND" | "OR">(initialLogic);
  const [rows, setRows] = useState<FilterRow[]>(
    initialRows.length > 0
      ? initialRows
      : [
          {
            id: "1",
            field: "voucherType",
            operator: "equals",
            value: "INVOICE",
          },
        ]
  );

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        id: Math.random().toString(36).slice(2, 9),
        field: "debit",
        operator: "gt",
        value: "1000",
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, updates: Partial<FilterRow>) => {
    setRows(
      rows.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        // If field changed, set default operator
        if (updates.field) {
          const fieldDef = fieldCatalog.find((f) => f.id === updates.field);
          updated.operator = fieldDef?.operators[0] || "equals";
        }
        return updated;
      })
    );
  };

  const handleApply = () => {
    onApplyFilters(logic, rows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-card bg-card shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-canvas/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gold" />
            <div>
              <h2 className="font-display text-lg font-bold text-charcoal">Advanced Filter Builder</h2>
              <p className="text-xs text-muted">Construct multi-parameter rules with typed database operators</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-canvas transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Logic Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted">Match transactions where</span>
            <div className="inline-flex rounded-btn border border-border p-0.5 bg-canvas/50">
              <button
                type="button"
                onClick={() => setLogic("AND")}
                className={`px-3 py-1 text-xs font-bold rounded-btn transition-colors ${
                  logic === "AND" ? "bg-white text-gold shadow-xs" : "text-muted hover:text-charcoal"
                }`}
              >
                ALL conditions match (AND)
              </button>
              <button
                type="button"
                onClick={() => setLogic("OR")}
                className={`px-3 py-1 text-xs font-bold rounded-btn transition-colors ${
                  logic === "OR" ? "bg-white text-gold shadow-xs" : "text-muted hover:text-charcoal"
                }`}
              >
                ANY condition matches (OR)
              </button>
            </div>
          </div>

          {/* Condition Rows */}
          <div className="space-y-2.5">
            {rows.map((row, idx) => {
              const fieldDef = fieldCatalog.find((f) => f.id === row.field);
              const availableOperators = fieldDef?.operators || ["equals"];

              return (
                <div
                  key={row.id}
                  className="flex items-center gap-2 p-2.5 rounded-btn border border-border bg-white shadow-xs"
                >
                  <span className="w-6 text-center text-xs font-bold text-muted">
                    {idx === 0 ? "IF" : logic}
                  </span>

                  {/* Field Selector */}
                  <select
                    value={row.field}
                    onChange={(e) => handleRowChange(row.id, { field: e.target.value })}
                    className="h-9 rounded-btn border border-border px-2 text-xs font-semibold text-charcoal focus:border-gold outline-none w-48"
                  >
                    {fieldCatalog
                      .filter((f) => f.filterable)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label} ({f.category})
                        </option>
                      ))}
                  </select>

                  {/* Operator Selector */}
                  <select
                    value={row.operator}
                    onChange={(e) => handleRowChange(row.id, { operator: e.target.value })}
                    className="h-9 rounded-btn border border-border px-2 text-xs text-charcoal focus:border-gold outline-none w-36"
                  >
                    {availableOperators.map((op) => (
                      <option key={op} value={op}>
                        {op.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>

                  {/* Value Input */}
                  {!row.operator.startsWith("is_") && (
                    <div className="flex-1">
                      {fieldDef?.enumOptions ? (
                        <select
                          value={row.value}
                          onChange={(e) => handleRowChange(row.id, { value: e.target.value })}
                          className="h-9 w-full rounded-btn border border-border px-2 text-xs text-charcoal focus:border-gold outline-none"
                        >
                          {fieldDef.enumOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={fieldDef?.dataType === "number" || fieldDef?.dataType === "currency" ? "number" : "text"}
                          value={row.value}
                          onChange={(e) => handleRowChange(row.id, { value: e.target.value })}
                          placeholder="Value..."
                          className="h-9 text-xs"
                        />
                      )}
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    disabled={rows.length === 1}
                    className="p-1.5 text-muted hover:text-ruby disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Rule
          </Button>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border bg-canvas/30 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRows([])}
            className="text-xs text-muted hover:text-charcoal"
          >
            Clear All Rules
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply} className="bg-gold text-white hover:bg-gold/90">
              <Check className="h-4 w-4 mr-1.5" />
              Apply Filter Tree
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
