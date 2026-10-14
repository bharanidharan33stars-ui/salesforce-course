"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageLoader } from "@/components/ui/primitives";

/**
 * Blocks the whole admin area from anyone who is not signed in as an admin.
 * The backend authorises every admin endpoint again regardless — this is a
 * UX guard, not a security boundary.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return <PageLoader label="Checking administrator access" />;
  }

  if (!isAdmin) {
    return (
      <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft">
            <ShieldAlert className="h-7 w-7 text-danger" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-navy">Administrator access required</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            You need to be signed in with an administrator account to view this area. If you
            believe this is a mistake, contact the academy administrator.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Go to sign in
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-muted transition-colors hover:text-brand"
            >
              Back to site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
