"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, BookOpen, ClipboardCheck, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/primitives";

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your account",
    body: "Sign up with your name and e-mail address, then enrol in the Salesforce course from your dashboard.",
  },
  {
    icon: BookOpen,
    title: "Learn unit by unit",
    body: "Work through each unit's lessons in order — articles, videos and code examples. Mark lessons complete as you go and your progress is saved.",
  },
  {
    icon: ClipboardCheck,
    title: "Pass the unit quizzes",
    body: "Each unit ends with a quiz that shows its passing score and attempt limit up front. Your best score and remaining attempts stay visible.",
  },
  {
    icon: Award,
    title: "Earn your certificate",
    body: "Complete every required lesson and pass every required quiz, then download your academy course-completion certificate with its verification number.",
  },
] as const;

/** How the learning process works: register → learn → quizzes → certificate. */
export function ProcessSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="process-heading" className="py-12 sm:py-16">
      <div className="container-page">
        <div className="max-w-2xl">
          <Badge tone="brand">How it works</Badge>
          <h2
            id="process-heading"
            className="mt-4 break-words text-2xl font-bold tracking-tight text-navy sm:text-3xl"
          >
            How the learning process works
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            Four steps from creating your account to earning your certificate — at whatever pace
            suits you.
          </p>
        </div>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
                delay: index * 0.05,
              }}
              className="card flex flex-col p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"
                  aria-hidden="true"
                >
                  <step.icon className="h-5 w-5" />
                </span>
                <Badge tone="brand">Step {index + 1}</Badge>
              </div>
              <h3 className="mt-4 break-words text-base font-bold text-navy">{step.title}</h3>
              <p className="mt-2 break-words text-sm leading-relaxed text-muted">{step.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
