import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Lock,
  Printer,
  Hash,
  ShieldCheck,
  Save,
  RotateCcw,
  Percent,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  getWorkstationLockSettings,
  saveWorkstationLockSettings,
  triggerWorkstationLock,
} from "@/components/auth/WorkstationLockModal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { settingsService, type NumberSeries } from "@/services/settingsService";
import { useAuthStore } from "@/stores/authStore";

export const getPrintAdvanceSettings = (companyId?: string | null) => {
  try {
    const raw = localStorage.getItem(`jewel_print_advance_settings:${companyId || "default"}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    showBankDetails: true,
    showHallmarkNotice: true,
    showTerms: true,
    termsText:
      "1. Goods once sold will not be accepted back or exchanged without original invoice.\n2. 100% Certified BIS Hallmarked Jewellery with HUID verification.\n3. Making charges and taxes as applicable by Indian GST Law.",
    autoRoundOff: true,
    signatoryTitle: "For Authorized Signatory",
    defaultHsn: "7113",
    defaultGstRate: 3,
    b2clThreshold: 100000,
  };
};

export const savePrintAdvanceSettings = (settings: ReturnType<typeof getPrintAdvanceSettings>, companyId?: string | null) => {
  localStorage.setItem(`jewel_print_advance_settings:${companyId || "default"}`, JSON.stringify(settings));
};

export const AdvanceConfigTab = () => {
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);

  // App Lock settings
  const [lockSettings, setLockSettings] = useState(getWorkstationLockSettings);
  const [newPin, setNewPin] = useState(lockSettings.pin);
  const [confirmPin, setConfirmPin] = useState(lockSettings.pin);

  // Print & GST Advance settings
  const [printSettings, setPrintSettings] = useState(() => getPrintAdvanceSettings(currentCompanyId));

  // Number Series Query
  const { data: series = [], refetch: refetchSeries } = useQuery({
    queryKey: ["settings-number-series", currentCompanyId],
    queryFn: () => settingsService.getNumberSeries(),
  });

  const updateSeriesMutation = useMutation({
    mutationFn: (row: NumberSeries) =>
      settingsService.updateNumberSeries(row.type, {
        prefix: row.prefix,
        suffix: row.suffix,
        padding: row.padding,
        currentValue: row.currentValue,
        resetPerFy: row.resetPerFy,
      }),
    onSuccess: () => {
      toast.success("Number series updated");
      void refetchSeries();
    },
    onError: () => toast.error("Unable to update number series"),
  });

  const handleSaveLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      toast.error("PIN confirmation does not match");
      return;
    }
    if (newPin.length < 4 || newPin.length > 6) {
      toast.error("PIN must be 4 to 6 digits");
      return;
    }
    saveWorkstationLockSettings({
      ...lockSettings,
      pin: newPin,
    });
    setLockSettings(getWorkstationLockSettings());
    toast.success("Workstation PIN lock settings saved");
  };

  const handleSavePrintAndGst = (e: React.FormEvent) => {
    e.preventDefault();
    savePrintAdvanceSettings(printSettings, currentCompanyId);
    toast.success("Print & GST advance configurations saved");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Workstation PIN Lock & App Lock Config */}
      <div className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-btn bg-gold/15 text-gold">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-charcoal">
                Workstation App Lock & Quick PIN Security
              </h3>
              <p className="text-xs text-muted">
                Secure your jewellery billing counter when stepping away. Screen locks automatically without ending your session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerWorkstationLock()}
            className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-charcoal px-3 text-xs font-semibold text-white hover:bg-black transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            Lock Now
          </button>
        </div>

        <form onSubmit={handleSaveLock} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded border border-border p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-charcoal">Enable PIN Lock</div>
                <div className="text-2xs text-muted">Requires PIN after inactivity</div>
              </div>
              <input
                type="checkbox"
                checked={lockSettings.enabled}
                onChange={(e) => setLockSettings({ ...lockSettings, enabled: e.target.checked })}
                className="h-4 w-4 rounded text-gold focus:ring-gold"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted">Inactivity Auto-Lock Timeout</label>
              <select
                value={lockSettings.timeoutMinutes}
                onChange={(e) =>
                  setLockSettings({ ...lockSettings, timeoutMinutes: Number(e.target.value) })
                }
                className="mt-1 h-10 w-full rounded border border-border bg-white px-3 text-sm focus:border-gold focus:outline-none"
              >
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes</option>
                <option value={0}>Manual Lock Only (Never Auto)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted">Workstation PIN (4-6 digits)</label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 1234"
                className="mt-1 h-10 w-full rounded border border-border bg-white px-3 font-mono text-sm tracking-widest focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-gold px-4 text-xs font-bold text-white shadow hover:bg-gold-dark transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              Save Lock Settings
            </button>
          </div>
        </form>
      </div>

      {/* Invoice & Document Number Series Settings */}
      <div className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
          <div className="grid h-9 w-9 place-items-center rounded-btn bg-gold/15 text-gold">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-charcoal">
              Document Numbering & Series Configuration
            </h3>
            <p className="text-xs text-muted">
              Configure prefix, suffix, zero-padding, and starting numbers for Invoices, Bills, and Notes.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {series.map((row) => (
            <div key={row.id} className="grid gap-3 rounded border border-border bg-slate-50/50 p-3.5 md:grid-cols-6 items-end">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-muted">Document</span>
                <div className="mt-1 font-display text-sm font-bold text-charcoal">{row.type.toUpperCase()}</div>
              </div>
              <div>
                <label className="text-2xs text-muted">Prefix (e.g. INV/25-26/)</label>
                <input
                  className="mt-1 h-9 w-full rounded border border-border bg-white px-2.5 text-xs font-mono font-semibold"
                  defaultValue={row.prefix}
                  onChange={(e) => {
                    row.prefix = e.target.value;
                  }}
                />
              </div>
              <div>
                <label className="text-2xs text-muted">Suffix</label>
                <input
                  className="mt-1 h-9 w-full rounded border border-border bg-white px-2.5 text-xs font-mono"
                  defaultValue={row.suffix || ""}
                  onChange={(e) => {
                    row.suffix = e.target.value;
                  }}
                />
              </div>
              <div>
                <label className="text-2xs text-muted">Padding (Digits)</label>
                <input
                  type="number"
                  className="mt-1 h-9 w-full rounded border border-border bg-white px-2.5 text-xs font-mono"
                  defaultValue={row.padding}
                  onChange={(e) => {
                    row.padding = Number(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="text-2xs text-muted">Next Number</label>
                <input
                  type="number"
                  className="mt-1 h-9 w-full rounded border border-border bg-white px-2.5 text-xs font-mono font-bold text-gold-dark"
                  defaultValue={row.currentValue}
                  onChange={(e) => {
                    row.currentValue = Number(e.target.value);
                  }}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updateSeriesMutation.mutate(row)}
                  className="h-9 w-full rounded-btn border border-border bg-white text-xs font-semibold text-charcoal hover:bg-slate-100 transition-colors shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print & PDF Layout Configuration */}
      <div className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
          <div className="grid h-9 w-9 place-items-center rounded-btn bg-gold/15 text-gold">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-charcoal">
              Invoice Print & PDF Layout Preferences
            </h3>
            <p className="text-xs text-muted">
              Standard Indian GST invoice print options, bank details display, BIS hallmarking, and custom terms.
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePrintAndGst} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 rounded border border-border p-3 text-xs font-semibold text-charcoal cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={printSettings.showBankDetails}
                  onChange={(e) =>
                    setPrintSettings({ ...printSettings, showBankDetails: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-gold focus:ring-gold"
                />
                Show Bank Details & RTGS/NEFT on Invoices
              </label>

              <label className="flex items-center gap-2.5 rounded border border-border p-3 text-xs font-semibold text-charcoal cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={printSettings.showHallmarkNotice}
                  onChange={(e) =>
                    setPrintSettings({ ...printSettings, showHallmarkNotice: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-gold focus:ring-gold"
                />
                Show 100% Certified BIS Hallmarked Jewellery & HUID Notice
              </label>

              <label className="flex items-center gap-2.5 rounded border border-border p-3 text-xs font-semibold text-charcoal cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={printSettings.autoRoundOff}
                  onChange={(e) =>
                    setPrintSettings({ ...printSettings, autoRoundOff: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-gold focus:ring-gold"
                />
                Auto Round-Off Invoice Total to Nearest ₹1
              </label>

              <div>
                <label className="text-xs font-medium text-muted">Authorized Signatory Label</label>
                <input
                  type="text"
                  value={printSettings.signatoryTitle}
                  onChange={(e) =>
                    setPrintSettings({ ...printSettings, signatoryTitle: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded border border-border bg-white px-3 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted">
                Invoice Terms & Conditions Preset
              </label>
              <textarea
                rows={6}
                value={printSettings.termsText}
                onChange={(e) =>
                  setPrintSettings({ ...printSettings, termsText: e.target.value })
                }
                className="mt-1 w-full rounded border border-border bg-white p-2.5 text-xs focus:border-gold focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-border/60 pt-3">
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-gold px-4 text-xs font-bold text-white shadow hover:bg-gold-dark transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              Save Print Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AdvanceConfigTab;
