"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { cn, initials } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Courses", href: "/admin/courses", icon: GraduationCap },
  { label: "Units", href: "/admin/units", icon: Layers },
  { label: "Lessons", href: "/admin/lessons", icon: BookOpen },
  { label: "Quizzes", href: "/admin/quizzes", icon: FileText },
  { label: "Certificates", href: "/admin/certificates", icon: Award },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Responsive chrome for the admin area:
 * - top bar with brand, "Back to site", current user and Sign out;
 * - left sidebar on lg+ screens, horizontally scrolling tab bar below the
 *   top bar on smaller screens.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      router.replace("/");
    }
  };

  const displayName = user?.fullName ?? "Administrator";
  const displayEmail = user?.email ?? "";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        {/* Top bar */}
        <div className="container-page flex h-14 items-center justify-between gap-2 sm:h-16">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white"
              aria-hidden="true"
            >
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy sm:text-base">
                Salesforce Learning Academy
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Admin area
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to site
            </Link>
            <div className="hidden min-w-0 text-right md:block">
              <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
              {displayEmail ? (
                <p className="truncate text-xs text-muted">{displayEmail}</p>
              ) : null}
            </div>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand md:hidden"
              aria-hidden="true"
            >
              {initials(displayName)}
            </span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </div>
        </div>

        {/* Mobile / tablet: horizontal scrolling tab bar */}
        <nav aria-label="Admin sections" className="lg:hidden">
          <ul className="container-page flex gap-1 overflow-x-auto py-2">
            {NAV_ITEMS.map((item) => {
              const active = isActiveRoute(pathname, item.href);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-brand-soft text-brand"
                        : "text-muted hover:bg-brand-soft hover:text-brand",
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <div className="container-page flex flex-col gap-6 py-6 lg:flex-row lg:gap-8 lg:py-8">
        {/* lg+: left sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav aria-label="Admin sections" className="sticky top-24">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                        active
                          ? "bg-brand-soft text-brand"
                          : "text-ink hover:bg-brand-soft hover:text-brand",
                      )}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
