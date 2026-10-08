import React from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = ({ children, required, className, ...props }: LabelProps) => {
  return (
    <label
      className={cn("mb-1 block text-xs font-medium text-muted", className)}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-ruby font-bold">*</span>}
    </label>
  );
};
