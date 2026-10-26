import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, X, Package, Wrench, Info, ShoppingCart, BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { productServiceService, type ProductService } from "@/services/productServiceService";
import { accountsService } from "@/services/accountsService";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";

type Tab = "sales" | "purchases" | "inventory";

const TAX_RATES = [
  { label: "No Tax (0%)", value: 0 },
  { label: "GST 0.25% (Rough Stones / Bullion)", value: 0.25 },
  { label: "GST 3% (Jewellery Standard)", value: 3 },
  { label: "GST 5% (Job Work / Services)", value: 5 },
  { label: "GST 12%", value: 12 },
  { label: "GST 18% (Standard Services / Repair)", value: 18 },
  { label: "GST 28%", value: 28 },
];

type FormState = {
  code: string;
  name: string;
  description: string;
  hsnSacCode: string;
  type: "PRODUCT" | "SERVICE";
  isTracked: boolean;
  isSold: boolean;
  salesDescription: string;
  salesPrice: string;
  salesAccountId: string;
  salesTaxRate: number;
  isPurchased: boolean;
  purchaseDescription: string;
  purchasePrice: string;
  purchaseAccountId: string;
  purchaseTaxRate: number;
  itcEligibility: "ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5";
  isRcm: boolean;
  inventoryAssetAccountId: string;
  openingQuantity: string;
  openingValue: string;
  reorderLevel: string;
  unit: string;
  status: "ACTIVE" | "ARCHIVED";
};

const defaultForm: FormState = {
  code: "",
  name: "",
  description: "",
  hsnSacCode: "7113",
  type: "PRODUCT",
  isTracked: false,
  isSold: true,
  salesDescription: "",
  salesPrice: "",
  salesAccountId: "",
  salesTaxRate: 3,
  isPurchased: true,
  purchaseDescription: "",
  purchasePrice: "",
  purchaseAccountId: "",
  purchaseTaxRate: 3,
  itcEligibility: "ELIGIBLE",
  isRcm: false,
  inventoryAssetAccountId: "",
  openingQuantity: "",
  openingValue: "",
  reorderLevel: "",
  unit: "g",
  status: "ACTIVE",
};

