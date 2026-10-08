import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => (
  <div className="rounded-card border border-dashed border-border bg-card p-8 text-center">
    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gold-tint">
      <Icon className="h-5 w-5 text-gold" />
    </div>
    <div className="mb-1 font-display text-xl font-semibold text-charcoal">{title}</div>
    <p className="mb-4 text-sm text-muted">{description}</p>
    {actionLabel && onAction ? (
      <button
        className="h-10 rounded-btn bg-gold px-4 text-sm font-medium text-white hover:bg-gold/90"
        onClick={onAction}
        type="button"
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
);
