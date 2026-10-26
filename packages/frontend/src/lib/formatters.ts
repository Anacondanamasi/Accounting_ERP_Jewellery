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

export const numberToWordsIndian = (num: number): string => {
  const safeNum = toFiniteNumber(num);
  if (safeNum === 0) return "Zero Rupees Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatLessThanThousand = (n: number): string => {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : " ");
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const rounded = Math.round(safeNum * 100) / 100;
  const intPart = Math.floor(Math.abs(rounded));
  const paisePart = Math.round((Math.abs(rounded) - intPart) * 100);

  let result = "";
  let rem = intPart;

  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundreds = rem;

  if (crore > 0) result += formatLessThanThousand(crore) + "Crore ";
  if (lakh > 0) result += formatLessThanThousand(lakh) + "Lakh ";
  if (thousand > 0) result += formatLessThanThousand(thousand) + "Thousand ";
  if (hundreds > 0) result += formatLessThanThousand(hundreds);

  result = result.trim();
  if (!result) result = "Zero";

  let out = "INR " + result + " Rupees";
  if (paisePart > 0) {
    out += " and " + formatLessThanThousand(paisePart).trim() + " Paise";
  }
  out += " Only";
  return out;
};
