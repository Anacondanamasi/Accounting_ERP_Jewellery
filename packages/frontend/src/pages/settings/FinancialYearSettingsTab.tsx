import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  financialYearService,
  type FinancialYear,
} from "@/services/financialYearService";
import { YearEndClosingModal } from "./YearEndClosingModal";

export const FinancialYearSettingsTab = () => {
  const queryClient = useQueryClient();
  const [selectedFyForClosing, setSelectedFyForClosing] = useState<FinancialYear | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newIsActive, setNewIsActive] = useState(false);

  const {
    data: yearsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["financial-years"],
    queryFn: () => financialYearService.list(),
  });

  const years: FinancialYear[] = Array.isArray(yearsData) ? yearsData : [];

  const activateMutation = useMutation({
    mutationFn: (id: number) => financialYearService.activate(id),
    onSuccess: (data) => {
      toast.success("Active financial year updated");
      void queryClient.invalidateQueries({ queryKey: ["financial-years"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update active financial year");
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      financialYearService.create({
        label: newLabel.trim(),
        startDate: newStartDate,
        endDate: newEndDate,
        isActive: newIsActive,
      }),
    onSuccess: () => {
      toast.success("New financial year created");
      setIsCreateOpen(false);
      setNewLabel("");
      setNewStartDate("");
      setNewEndDate("");
      setNewIsActive(false);
      void queryClient.invalidateQueries({ queryKey: ["financial-years"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Failed to create financial year");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newStartDate || !newEndDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining Accounting Policy */}
      <div className="rounded-card border border-border bg-slate-50/70 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold shrink-0">
            <Scale className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-charcoal">
              Financial Year Management & Year-End Closing Policy
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              In accordance with standard accounting rules and double-entry bookkeeping,
              each financial year represents an official reporting period. When a financial year is closed,
              the net balance of the <strong>Profit and Loss Statement (Revenue minus Expenses)</strong> is
              atomically transferred into <strong>3100 - Retained Earnings</strong> in Equity, resetting all nominal
              revenue and expense accounts to zero for the subsequent year.
            </p>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="rounded-card border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-slate-50/50 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-charcoal font-display">
              Company Financial Years
            </h3>
            <p className="text-xs text-muted">
              Select the active financial year and perform year-end closings.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-gold/90 transition-colors"
            type="button"
          >
            <Plus className="h-4 w-4" /> Add Financial Year
          </button>
        </div>

        {/* Create form dropdown */}
        {isCreateOpen && (
          <form
            onSubmit={handleCreateSubmit}
            className="border-b border-border bg-slate-50/90 p-5 animate-in fade-in duration-200"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-3">
              Create New Financial Year
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Label *
                </label>
                <input
                  type="text"
                  placeholder="e.g. FY 2026-27"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="mt-1 h-9 w-full rounded border border-border bg-white px-3 text-xs focus:border-gold focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="mt-1 h-9 w-full rounded border border-border bg-white px-3 text-xs focus:border-gold focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  End Date *
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="mt-1 h-9 w-full rounded border border-border bg-white px-3 text-xs focus:border-gold focus:outline-none"
                  required
                />
              </div>
              <div className="flex items-end justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-charcoal pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="rounded border-border text-gold focus:ring-gold"
                  />
                  Set as Active
                </label>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="h-9 rounded bg-gold px-4 text-xs font-bold text-white hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Save Year"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Financial Years Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-6 py-3.5">Financial Year</th>
                <th className="px-4 py-3.5">Start Date</th>
                <th className="px-4 py-3.5">End Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">P&L Closing Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-muted">
                    Loading financial years...
                  </td>
                </tr>
              )}
              {years.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-muted">
                    No financial years found. Default financial years will be initialized.
                  </td>
                </tr>
              )}
              {years.map((fy) => {
                const isCurrentActive = fy.isActive;
                return (
                  <tr
                    key={fy.id}
                    className={`transition-colors hover:bg-slate-50/50 ${
                      isCurrentActive ? "bg-gold/5" : ""
                    }`}
                  >
                    {/* Label */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-charcoal font-display">
                          {fy.label}
                        </span>
                        {isCurrentActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <Check className="h-3 w-3" /> Active Year
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Start Date */}
                    <td className="px-4 py-4 font-mono text-xs text-charcoal">
                      {new Date(fy.startDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* End Date */}
                    <td className="px-4 py-4 font-mono text-xs text-charcoal">
                      {new Date(fy.endDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Active/Inactive */}
                    <td className="px-4 py-4">
                      {isCurrentActive ? (
                        <span className="text-xs font-semibold text-emerald-600">
                          Active Posting Year
                        </span>
                      ) : (
                        <button
                          onClick={() => activateMutation.mutate(fy.id)}
                          disabled={activateMutation.isPending}
                          className="text-xs font-semibold text-sapphire underline hover:text-sapphire/70 transition-colors"
                          type="button"
                        >
                          Select as Active
                        </button>
                      )}
                    </td>

                    {/* P&L Closing Status */}
                    <td className="px-4 py-4">
                      {fy.isClosed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                          <Lock className="h-3.5 w-3.5 text-amber-700" /> Closed (Transferred to Retained Earnings)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-slate-500" /> Open Period
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      {fy.isClosed ? (
                        <button
                          onClick={() => setSelectedFyForClosing(fy)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-slate-50 transition-colors"
                          type="button"
                        >
                          View Closing Details
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedFyForClosing(fy)}
                          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold hover:text-white transition-all shadow-sm"
                          type="button"
                        >
                          <Lock className="h-3.5 w-3.5" /> Close Financial Year
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year-End Closing Modal */}
      {selectedFyForClosing && (
        <YearEndClosingModal
          financialYear={selectedFyForClosing}
          isOpen={Boolean(selectedFyForClosing)}
          onClose={() => setSelectedFyForClosing(null)}
        />
      )}
    </div>
  );
};
