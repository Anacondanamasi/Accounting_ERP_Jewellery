import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./Label";
import { ErrorMessage } from "./ErrorMessage";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
  options: { value: string | number; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, placeholder, error, required, containerClassName, className, options, ...props }, ref) => {
    const id = props.id || props.name;

    return (
      <div className={cn("flex flex-col space-y-1", containerClassName)}>
        {label && (
          <Label htmlFor={id} required={required}>
            {label}
          </Label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "h-10 w-full rounded border border-border bg-white px-3 text-sm transition-all duration-200 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-ruby focus:border-ruby focus:ring-ruby",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <ErrorMessage id={`${id}-error`} message={error} />}
      </div>
    );
  }
);

Select.displayName = "Select";
