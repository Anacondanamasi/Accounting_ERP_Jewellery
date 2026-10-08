import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
const getShortcutForElement = (el) => {
    if (el.matches('button[type="submit"]'))
        return "Save (Ctrl+S) / Submit (Ctrl+Enter)";
    if (el.matches('a[href$="/new"], button[title*="New"], button[aria-label*="New"], a[title*="New"]'))
        return "New Record (Ctrl+N)";
    if (el.matches('a[href$="/edit"], button[title*="Edit"], button[aria-label*="Edit"]'))
        return "Edit (Ctrl+E)";
    if (el.matches('button[title*="Delete"], button[aria-label*="Delete"], button[title*="Void"], button[aria-label*="Void"]'))
        return "Delete (Ctrl+Del)";
    if (el.matches('button[title*="Export"], button[aria-label*="Export"]'))
        return "Export (Ctrl+Shift+E)";
    if (el.matches('button[title*="Print"], button[aria-label*="Print"]'))
        return "Print (Ctrl+P)";
    if (el.matches('button[aria-label="Go back"]'))
        return "Back (Alt+←)";
    return null;
};
export const GlobalTooltip = () => {
    const [visible, setVisible] = useState(false);
    const [content, setContent] = useState("");
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const hoverTimer = useRef(null);
    useEffect(() => {
        const handleMouseOver = (e) => {
            const target = e.target;
            // Traverse up to find a matching button/link
            const el = target.closest("button, a");
            if (!el)
                return;
            const shortcut = getShortcutForElement(el);
            if (shortcut) {
                if (el.hasAttribute("title")) {
                    el.setAttribute("data-original-title", el.getAttribute("title") || "");
                    el.removeAttribute("title");
                }
                if (hoverTimer.current)
                    clearTimeout(hoverTimer.current);
                hoverTimer.current = setTimeout(() => {
                    const rect = el.getBoundingClientRect();
                    setContent(shortcut);
                    setCoords({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                    });
                    setVisible(true);
                }, 300); // 300ms delay to prevent flashing
            }
        };
        const handleMouseOut = (e) => {
            if (hoverTimer.current)
                clearTimeout(hoverTimer.current);
            setVisible(false);
            const target = e.target;
            const el = target.closest("button, a");
            if (el && el.hasAttribute("data-original-title")) {
                el.setAttribute("title", el.getAttribute("data-original-title") || "");
                el.removeAttribute("data-original-title");
            }
        };
        const handleClick = () => {
            setVisible(false);
        };
        document.addEventListener("mouseover", handleMouseOver);
        document.addEventListener("mouseout", handleMouseOut);
        document.addEventListener("click", handleClick);
        return () => {
            document.removeEventListener("mouseover", handleMouseOver);
            document.removeEventListener("mouseout", handleMouseOut);
            document.removeEventListener("click", handleClick);
        };
    }, []);
    if (!visible || !content)
        return null;
    return (_jsxs("div", { className: "pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg animate-in fade-in zoom-in-95 duration-200", style: { left: coords.x, top: coords.y }, children: [content, _jsx("div", { className: "absolute bottom-[-4px] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800" })] }));
};
