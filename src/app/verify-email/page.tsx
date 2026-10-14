"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle2, GraduationCap, MailCheck } from "lucide-react";

import { api, errorMessage } from "@/lib/api-client";
import { ACADEMY_NAME } from "@/lib/constants";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert, Card, PageLoader, Spinner } from "@/components/ui/primitives";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  return (
    <main id="main-content" className="min-h-screen bg-bg">
      <Suspense fallback={<PageLoader label="Opening your verification link…" />}>
        <VerifyEmailPanel />
      </Suspense>
    </main>
  );
}

function VerifyEmailPanel() {
  const token = useSearchParams().get("token") ?? "";
  const reduceMotion = useReducedMotion();
  const { isAuthenticated, refresh } = useAuth();

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [resendMessage, setResendMessage] = useState("");

  // Verify each token once, even when StrictMode runs the effect twice in dev
  // or the visitor re-opens the same link in this tab.
  const attemptedToken = useRef<string | null>(null);

  useEffect(() => {
    if (attemptedToken.current === token) return;
    attemptedToken.current = token;

    if (!token) {
      setStatus("error");
      setMessage(
        "This verification link is incomplete. Open the link from your e-mail again, or request a new one below.",
      );
      return;
    }

    // No cancellation flag here on purpose: React StrictMode runs this effect
    // (setup → cleanup → setup) in development, and a cleanup would throw away
    // the only in-flight request. The ref above already prevents duplicates.
    void (async () => {
      try {
        const res = await api.post<{ message: string }>("/auth/verify-email", { token });
        setMessage(res.message || "Your e-mail address has been verified.");
        setStatus("success");
        // Keep the session's `emailVerifiedAt` in sync when someone is signed in.
        void refresh();
      } catch (error) {
        setMessage(errorMessage(error));
        setStatus("error");
      }
    })();
  }, [token, refresh]);

  const handleResend = async () => {
    setResendStatus("sending");
    setResendMessage("");
    try {
      const res = await api.post<{ message: string }>("/auth/resend-verification");
      setResendMessage(res.message || "If your address still needs verification, a new link has been sent.");
      setResendStatus("sent");
    } catch (error) {
      setResendMessage(errorMessage(error));
      setResendStatus("failed");
    }
  };

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
          {status === "verifying" ? (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                  <MailCheck className="h-5 w-5 text-brand" aria-hidden="true" />
                </span>
                <h1 className="text-xl font-bold text-navy sm:text-2xl">Verifying your e-mail</h1>
              </div>
              <p className="mt-2 text-sm text-muted">We are checking your verification link — this takes a moment.</p>
              <div role="status" className="mt-6 flex justify-center pb-2">
                <Spinner label="Verifying…" />
              </div>
            </>
          ) : status === "success" ? (
            <div className="text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
              </span>
              <h1 className="text-xl font-bold text-navy sm:text-2xl">E-mail verified</h1>
              <p className="mt-2 text-sm text-muted">{message}</p>
              <LinkButton href="/login" size="lg" fullWidth className="mt-5">
                Go to sign in
              </LinkButton>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-navy sm:text-2xl">Verify your e-mail</h1>
              <p className="mt-1.5 text-sm text-muted">We could not confirm your address with this link.</p>

              <Alert tone="danger" title="Verification failed" className="mt-4">
                {message}
              </Alert>

              <div className="mt-4 space-y-3">
                {isAuthenticated ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      fullWidth
                      loading={resendStatus === "sending"}
                      disabled={resendStatus === "sending"}
                      onClick={handleResend}
                    >
                      Resend e-mail
                    </Button>
                    {resendMessage ? (
                      <Alert tone={resendStatus === "failed" ? "danger" : "success"}>{resendMessage}</Alert>
                    ) : null}
                  </>
                ) : (
                  <>
                    <LinkButton href="/login" variant="outline" fullWidth>
                      Sign in to resend
                    </LinkButton>
                    <p className="text-center text-sm text-muted">
                      You need to be signed in on this device to request a new verification e-mail.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </Card>
      </motion.div>

      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
