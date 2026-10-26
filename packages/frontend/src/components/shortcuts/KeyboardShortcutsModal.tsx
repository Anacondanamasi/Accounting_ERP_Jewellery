import { useState, useMemo } from "react";
import { Search, X, Command, Sparkles, Check, Keyboard } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { SHORTCUT_REGISTRY, type ShortcutItem } from "@/shortcuts/shortcutRegistry";

export const KeyboardShortcutsModal = () => {
  const open = useAppStore((state) => state.shortcutsHelpOpen);
  const setOpen = useAppStore((state) => state.setShortcutsHelpOpen);
  const tallyMode = useAppStore((state) => state.tallyMode);
  const setTallyMode = useAppStore((state) => state.setTallyMode);

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const cats = Array.from(new Set(SHORTCUT_REGISTRY.map((s) => s.category)));
    return ["All", ...cats];
  }, []);

  const filtered = useMemo(() => {
    return SHORTCUT_REGISTRY.filter((item) => {
      if (selectedCategory !== "All" && item.category !== selectedCategory) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keys.join(" ").toLowerCase().includes(q)
      );
    });
  }, [query, selectedCategory]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-canvas/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-charcoal">
                Keyboard Shortcuts & Commands
              </h2>
              <p className="text-xs text-muted">
                Navigate, create vouchers and enter transactions like lightning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Tally Mode Switch */}
            <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-border bg-white px-3 py-1.5 shadow-sm hover:border-gold/50 transition-colors">
              <input
                type="checkbox"
                checked={tallyMode}
                onChange={(e) => setTallyMode(e.target.checked)}
                className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
              />
              <span className="text-xs font-medium text-charcoal">
                Tally F-Keys (F4-F9)
              </span>
              {tallyMode && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  ON
                </span>
              )}
            </label>

            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-charcoal transition-colors"
              title="Close (Esc)"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <div className="border-b border-border bg-card px-6 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter shortcuts (e.g., invoice, enter, F8, save)..."
              className="h-9 w-full rounded-lg border border-border bg-canvas/40 pl-9 pr-4 text-xs text-charcoal placeholder:text-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                type="button"
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-gold text-white shadow-sm"
                    : "bg-slate-100 text-muted hover:bg-slate-200 hover:text-charcoal"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List of Shortcuts */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              No shortcuts found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-3 hover:border-gold/40 hover:bg-gold-tint/5 transition-all shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-charcoal truncate">
                        {item.label}
                      </span>
                      {item.isTally && (
                        <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800">
                          Tally
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted line-clamp-1">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.keys.map((k, idx) => (
                      <span key={idx}>
                        {k === "then" || k === "or" ? (
                          <span className="mx-0.5 text-[10px] text-muted font-medium">
                            {k}
                          </span>
                        ) : (
                          <kbd className="min-w-[20px] inline-flex items-center justify-center rounded border border-border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-charcoal shadow-inner">
                            {k}
                          </kbd>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-canvas/30 px-6 py-3 text-[11px] text-muted">
          <span>
            Tip: Press <kbd className="rounded border bg-white px-1 font-mono text-[10px]">?</kbd> anytime to open this sheet.
          </span>
          <button
            onClick={() => setOpen(false)}
            className="rounded bg-slate-200 px-3 py-1 font-medium text-charcoal hover:bg-slate-300 transition-colors"
            type="button"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
