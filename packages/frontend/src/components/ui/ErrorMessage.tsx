import React from "react";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  message?: string;
  className?: string;
}

export const ErrorMessage = ({ message, className }: ErrorMessageProps) => {
  if (!message) return null;

  return (
    <p className={cn("mt-1 text-xs text-ruby animate-in fade-in slide-in-from-top-1 duration-200", className)} role="alert">
      {message}
    </p>
  );
};
