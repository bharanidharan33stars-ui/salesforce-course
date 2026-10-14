"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Info, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ card */

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card p-5 sm:p-6", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-navy sm:text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- badge */

type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-bg text-muted border border-line",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- progress */

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "brand",
  showValue = true,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: "brand" | "success";
  showValue?: boolean;
  className?: string;
}) {
  const percent = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("w-full", className)}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label ? <span className="font-medium text-ink">{label}</span> : <span />}
          {showValue ? <span className="font-semibold text-navy">{percent}%</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-2.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            tone === "success" ? "bg-success" : "bg-brand",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- alert */

export function Alert({
  tone = "info",
  title,
  children,
  className,
  onDismiss,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
}) {
  const tones = {
    info: { wrapper: "bg-brand-soft border-brand/20 text-navy", icon: <Info className="h-5 w-5 text-brand" /> },
    success: {
      wrapper: "bg-success-soft border-success/20 text-navy",
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
    },
    warning: {
      wrapper: "bg-warning-soft border-warning/20 text-navy",
      icon: <AlertCircle className="h-5 w-5 text-warning" />,
    },
    danger: { wrapper: "bg-danger-soft border-danger/20 text-navy", icon: <AlertCircle className="h-5 w-5 text-danger" /> },
  } as const;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", tones[tone].wrapper, className)}
    >
      <span className="mt-0.5 shrink-0">{tones[tone].icon}</span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title ? "mt-0.5" : undefined, "leading-relaxed")}>{children}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="-m-1 shrink-0 rounded-lg p-1 text-muted hover:text-ink"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- loading */

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-muted", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className ?? "h-5 w-full")} aria-hidden="true" />;
}

export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

/* ----------------------------------------------------------- empty state */

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center", className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
        <Inbox className="h-6 w-6 text-brand" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-navy">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
