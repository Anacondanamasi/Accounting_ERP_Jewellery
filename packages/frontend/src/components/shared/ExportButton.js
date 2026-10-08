import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Download } from "lucide-react";
import { useState } from "react";
export const ExportButton = ({ onExportPDF, onExportExcel, onExportCSV }) => {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { className: "flex h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm", onClick: () => setOpen((prev) => !prev), type: "button", children: [_jsx(Download, { className: "h-4 w-4" }), "Export"] }), open ? (_jsxs("div", { className: "absolute right-0 z-20 mt-1 w-40 rounded border border-border bg-white py-1 shadow-card", children: [_jsx("button", { className: "block w-full px-3 py-2 text-left text-sm hover:bg-gold-tint", onClick: onExportPDF, type: "button", children: "Export PDF" }), _jsx("button", { className: "block w-full px-3 py-2 text-left text-sm hover:bg-gold-tint", onClick: onExportExcel, type: "button", children: "Export Excel" }), _jsx("button", { className: "block w-full px-3 py-2 text-left text-sm hover:bg-gold-tint", onClick: onExportCSV, type: "button", children: "Export CSV" })] })) : null] }));
};
