"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { FieldPath, UseFormSetError } from "react-hook-form";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, GraduationCap } from "lucide-react";

import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { ACADEMY_NAME, PASSWORD_POLICY_TEXT } from "@/lib/constants";
import { signupSchema } from "@/lib/validators";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/field";
import { Alert, Card, Spinner } from "@/components/ui/primitives";
import type { User } from "@/types";

type SignupValues = z.input<typeof signupSchema>;

const FIELD_NAMES = ["fullName", "email", "password", "confirmPassword", "acceptTerms"] as const;

/**
 * Maps `ApiClientError` validation issues ({ issues: [{ field, message }] })
 * onto their fields. Returns false when nothing could be mapped, so the caller
 * can fall back to a form-level alert.
 */
function applyServerErrors(error: unknown, setError: UseFormSetError<SignupValues>): boolean {
  const details =
    error instanceof ApiClientError
      ? (error.details as { issues?: { field?: string; message?: string }[] } | undefined)
      : undefined;
  const issues = details?.issues;
  if (!issues?.length) return false;

  let mapped = false;
  for (const issue of issues) {
    if (issue.field && issue.message && (FIELD_NAMES as readonly string[]).includes(issue.field)) {
      setError(issue.field as FieldPath<SignupValues>, { type: "server", message: issue.message });
      mapped = true;
    }
  }
  return mapped;
}

/**
 * Small confirmation toast. It is appended straight to <body> so it stays on
 * screen after the router pushes the visitor to their dashboard.
 */
function showNotice(message: string): void {
  if (typeof document === "undefined") return;

  const toast = document.createElement("div");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.cssText =
    "position:fixed;top:16px;left:50%;z-index:200;display:flex;align-items:flex-start;gap:8px;" +
    "max-width:calc(100vw - 24px);padding:12px 14px;border-radius:14px;border:1px solid #b7e2d1;" +
    "background:#e6f5ef;color:#12243a;font-family:inherit;font-size:14px;line-height:1.45;" +
    "box-shadow:0 12px 30px rgba(18,36,58,0.18);";

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "\u2713";
  icon.style.cssText = "color:#16845d;font-weight:700";

  const text = document.createElement("span");
  text.textContent = message;

  toast.append(icon, text);
  document.body.appendChild(toast);

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, -8px)";
    toast.style.transition = "opacity 250ms ease, transform 250ms ease";
    window.requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translate(-50%, 0)";
    });
  } else {
    toast.style.transform = "translate(-50%, 0)";
  }

  window.setTimeout(() => {
    toast.style.opacity = "0";
  }, 5200);
  window.setTimeout(() => toast.remove(), 5600);
}

export default function SignUpPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await api.post<{ user: User | null; message: string }>("/auth/register", values);
      await refresh();
      showNotice(res.message || "Your account was created. Check your inbox to verify your e-mail address.");
      router.push("/dashboard");
    } catch (error) {
      if (!applyServerErrors(error, setError)) setFormError(errorMessage(error));
    }
  });

  return (
    <main id="main-content" className="min-h-screen bg-bg">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8 sm:py-12">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>

        <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-bold leading-tight text-navy">{ACADEMY_NAME}</span>
        </Link>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card>
            <h1 className="text-xl font-bold text-navy sm:text-2xl">Create your account</h1>
            <p className="mt-1.5 text-sm text-muted">
              Join the academy and work through the five learning units, quizzes and progress tracking at your own
              pace.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
              {formError ? (
                <Alert tone="danger" onDismiss={() => setFormError(null)}>
                  {formError}
                </Alert>
              ) : null}

              <Input
                {...register("fullName")}
                label="Full name"
                placeholder="Ada Lovelace"
                autoComplete="name"
                required
                error={errors.fullName?.message}
              />

              <Input
                {...register("email")}
                label="E-mail address"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                error={errors.email?.message}
              />

              <Input
                {...register("password")}
                label="Password"
                type="password"
                placeholder="Choose a password"
                autoComplete="new-password"
                required
                hint={PASSWORD_POLICY_TEXT}
                error={errors.password?.message}
              />

              <Input
                {...register("confirmPassword")}
                label="Confirm password"
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
                error={errors.confirmPassword?.message}
              />

              <Checkbox
                {...register("acceptTerms")}
                error={errors.acceptTerms?.message}
                label={
                  <>
                    I agree to the{" "}
                    <Link href="/terms" className="font-semibold text-brand hover:underline">
                      Terms of Use
                    </Link>{" "}
                    and the{" "}
                    <Link href="/privacy" className="font-semibold text-brand hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </>
                }
              />

              <div className="pt-1">
                <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={isSubmitting}>
                  Create account
                </Button>
                {isSubmitting ? (
                  <div role="status" className="mt-3 flex justify-center">
                    <Spinner label="Creating your account…" />
                  </div>
                ) : null}
              </div>
            </form>
          </Card>
        </motion.div>

        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
