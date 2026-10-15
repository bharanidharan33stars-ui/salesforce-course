import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { ACADEMY_NAME } from "@/lib/constants";

const PRODUCT_LINKS = [
  { href: "/course", label: "Course overview" },
  { href: "/course/introduction-to-salesforce", label: "Unit 1: Introduction to Salesforce" },
  { href: "/course/salesforce-crm-functionality", label: "Unit 2: Salesforce CRM Functionality" },
  { href: "/course/apex-programming-basics", label: "Unit 3: Apex Programming Basics" },
  { href: "/course/apex-programming-development", label: "Unit 4: Apex Programming Development" },
  { href: "/course/visualforce-development", label: "Unit 5: Visualforce Development" },
  { href: "/verify-certificate", label: "Verify a certificate" },
];

const ACCOUNT_LINKS = [
  { href: "/signup", label: "Create account" },
  { href: "/login", label: "Sign in" },
  { href: "/forgot-password", label: "Forgot password" },
  { href: "/dashboard", label: "Student dashboard" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-[15px] font-bold text-navy">{ACADEMY_NAME}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Learn Salesforce administration, CRM functionality, Apex and Visualforce through a
            structured five-unit course with quizzes and an academy certificate.
          </p>
        </div>

        <nav aria-label="Course links">
          <h3 className="text-sm font-bold text-navy">Course</h3>
          <ul className="mt-3 space-y-2.5">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted hover:text-brand">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Account links">
          <h3 className="text-sm font-bold text-navy">Account</h3>
          <ul className="mt-3 space-y-2.5">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted hover:text-brand">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal links">
          <h3 className="text-sm font-bold text-navy">Academy</h3>
          <ul className="mt-3 space-y-2.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted hover:text-brand">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {ACADEMY_NAME}. All rights reserved.</p>
          <p className="max-w-xl leading-relaxed">
            Academy-issued course-completion certificate. This is not an official Salesforce
            certification and is not endorsed by Salesforce.
          </p>
        </div>
      </div>
    </footer>
  );
}
