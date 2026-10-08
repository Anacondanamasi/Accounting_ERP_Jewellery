import { jsx as _jsx } from "react/jsx-runtime";
import { getStatusBadgeProps } from "@/lib/formatters";
export const StatusBadge = ({ status }) => {
    const props = getStatusBadgeProps(status);
    return _jsx("span", { className: `rounded-full px-3 py-1 text-xs ${props.className}`, children: props.label });
};
