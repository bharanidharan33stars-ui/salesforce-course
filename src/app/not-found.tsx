import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist — head back to the homepage or browse the course outline.",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="container-page py-16 sm:py-24">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand"
            aria-hidden="true"
          >
            <Compass className="h-8 w-8" />
          </span>

          <p className="mt-6 text-5xl font-bold tracking-tight text-navy" aria-hidden="true">
            404
          </p>

          <h1 className="mt-4 break-words text-2xl font-bold text-navy sm:text-3xl">
            We could not find that page
          </h1>
          <p className="mt-4 break-words text-sm leading-relaxed text-muted sm:text-base">
            The link may be out of date, or the page may have moved. Your course progress is
            unaffected — you can pick it up from your dashboard or start again from the homepage.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <LinkButton href="/" size="lg" className="w-full sm:w-auto">
              Back to home
            </LinkButton>
            <LinkButton
              href="/course"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              View course
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkButton>
          </div>

          <p className="mt-6 text-sm text-muted">
            Still stuck?{" "}
            <Link
              href="/contact"
              className="font-semibold text-brand transition-colors hover:text-brand-dark"
            >
              Contact us
            </Link>{" "}
            and we will help you find what you need.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
