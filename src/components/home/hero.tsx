"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Award, BookOpen } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";

gsap.registerPlugin(useGSAP);

/** Compact, honest snapshot of the five units shown in the decorative panel. */
const HERO_UNIT_ROWS = [
  { title: "Introduction to Salesforce", detail: "Architecture, orgs, objects & security" },
  { title: "Salesforce CRM Functionality", detail: "Accounts, leads, opportunities & cases" },
  { title: "Apex Programming Basics", detail: "Types, control flow, SOQL & DML" },
  { title: "Apex Programming Development", detail: "Triggers, testing & governor limits" },
  { title: "Visualforce Development", detail: "Pages, controllers & security" },
];

/**
 * Homepage hero.
 *
 * Framer Motion animates the copy (entrance of the text and the buttons);
 * GSAP (via useGSAP, scoped to this component with automatic cleanup) runs a
 * decorative timeline over the outline panel. The two libraries never animate
 * the same property on the same element, and with prefers-reduced-motion both
 * render the final state with no animation.
 */
export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reduceMotion) return;
      const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
      timeline
        .from("[data-hero-panel]", { opacity: 0, y: 16, duration: 0.55 })
        .from(
          "[data-hero-row]",
          { opacity: 0, x: -10, duration: 0.4, stagger: 0.09 },
          "-=0.25",
        )
        .from("[data-hero-chip]", { opacity: 0, y: 10, duration: 0.45 }, "-=0.1");
    },
    { scope: rootRef, dependencies: [reduceMotion] },
  );

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-line bg-white"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -right-32 top-1/4 h-80 w-80 rounded-full bg-brand-soft blur-3xl" />
      </div>

      <div
        ref={rootRef}
        className="container-page relative grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20"
      >
        <div>
          {/* -------------------------------------------------------- copy */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge tone="brand">Five units · Quizzes · Certificate</Badge>

            <h1
              id="hero-heading"
              className="mt-4 break-words text-3xl font-bold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl"
            >
              Learn Salesforce.{" "}
              <span className="text-brand">Build Your Future.</span>
            </h1>

            <p className="mt-4 max-w-xl break-words text-sm leading-relaxed text-muted sm:text-base">
              A structured course that takes you from Salesforce fundamentals through CRM
              functionality, Apex programming and Visualforce — short lessons you can study on any
              device, a quiz at the end of each unit, and progress that is saved to your account.
            </p>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/signup" size="lg" fullWidth className="sm:w-auto">
                Start Learning
              </LinkButton>
              <LinkButton
                href="/course"
                variant="outline"
                size="lg"
                fullWidth
                className="sm:w-auto"
              >
                Explore Course
              </LinkButton>
            </div>
            <p className="mt-4 max-w-xl break-words text-xs leading-relaxed text-muted sm:text-sm">
              Finish the required lessons and quizzes to earn an academy-issued course-completion
              certificate — not an official Salesforce certification.
            </p>
          </motion.div>
        </div>

        {/* --------------------------------------------- decorative outline */}
        <div data-hero-panel className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                Course outline
              </p>
              <p className="mt-2 break-words text-lg font-bold text-navy">
                Five units, taught in order
              </p>
            </div>
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
              aria-hidden="true"
            >
              <BookOpen className="h-5 w-5" />
            </span>
          </div>

          <ol className="mt-6 space-y-3">
            {HERO_UNIT_ROWS.map((row, index) => (
              <li
                key={row.title}
                data-hero-row
                className="flex items-center gap-3 rounded-xl border border-line bg-bg px-4 py-3"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-xs font-bold text-brand"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-sm font-semibold text-ink">
                    {row.title}
                  </span>
                  <span className="mt-1 block break-words text-xs text-muted">{row.detail}</span>
                </span>
              </li>
            ))}
          </ol>

          <div
            data-hero-chip
            className="mt-6 flex items-start gap-3 rounded-xl border border-success/25 bg-success-soft px-4 py-3"
          >
            <Award className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="break-words text-sm leading-relaxed text-navy">
              <span className="font-semibold">Certificate included</span> — academy-issued
              course-completion certificate, not an official Salesforce certification.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
