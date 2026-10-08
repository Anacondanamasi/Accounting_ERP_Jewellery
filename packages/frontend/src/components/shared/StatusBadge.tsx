import { getStatusBadgeProps } from "@/lib/formatters";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const props = getStatusBadgeProps(status);
  return <span className={`rounded-full px-3 py-1 text-xs ${props.className}`}>{props.label}</span>;
};
