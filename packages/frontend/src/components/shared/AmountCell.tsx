import { formatCurrency } from "@/lib/formatters";

interface AmountCellProps {
  amount: number;
  currency?: string;
}

export const AmountCell = ({ amount, currency = "INR" }: AmountCellProps) => (
  <span className={`font-mono ${amount >= 0 ? "text-emerald" : "text-ruby"}`}>
    {formatCurrency(amount, currency)}
  </span>
);
