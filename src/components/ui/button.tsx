"use client";

import Link from "next/link";
import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark shadow-[0_1px_2px_rgba(18,36,58,0.12)] disabled:bg-brand/50",
  secondary: "bg-navy text-white hover:bg-navy/90 disabled:bg-navy/50",
  outline: "border border-line bg-white text-ink hover:border-brand hover:text-brand disabled:opacity-60",
  ghost: "text-ink hover:bg-brand-soft hover:text-brand disabled:opacity-60",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
  success: "bg-success text-white hover:bg-success/90 disabled:bg-success/50",
};

const sizes: Record<Size, string> = {
  // 44px minimum height = comfortable touch target on phones
  sm: "min-h-10 px-3.5 text-sm rounded-lg gap-1.5",
  md: "min-h-11 px-5 text-sm rounded-xl gap-2",
  lg: "min-h-12 px-6 text-base rounded-xl gap-2",
};

const base =
  "inline-flex items-center justify-center font-semibold transition-colors duration-150 select-none disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
