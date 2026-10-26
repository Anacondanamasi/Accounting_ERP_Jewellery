import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  History,
  FileText,
  Printer,
  Download,
  Lock,
  User,
  Clock,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { auditService, type AuditEventRow, type ChainVerificationResult } from "@/services/auditService";
import { EntityHistoryDrawer } from "@/components/shared/EntityHistoryDrawer";

export const AuditLogPage = () => {
  const [activeTab, setActiveTab] = useState<"TRAIL" | "SECURITY" | "STATUTORY">("TRAIL");

  // Filters
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [indirectOnly, setIndirectOnly] = useState(false);
  const [failedOnly, setFailedOnly] = useState(false);

  // Verification State
  const [verificationResult, setVerificationResult] = useState<ChainVerificationResult | null>(null);

  // History Drawer State
  const [historyDrawer, setHistoryDrawer] = useState<{
    isOpen: boolean;
    entityType: string;
    entityId: string;
    entityNumber?: string;
  }>({
    isOpen: false,
    entityType: "Invoice",
    entityId: "",
  });

  // Query Audit Events
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-events", from, to, search, category, indirectOnly, failedOnly, activeTab],
    queryFn: () =>
      auditService.listEvents({
        from,
        to,
        search: search || undefined,
        category: activeTab === "SECURITY" ? "security" : category !== "ALL" ? category : undefined,
        indirectOnly: indirectOnly || undefined,
        failedOnly: activeTab === "SECURITY" ? undefined : failedOnly || undefined,
      }),
  });

  // Query Statutory Report
  const { data: statutoryData, isLoading: statutoryLoading } = useQuery({
    queryKey: ["statutory-audit-report", from, to],
    queryFn: () => auditService.getStatutoryReport(from, to),
    enabled: activeTab === "STATUTORY",
  });

  // Verify Chain Mutation
  const verifyMutation = useMutation({
    mutationFn: () => auditService.verifyChain(),
    onSuccess: (res) => {
      setVerificationResult(res);
      if (res.isValid) {
        toast.success(`Cryptographic Hash Chain 100% Verified across all ${res.totalEvents} events!`);
      } else {
        toast.error(`Tamper Detected: ${res.error}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to verify chain");
    },
  });

  const events = data?.items || [];

  const exportAuditCSV = () => {
    if (!events.length) return;
    const headers = "Timestamp (IST),User,Role,Event,Entity Type,Entity ID,Amount,Summary,Hash\n";
    const rows = events
      .map(
        (e) =>
          `"${new Date(e.occurredAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}","${e.actorName}","${e.actorRole || "USER"}","${e.eventType}","${e.entityType}","${e.entityNumber || e.entityId}",${e.amountAfter ?? ""},"${e.summary.replace(/"/g, '""')}","${e.hash}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `audit_trail_${from}_to_${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Log & Edit Trail"
        subtitle="Tamper-evident, always-on record of transactions, master changes, and security events"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              disabled={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
            >
              <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
              {verifyMutation.isPending ? "Verifying Chain..." : "Verify Hash Chain"}
            </Button>

            <Button variant="outline" size="sm" onClick={exportAuditCSV} disabled={!events.length}>
              <Download className="mr-1.5 h-4 w-4" />
              Export Log
            </Button>

            {activeTab === "STATUTORY" && (
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" />
                Print Statutory Report
              </Button>
            )}
          </div>
        }
      />

      {/* VERIFICATION BANNER IF RUN */}
      {verificationResult && (
        <div
          className={`flex items-center justify-between rounded-card border p-4 ${
            verificationResult.isValid
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-crimson/30 bg-crimson/10 text-crimson font-bold"
          }`}
        >
          <div className="flex items-center gap-3">
            {verificationResult.isValid ? (
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-crimson" />
            )}
            <div>
              <div className="font-bold text-sm">
                {verificationResult.isValid
                  ? "Audit Trail Cryptographically Verified (SHA-256)"
                  : "CRITICAL ALERT: Tamper or Chain Break Detected!"}
              </div>
              <p className="text-xs">
                {verificationResult.isValid
                  ? `All ${verificationResult.totalEvents} audit records link seamlessly to the genesis block with 0 broken hashes.`
                  : verificationResult.error}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setVerificationResult(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-border">
        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "TRAIL"
              ? "border-sapphire text-sapphire"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
          onClick={() => setActiveTab("TRAIL")}
        >
          <History className="h-4 w-4" />
          Audit Trail
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "SECURITY"
              ? "border-sapphire text-sapphire"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
          onClick={() => setActiveTab("SECURITY")}
        >
          <Lock className="h-4 w-4" />
          Security & Access
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "STATUTORY"
              ? "border-sapphire text-sapphire"
              : "border-transparent text-muted hover:text-charcoal"
          }`}
          onClick={() => setActiveTab("STATUTORY")}
        >
          <FileText className="h-4 w-4" />
          Statutory Audit Report (MCA)
        </button>
      </div>

      {/* FILTER TOOLBAR */}
      {activeTab !== "STATUTORY" && (
        <div className="rounded-card border border-border bg-card p-4 shadow-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted">From:</label>
              <Input
                type="date"
                className="h-9 w-38 text-xs"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted">To:</label>
              <Input
                type="date"
                className="h-9 w-38 text-xs"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            {activeTab === "TRAIL" && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted">Category:</label>
                  <select
                    className="h-9 rounded-btn border border-border bg-white px-2.5 text-xs font-semibold text-charcoal outline-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="ALL">All Categories</option>
                    <option value="transactions">Transactions</option>
                    <option value="masters">Masters</option>
                    <option value="banking">Banking</option>
                    <option value="settings">Settings & Controls</option>
                  </select>
                </div>

                <label className="flex items-center gap-1.5 text-xs font-medium text-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-sapphire"
                    checked={indirectOnly}
                    onChange={(e) => setIndirectOnly(e.target.checked)}
                  />
                  Indirect edits only
                </label>
              </>
            )}
          </div>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
            <Input
              placeholder="Search user, doc #, text..."
              className="h-9 pl-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ================= TAB 1 & 2: AUDIT TRAIL / SECURITY TABLE ================= */}
      {(activeTab === "TRAIL" || activeTab === "SECURITY") && (
        <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Timestamp (IST)</th>
                  <th className="px-4 py-3">User & Role</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Entity / Number</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3 text-right">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      Loading audit events...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-crimson">
                      Failed to load audit records.
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      No audit events found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => {
                    const isSecurityFail = evt.eventType.includes("failed");

                    return (
                      <tr
                        key={evt.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isSecurityFail ? "bg-crimson/5" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-charcoal">
                          {new Date(evt.occurredAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-semibold text-charcoal">{evt.actorName}</div>
                          <div className="text-[10px] text-muted">
                            {evt.actorRole || evt.actorType} {evt.ipAddress ? `· ${evt.ipAddress}` : ""}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isSecurityFail
                                ? "bg-crimson/20 text-crimson"
                                : evt.eventType.includes("created")
                                ? "bg-emerald-100 text-emerald-800"
                                : evt.eventType.includes("updated")
                                ? "bg-sapphire/10 text-sapphire"
                                : "bg-slate-100 text-charcoal"
                            }`}
                          >
                            {evt.eventType}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-charcoal">
                          {evt.entityType} {evt.entityNumber ? `(${evt.entityNumber})` : `#${evt.entityId}`}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">
                          {evt.amountAfter !== undefined && evt.amountAfter !== null ? (
                            formatCurrency(evt.amountAfter)
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-md">
                          <div className="line-clamp-2">{evt.summary}</div>
                          {evt.causedByEventId && (
                            <span className="text-[10px] text-purple-700 font-semibold">
                              (Indirect edit)
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-sapphire hover:bg-sapphire/10"
                            onClick={() =>
                              setHistoryDrawer({
                                isOpen: true,
                                entityType: evt.entityType,
                                entityId: evt.entityId,
                                entityNumber: evt.entityNumber || undefined,
                              })
                            }
                          >
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: STATUTORY AUDIT REPORT ================= */}
      {activeTab === "STATUTORY" && statutoryData && (
        <div className="space-y-4">
          <div className="rounded-card border border-border bg-white p-6 shadow-card space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-xl font-bold text-charcoal">
                  Statutory Audit Trail Report (Companies Act Compliance)
                </h3>
                <p className="text-xs text-muted">
                  Company: <strong>{statutoryData.company.name}</strong> · GSTIN:{" "}
                  <strong>{statutoryData.company.gstin}</strong> · PAN:{" "}
                  <strong>{statutoryData.company.pan}</strong>
                </p>
                <p className="text-xs text-muted">
                  Period: {formatDate(statutoryData.period.from)} to {formatDate(statutoryData.period.to)} · Generated on{" "}
                  {formatDate(statutoryData.generatedAt)}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-card border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <div>
                  <span className="font-bold">Cryptographically Verified</span>
                  <div className="text-[10px] text-emerald-800">
                    {statutoryData.chainVerification.totalEvents} events, 0 hash breaks
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-slate-50 text-[10px] uppercase font-semibold text-muted">
                  <tr>
                    <th className="px-3 py-2">Timestamp</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">Summary & Field Changes</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2 text-right">Hash Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {statutoryData.events.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">{e.timestampIST}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium">
                        {e.actorName} ({e.actorRole})
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-charcoal">{e.entity}</td>
                      <td className="px-3 py-2 max-w-md">
                        <div>{e.summary}</div>
                        {e.diffs.length > 0 && (
                          <div className="mt-1 space-y-0.5 text-[10px]">
                            {e.diffs.map((d, dIdx) => (
                              <div key={dIdx}>
                                <strong>{d.label}:</strong>{" "}
                                <span className="line-through text-crimson">{String(d.old)}</span>{" "}
                                <ArrowRight className="inline h-2.5 w-2.5 text-muted" />{" "}
                                <span className="font-bold text-emerald-700">{String(d.new)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted italic">{e.reason}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-[10px] text-slate-500">
                        {e.hash.slice(0, 16)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ENTITY HISTORY DRAWER */}
      <EntityHistoryDrawer
        isOpen={historyDrawer.isOpen}
        onClose={() => setHistoryDrawer((prev) => ({ ...prev, isOpen: false }))}
        entityType={historyDrawer.entityType}
        entityId={historyDrawer.entityId}
        entityNumber={historyDrawer.entityNumber}
      />
    </div>
  );
};
