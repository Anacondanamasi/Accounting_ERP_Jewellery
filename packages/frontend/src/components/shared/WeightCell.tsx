import { formatWeight } from "@/lib/formatters";

interface WeightCellProps {
  weight: number;
  unit: "g" | "tola" | "ct";
}

export const WeightCell = ({ weight, unit }: WeightCellProps) => (
  <span className="font-mono text-charcoal">{formatWeight(weight, unit)}</span>
);
