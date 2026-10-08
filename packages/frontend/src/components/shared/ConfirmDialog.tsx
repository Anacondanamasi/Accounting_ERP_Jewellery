import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  variant = "info",
  onConfirm,
  onClose,
}: ConfirmDialogProps) => {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-charcoal/50 p-4"
      onClick={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-card bg-card p-6 shadow-modal">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle
            className={`h-5 w-5 ${
              variant === "danger" ? "text-ruby" : variant === "warning" ? "text-gold" : "text-sapphire"
            }`}
          />
          <h3 className="font-display text-xl font-semibold text-charcoal">{title}</h3>
        </div>
        <p className="mb-5 text-sm text-muted">{description}</p>
        <div className="flex justify-end gap-2">
          <button className="h-10 rounded-btn border border-border px-4 text-sm" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={`h-10 rounded-btn px-4 text-sm text-white ${
              variant === "danger" ? "bg-ruby" : variant === "warning" ? "bg-gold" : "bg-sapphire"
            }`}
            onClick={onConfirm}
            type="button"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
