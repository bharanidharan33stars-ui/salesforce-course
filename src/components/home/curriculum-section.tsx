import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { UNIT_SLUGS } from "@/lib/constants";
import type { CourseUnit } from "@/types";

/**
 * Static outline of the five units, used as a fallback whenever the course API
 * cannot be reached, so the public pages still render real curriculum
 * structure instead of crashing. Titles and descriptions mirror the seeded
 * course content; no lesson counts or scores are invented (they stay empty and
 * simply are not rendered).
 */
const FALLBACK_CONTENT: Record<
  (typeof UNIT_SLUGS)[number],
  { title: string; description: string }
> = {
  "introduction-to-salesforce": {
    title: "Introduction to Salesforce",
    description:
      "How Salesforce works underneath the interface: multi-tenant architecture, orgs and sandboxes, the object and relationship model, and the security model that decides who can see what.",
  },
  "salesforce-crm-functionality": {
    title: "Salesforce CRM Functionality",
    description:
      "The core CRM objects and processes: accounts and contacts, leads and conversion, opportunities and pipeline, cases and service rules, and the tools that capture and de-duplicate customer data.",
  },
  "apex-programming-basics": {
    title: "Apex Programming Basics",
    description:
      "Learn the fundamentals of Apex: what the language is, variables and data types, control flow, collections, SOQL queries and DML, plus transactions and exception handling.",
  },
  "apex-programming-development": {
    title: "Apex Programming Development",
    description:
      "Build production-ready Apex: triggers and their context variables, handler patterns and bulkification, test classes, governor limits and asynchronous Apex.",
  },
  "visualforce-development": {
    title: "Visualforce Development",
    description:
      "Visualforce is Salesforce's markup language for building custom pages. You will write pages with apex: tags and merge fields, display records with standard and custom controllers, and learn the security rules that keep those pages safe.",
  },
};

/** The five units built from UNIT_SLUGS, in teaching order. */
export const FALLBACK_UNITS: CourseUnit[] = UNIT_SLUGS.map((slug, index) => ({
  id: index + 1,
  title: FALLBACK_CONTENT[slug].title,
  slug,
  description: FALLBACK_CONTENT[slug].description,
  sortOrder: index + 1,
  lessonCount: 0,
  requiredLessonCount: 0,
  lessons: [],
  quiz: null,
}));

/**
 * Homepage curriculum overview. Server component: the page passes in live
 * units from the API, or FALLBACK_UNITS when the backend is unavailable.
 */
export function CurriculumSection({ units }: { units: CourseUnit[] }) {
  return (
    <section aria-labelledby="curriculum-heading" className="py-12 sm:py-16">
      <div className="container-page">
        <div className="max-w-2xl">
          <Badge tone="brand">Curriculum</Badge>
          <h2
            id="curriculum-heading"
            className="mt-4 break-words text-2xl font-bold tracking-tight text-navy sm:text-3xl"
          >
            Five units that build on each other
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            The course moves in one direction: platform fundamentals first, then CRM
            functionality, then Apex and Visualforce. Every unit is a set of lessons you work
            through in order, finished with a quiz.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {units.map((unit, index) => (
            <article key={unit.slug} className="card flex flex-col p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">Unit {index + 1}</Badge>
                {unit.quiz ? (
                  <Badge tone="success">
                    <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Pass at {unit.quiz.passingPercentage}%
                  </Badge>
                ) : null}
              </div>

              <h3 className="mt-4 break-words text-lg font-bold text-navy">
                <Link
                  href={`/course/${unit.slug}`}
                  className="transition-colors hover:text-brand"
                >
                  {unit.title}
                </Link>
              </h3>

              <p className="mt-2 break-words text-sm leading-relaxed text-muted">
                {unit.description}
              </p>

              {unit.lessonCount > 0 ? (
                <div className="mt-4">
                  <Badge tone="neutral">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    {unit.lessonCount} lessons
                  </Badge>
                </div>
              ) : null}

              <div className="mt-auto pt-6">
                <Link
                  href={`/course/${unit.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                  View unit
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 flex justify-center sm:justify-start">
          <LinkButton
            href="/course"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            See the full course outline
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
