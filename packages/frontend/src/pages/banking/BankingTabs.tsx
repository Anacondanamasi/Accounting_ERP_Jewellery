import { Link, useLocation } from "react-router-dom";

const tabs = [
  { key: "overview", label: "Overview", path: "/banking" },
  { key: "transactions", label: "Transactions", path: "/banking/transactions" },
  { key: "rules", label: "Bank Rules", path: "/banking/rules" },
  { key: "import", label: "Bank Statements", path: "/banking/import" },
  { key: "reconcile", label: "Reconciliation", path: "/banking/reconcile" },
  { key: "cheques", label: "Cheques", path: "/banking/cheques" },
];

const isActivePath = (pathname: string, path: string) => {
  if (path === "/banking") {
    return pathname === "/banking";
  }
  return pathname.startsWith(path);
};

export const BankingTabs = () => {
  const location = useLocation();

  return (
    <div className="mb-4 rounded-card border border-border bg-card p-2 shadow-card">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = isActivePath(location.pathname, tab.path);
          return (
            <Link
              key={tab.key}
              className={`inline-flex h-9 items-center rounded-btn px-4 text-sm ${
                active ? "bg-sapphire text-white" : "border border-border bg-white text-charcoal hover:bg-gold-tint"
              }`}
              to={tab.path}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
