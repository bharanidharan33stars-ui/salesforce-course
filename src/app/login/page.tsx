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
import { ACADEMY_NAME } from "@/lib/constants";
import { loginSchema } from "@/lib/validators";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/field";
import { Alert, Card, Spinner } from "@/components/ui/primitives";
import type { User } from "@/types";

type LoginValues = z.input<typeof loginSchema>;

const FIELD_NAMES = ["email", "password", "remember"] as const;

/** Maps server validation issues onto their fields; false ⇒ show a form alert. */
function applyServerErrors(error: unknown, setError: UseFormSetError<LoginValues>): boolean {
  const details =
    error instanceof ApiClientError
      ? (error.details as { issues?: { field?: string; message?: string }[] } | undefined)
      : undefined;
  const issues = details?.issues;
  if (!issues?.length) return false;

  let mapped = false;
  for (const issue of issues) {
    if (issue.field && issue.message && (FIELD_NAMES as readonly string[]).includes(issue.field)) {
      setError(issue.field as FieldPath<LoginValues>, { type: "server", message: issue.message });
      mapped = true;
    }
  }
  return mapped;
}

export default function SignInPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { setUser, refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const data = await api.post<{ user: User }>("/auth/login", values);
      if (data.user) setUser(data.user);
      await refresh();

      // Honour ?next=<path> when it is a safe same-site path (never //host),
      // so "sign in to open this lesson" returns to the lesson afterwards.
      const requested = new URLSearchParams(window.location.search).get("next");
      const safeNext =
        requested && requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\")
          ? requested
          : null;
      const isAdmin = data.user?.role === "admin";
      const destination = safeNext && (isAdmin || !safeNext.startsWith("/admin")) ? safeNext : isAdmin ? "/admin" : "/dashboard";
      router.push(destination);
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
            <h1 className="text-xl font-bold text-navy sm:text-2xl">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted">Sign in to pick up your learning where you left off.</p>

            <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
              {formError ? (
                <Alert tone="danger" onDismiss={() => setFormError(null)}>
                  {formError}
                </Alert>
              ) : null}

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

              <div>
                <Input
                  {...register("password")}
                  label="Password"
                  type="password"
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                  error={errors.password?.message}
                />
                <div className="mt-2 flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Checkbox
                {...register("remember")}
                error={errors.remember?.message}
                label="Remember me on this device"
              />

              <div className="pt-1">
                <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={isSubmitting}>
                  Sign in
                </Button>
                {isSubmitting ? (
                  <div role="status" className="mt-3 flex justify-center">
                    <Spinner label="Signing in…" />
                  </div>
                ) : null}
              </div>
            </form>
          </Card>
        </motion.div>

        <p className="mt-5 text-center text-sm text-muted">
          New to the academy?{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
