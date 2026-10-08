import { jsx as _jsx } from "react/jsx-runtime";
import { formatCurrency } from "@/lib/formatters";
export const AmountCell = ({ amount, currency = "INR" }) => (_jsx("span", { className: `font-mono ${amount >= 0 ? "text-emerald" : "text-ruby"}`, children: formatCurrency(amount, currency) }));
