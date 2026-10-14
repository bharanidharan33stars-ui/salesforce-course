"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Award, BookOpen, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { useAuth } from "@/components/providers/auth-provider";
import { PageLoader } from "@/components/ui/primitives";
import { cn, initials } from "@/lib/utils";

const STUDENT_LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/course", label: "My course", icon: BookOpen },
  { href: "/certificates", label: "Certificates", icon: Award },
];

/**
 * Guarded shell for signed-in students.
 * The real authorisation happens on the API - this only improves navigation.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login?next=/dashboard");
  }, [loading, isAuthenticated, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (loading) return <PageLoader label="Loading your dashboard" />;
  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="border-b border-line bg-white">
        <div className="container-page flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {initials(user?.fullName ?? "?")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy">{user?.fullName}</p>
              <p className="truncate text-xs text-muted">Student dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Link
                href="/admin"
                className="hidden min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted hover:bg-bg hover:text-ink sm:inline-flex"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Admin
              </Link>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="hidden min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted hover:bg-bg hover:text-ink sm:inline-flex"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line sm:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Section navigation - horizontal tabs, scrollable on small screens */}
        <nav className="container-page flex gap-1 overflow-x-auto pb-2" aria-label="Dashboard sections">
          {STUDENT_LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
                  active ? "bg-brand text-white" : "text-muted hover:bg-bg hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen ? (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-b border-line bg-white sm:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-3">
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger-soft"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main id="main-content" className="flex-1 py-6 sm:py-8">
        <div className="container-page">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}
