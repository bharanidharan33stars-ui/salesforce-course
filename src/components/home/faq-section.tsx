"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { ACADEMY_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FaqItem {
  question: string;
  answer: ReactNode;
}

const FAQS: FaqItem[] = [
  {
    question: "What does the course cover?",
    answer:
      "Five units taught in order: an introduction to Salesforce (architecture, orgs, objects and security), Salesforce CRM functionality (accounts, leads, opportunities and cases), Apex programming basics, Apex development (triggers, testing and governor limits), and Visualforce. Each unit is a set of lessons you read or watch, followed by a quiz.",
  },
  {
    question: "Is this an official Salesforce certification?",
    answer: (
      <>
        No — and it is important to be clear about that. This is a college learning platform, and
        the certificate you earn is issued by {ACADEMY_NAME} to confirm that you completed{" "}
        <em>this</em> course. It is not an official Salesforce certification, it is not issued or
        endorsed by Salesforce, and anyone looking for official Salesforce credentials will expect
        the certifications you earn by taking Salesforce&apos;s own exams.
      </>
    ),
  },
  {
    question: "How is my certificate issued?",
    answer: (
      <>
        When you complete every required lesson and pass the required unit quizzes, the platform
        issues an academy-issued course-completion certificate with a certificate number and a
        verification id. You can download it from your dashboard, and anyone can confirm it on the{" "}
        <Link href="/verify-certificate" className="font-semibold text-brand hover:underline">
          public certificate verification page
        </Link>{" "}
        using that number.
      </>
    ),
  },
  {
    question: "Does it work on my phone?",
    answer:
      "Yes. The site is built mobile-first, so lessons, quizzes and your dashboard all work in a phone browser at small screen sizes — there is no app to install. You can start on a laptop and pick up on your phone; your progress follows your account, not your device.",
  },
  {
    question: "What score do I need to pass?",
    answer:
      "Each quiz shows its own passing score on the quiz page before you start — the unit quizzes in this course are currently set to 70% to pass, with up to 3 attempts each. Your best score and remaining attempts stay visible on the quiz and on your dashboard, and the course outline page lists the figures for every unit.",
  },
  {
    question: "How long does my access last?",
    answer:
      "There is no countdown or expiry date on your account. You can sign back in whenever you like and continue from where you left off, at whatever pace suits you (sign-in sessions themselves last up to 7 days, after which you simply sign in again). If the course is ever retired we will let you know using the e-mail address on your account.",
  },
];

/** FAQ accordion with a framer-motion height transition on each panel. */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="faq-heading" className="border-t border-line bg-white py-12 sm:py-16">
      <div className="container-page grid gap-8 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-1">
          <Badge tone="brand">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            FAQ
          </Badge>
          <h2
            id="faq-heading"
            className="mt-4 break-words text-2xl font-bold tracking-tight text-navy sm:text-3xl"
          >
            Frequently asked questions
          </h2>
          <p className="mt-4 break-words text-sm leading-relaxed text-muted">
            Straight answers about the course, the quizzes and the certificate. Something not
            covered here?{" "}
            <Link
              href="/contact"
              className="font-semibold text-brand transition-colors hover:text-brand-dark"
            >
              Contact us
            </Link>
            .
          </p>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-question-${index}`;

            return (
              <div key={item.question} className="card overflow-hidden">
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex min-h-12 w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="break-words text-sm font-semibold text-navy sm:text-base">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted transition-transform duration-200",
                      isOpen && "rotate-180 text-brand",
                    )}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      key="panel"
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="break-words px-5 pb-5 text-sm leading-relaxed text-muted">
                        {item.answer}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
