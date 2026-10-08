import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, containerClassName, className, ...props }, ref) => {
    const id = props.id || props.name;

    return (
      <label className={cn("flex cursor-pointer items-center gap-2 text-sm text-muted", containerClassName)}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className={cn(
            "h-4 w-4 rounded border-border text-gold focus:ring-gold transition-colors duration-200",
            className
          )}
          {...props}
        />
        {label}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
