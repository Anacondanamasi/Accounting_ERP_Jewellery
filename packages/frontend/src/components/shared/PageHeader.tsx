import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "./Tooltip";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
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
          {shouldShowBack && (
            <Tooltip content="Back (Alt + ←)" position="bottom">
              <button
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-charcoal transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-gold"
                aria-label="Go back"
                type="button"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Tooltip>
          )}
          <div>
            <h1 className="font-display text-[28px] font-bold text-charcoal">{title}</h1>
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
};
