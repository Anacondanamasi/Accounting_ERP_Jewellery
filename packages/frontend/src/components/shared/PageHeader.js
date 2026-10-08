import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "./Tooltip";
export const PageHeader = ({ title, subtitle, actions, breadcrumbItems, showBack }) => {
    const navigate = useNavigate();
    const location = window.location;
    const shouldShowBack = showBack !== undefined ? showBack : location.pathname !== "/";
    return (_jsxs("div", { className: "mb-6", children: [breadcrumbItems?.length ? (_jsx("div", { className: "mb-1 text-xs text-muted", children: breadcrumbItems.join(" / ") })) : null, _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [shouldShowBack && (_jsx(Tooltip, { content: "Back (Alt + \u2190)", position: "bottom", children: _jsx("button", { onClick: () => navigate(-1), className: "flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-charcoal transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-gold", "aria-label": "Go back", type: "button", children: _jsx(ArrowLeft, { className: "h-5 w-5" }) }) })), _jsxs("div", { children: [_jsx("h1", { className: "font-display text-[28px] font-bold text-charcoal", children: title }), subtitle ? _jsx("p", { className: "text-sm text-muted", children: subtitle }) : null] })] }), actions ? _jsx("div", { className: "flex items-center gap-2", children: actions }) : null] })] }));
};
