import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = ({
  children,
  loading,
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}: ButtonProps) => {
  const variants = {
    primary: "bg-gold text-white hover:bg-gold/90 focus:ring-gold",
    secondary: "bg-charcoal text-white hover:bg-charcoal/90 focus:ring-charcoal",
    outline: "border border-border bg-transparent text-charcoal hover:bg-canvas focus:ring-border",
    ghost: "bg-transparent text-charcoal hover:bg-canvas focus:ring-canvas",
    danger: "bg-ruby text-white hover:bg-ruby/90 focus:ring-ruby",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-btn font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};
