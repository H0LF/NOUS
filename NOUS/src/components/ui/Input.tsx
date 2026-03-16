import React, { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-nous-secondary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2.5 bg-nous-surface border border-nous-border rounded-xl text-nous-primary placeholder-nous-secondary/50 focus:border-nous-accent focus:ring-2 focus:ring-nous-accent/20 outline-none transition-all duration-200 ${
            error ? "border-nous-error focus:border-nous-error focus:ring-nous-error/20" : ""
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-nous-error animate-fadeIn">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
