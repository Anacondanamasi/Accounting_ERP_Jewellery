import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./Label";
import { ErrorMessage } from "./ErrorMessage";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, required, containerClassName, className, ...props }, ref) => {
    const id = props.id || props.name;

    return (
      <div className={cn("flex flex-col space-y-1", containerClassName)}>
        {label && (
          <Label htmlFor={id} required={required}>
            {label}
          </Label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "min-h-20 w-full rounded border border-border px-3 py-2 text-sm transition-all duration-200 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-ruby focus:border-ruby focus:ring-ruby",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && <ErrorMessage id={`${id}-error`} message={error} />}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
