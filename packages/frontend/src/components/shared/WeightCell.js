import { jsx as _jsx } from "react/jsx-runtime";
import { formatWeight } from "@/lib/formatters";
export const WeightCell = ({ weight, unit }) => (_jsx("span", { className: "font-mono text-charcoal", children: formatWeight(weight, unit) }));
