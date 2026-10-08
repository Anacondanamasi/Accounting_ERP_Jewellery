import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
export const ConfirmDialog = ({ open, title, description, variant = "info", onConfirm, onClose, }) => {
    useEffect(() => {
        if (!open) {
            return;
        }
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);
    if (!open) {
        return null;
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-charcoal/50 p-4", onClick: (event) => {
            if (event.currentTarget === event.target) {
                onClose();
            }
        }, children: _jsxs("div", { className: "w-full max-w-md rounded-card bg-card p-6 shadow-modal", children: [_jsxs("div", { className: "mb-3 flex items-center gap-2", children: [_jsx(AlertTriangle, { className: `h-5 w-5 ${variant === "danger" ? "text-ruby" : variant === "warning" ? "text-gold" : "text-sapphire"}` }), _jsx("h3", { className: "font-display text-xl font-semibold text-charcoal", children: title })] }), _jsx("p", { className: "mb-5 text-sm text-muted", children: description }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { className: "h-10 rounded-btn border border-border px-4 text-sm", onClick: onClose, type: "button", children: "Cancel" }), _jsx("button", { className: `h-10 rounded-btn px-4 text-sm text-white ${variant === "danger" ? "bg-ruby" : variant === "warning" ? "bg-gold" : "bg-sapphire"}`, onClick: onConfirm, type: "button", children: "Confirm" })] })] }) }));
};
