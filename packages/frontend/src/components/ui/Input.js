import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./Label";
import { ErrorMessage } from "./ErrorMessage";
import { Eye, EyeOff } from "lucide-react";
export const Input = forwardRef(({ label, error, required, containerClassName, className, type, ...props }, ref) => {
    const id = props.id || props.name;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;
    return (_jsxs("div", { className: cn("flex flex-col space-y-1", containerClassName), children: [label && (_jsx(Label, { htmlFor: id, required: required, children: label })), _jsxs("div", { className: "relative flex items-center", children: [_jsx("input", { ref: ref, id: id, type: inputType, className: cn("h-10 w-full rounded border border-border px-3 text-sm transition-all duration-200 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-50", isPassword && "pr-10", error && "border-ruby focus:border-ruby focus:ring-ruby", className), "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined, ...props }), isPassword && (_jsx("button", { type: "button", tabIndex: -1, onClick: () => setShowPassword(!showPassword), className: "absolute right-3 text-muted hover:text-charcoal focus:outline-none transition-colors", children: showPassword ? (_jsx(EyeOff, { className: "h-4 w-4" })) : (_jsx(Eye, { className: "h-4 w-4" })) }))] }), error && _jsx(ErrorMessage, { id: `${id}-error`, message: error })] }));
});
Input.displayName = "Input";
