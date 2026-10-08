import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
export const SearchableSelect = ({ options, value, onChange, placeholder = "Select", loadOptions, error, onAddNew, addNewLabel, }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [asyncOptions, setAsyncOptions] = useState([]);
    const rootRef = useRef(null);
    useEffect(() => {
        const onClick = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        window.addEventListener("mousedown", onClick);
        return () => window.removeEventListener("mousedown", onClick);
    }, []);
    useEffect(() => {
        if (!loadOptions || !open) {
            return;
        }
        const timer = window.setTimeout(async () => {
            try {
                const results = await loadOptions(query);
                setAsyncOptions(results);
            }
            catch (err) {
                console.error("Failed to load options:", err);
            }
        }, 350);
        return () => window.clearTimeout(timer);
    }, [loadOptions, query, open]);
    const mergedOptions = useMemo(() => (loadOptions ? asyncOptions : options.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))), [asyncOptions, loadOptions, options, query]);
    const selectedLabel = useMemo(() => {
        const allOptions = [...options, ...asyncOptions];
        return allOptions.find((option) => String(option.value) === String(value))?.label;
    }, [options, asyncOptions, value]);
    return (_jsxs("div", { className: "relative", ref: rootRef, children: [_jsxs("button", { className: cn("flex h-10 w-full items-center justify-between rounded border border-border bg-white px-3 text-sm transition-all duration-200 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold", error && "border-ruby focus:border-ruby focus:ring-ruby", open && "border-gold ring-1 ring-gold"), onClick: () => setOpen((prev) => !prev), type: "button", "aria-haspopup": "listbox", "aria-expanded": open, "aria-invalid": !!error, children: [_jsx("span", { className: cn("truncate", !selectedLabel && "text-muted"), children: selectedLabel ?? placeholder }), _jsx(ChevronDown, { className: cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180") })] }), open ? (_jsxs("div", { className: "absolute z-50 mt-1 w-full min-w-[260px] rounded border border-border bg-white shadow-card animate-in fade-in zoom-in-95 duration-100", children: [_jsx("input", { className: "w-full border-b border-border px-3 py-2 text-sm outline-none focus:bg-canvas", onChange: (event) => setQuery(event.target.value), placeholder: "Type to search...", value: query, autoFocus: true }), _jsxs("div", { className: "max-h-56 overflow-auto p-1", role: "listbox", children: [mergedOptions.length === 0 ? (_jsx("div", { className: "p-4 text-center text-xs text-muted italic", children: "No results found" })) : (mergedOptions.map((option) => (_jsxs("button", { className: cn("flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors hover:bg-gold-tint", String(option.value) === String(value) && "bg-gold-tint font-medium text-gold"), onClick: () => {
                                    onChange(option.value, option);
                                    setOpen(false);
                                }, type: "button", role: "option", "aria-selected": String(option.value) === String(value), children: [_jsx("span", { className: "truncate", children: option.label }), option.meta ? _jsx("span", { className: "ml-2 text-[10px] text-muted-foreground bg-canvas px-1.5 py-0.5 rounded", children: option.meta }) : null] }, String(option.value))))), onAddNew && (_jsx("div", { className: "border-t border-border mt-1 pt-1", children: _jsxs("button", { type: "button", className: "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-sapphire hover:bg-sapphire/5 font-medium transition-colors", onClick: () => {
                                        onAddNew(query);
                                        setOpen(false);
                                    }, children: [_jsx("span", { className: "text-lg leading-none", children: "+" }), addNewLabel || "Add new", " ", query ? `"${query}"` : ""] }) }))] })] })) : null] }));
};
