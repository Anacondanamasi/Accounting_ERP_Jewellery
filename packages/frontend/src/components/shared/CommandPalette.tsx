import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "@/lib/nav";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette = ({ open, onClose }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const flatResults = useMemo(
    () =>
      NAV_ITEMS.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          group: group.group,
        })),
      ).filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter" && flatResults[index]) {
        event.preventDefault();
        const path = flatResults[index].path;
        const recent = JSON.parse(localStorage.getItem("jl_recent_searches") ?? "[]") as string[];
        localStorage.setItem(
          "jl_recent_searches",
          JSON.stringify([path, ...recent.filter((x) => x !== path)].slice(0, 8)),
        );
        navigate(path);
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flatResults, index, navigate, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-charcoal/70 p-6 pt-20"
      onClick={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-card bg-card shadow-modal">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            autoFocus
            className="w-full bg-transparent text-sm outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search invoices, customers, items, suppliers, accounts..."
            value={query}
          />
          <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">ESC</span>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-2">
          {flatResults.map((item, rowIndex) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left ${
                  rowIndex === index ? "bg-gold-tint text-charcoal" : "hover:bg-slate-50"
                }`}
                onMouseEnter={() => setIndex(rowIndex)}
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                type="button"
              >
                <Icon className="h-4 w-4 text-gold" />
                <div className="text-sm">{item.label}</div>
                <div className="ml-auto rounded bg-slate-100 px-2 py-[2px] font-mono text-[10px] text-slate-500">
                  {item.group}
                </div>
              </button>
            );
          })}
          {flatResults.length === 0 && (
            <div className="p-6 text-center text-sm text-muted">No results found</div>
          )}
        </div>
      </div>
    </div>
  );
};
