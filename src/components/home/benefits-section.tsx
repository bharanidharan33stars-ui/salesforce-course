"use client";

import type { ElementType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Award, ClipboardCheck, LineChart, ListChecks } from "lucide-react";

interface Benefit {
  icon: ElementType;
  title: string;
  body: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: ListChecks,
    title: "A structured five-unit curriculum",
    body: "Lessons are ordered so each topic builds on the last: Salesforce fundamentals, CRM functionality, Apex basics, Apex development, then Visualforce. You always know what to study next.",
  },
  {
    icon: ClipboardCheck,
    title: "Practice quizzes with clear goals",
    body: "Every unit ends with a quiz that shows its passing score and attempt limit before you start, so you always know what counts as finished.",
  },
  {
    icon: LineChart,
    title: "Progress you can keep track of",
    body: "Completed lessons, quiz scores and your position in the course are saved to your account and shown on your dashboard on any device you sign in from.",
  },
  {
    icon: Award,
    title: "A certificate when you finish",
    body: "Academy-issued course-completion certificate — not an official Salesforce certification. It records the course you completed and carries a verification number anyone can check.",
  },
];

/**
 * Genuine benefits of the platform. No student counts, ratings, reviews,
 * testimonials or employer claims — only what the product actually does.
 */
export function BenefitsSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="benefits-heading"
      className="border-t border-line bg-white py-12 sm:py-16"
    >
      <div className="container-page">
        <div className="max-w-2xl">
          <h2
            id="benefits-heading"
            className="break-words text-2xl font-bold tracking-tight text-navy sm:text-3xl"
          >
            Everything you need to work through the course
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            The material, the practice and your progress live in one place — sign in and pick up
            where you stopped.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
          {BENEFITS.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
                delay: (index % 2) * 0.06,
              }}
              className="card p-5 sm:p-6"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"
                aria-hidden="true"
              >
                <benefit.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 break-words text-base font-bold text-navy sm:text-lg">
                {benefit.title}
              </h3>
              <p className="mt-2 break-words text-sm leading-relaxed text-muted">
                {benefit.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
