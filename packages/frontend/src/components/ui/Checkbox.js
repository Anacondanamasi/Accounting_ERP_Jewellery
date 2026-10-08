import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
export const Checkbox = forwardRef(({ label, containerClassName, className, ...props }, ref) => {
    const id = props.id || props.name;
    return (_jsxs("label", { className: cn("flex cursor-pointer items-center gap-2 text-sm text-muted", containerClassName), children: [_jsx("input", { ref: ref, id: id, type: "checkbox", className: cn("h-4 w-4 rounded border-border text-gold focus:ring-gold transition-colors duration-200", className), ...props }), label] }));
});
Checkbox.displayName = "Checkbox";
