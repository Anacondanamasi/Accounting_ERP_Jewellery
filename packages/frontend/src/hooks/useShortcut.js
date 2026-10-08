import { useEffect } from "react";
export const useShortcut = (combo, callback, options = {}) => {
    useEffect(() => {
        if (options.enabled === false)
            return;
        const handler = (e) => {
            // Ignore if typing in an input/textarea unless specifically requested
            if (options.ignoreInInputs !== false) {
                const target = e.target;
                if (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT" ||
                    target.isContentEditable) {
                    // Allow ESC in inputs (often used to clear or exit)
                    if (e.key !== "Escape") {
                        return;
                    }
                }
            }
            const matchKey = e.key.toLowerCase() === combo.key.toLowerCase();
            const matchCtrl = !!combo.ctrlKey === (e.ctrlKey || e.metaKey);
            const matchShift = !!combo.shiftKey === e.shiftKey;
            const matchAlt = !!combo.altKey === e.altKey;
            if (matchKey && matchCtrl && matchShift && matchAlt) {
                if (options.preventDefault !== false) {
                    e.preventDefault();
                }
                callback(e);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [combo.key, combo.ctrlKey, combo.shiftKey, combo.altKey, callback, options]);
};
