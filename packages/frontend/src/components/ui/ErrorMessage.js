import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export const ErrorMessage = ({ message, className }) => {
    if (!message)
        return null;
    return (_jsx("p", { className: cn("mt-1 text-xs text-ruby animate-in fade-in slide-in-from-top-1 duration-200", className), role: "alert", children: message }));
};
