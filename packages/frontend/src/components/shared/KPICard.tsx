import type { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  subText?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon?: ReactNode;
}

export const KPICard = ({
  title,
  value,
  subText,
  trend,
  trendDirection = "neutral",
  icon,
}: KPICardProps) => {
  // Dynamically size text so large currency figures fit comfortably inside card boundaries
  const valueLength = value ? value.length : 0;
  const fontSizeClass =
    valueLength >= 14
      ? "text-base sm:text-lg xl:text-lg 2xl:text-xl"
      : valueLength >= 11
        ? "text-lg sm:text-xl xl:text-xl 2xl:text-2xl"
        : valueLength >= 8
          ? "text-xl sm:text-2xl xl:text-2xl 2xl:text-3xl"
          : "text-2xl sm:text-3xl xl:text-3xl 2xl:text-4xl";

  return (
    <div className="rounded-card border-t-2 border-t-gold-light bg-card p-4 sm:p-5 shadow-card overflow-hidden flex flex-col justify-between">
      <div className="mb-2 flex items-center justify-between gap-1">
        <p className="text-xs sm:text-sm font-medium text-muted truncate" title={title}>
          {title}
        </p>
        {icon && <div className="shrink-0">{icon}</div>}
      </div>

      <div
        className={`font-mono font-bold text-gold tracking-tight truncate ${fontSizeClass}`}
        title={value}
      >
        {value}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs truncate min-h-[1.25rem]">
        {trend ? (
          <span
            className={`font-semibold shrink-0 ${
              trendDirection === "up"
                ? "text-emerald-600"
                : trendDirection === "down"
                  ? "text-ruby"
                  : "text-muted"
            }`}
          >
            {trend}
          </span>
        ) : null}
        {subText ? <span className="text-muted truncate">{subText}</span> : null}
      </div>
    </div>
  );
};
