import { format } from "date-fns";
const toFiniteNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
};
export const formatCurrency = (amount, currency = "INR") => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(toFiniteNumber(amount));
export const formatWeight = (grams, unit = "g") => {
    const safeGrams = toFiniteNumber(grams);
    if (unit === "tola") {
        return `${(safeGrams / 11.664).toFixed(3)} tola`;
    }
    if (unit === "ct") {
        return `${safeGrams.toFixed(4)} ct`;
    }
    return `${safeGrams.toFixed(3)}g`;
};
export const formatDate = (value, style = "display") => {
    const date = typeof value === "string" ? new Date(value) : value;
    return style === "display" ? format(date, "dd-MMM-yyyy") : format(date, "yyyy-MM-dd");
};
export const getStatusBadgeProps = (status) => {
    const key = status.trim().toLowerCase();
    const map = {
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
