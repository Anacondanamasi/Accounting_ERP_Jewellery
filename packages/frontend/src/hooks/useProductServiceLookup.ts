/**
 * useProductServiceLookup
 *
 * A shared hook that provides a product/service search function and a handler
 * to auto-fill invoice/bill line item fields when a product is selected.
 *
 * Usage:
 *   const { productOptions, onSelectProduct } = useProductServiceLookup("sales");
 *   // then call onSelectProduct(index, productId, setValue) in a line item's onChange
 */

import { useQuery } from "@tanstack/react-query";
import { productServiceService, type ProductService } from "@/services/productServiceService";

type Side = "sales" | "purchase";

export interface ProductOption {
  value: string;       // product ID as string
  label: string;       // "CODE - Name"
  meta: string;        // e.g. "Product • ₹8,500"
  payload: ProductService;
}

export interface AutofillResult {
  description: string;
  gstPct: number;
  ratePerGram: number;  // used as the unit/reference price for non-weight items
  hsnCode: string;
  _productName: string;
  _productCode: string;
  _productId: number;
  _salesAccountId?: number;
  _purchaseAccountId?: number;
}

/**
 * Returns the list of active P&S products and a helper to build autofill data
 * for a selected product.
 *
 * @param side - "sales" uses salesPrice + salesTaxRate; "purchase" uses purchasePrice + purchaseTaxRate
 */
export const useProductServiceLookup = (side: Side = "sales") => {
  const { data } = useQuery({
    queryKey: ["product-services-lookup"],
    queryFn: () => productServiceService.list({ status: "ACTIVE", limit: 200 }),
    staleTime: 60_000,
  });

  const products: ProductService[] = data?.rows ?? [];

  const productOptions: ProductOption[] = products
    .filter((p) => (side === "sales" ? p.isSold : p.isPurchased))
    .map((p) => ({
      value: String(p.id),
      label: `${p.code} – ${p.name}`,
      meta: `${p.type === "PRODUCT" ? "Product" : "Service"} • ₹${
        side === "sales"
          ? p.salesPrice.toLocaleString("en-IN")
          : p.purchasePrice.toLocaleString("en-IN")
      }`,
      payload: p,
    }));

  /**
   * Given a product (from the P&S master), returns line-item field values
   * for the chosen side (sales or purchase).
   */
  const buildAutofill = (product: ProductService): AutofillResult => {
    const price = side === "sales" ? product.salesPrice : product.purchasePrice;
    const taxRate = side === "sales" ? product.salesTaxRate : product.purchaseTaxRate;
    const description =
      (side === "sales" ? product.salesDescription : product.purchaseDescription) ||
      product.description ||
      product.name;

    return {
      description,
      gstPct: taxRate,
      ratePerGram: price,   // for weight-based lines this acts as the reference/unit price
      hsnCode: "7113",       // fallback HSN — can be overridden
      _productName: product.name,
      _productCode: product.code,
      _productId: product.id,
      _salesAccountId: product.salesAccountId,
      _purchaseAccountId: product.purchaseAccountId,
    };
  };

  /**
   * Async search for the SearchableSelect loadOptions prop.
   */
  const searchProducts = async (query: string): Promise<ProductOption[]> => {
    const result = await productServiceService.list({
      search: query || undefined,
      status: "ACTIVE",
      limit: 30,
    });

    return result.rows
      .filter((p) => (side === "sales" ? p.isSold : p.isPurchased))
      .map((p) => ({
        value: String(p.id),
        label: `${p.code} – ${p.name}`,
        meta: `${p.type === "PRODUCT" ? "Product" : "Service"} • ₹${
          side === "sales"
            ? p.salesPrice.toLocaleString("en-IN")
            : p.purchasePrice.toLocaleString("en-IN")
        }`,
        payload: p,
      }));
  };

  return { products, productOptions, buildAutofill, searchProducts };
};
