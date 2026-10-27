import { useState, useEffect, useMemo } from "react";
import {
  Printer,
  Download,
  Settings2,
  Check,
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  Layers,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { labelService, LabelTemplateOption } from "@/services/labelService";
import { inventoryService, InventoryItem } from "@/services/inventoryService";

interface LabelPrintModalProps {
  open: boolean;
  onClose: () => void;
  items: InventoryItem[];
}

export const LabelPrintModal = ({ open, onClose, items: initialItems }: LabelPrintModalProps) => {
  const [templates, setTemplates] = useState<LabelTemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("THERMAL_50X25");

  // Dynamic batch of items being printed
  const [batchItems, setBatchItems] = useState<InventoryItem[]>([]);
  const [copies, setCopies] = useState<Record<number, number>>({});

  // Search & add new items to batch
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Content & Calibration options
  const [showPrice, setShowPrice] = useState(true);
  const [showWeight, setShowWeight] = useState(true);
  const [showKarat, setShowKarat] = useState(true);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  // Load templates and initialize batch when modal opens
  useEffect(() => {
    if (open) {
      labelService
        .getTemplates()
        .then((res) => {
          setTemplates(res);
          const def = res.find((t) => t.isDefault) || res[0];
          if (def) setSelectedTemplate(def.code);
        })
        .catch(() => {
          setTemplates([
            {
              code: "THERMAL_50X25",
              name: "Thermal 50×25 mm (Standard Jewellery Tag)",
              widthMm: 50,
              heightMm: 25,
              description: "Standard barcode/QR jewellery tag for thermal roll printers (TSC, Zebra, Godex).",
              isDefault: true,
            },
            {
              code: "THERMAL_38X25",
              name: "Thermal 38×25 mm (Compact Tag)",
              widthMm: 38,
              heightMm: 25,
              description: "Compact tag for rings, earrings and delicate items.",
              isDefault: false,
            },
            {
              code: "THERMAL_100X50",
              name: "Thermal 100×50 mm (Retail Box / Parcel)",
              widthMm: 100,
              heightMm: 50,
              description: "Large label for boxes, pouches, trays and parcel packages.",
              isDefault: false,
            },
            {
              code: "A4_SHEET_3X8",
              name: "A4 Laser/Inkjet Sheet (3×8 = 24 Labels)",
              widthMm: 64,
              heightMm: 33.9,
              description: "Standard 24-up sticker sheet for standard office laser and inkjet printers (Avery 7160).",
              isDefault: false,
            },
          ]);
        });

      // Initialize batch items
      setBatchItems(initialItems);

      // Default quantities: 1 each if single/few items, or 1 default
      const initialCopies: Record<number, number> = {};
      initialItems.forEach((item) => {
        initialCopies[item.id] = 1;
      });
      setCopies(initialCopies);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open, initialItems]);

  // Handle dynamic search for adding products
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await inventoryService.listItems({ search: q });
        // Filter out items already in the batch
        const existingIds = new Set(batchItems.map((b) => b.id));
        setSearchResults(found.filter((item) => !existingIds.has(item.id)).slice(0, 6));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, batchItems]);

  const totalLabels = useMemo(() => {
    return batchItems.reduce((sum, item) => sum + (copies[item.id] || 0), 0);
  }, [batchItems, copies]);

  if (!open) return null;

  // Add an item into the active print batch
  const handleAddItemToBatch = (item: InventoryItem, initialQty = 1) => {
    setBatchItems((prev) => [...prev, item]);
    setCopies((prev) => ({ ...prev, [item.id]: initialQty }));
    setSearchQuery("");
    setSearchResults([]);
    toast.success(`Added "${item.name}" to print batch`);
  };

  // Remove an item from the batch
  const handleRemoveFromBatch = (itemId: number) => {
    setBatchItems((prev) => prev.filter((i) => i.id !== itemId));
    setCopies((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleUpdateQty = (itemId: number, delta: number) => {
    setCopies((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const handleSetExactQty = (itemId: number, qty: number) => {
    setCopies((prev) => ({
      ...prev,
      [itemId]: Math.max(0, qty),
    }));
  };

  const handleSetAllToOne = () => {
    const updated: Record<number, number> = {};
    batchItems.forEach((item) => {
      updated[item.id] = 1;
    });
    setCopies(updated);
  };

  const handleSetAllToStock = () => {
    const updated: Record<number, number> = {};
    batchItems.forEach((item) => {
      updated[item.id] = Math.max(1, Math.round(item.stockQty || 1));
    });
    setCopies(updated);
  };

  const handleResetToZero = () => {
    const updated: Record<number, number> = {};
    batchItems.forEach((item) => {
      updated[item.id] = 0;
    });
    setCopies(updated);
  };

  const preparePayload = () => {
    const activeItems = batchItems
      .filter((item) => (copies[item.id] || 0) > 0)
      .map((item) => ({
        itemId: item.id,
        copies: copies[item.id],
      }));

    if (activeItems.length === 0) {
      throw new Error("Please set at least 1 copy for at least one item");
    }

    return {
      templateCode: selectedTemplate,
      items: activeItems,
      offsetXmm: offsetX,
      offsetYmm: offsetY,
      showPrice,
      showWeight,
      showKarat,
    };
  };

  const handleDownload = async () => {
    try {
      const payload = preparePayload();
      setIsPrinting(true);
      await labelService.downloadLabelsPdf(payload);
      toast.success(`Generated ${totalLabels} barcode labels PDF`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || err.response?.data?.error?.message || "Failed to generate labels");
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintDirect = async () => {
    try {
      const payload = preparePayload();
      setIsPrinting(true);
      const blob = await labelService.getLabelsPdfBlob(payload);
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.focus();
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `labels_${selectedTemplate.toLowerCase()}.pdf`;
        link.click();
      }
      toast.success("Labels sent to print dialog");
      onClose();
    } catch (err: any) {
      toast.error(err.message || err.response?.data?.error?.message || "Failed to print labels");
    } finally {
      setIsPrinting(false);
    }
  };

  // Sheet calculations for A4 3x8
  const isA4Sheet = selectedTemplate === "A4_SHEET_3X8";
  const a4SheetsNeeded = Math.ceil(totalLabels / 24);
  const a4Remainder = totalLabels % 24;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-charcoal px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/20 text-gold border border-gold/30">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Dynamic Barcode & QR Label Printing</h2>
              <p className="text-xs text-slate-300">
                Mix multiple products, set custom quantities (e.g. 10 of Product A, 7 of B, 15 of C), and print on any label roll or A4 sticker sheet.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6 bg-canvas/30">
          {/* 1. Printer Machine & Sheet Preset */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                1. Select Printer Machine & Label Format
              </label>
              <span className="text-[11px] text-muted">Vector millimeter-precise layout</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {templates.map((tpl) => {
                const isSelected = selectedTemplate === tpl.code;
                return (
                  <div
                    key={tpl.code}
                    onClick={() => setSelectedTemplate(tpl.code)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-gold bg-gold/10 shadow-sm ring-1 ring-gold"
                        : "border-border bg-card hover:border-gold/50 hover:bg-muted/5"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="font-bold text-charcoal text-xs leading-snug">{tpl.name}</div>
                        {isSelected ? <Check className="h-4 w-4 text-gold shrink-0 ml-1" /> : null}
                      </div>
                      <div className="mt-1.5 text-[11px] text-muted leading-relaxed line-clamp-2">
                        {tpl.description}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="rounded bg-muted/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-charcoal">
                        {tpl.widthMm} × {tpl.heightMm} mm
                      </span>
                      {tpl.code.includes("A4") && (
                        <span className="text-[10px] font-bold text-sapphire">24-Up Sheet</span>
                      )}
                      {tpl.code.includes("THERMAL") && (
                        <span className="text-[10px] font-bold text-gold">Thermal Roll</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Dynamic Print Summary & Machine Calculator */}
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/20 text-gold">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Print Batch Summary</div>
                <div className="text-base font-bold text-charcoal">
                  <span className="text-gold font-mono">{totalLabels}</span> Total Labels across{" "}
                  <span className="text-charcoal font-mono">{batchItems.filter((i) => (copies[i.id] || 0) > 0).length}</span> Products
                </div>
              </div>
            </div>

            {/* Live Sheet vs Roll Calculation */}
            <div className="rounded-lg bg-card border border-border px-3.5 py-2 text-xs">
              {isA4Sheet ? (
                <div>
                  <span className="font-semibold text-charcoal">A4 Sheet Output: </span>
                  <strong className="text-sapphire font-mono">
                    {a4SheetsNeeded} Sheet{a4SheetsNeeded === 1 ? "" : "s"}
                  </strong>{" "}
                  <span className="text-muted">
                    ({totalLabels} of {a4SheetsNeeded * 24} slots filled
                    {a4Remainder > 0 ? `, ${24 - a4Remainder} free slots on last sheet` : ""})
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-semibold text-charcoal">Thermal Continuous Roll: </span>
                  <strong className="text-gold font-mono">{totalLabels} Individual Tags</strong>{" "}
                  <span className="text-muted">(direct 0-margin roll feed)</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Items in Batch with Dynamic Copies */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                2. Products in Print Batch ({batchItems.length})
              </label>

              {/* Quick Batch Actions */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleSetAllToOne}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-charcoal hover:border-gold/50 hover:bg-gold/5 transition-colors"
                >
                  All = 1
                </button>
                <button
                  type="button"
                  onClick={handleSetAllToStock}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-charcoal hover:border-gold/50 hover:bg-gold/5 transition-colors"
                >
                  All = Stock Qty
                </button>
                <button
                  type="button"
                  onClick={handleResetToZero}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-muted hover:text-ruby hover:border-ruby/40 transition-colors"
                >
                  Reset Quantities
                </button>
              </div>
            </div>

            {/* Quick Search & Add Any Product Directly into Batch */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type product name or SKU to add another item to this print batch..."
                  className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs placeholder:text-muted focus:border-gold focus:outline-none"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-10 z-20 rounded-xl border border-border bg-card p-1.5 shadow-xl">
                  {searchResults.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => handleAddItemToBatch(res, 1)}
                      className="flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs hover:bg-gold/10 hover:text-gold transition-colors"
                    >
                      <div>
                        <strong className="text-charcoal font-medium">{res.name}</strong>
                        <span className="ml-2 font-mono text-[11px] text-muted">({res.sku})</span>
                        <span className="ml-2 text-muted">
                          {res.karat} • {res.netWt}g • Stock: {res.stockQty}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded bg-gold/15 text-gold px-2 py-0.5 text-[11px] font-bold">
                        <Plus className="h-3 w-3" /> Add
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items List Table / Cards */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/15 border-b border-border font-semibold text-muted uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-3">Specs</th>
                      <th className="py-2.5 px-3 text-right">In Stock</th>
                      <th className="py-2.5 px-3 text-center w-60">Print Copies</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {batchItems.map((item) => {
                      const qty = copies[item.id] ?? 0;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-muted/5 transition-colors ${
                            qty === 0 ? "opacity-50 bg-muted/5" : ""
                          }`}
                        >
                          {/* Name & SKU */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-charcoal">{item.name}</div>
                            <div className="font-mono text-[11px] text-muted">
                              {item.codes?.[0]?.code || item.sku}
                            </div>
                          </td>

                          {/* Specs */}
                          <td className="py-2.5 px-3 text-muted">
                            <span className="inline-block rounded bg-sapphire/10 text-sapphire px-1.5 py-0.5 text-[10px] font-semibold mr-1.5">
                              {item.karat}
                            </span>
                            <span>{item.netWt}g</span>
                          </td>

                          {/* In Stock */}
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-charcoal">
                            {item.stockQty}
                          </td>

                          {/* Dynamic Copies Stepper & Direct Typing */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, -1)}
                                className="h-7 w-7 rounded-lg border border-border bg-surface text-charcoal hover:bg-muted/20 flex items-center justify-center transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>

                              <input
                                type="number"
                                min="0"
                                max="999"
                                value={qty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  handleSetExactQty(item.id, isNaN(val) ? 0 : val);
                                }}
                                className="h-7 w-16 rounded-lg border border-border px-1.5 text-center font-mono font-bold text-xs text-charcoal focus:border-gold focus:outline-none"
                              />

                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, 1)}
                                className="h-7 w-7 rounded-lg border border-border bg-surface text-charcoal hover:bg-muted/20 flex items-center justify-center transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>

                              {/* Quick Presets (+5, +10) */}
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, 5)}
                                className="h-7 rounded border border-border bg-card px-1.5 text-[10px] font-mono font-semibold text-muted hover:border-gold/50 hover:text-gold transition-colors"
                                title="Add 5"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, 10)}
                                className="h-7 rounded border border-border bg-card px-1.5 text-[10px] font-mono font-semibold text-muted hover:border-gold/50 hover:text-gold transition-colors"
                                title="Add 10"
                              >
                                +10
                              </button>
                            </div>
                          </td>

                          {/* Remove from batch */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromBatch(item.id)}
                              className="rounded p-1 text-muted hover:text-ruby hover:bg-ruby/10 transition-colors"
                              title="Remove item from batch"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {batchItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-muted">
                          No items in print batch. Search above to add items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. Fine-Tuning, Offsets & Label Content */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal">
              <Settings2 className="h-4 w-4 text-gold" />
              <span>3. Label Customization & Machine Calibration</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Fields to include on label */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-charcoal cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded border-border text-gold focus:ring-gold"
                  />
                  <span>Show MRP / Price on Label</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-charcoal cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showWeight}
                    onChange={(e) => setShowWeight(e.target.checked)}
                    className="rounded border-border text-gold focus:ring-gold"
                  />
                  <span>Show Net & Gross Weight (in grams)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-charcoal cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showKarat}
                    onChange={(e) => setShowKarat(e.target.checked)}
                    className="rounded border-border text-gold focus:ring-gold"
                  />
                  <span>Show Purity / Karat (e.g. 22K)</span>
                </label>
              </div>

              {/* Margin Calibration Offsets for Physical Printer Alignment */}
              <div className="grid grid-cols-2 gap-3 bg-canvas/40 p-3 rounded-lg border border-border">
                <div>
                  <label className="block text-[11px] font-semibold text-muted">
                    X Margin Offset (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseFloat(e.target.value) || 0)}
                    className="mt-1 h-8 w-full rounded border border-border px-2 font-mono text-xs focus:border-gold focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted">
                    Y Margin Offset (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseFloat(e.target.value) || 0)}
                    className="mt-1 h-8 w-full rounded border border-border px-2 font-mono text-xs focus:border-gold focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 text-[10px] text-muted">
                  Use margin offsets if your physical thermal roll feed prints slightly off-center.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 bg-card">
          <div className="text-xs text-muted">
            Ready to print: <strong className="text-charcoal font-mono text-sm">{totalLabels} total labels</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPrinting}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-charcoal hover:bg-muted/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isPrinting || totalLabels === 0}
              className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-bold text-gold hover:bg-gold/20 transition-all disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={handlePrintDirect}
              disabled={isPrinting || totalLabels === 0}
              className="flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-gold-dark transition-all disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print Directly
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