export const ProductServiceFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existing } = useQuery({
    queryKey: ["product-service", id],
    queryFn: () => productServiceService.getById(Number(id)),
    enabled: editing,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: () => accountsService.list(),
  });

  const accountOptions = (accounts as any[]).map((a: any) => ({
    id: String(a.id),
    label: `${a.code} - ${a.name}`,
    type: String(a.type).toLowerCase(),
  }));

  const incomeAccounts = accountOptions.filter((a) => a.type === "income" || a.type === "revenue");
  const expenseAccounts = accountOptions.filter((a) => a.type === "expense" || a.type === "expenses");
  const assetAccounts = accountOptions.filter((a) => a.type === "asset" || a.type === "assets");

  useEffect(() => {
    if (!existing || !editing) return;
    setForm({
      code: existing.code,
      name: existing.name,
      description: existing.description ?? "",
      hsnSacCode: (existing as any).hsnSacCode ?? (existing as any).hsnCode ?? "7113",
      type: existing.type as "PRODUCT" | "SERVICE",
      isTracked: existing.isTracked,
      isSold: existing.isSold,
      salesDescription: existing.salesDescription ?? "",
      salesPrice: String(existing.salesPrice),
      salesAccountId: existing.salesAccountId ? String(existing.salesAccountId) : "",
      salesTaxRate: existing.salesTaxRate,
      isPurchased: existing.isPurchased,
      purchaseDescription: existing.purchaseDescription ?? "",
      purchasePrice: String(existing.purchasePrice),
      purchaseAccountId: existing.purchaseAccountId ? String(existing.purchaseAccountId) : "",
      purchaseTaxRate: existing.purchaseTaxRate,
      itcEligibility: (existing as any).itcEligibility ?? "ELIGIBLE",
      isRcm: (existing as any).isRcm ?? false,
      inventoryAssetAccountId: existing.inventoryAssetAccountId ? String(existing.inventoryAssetAccountId) : "",
      openingQuantity: String(existing.openingQuantity),
      openingValue: String(existing.openingValue),
      reorderLevel: String(existing.reorderLevel),
      unit: existing.unit ?? "pcs",
      status: existing.status as "ACTIVE" | "ARCHIVED",
    });
  }, [existing, editing]);

  const set = (k: keyof FormState, v: any) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => { const n = { ...prev }; delete n[k]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.code.trim()) errs.code = "Item code is required";
    if (!form.name.trim()) errs.name = "Item name is required";
    if (form.isSold && form.salesPrice !== "" && isNaN(Number(form.salesPrice)))
      errs.salesPrice = "Enter a valid price";
    return errs;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<ProductService> = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description || undefined,
        hsnCode: form.hsnSacCode || undefined,
        hsnSacCode: form.hsnSacCode || undefined,
        type: form.type,
        isTracked: form.isTracked && form.type === "PRODUCT",
        isSold: form.isSold,
        salesDescription: form.salesDescription || undefined,
        salesPrice: Number(form.salesPrice) || 0,
        salesAccountId: form.salesAccountId ? Number(form.salesAccountId) : undefined,
        salesTaxRate: form.salesTaxRate,
        isPurchased: form.isPurchased,
        purchaseDescription: form.purchaseDescription || undefined,
        purchasePrice: Number(form.purchasePrice) || 0,
        purchaseAccountId: form.purchaseAccountId ? Number(form.purchaseAccountId) : undefined,
        purchaseTaxRate: form.purchaseTaxRate,
        itcEligibility: form.itcEligibility,
        isRcm: form.isRcm,
        inventoryAssetAccountId: form.inventoryAssetAccountId ? Number(form.inventoryAssetAccountId) : undefined,
        openingQuantity: Number(form.openingQuantity) || 0,
        openingValue: Number(form.openingValue) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        unit: form.unit || "pcs",
        status: form.status,
      } as any;

      return editing
        ? productServiceService.update(Number(id), payload)
        : productServiceService.create(payload);
    },
    onSuccess: (result) => {
      toast.success(editing ? "Item updated" : "Item created");
      queryClient.invalidateQueries({ queryKey: ["product-services"] });
      navigate(`/products/${result.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || "Unable to save item");
    },
  });

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the errors before saving");
      return;
    }
    saveMutation.mutate();
  };

  const TABS = [
    { key: "sales" as Tab, label: "Sales Information", icon: ShoppingCart },
    { key: "purchases" as Tab, label: "Purchase Information", icon: Package },
    ...(form.type === "PRODUCT" && form.isTracked
      ? [{ key: "inventory" as Tab, label: "Inventory Tracking", icon: BarChart3 }]
      : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={editing ? "Edit Item" : "New Product / Service"}
        subtitle={editing ? `Editing: ${existing?.name ?? "..."}` : "Add a product or service to use in your transactions"}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(editing ? `/products/${id}` : "/products")} type="button">
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saveMutation.isPending} type="button">
              <Save className="mr-2 h-4 w-4" /> {editing ? "Update Item" : "Save Item"}
            </Button>
          </>
        }
      />

      {/* Basic Information */}
      <div className="rounded-xl border-t-2 border-t-gold bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-base font-semibold text-charcoal">Basic Information</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            label="Item Code / SKU"
            required
            placeholder="e.g. RING-22K-001"
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            error={errors.code}
          />
          <Input
            label="Item Name"
            required
            placeholder="e.g. 22K Gold Ring"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />
          <TextArea
            label="Description"
            containerClassName="md:col-span-2"
            placeholder="Brief description of the item..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted block">HSN / SAC Code (Statutory)</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="h-10 w-44 rounded border border-border px-3 font-mono text-sm uppercase focus:border-gold focus:outline-none"
                placeholder="e.g. 7113"
                value={form.hsnSacCode}
                onChange={(e) => set("hsnSacCode", e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted text-[11px]">Quick:</span>
                <button
                  type="button"
                  onClick={() => set("hsnSacCode", "7113")}
                  className="rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] text-charcoal font-medium"
                >
                  7113 (Jewellery)
                </button>
                <button
                  type="button"
                  onClick={() => set("hsnSacCode", "7108")}
                  className="rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] text-charcoal font-medium"
                >
                  7108 (Bullion)
                </button>
                <button
                  type="button"
                  onClick={() => set("hsnSacCode", "7102")}
                  className="rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] text-charcoal font-medium"
                >
                  7102 (Diamonds)
                </button>
                <button
                  type="button"
                  onClick={() => set("hsnSacCode", "9988")}
                  className="rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] text-charcoal font-medium"
                >
                  9988 (Job Work)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Item Type */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-muted">Item Type <span className="text-ruby">*</span></p>
          <div className="flex gap-3">
            {[
              { v: "PRODUCT", label: "Product", icon: Package, desc: "Physical goods — jewellery, metals, gemstones" },
              { v: "SERVICE", label: "Service", icon: Wrench, desc: "Non-physical — making charges, repair, design fees" },
            ].map(({ v, label, icon: Icon, desc }) => (
              <button
                key={v}
                type="button"
                className={`flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  form.type === v
                    ? "border-gold bg-gold-tint"
                    : "border-border bg-canvas hover:border-gold/50"
                }`}
                onClick={() => { set("type", v); if (v === "SERVICE") set("isTracked", false); }}
              >
                <Icon className={`h-6 w-6 ${form.type === v ? "text-gold" : "text-muted"}`} />
                <div>
                  <p className={`font-semibold ${form.type === v ? "text-charcoal" : "text-muted"}`}>{label}</p>
                  <p className="text-xs text-muted">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Track inventory toggle — only for products */}
        {form.type === "PRODUCT" && (
          <label className="mt-5 flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-gold"
              checked={form.isTracked}
              onChange={(e) => set("isTracked", e.target.checked)}
            />
            <div>
              <p className="text-sm font-medium text-charcoal group-hover:text-gold transition-colors">
                Track inventory for this item
              </p>
              <p className="text-xs text-muted">
                Maintain quantity on hand. Sales will reduce stock; purchases will increase it.
              </p>
            </div>
          </label>
        )}
      </div>

      {/* Tabbed Sections */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        {/* Tab nav */}
        <div className="flex border-b border-border">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all -mb-[1px] ${
                activeTab === key
                  ? "border-gold text-gold bg-gold-tint/30"
                  : "border-transparent text-muted hover:text-charcoal hover:border-border"
              }`}
              onClick={() => setActiveTab(key)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* SALES TAB */}
          {activeTab === "sales" && (
            <div className="space-y-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-gold"
                  checked={form.isSold}
                  onChange={(e) => set("isSold", e.target.checked)}
                />
                <span className="text-sm font-medium text-charcoal">I sell this item</span>
              </label>

              {form.isSold && (
                <div className="grid gap-5 md:grid-cols-2">
                  <TextArea
                    label="Sales Description"
                    containerClassName="md:col-span-2"
                    placeholder="Description shown on invoices/quotes..."
                    value={form.salesDescription}
                    onChange={(e) => set("salesDescription", e.target.value)}
                  />
                  <Input
                    label="Sales Price (₹)"
                    type="number"
                    placeholder="0.00"
                    value={form.salesPrice}
                    onChange={(e) => set("salesPrice", e.target.value)}
                    error={errors.salesPrice}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Sales Account</label>
                    <select
                      className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none"
                      value={form.salesAccountId}
                      onChange={(e) => set("salesAccountId", e.target.value)}
                    >
                      <option value="">Select account...</option>
                      {incomeAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Sales Tax Rate</label>
                    <select
                      className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none"
                      value={form.salesTaxRate}
                      onChange={(e) => set("salesTaxRate", Number(e.target.value))}
                    >
                      {TAX_RATES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PURCHASES TAB */}
          {activeTab === "purchases" && (
            <div className="space-y-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-gold"
                  checked={form.isPurchased}
                  onChange={(e) => set("isPurchased", e.target.checked)}
                />
                <span className="text-sm font-medium text-charcoal">I purchase this item</span>
              </label>

              {form.isPurchased && (
                <div className="grid gap-5 md:grid-cols-2">
                  <TextArea
                    label="Purchase Description"
                    containerClassName="md:col-span-2"
                    placeholder="Description shown on purchase orders/bills..."
                    value={form.purchaseDescription}
                    onChange={(e) => set("purchaseDescription", e.target.value)}
                  />
                  <Input
                    label="Cost Price / Purchase Price (₹)"
                    type="number"
                    placeholder="0.00"
                    value={form.purchasePrice}
                    onChange={(e) => set("purchasePrice", e.target.value)}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Purchase / COGS Account</label>
                    <select
                      className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none"
                      value={form.purchaseAccountId}
                      onChange={(e) => set("purchaseAccountId", e.target.value)}
                    >
                      <option value="">Select account...</option>
                      {expenseAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Purchase Tax Rate</label>
                    <select
                      className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none"
                      value={form.purchaseTaxRate}
                      onChange={(e) => set("purchaseTaxRate", Number(e.target.value))}
                    >
                      {TAX_RATES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Input Tax Credit (ITC) Eligibility</label>
                    <select
                      className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none"
                      value={form.itcEligibility}
                      onChange={(e) => set("itcEligibility", e.target.value as any)}
                    >
                      <option value="ELIGIBLE">Eligible (Normal Business Input)</option>
                      <option value="INELIGIBLE">Ineligible (Non-business / Exempt)</option>
                      <option value="BLOCKED_17_5">Blocked Credit u/s 17(5)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="rcm-toggle"
                      checked={form.isRcm}
                      onChange={(e) => set("isRcm", e.target.checked)}
                      className="h-4 w-4 text-gold rounded"
                    />
                    <label htmlFor="rcm-toggle" className="text-xs text-charcoal cursor-pointer">
                      Purchase is subject to Reverse Charge (RCM)
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === "inventory" && form.isTracked && form.type === "PRODUCT" && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <Info className="h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Opening quantity creates an initial stock balance entry. Subsequent purchases and sales will automatically track quantity on hand.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Inventory Asset Account</label>
                  <select
                    className="h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none"
                    value={form.inventoryAssetAccountId}
                    onChange={(e) => set("inventoryAssetAccountId", e.target.value)}
                  >
                    <option value="">Select asset account...</option>
                    {assetAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Unit of Measurement"
                  placeholder="e.g. pcs, g, kg, set"
                  value={form.unit}
                  onChange={(e) => set("unit", e.target.value)}
                />
                <Input
                  label="Opening Quantity"
                  type="number"
                  placeholder="0"
                  value={form.openingQuantity}
                  onChange={(e) => set("openingQuantity", e.target.value)}
                />
                <Input
                  label="Opening Value (₹)"
                  type="number"
                  placeholder="0.00"
                  value={form.openingValue}
                  onChange={(e) => set("openingValue", e.target.value)}
                />
                <Input
                  label="Reorder Level"
                  type="number"
                  placeholder="Alert when qty falls below this"
                  value={form.reorderLevel}
                  onChange={(e) => set("reorderLevel", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-charcoal">Item Status</p>
            <p className="text-xs text-muted">Archived items are hidden from selection in new transactions</p>
          </div>
          <select
            className="h-10 rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>
    </div>
  );
};
