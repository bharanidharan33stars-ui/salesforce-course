"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";

/**
 * "Enroll now" for the course overview page.
 *
 * Signed-out visitors are sent to /signup; signed-in students enrol with one
 * tap and are then linked to their dashboard. The endpoint is idempotent, so
 * pressing it twice is harmless.
 */
export function EnrollButton({ courseId }: { courseId: number }) {
  const { isAuthenticated, loading } = useAuth();
  const [state, setState] = useState<"unknown" | "not-enrolled" | "enrolled">("unknown");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Learn whether this student already enrolled (0 while signed out).
  useEffect(() => {
    if (!isAuthenticated) {
      setState("not-enrolled");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.get<{ progress: { enrolled: boolean } }>("/student/dashboard");
        if (!cancelled) setState(data.progress.enrolled ? "enrolled" : "not-enrolled");
      } catch {
        if (!cancelled) setState("not-enrolled");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const enroll = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/courses/${courseId}/enroll`);
      setState("enrolled");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (loading || state === "unknown") {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-line px-5 text-sm font-semibold text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading…
      </span>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      {!isAuthenticated ? (
        <LinkButton href="/signup" size="lg" className="sm:w-auto">
          Create an account to start
        </LinkButton>
      ) : state === "enrolled" ? (
        <LinkButton href="/dashboard" size="lg" className="sm:w-auto">
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          Go to my dashboard
        </LinkButton>
      ) : (
        <button
          type="button"
          onClick={() => void enroll()}
          disabled={busy}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60 sm:w-auto"
        >
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          {busy ? "Enrolling…" : "Enroll now — it's free"}
        </button>
      )}
      {error ? <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert> : null}
      {state === "enrolled" && isAuthenticated ? (
        <Link href="/learn/introduction-to-salesforce/salesforce-overview-and-architecture" className="text-sm font-medium text-brand underline underline-offset-2">
          Jump to the first lesson
        </Link>
      ) : null}
    </div>
  );
}
