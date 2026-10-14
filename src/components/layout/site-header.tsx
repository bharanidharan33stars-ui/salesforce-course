"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { GraduationCap, Menu, X, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { cn, initials } from "@/lib/utils";
import { ACADEMY_NAME } from "@/lib/constants";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/course", label: "Course" },
  { href: "/certificates", label: "Certificates" },
  { href: "/contact", label: "Contact" },
];

/**
 * Public site header. Mobile-first: the navigation collapses into a
 * touch-friendly menu under the `md` breakpoint.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Close the menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="truncate text-[15px] font-bold leading-tight text-navy">
            {ACADEMY_NAME}
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href ? "bg-brand-soft text-brand" : "text-muted hover:bg-bg hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted hover:bg-bg hover:text-ink"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Admin
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink hover:bg-bg"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                  {initials(user?.fullName ?? "?")}
                </span>
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted hover:bg-bg hover:text-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-ink hover:bg-bg"
              >
                Sign in
              </Link>
              <LinkButton href="/signup" size="sm">
                Start Learning
              </LinkButton>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-ink md:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-white md:hidden"
          >
            <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium",
                    pathname === link.href ? "bg-brand-soft text-brand" : "text-ink hover:bg-bg",
                  )}
                >
                  {link.label}
                </Link>
              ))}

              <div className="my-2 border-t border-line" />

              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-medium text-ink hover:bg-bg"
                  >
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    My dashboard
                  </Link>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-medium text-ink hover:bg-bg"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Admin dashboard
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-[15px] font-medium text-danger hover:bg-danger-soft"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <LinkButton href="/login" variant="outline" fullWidth>
                    Sign in
                  </LinkButton>
                  <LinkButton href="/signup" fullWidth>
                    Start Learning
                  </LinkButton>
                </div>
              )}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
