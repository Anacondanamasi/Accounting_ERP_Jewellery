import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  ShieldCheck,
  Percent,
  Lock,
  FileCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { taxService } from "@/services/taxService";
import { settingsService } from "@/services/settingsService";
import { useAuthStore } from "@/stores/authStore";

export interface GstConfiguration {
  primaryGstin: string;
  stateCode: string;
  stateName: string;
  filingFrequency: "MONTHLY" | "QUARTERLY_QRMP";
  compositionScheme: boolean;
  eInvoiceEnabled: boolean;
  eInvoiceTurnoverThreshold: number;
  eWayBillThreshold: number;
  taxLockDate: string; // ISO date string (YYYY-MM-DD)
  lutNumber?: string;
  lutExpiry?: string;
}

const DEFAULT_GST_CONFIG: GstConfiguration = {
  primaryGstin: "",
  stateCode: "24",
  stateName: "Gujarat",
  filingFrequency: "MONTHLY",
  compositionScheme: false,
  eInvoiceEnabled: false,
  eInvoiceTurnoverThreshold: 50000000, // 5 Crore
  eWayBillThreshold: 50000,
  taxLockDate: "",
  lutNumber: "",
  lutExpiry: "",
};

export const getStoredGstConfig = (companyId: string | null): GstConfiguration => {
  try {
    const raw = localStorage.getItem(`jewel_gst_config_${companyId || "default"}`);
    if (raw) return { ...DEFAULT_GST_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_GST_CONFIG;
};

export const saveStoredGstConfig = (companyId: string | null, config: GstConfiguration) => {
  localStorage.setItem(`jewel_gst_config_${companyId || "default"}`, JSON.stringify(config));
};

export const GstSettingsTab = () => {
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const queryClient = useQueryClient();

  const [config, setConfig] = useState<GstConfiguration>(() => getStoredGstConfig(currentCompanyId));
  const [gstinInput, setGstinInput] = useState(config.primaryGstin);
  const [gstinValidation, setGstinValidation] = useState<{
    valid: boolean;
    state?: string;
    stateCode?: string;
    pan?: string;
    error?: string;
  } | null>(null);
  const [validatingGstin, setValidatingGstin] = useState(false);

  // Load Seeded Tax Codes
  const { data: taxCodes = [], isLoading: loadingCodes } = useQuery({
    queryKey: ["gst-tax-codes"],
    queryFn: () => taxService.getTaxCodes(),
  });

  // Verify GSTIN via backend service
  const handleValidateGstin = async (val: string) => {
    if (!val || val.length !== 15) {
      setGstinValidation(null);
      return;
    }
    setValidatingGstin(true);
    try {
      const res = await taxService.validateGstin(val.toUpperCase());
      if (res.valid) {
        setGstinValidation({
          valid: true,
          state: res.stateName,
          stateCode: res.stateCode,
          pan: res.pan,
        });
        setConfig((prev) => ({
          ...prev,
          primaryGstin: val.toUpperCase(),
          stateCode: res.stateCode || prev.stateCode,
          stateName: res.stateName || prev.stateName,
        }));
        toast.success(`Valid GSTIN for ${res.stateName} (PAN: ${res.pan})`);
      } else {
        setGstinValidation({
          valid: false,
          error: res.error || "Invalid GSTIN checksum / format",
        });
        toast.error(res.error || "Invalid GSTIN");
      }
    } catch {
      setGstinValidation({ valid: false, error: "Validation request failed" });
    } finally {
      setValidatingGstin(false);
    }
  };

  const handleSave = () => {
    saveStoredGstConfig(currentCompanyId, config);
    toast.success("GST and Tax configuration saved successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">GST & Indian Tax Setup</h2>
          <p className="text-xs text-muted">
            Configure multi-state GSTINs, statutory tax codes, e-Invoicing thresholds, and tax period lock dates.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-btn bg-gold px-4 py-2 text-xs font-semibold text-white shadow hover:bg-gold-dark transition-all"
        >
          <Save className="h-4 w-4" />
          Save Configuration
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: GSTIN & Registration */}
        <div className="rounded-card border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-charcoal">
            <Building2 className="h-4 w-4 text-gold" />
            Primary GSTIN & Jurisdiction
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">Company GSTIN (15 Digits)</label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={15}
                placeholder="24AAACM1234A1Z1"
                value={gstinInput}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setGstinInput(val);
                  setConfig((prev) => ({ ...prev, primaryGstin: val }));
                }}
                className="h-10 flex-1 rounded border border-border px-3 font-mono text-sm tracking-wider uppercase focus:border-gold focus:outline-none"
              />
              <button
                type="button"
                disabled={validatingGstin || gstinInput.length !== 15}
                onClick={() => handleValidateGstin(gstinInput)}
                className="h-10 rounded border border-border bg-slate-50 px-3 text-xs font-medium text-charcoal hover:bg-slate-100 disabled:opacity-50"
              >
                {validatingGstin ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Verify"}
              </button>
            </div>
            {gstinValidation?.valid && (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                State: {gstinValidation.state} ({gstinValidation.stateCode}) | PAN: {gstinValidation.pan}
              </p>
            )}
            {gstinValidation && !gstinValidation.valid && (
              <p className="mt-1 flex items-center gap-1 text-xs text-ruby font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                {gstinValidation.error}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Filing Frequency</label>
              <select
                value={config.filingFrequency}
                onChange={(e) => setConfig((p) => ({ ...p, filingFrequency: e.target.value as any }))}
                className="h-10 w-full rounded border border-border px-3 text-sm focus:border-gold focus:outline-none"
              >
                <option value="MONTHLY">Monthly (Regular)</option>
                <option value="QUARTERLY_QRMP">Quarterly (QRMP Scheme)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted block mb-1">Tax Scheme</label>
              <select
                value={config.compositionScheme ? "composition" : "regular"}
                onChange={(e) => setConfig((p) => ({ ...p, compositionScheme: e.target.value === "composition" }))}
                className="h-10 w-full rounded border border-border px-3 text-sm focus:border-gold focus:outline-none"
              >
                <option value="regular">Regular Scheme (ITC Eligible)</option>
                <option value="composition">Composition Scheme (No ITC)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Period Lock & Compliance Controls */}
        <div className="rounded-card border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-charcoal">
            <Lock className="h-4 w-4 text-gold" />
            Tax Lock Date & Period Closing
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">
              Statutory Tax Lock Date (Xero-style)
            </label>
            <input
              type="date"
              value={config.taxLockDate}
              onChange={(e) => setConfig((p) => ({ ...p, taxLockDate: e.target.value }))}
              className="h-10 w-full rounded border border-border px-3 text-sm focus:border-gold focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">
              Transactions dated on or before this lock date cannot be created, modified, or deleted without unlock privilege.
            </p>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Once a monthly GSTR-3B return is filed and the settlement journal is posted, advance the lock date to prevent retroactive journal corruption.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">LUT (Letter of Undertaking) No.</label>
              <input
                type="text"
                placeholder="AD240324001234A"
                value={config.lutNumber || ""}
                onChange={(e) => setConfig((p) => ({ ...p, lutNumber: e.target.value.toUpperCase() }))}
                className="h-10 w-full rounded border border-border px-3 text-xs uppercase focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">LUT Valid Till</label>
              <input
                type="date"
                value={config.lutExpiry || ""}
                onChange={(e) => setConfig((p) => ({ ...p, lutExpiry: e.target.value }))}
                className="h-10 w-full rounded border border-border px-3 text-xs focus:border-gold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 3: e-Invoice & e-Way Bill Thresholds */}
        <div className="rounded-card border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-charcoal">
            <FileCheck className="h-4 w-4 text-gold" />
            e-Invoice & e-Way Bill Rules
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-charcoal block">e-Invoicing Applicability</span>
              <span className="text-xs text-muted">Mandatory for B2B invoices above aggregate turnover limit</span>
            </div>
            <input
              type="checkbox"
              checked={config.eInvoiceEnabled}
              onChange={(e) => setConfig((p) => ({ ...p, eInvoiceEnabled: e.target.checked }))}
              className="h-4 w-4 text-gold focus:ring-gold rounded"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">Turnover Threshold for e-Invoice (INR)</label>
            <input
              type="number"
              value={config.eInvoiceTurnoverThreshold}
              onChange={(e) => setConfig((p) => ({ ...p, eInvoiceTurnoverThreshold: Number(e.target.value) }))}
              className="h-10 w-full rounded border border-border px-3 text-sm focus:border-gold focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">Current statutory threshold: ₹5,00,00,000 (₹5 Crore) aggregate turnover.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">e-Way Bill Generation Threshold (Rule 138)</label>
            <input
              type="number"
              value={config.eWayBillThreshold}
              onChange={(e) => setConfig((p) => ({ ...p, eWayBillThreshold: Number(e.target.value) }))}
              className="h-10 w-full rounded border border-border px-3 text-sm focus:border-gold focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">Statutory threshold is ₹50,000 consignment value (inter-state & intra-state).</p>
          </div>
        </div>

        {/* Card 4: Control Account Ledger Mapping */}
        <div className="rounded-card border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-charcoal">
            <Percent className="h-4 w-4 text-gold" />
            Statutory Control Ledgers (Auto-Mapped)
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Output CGST Payable (2201)</span>
              <span className="font-mono font-medium text-charcoal">Liability · Duties & Taxes</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Output SGST Payable (2202)</span>
              <span className="font-mono font-medium text-charcoal">Liability · Duties & Taxes</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Output IGST Payable (2203)</span>
              <span className="font-mono font-medium text-charcoal">Liability · Duties & Taxes</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Input CGST Receivable (1201)</span>
              <span className="font-mono font-medium text-emerald">Asset · Input Tax Credit</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Input SGST Receivable (1202)</span>
              <span className="font-mono font-medium text-emerald">Asset · Input Tax Credit</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Input IGST Receivable (1203)</span>
              <span className="font-mono font-medium text-emerald">Asset · Input Tax Credit</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">RCM Output Tax Payable (2211-2213)</span>
              <span className="font-mono font-medium text-charcoal">Liability (Cash Only)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted">ITC Blocked u/s 17(5) (5100)</span>
              <span className="font-mono font-medium text-ruby">Expense · Ineligible ITC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seeded Statutory Tax Codes Table */}
      <div className="rounded-card border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-charcoal">
            <Percent className="h-4 w-4 text-gold" />
            Active GST Tax Rates & Slabs (GST Council Masters)
          </div>
          <span className="text-xs text-muted">{taxCodes.length} Rates Configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/70 text-muted">
                <th className="py-2.5 px-3 font-medium">Code</th>
                <th className="py-2.5 px-3 font-medium">Name</th>
                <th className="py-2.5 px-3 font-medium">Total Rate</th>
                <th className="py-2.5 px-3 font-medium">CGST / SGST</th>
                <th className="py-2.5 px-3 font-medium">IGST</th>
                <th className="py-2.5 px-3 font-medium">Special Attributes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingCodes ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    Loading tax codes...
                  </td>
                </tr>
              ) : taxCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    No tax codes seeded.
                  </td>
                </tr>
              ) : (
                taxCodes.map((tc: any) => (
                  <tr key={tc.code} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-semibold text-charcoal">{tc.code}</td>
                    <td className="py-2 px-3 text-charcoal">{tc.name}</td>
                    <td className="py-2 px-3 font-semibold text-charcoal">{tc.rate}%</td>
                    <td className="py-2 px-3 text-muted">
                      {tc.components?.find((c: any) => c.component === "CGST")?.rate || tc.rate / 2}% +{" "}
                      {tc.components?.find((c: any) => c.component === "SGST")?.rate || tc.rate / 2}%
                    </td>
                    <td className="py-2 px-3 text-muted">{tc.rate}%</td>
                    <td className="py-2 px-3">
                      {tc.isRcm && (
                        <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 mr-1">
                          RCM
                        </span>
                      )}
                      {tc.isBlocked && (
                        <span className="inline-block rounded bg-ruby/10 px-1.5 py-0.5 text-[10px] font-semibold text-ruby mr-1">
                          Blocked 17(5)
                        </span>
                      )}
                      {tc.rate === 0 && (
                        <span className="inline-block rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald mr-1">
                          Zero-Rated / LUT
                        </span>
                      )}
                      {tc.code.includes("3") && (
                        <span className="inline-block rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                          Jewellery Standard
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
