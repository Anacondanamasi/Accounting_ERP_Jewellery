import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "./Tooltip";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumbItems?: string[];
  showBack?: boolean;
}

export const PageHeader = ({ title, subtitle, actions, breadcrumbItems, showBack }: PageHeaderProps) => {
  const navigate = useNavigate();
  const location = window.location;
  const shouldShowBack = showBack !== undefined ? showBack : location.pathname !== "/";

  return (
    <div className="mb-6">
      {breadcrumbItems?.length ? (
        <div className="mb-1 text-xs text-muted">{breadcrumbItems.join(" / ")}</div>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {shouldShowBack ? (
            <Tooltip content="Back (Alt+Left)">
              <button
                className="rounded p-1 text-muted transition hover:bg-slate-100 hover:text-charcoal"
                onClick={() => navigate(-1)}
                type="button"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Tooltip>
          ) : null}
          <div>
            <h1 className="font-display text-2xl font-bold text-charcoal">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
};
