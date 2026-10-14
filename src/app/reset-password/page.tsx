"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { FieldPath, UseFormSetError } from "react-hook-form";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle2, GraduationCap } from "lucide-react";

import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { ACADEMY_NAME, PASSWORD_POLICY_TEXT } from "@/lib/constants";
import { resetPasswordSchema } from "@/lib/validators";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, LinkButton } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert, Card, PageLoader, Spinner } from "@/components/ui/primitives";

type ResetValues = z.input<typeof resetPasswordSchema>;

const FIELD_NAMES = ["token", "password", "confirmPassword"] as const;

/** Maps server validation issues onto their fields; false ⇒ show a form alert. */
function applyServerErrors(error: unknown, setError: UseFormSetError<ResetValues>): boolean {
  const details =
    error instanceof ApiClientError
      ? (error.details as { issues?: { field?: string; message?: string }[] } | undefined)
      : undefined;
  const issues = details?.issues;
  if (!issues?.length) return false;

  let mapped = false;
  for (const issue of issues) {
    if (issue.field && issue.message && (FIELD_NAMES as readonly string[]).includes(issue.field)) {
      setError(issue.field as FieldPath<ResetValues>, { type: "server", message: issue.message });
      mapped = true;
    }
  }
  return mapped;
}

export default function ResetPasswordPage() {
  return (
    <main id="main-content" className="min-h-screen bg-bg">
      <Suspense fallback={<PageLoader label="Opening your reset link…" />}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const reduceMotion = useReducedMotion();
  const { refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await api.post<{ message: string }>("/auth/reset-password", values);
      setDone(res.message || "Your password has been changed. You can sign in now.");
      // Changing a password signs out every session, so drop any stale one here.
      void refresh();
    } catch (error) {
      if (!applyServerErrors(error, setError)) setFormError(errorMessage(error));
    }
  });

  return (
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
          {done ? (
            <div className="text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
              </span>
              <h1 className="text-xl font-bold text-navy sm:text-2xl">Password updated</h1>
              <p className="mt-2 text-sm text-muted">{done}</p>
              <LinkButton href="/login" size="lg" fullWidth className="mt-5">
                Go to sign in
              </LinkButton>
            </div>
          ) : !token ? (
            <>
              <h1 className="text-xl font-bold text-navy sm:text-2xl">Choose a new password</h1>
              <p className="mt-1.5 text-sm text-muted">
                This link should contain a one-time token from your reset e-mail.
              </p>
              <Alert tone="danger" title="Invalid reset link" className="mt-4">
                The link is missing its token, has expired or has already been used. Request a new password reset
                link and try again.
              </Alert>
              <div className="mt-4">
                <LinkButton href="/forgot-password" variant="outline" fullWidth>
                  Request a new link
                </LinkButton>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-navy sm:text-2xl">Choose a new password</h1>
              <p className="mt-1.5 text-sm text-muted">
                Pick a password you have not used on this account before. You will sign in with it from now on.
              </p>

              <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
                {formError ? (
                  <Alert tone="danger" onDismiss={() => setFormError(null)}>
                    {formError}
                  </Alert>
                ) : null}

                <Input
                  {...register("password")}
                  label="New password"
                  type="password"
                  placeholder="Choose a password"
                  autoComplete="new-password"
                  required
                  hint={PASSWORD_POLICY_TEXT}
                  error={errors.password?.message}
                />

                <Input
                  {...register("confirmPassword")}
                  label="Confirm new password"
                  type="password"
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                  required
                  error={errors.confirmPassword?.message}
                />

                <div className="pt-1">
                  <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={isSubmitting}>
                    Update password
                  </Button>
                  {isSubmitting ? (
                    <div role="status" className="mt-3 flex justify-center">
                      <Spinner label="Updating your password…" />
                    </div>
                  ) : null}
                </div>
              </form>
            </>
          )}
        </Card>
      </motion.div>

      <p className="mt-5 text-center text-sm text-muted">
        Remembered your password?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
