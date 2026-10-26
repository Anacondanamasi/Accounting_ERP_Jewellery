import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  History,
  ArrowRight,
  ShieldCheck,
  Undo2,
  FileText,
  Clock,
  User,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/formatters";
import { auditService, type AuditEventRow, type FieldDiff } from "@/services/auditService";

interface EntityHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string | number;
  entityNumber?: string;
  onOpenJournalAtRevision?: (revision: number) => void;
}

export const EntityHistoryDrawer = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityNumber,
  onOpenJournalAtRevision,
}: EntityHistoryDrawerProps) => {
  const queryClient = useQueryClient();
  const [restoreReason, setRestoreReason] = useState("");
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["entity-audit-history", entityType, entityId],
    queryFn: () => auditService.getEntityHistory(entityType, entityId),
    enabled: isOpen && Boolean(entityId),
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: () => auditService.restoreEntity(entityType, entityId, restoreReason),
    onSuccess: () => {
      toast.success(`${entityType} restored successfully`);
      setShowRestorePrompt(false);
      void refetch();
      void queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to restore record");
    },
  });

  // Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDeletedOrVoid = data.some((e) =>
    e.eventType.endsWith(".deleted") || e.eventType.endsWith(".voided")
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-xl bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* DRAWER HEADER */}
          <div className="flex items-center justify-between border-b border-border bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-sapphire/10 p-2 text-sapphire">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-charcoal">Audit History</h3>
                <p className="text-xs text-muted">
                  {entityType} {entityNumber || `#${entityId}`} · Tamper-evident revision timeline
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-btn p-1.5 text-muted hover:bg-slate-200 hover:text-charcoal transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* DRAWER BODY */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted">Loading audit timeline...</div>
            ) : isError ? (
              <div className="rounded-card border border-crimson/20 bg-crimson/5 p-4 text-center text-sm text-crimson">
                Unable to load entity history.
              </div>
            ) : data.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                No historical revisions recorded for this entity.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                {data.map((evt, idx) => {
                  const revNum = evt.revisionAfter || data.length - idx;
                  const isVoidOrDelete = evt.eventType.includes("deleted") || evt.eventType.includes("voided");

                  return (
                    <div key={evt.id} className="relative pl-6">
                      {/* Timeline dot */}
                      <span
                        className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-xs ${
                          idx === 0
                            ? isVoidOrDelete
                              ? "bg-crimson"
                              : "bg-sapphire"
                            : "bg-slate-300"
                        }`}
                      />

                      {/* Event Card */}
                      <div className="rounded-card border border-border bg-white p-4 shadow-xs space-y-3">
                        {/* Event Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-charcoal">
                                Rev {revNum}
                              </span>
                              <span className="font-semibold text-xs text-charcoal">
                                {evt.summary}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <User className="h-3 w-3" />
                                {evt.actorName} {evt.actorRole ? `(${evt.actorRole})` : ""}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(evt.occurredAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                              </span>
                              <span>·</span>
                              <span className="font-mono text-[10px] text-muted">
                                {evt.source}
                              </span>
                            </div>
                          </div>

                          {onOpenJournalAtRevision && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-sapphire hover:bg-sapphire/10 text-xs h-7 px-2"
                              onClick={() => {
                                onClose();
                                onOpenJournalAtRevision(revNum);
                              }}
                            >
                              <FileText className="mr-1 h-3 w-3" />
                              Journal
                            </Button>
                          )}
                        </div>

                        {/* REASON / CAUSE TAGS */}
                        {(evt.reason || evt.causedByEventId) && (
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {evt.reason && (
                              <span className="rounded-sm bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-800">
                                <strong>Reason:</strong> {evt.reason}
                              </span>
                            )}
                            {evt.causedByEventId && (
                              <span className="rounded-sm bg-purple-50 border border-purple-200 px-2 py-0.5 text-purple-800">
                                Indirect Edit (Triggered by Event #{evt.causedByEventId.slice(0, 8)})
                              </span>
                            )}
                          </div>
                        )}

                        {/* FIELD DIFFS TABLE */}
                        {evt.diffs && evt.diffs.length > 0 && (
                          <div className="overflow-hidden rounded-md border border-border bg-slate-50 text-xs">
                            <table className="w-full text-left">
                              <thead className="border-b border-border text-[10px] uppercase font-semibold text-muted bg-slate-100">
                                <tr>
                                  <th className="px-2.5 py-1.5">Field</th>
                                  <th className="px-2.5 py-1.5">Previous Value</th>
                                  <th className="px-2.5 py-1.5">New Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {evt.diffs.map((d, dIdx) => (
                                  <tr key={dIdx} className="hover:bg-white/60">
                                    <td className="px-2.5 py-1.5 font-medium text-charcoal">
                                      {d.label}
                                    </td>
                                    <td className="px-2.5 py-1.5 font-mono text-crimson line-through">
                                      {typeof d.old === "object" ? JSON.stringify(d.old) : String(d.old ?? "—")}
                                    </td>
                                    <td className="px-2.5 py-1.5 font-mono font-semibold text-emerald-700">
                                      {typeof d.new === "object" ? JSON.stringify(d.new) : String(d.new ?? "—")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* CRYPTOGRAPHIC HASH FOOTPRINT */}
                        <div className="flex items-center justify-between text-[10px] text-muted font-mono pt-1">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <ShieldCheck className="h-3 w-3" />
                            Tamper-Evident SHA-256
                          </span>
                          <span title={evt.hash}>{evt.hash.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DRAWER FOOTER (RESTORE PROMPT IF VOIDED) */}
          <div className="border-t border-border bg-slate-50 p-4">
            {isDeletedOrVoid && !showRestorePrompt && (
              <Button
                variant="outline"
                className="w-full border-amber-300 text-amber-900 hover:bg-amber-50"
                onClick={() => setShowRestorePrompt(true)}
              >
                <Undo2 className="mr-2 h-4 w-4 text-amber-600" />
                Restore This Record
              </Button>
            )}

            {showRestorePrompt && (
              <div className="space-y-3 rounded-card border border-amber-200 bg-amber-50 p-3 text-xs">
                <strong className="text-amber-900">Restore Record Confirmation</strong>
                <p className="text-amber-800">
                  Restoring will re-create this transaction in the active ledger through the standard save pipeline.
                  This action is itself permanently recorded in the audit trail.
                </p>
                <input
                  type="text"
                  placeholder="Reason for restoration (optional)..."
                  className="w-full rounded-input border border-border bg-white px-2.5 py-1.5 text-xs text-charcoal outline-none"
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowRestorePrompt(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 text-white hover:bg-amber-700"
                    disabled={restoreMutation.isPending}
                    onClick={() => restoreMutation.mutate()}
                  >
                    {restoreMutation.isPending ? "Restoring..." : "Confirm Restore"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
