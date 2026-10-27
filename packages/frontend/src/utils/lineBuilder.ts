import { InventoryItem } from "@/services/inventoryService";

export interface LineBuilderContext {
  metalRates?: {
    karat24?: number;
    karat22?: number;
    karat18?: number;
    karat14?: number;
    silver?: number;
  } | null;
  defaultGstPct?: number;
  existingLine?: Partial<InvoiceLineItem>;
}

export interface InvoiceLineItem {
  sku: string;
  description: string;
  karat: "24K" | "22K" | "18K" | "14K" | "SILVER" | "PLATINUM";
  grossWt: number;
  netWt: number;
  stoneWt: number;
  makingType: "PER_GRAM" | "FLAT" | "PERCENT" | "FIXED";
  makingRate: number;
  ratePerGram: number;
  discountPct: number;
  gstPct: number;
  hsnCode: string;
  huid: string;
}

export function buildLineFromItem(
  item: InventoryItem,
  context: LineBuilderContext = {}
): InvoiceLineItem {
  const karat = (item.karat === "24K" || item.karat === "22K" || item.karat === "18K" || item.karat === "14K")
    ? item.karat
    : "22K";

  // Derive rate per gram from current day metal rates if available
  let ratePerGram = context.existingLine?.ratePerGram || 0;
  if (context.metalRates) {
    if (karat === "24K" && context.metalRates.karat24) {
      ratePerGram = context.metalRates.karat24;
    } else if (karat === "22K" && context.metalRates.karat22) {
      ratePerGram = context.metalRates.karat22;
    } else if (karat === "18K" && context.metalRates.karat18) {
      ratePerGram = context.metalRates.karat18;
    } else if (karat === "14K" && context.metalRates.karat14) {
      ratePerGram = context.metalRates.karat14;
    }
  }

  // If item has a fixed MRP or cost and no live rate, compute fallback rate per gram if net weight > 0
  if (ratePerGram === 0 && item.mrp && item.netWt > 0) {
    ratePerGram = Math.round(item.mrp / item.netWt);
  }

  const makingType = (item.makingType === "PER_GRAM" || item.makingType === "FLAT" || item.makingType === "PERCENT")
    ? item.makingType
    : "PER_GRAM";

  return {
    sku: String(item.sku || "").toUpperCase(),
    description: item.name || "",
    karat,
    grossWt: Number(item.grossWt || item.netWt || 0),
    netWt: Number(item.netWt || 0),
    stoneWt: Number(item.stoneWt || 0),
    makingType,
    makingRate: Number(item.makingRate || 0),
    ratePerGram,
    discountPct: context.existingLine?.discountPct || 0,
    gstPct: context.defaultGstPct !== undefined ? context.defaultGstPct : 3, // Standard 3% GST on gold jewellery
    hsnCode: "7113", // Standard Jewellery HSN code
    huid: (item as any).huid || "",
  };
}
