import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export const Label = ({ children, required, className, ...props }) => {
    return (_jsxs("label", { className: cn("mb-1 block text-xs font-medium text-muted", className), ...props, children: [children, required && _jsx("span", { className: "ml-1 text-ruby font-bold", children: "*" })] }));
};
