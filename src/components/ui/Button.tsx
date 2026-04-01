import React, { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nous-accent/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const variants = {
    primary:   "bg-nous-accent text-nous-bg hover:brightness-110 border border-transparent",
    secondary: "bg-transparent border border-nous-accent text-nous-accent hover:bg-nous-accent/10",
    ghost:     "bg-transparent text-nous-secondary hover:text-nous-primary hover:bg-nous-surface border border-transparent",
    danger:    "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-[15px] rounded-xl",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      style={{ fontFamily: 'var(--font-outfit)' }}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <Spinner className="w-4 h-4 mr-2" /> : null}
      {children}
    </button>
  );
};
