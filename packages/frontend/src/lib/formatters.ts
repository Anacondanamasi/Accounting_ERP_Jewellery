import { format } from "date-fns";

const toFiniteNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const formatCurrency = (amount: number, currency = "INR"): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toFiniteNumber(amount));

export const formatWeight = (grams: number, unit: "g" | "tola" | "ct" = "g"): string => {
  const safeGrams = toFiniteNumber(grams);
  if (unit === "tola") {
    return `${(safeGrams / 11.664).toFixed(3)} tola`;
  }

  if (unit === "ct") {
    return `${safeGrams.toFixed(4)} ct`;
  }

  return `${safeGrams.toFixed(3)}g`;
};

export const formatDate = (
  value: string | Date | null | undefined,
  style: "display" | "input" = "display",
): string => {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    if (isNaN(date.getTime())) return String(value);
    return style === "display" ? format(date, "dd-MMM-yyyy") : format(date, "yyyy-MM-dd");
  } catch {
    return String(value);
  }
};

export const getStatusBadgeProps = (status: string): { label: string; className: string } => {
  const key = status.trim().toLowerCase();
  const map: Record<string, string> = {
    paid: "bg-emerald/10 text-emerald",
    active: "bg-emerald/10 text-emerald",
    posted: "bg-emerald/10 text-emerald",
    completed: "bg-emerald/10 text-emerald",
    overdue: "bg-ruby/10 text-ruby",
    void: "bg-ruby/10 text-ruby",
    draft: "bg-sapphire/10 text-sapphire",
    pending: "bg-sapphire/10 text-sapphire",
    partial: "bg-gold/10 text-gold",
    hold: "bg-gold/10 text-gold",
    approved: "bg-emerald/10 text-emerald",
    submitted: "bg-sapphire/10 text-sapphire",
  };
  return {
    label: status,
    className: map[key] ?? "bg-slate-100 text-slate-600",
  };
};
