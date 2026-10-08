import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./Label";
import { ErrorMessage } from "./ErrorMessage";
export const TextArea = forwardRef(({ label, error, required, containerClassName, className, ...props }, ref) => {
    const id = props.id || props.name;
    return (_jsxs("div", { className: cn("flex flex-col space-y-1", containerClassName), children: [label && (_jsx(Label, { htmlFor: id, required: required, children: label })), _jsx("textarea", { ref: ref, id: id, className: cn("min-h-20 w-full rounded border border-border px-3 py-2 text-sm transition-all duration-200 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-50", error && "border-ruby focus:border-ruby focus:ring-ruby", className), "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined, ...props }), error && _jsx(ErrorMessage, { id: `${id}-error`, message: error })] }));
});
TextArea.displayName = "TextArea";
