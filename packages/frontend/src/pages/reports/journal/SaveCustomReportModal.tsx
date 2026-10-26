import React, { useState } from "react";
import { X, BookmarkPlus, FolderPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { journalReportService } from "@/services/journalReportService";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportDefinition: Record<string, any>;
  onSaved: () => void;
  folders: Array<{ id: number; name: string }>;
}

export const SaveCustomReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  reportDefinition,
  onSaved,
  folders,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<number | undefined>(undefined);
  const [visibility, setVisibility] = useState<"PRIVATE" | "SHARED" | "COMPANY">("PRIVATE");
  const [isDefault, setIsDefault] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const created = await journalReportService.createFolder(newFolderName.trim());
      setFolderId(created.id);
      setShowNewFolder(false);
      setNewFolderName("");
      toast.success("Report folder created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create folder");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Report name is required");
      return;
    }

    try {
      setIsSaving(true);
      await journalReportService.saveCustomReport({
        reportId: "transaction-journal",
        name: name.trim(),
        description: description.trim() || undefined,
        folderId: folderId || null,
        visibility,
        isDefault,
        definition: reportDefinition,
      });
      toast.success("Custom report saved successfully");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to save report");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-card bg-card shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border bg-canvas/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="h-5 w-5 text-gold" />
            <div>
              <h2 className="font-display text-lg font-bold text-charcoal">Save Custom Report</h2>
              <p className="text-xs text-muted">Save your filters, columns, and layout for reuse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-canvas transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-charcoal mb-1">
              Report Name <span className="text-ruby">*</span>
            </label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly GST Sales & Purchases Audit"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when and why to use this report..."
              className="w-full rounded-btn border border-border p-2 text-xs outline-none focus:border-gold"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-charcoal">Report Group / Folder</label>
              <button
                type="button"
                onClick={() => setShowNewFolder(!showNewFolder)}
                className="text-xs text-gold hover:underline flex items-center gap-1 font-semibold"
              >
                <FolderPlus className="h-3 w-3" />
                {showNewFolder ? "Cancel" : "New Folder"}
              </button>
            </div>

            {showNewFolder ? (
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="button" size="sm" onClick={handleCreateFolder}>
                  Create
                </Button>
              </div>
            ) : null}

            <select
              value={folderId || ""}
              onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-10 w-full rounded-btn border border-border bg-white px-3 text-xs outline-none focus:border-gold"
            >
              <option value="">(None - Unfiled)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal mb-1">Share With</label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: "PRIVATE", label: "Only Me" },
                { id: "SHARED", label: "My Role" },
                { id: "COMPANY", label: "Entire Company" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-center p-2 rounded-btn border cursor-pointer font-semibold ${
                    visibility === opt.id
                      ? "border-gold bg-gold-tint text-gold-dark"
                      : "border-border text-muted hover:bg-canvas"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === opt.id}
                    onChange={() => setVisibility(opt.id as any)}
                    className="hidden"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 pt-2 text-xs font-medium text-charcoal cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded text-gold focus:ring-gold"
            />
            <span>Set as my default view when opening the Transaction Journal</span>
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="bg-gold text-white hover:bg-gold/90 font-bold"
            >
              <Check className="h-4 w-4 mr-1.5" />
              {isSaving ? "Saving..." : "Save Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
