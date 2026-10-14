"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, GraduationCap } from "lucide-react";

import { api } from "@/lib/api-client";
import { ACADEMY_NAME } from "@/lib/constants";
import { forgotPasswordSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert, Card, Spinner } from "@/components/ui/primitives";

/**
 * Shown for every outcome — the API answers identically for known and unknown
 * addresses so this page can never be used to probe whether an account exists.
 */
const NEUTRAL_MESSAGE = "If an account exists for that address, a password reset link has been sent.";

export default function ForgotPasswordPage() {
  const reduceMotion = useReducedMotion();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post("/auth/forgot-password", values);
    } catch {
      // Same neutral answer either way: never reveal whether the address exists.
    }
    reset({ email: "" });
    setSent(true);
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
            <h1 className="text-xl font-bold text-navy sm:text-2xl">Reset your password</h1>
            <p className="mt-1.5 text-sm text-muted">
              Enter the e-mail address you registered with and we will send you a link to choose a new password.
            </p>

            {sent ? (
              <Alert tone="info" title="Check your inbox" className="mt-4" onDismiss={() => setSent(false)}>
                {NEUTRAL_MESSAGE}
              </Alert>
            ) : null}

            <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
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

              <div className="pt-1">
                <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={isSubmitting}>
                  Send reset link
                </Button>
                {isSubmitting ? (
                  <div role="status" className="mt-3 flex justify-center">
                    <Spinner label="Sending your link…" />
                  </div>
                ) : null}
              </div>
            </form>
          </Card>
        </motion.div>

        <p className="mt-5 text-center text-sm text-muted">
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
