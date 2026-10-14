"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible form field. The <label> is always connected to the input, and
 * errors are announced with role="alert" so screen readers hear them.
 */

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FieldWrapper({ label, error, hint, htmlFor, required, children }: FieldWrapperProps) {
  return (
    <div className="w-full">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const fieldClasses =
  "w-full min-h-11 rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:bg-bg disabled:text-muted";

const borderClasses = {
  idle: "border-line",
  error: "border-danger focus:ring-danger/30 focus:border-danger",
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, required, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={inputId} required={required}>
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(fieldClasses, error ? borderClasses.error : borderClasses.idle, className)}
        {...rest}
      />
    </FieldWrapper>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, required, rows = 6, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={inputId} required={required}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(fieldClasses, "resize-y", error ? borderClasses.error : borderClasses.idle, className)}
        {...rest}
      />
    </FieldWrapper>
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, hint, className, id, options, required, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={selectId} required={required}>
      <select
        id={selectId}
        required={required}
        className={cn(fieldClasses, "appearance-none pr-8", error ? borderClasses.error : borderClasses.idle, className)}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
  error?: string;
}

export function Checkbox({ label, error, className, id, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="w-full">
      <label htmlFor={inputId} className={cn("flex cursor-pointer items-start gap-3 text-sm text-ink", className)}>
        <input
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-line text-brand accent-[#1675D1] focus:ring-brand/30"
          {...rest}
        />
        <span className="leading-relaxed">{label}</span>
      </label>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
