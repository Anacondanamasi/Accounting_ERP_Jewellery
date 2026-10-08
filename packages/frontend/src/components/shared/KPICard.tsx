import type { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  subText?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon?: ReactNode;
}

export const KPICard = ({ title, value, subText, trend, trendDirection = "neutral", icon }: KPICardProps) => (
  <div className="rounded-card border-t-2 border-t-gold-light bg-card p-6 shadow-card">
    <div className="mb-3 flex items-center justify-between">
      <p className="text-sm text-muted">{title}</p>
      {icon}
    </div>
    <div className="font-mono text-[36px] font-bold text-gold">{value}</div>
    <div className="mt-2 flex items-center gap-2 text-xs">
      {trend ? (
        <span className={trendDirection === "up" ? "text-emerald" : trendDirection === "down" ? "text-ruby" : "text-muted"}>
          {trend}
        </span>
      ) : null}
      {subText ? <span className="text-muted">{subText}</span> : null}
    </div>
  </div>
);
