import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Receipt,
  ShoppingCart,
  Users,
  FileText,
  ClipboardList,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Tag,
} from "lucide-react";

interface QuickAction {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Invoice",
    path: "/invoices/new",
    icon: Receipt,
    description: "Bill a customer for goods or services",
    color: "#1e7b5e",
  },
  {
    label: "Bill",
    path: "/bills/new",
    icon: ShoppingCart,
    description: "Enter a bill from your supplier",
    color: "#c9922a",
  },
  {
    label: "Contact",
    path: "/customers/new",
    icon: Users,
    description: "Add a new customer or supplier",
    color: "#2563eb",
  },
  {
    label: "Quote",
    path: "/quotes/new",
    icon: FileText,
    description: "Create a price estimate for a customer",
    color: "#7c3aed",
  },
  {
    label: "Purchase Order",
    path: "/purchase-orders/new",
    icon: ClipboardList,
    description: "Order goods from your supplier",
    color: "#b45309",
  },
  {
    label: "Spend Money",
    path: "/banking/spend",
    icon: ArrowUpCircle,
    description: "Record a payment from your account",
    color: "#c0392b",
  },
  {
    label: "Receive Money",
    path: "/banking/receive",
    icon: ArrowDownCircle,
    description: "Record money received into your account",
    color: "#1e7b5e",
  },
  {
    label: "Transfer Money",
    path: "/banking/transfer",
    icon: ArrowLeftRight,
    description: "Move funds between bank accounts",
    color: "#0891b2",
  },
  {
    label: "New Product",
    path: "/products/new",
    icon: Tag,
    description: "Add a product or service item",
    color: "#6b7280",
  },
];

export const QuickCreateMenu = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  const handleItemClick = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* + Button */}
      <button
        id="quick-create-btn"
        type="button"
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
          open
            ? "bg-gold text-white shadow-lg shadow-gold/30 scale-110"
            : "bg-gold/10 text-gold hover:bg-gold hover:text-white hover:shadow-lg hover:shadow-gold/30 hover:scale-110"
        }`}
        title="Create New"
        aria-label="Create New Transaction"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Plus
          className={`h-5 w-5 transition-transform duration-300 ${open ? "rotate-45" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          id="quick-create-dropdown"
          className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right"
          style={{
            animation: "quickMenuIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Arrow */}
          <div
            className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-border bg-card"
            aria-hidden="true"
          />

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            {/* Header */}
            <div className="border-b border-border bg-charcoal px-4 py-3">
              <p className="text-[10px] font-bold tracking-[0.2em] text-gold uppercase">
                Create New
              </p>
            </div>

            {/* Items */}
            <div className="py-1">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.path}
                    type="button"
                    id={`quick-create-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-150 hover:bg-canvas"
                    onClick={() => handleItemClick(action.path)}
                  >
                    {/* Icon bubble */}
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110"
                      style={{ backgroundColor: `${action.color}18`, color: action.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-semibold text-charcoal transition-colors duration-150 group-hover:text-sapphire"
                        style={{ "--hover-color": action.color } as React.CSSProperties}
                      >
                        {action.label}
                      </p>
                      <p className="truncate text-[11px] text-muted">{action.description}</p>
                    </div>

                    {/* Arrow indicator */}
                    <div className="ml-auto text-muted opacity-0 transition-all duration-150 group-hover:translate-x-1 group-hover:opacity-100">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M3 7h8M7 3l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer shortcut hint */}
            <div className="border-t border-border bg-canvas/50 px-4 py-2">
              <p className="text-[10px] text-muted">
                Tip: Use{" "}
                <kbd className="rounded border border-border bg-white px-1 py-0.5 font-mono text-[10px]">
                  Cmd+K
                </kbd>{" "}
                to search and jump anywhere
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes quickMenuIn {
          from { opacity: 0; transform: scale(0.95) translateY(-6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
};
