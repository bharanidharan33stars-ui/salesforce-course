"use client";

import { motion, useReducedMotion } from "framer-motion";
import { LinkButton } from "@/components/ui/button";

/** Closing call to action shown at the bottom of the homepage. */
export function CtaSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="cta-heading" className="py-12 sm:py-16">
      <div className="container-page">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl bg-navy px-6 py-10 text-center sm:px-10 sm:py-12"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brand/25 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
          </div>

          <div className="relative">
            <h2
              id="cta-heading"
              className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              Ready to start learning Salesforce?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl break-words text-sm leading-relaxed text-white/70 sm:text-base">
              Create an account, work through the five units at your own pace, and finish with
              unit quizzes and a course-completion certificate.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <LinkButton href="/signup" size="lg" className="w-full sm:w-auto">
                Start Learning
              </LinkButton>
              <LinkButton
                href="/login"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Sign in
              </LinkButton>
            </div>

            <p className="mt-6 break-words text-xs leading-relaxed text-white/60">
              Academy-issued course-completion certificate — not an official Salesforce
              certification.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
