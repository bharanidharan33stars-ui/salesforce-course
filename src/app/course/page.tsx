import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Alert, Badge, Card, CardHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { EnrollButton } from "@/components/course/enroll-button";
import { FALLBACK_UNITS } from "@/components/home/curriculum-section";
import { api } from "@/lib/api-client";
import { COURSE_SLUG } from "@/lib/constants";
import type { CourseOverview } from "@/types";

export const metadata: Metadata = {
  title: "Course overview",
  description:
    "The full Salesforce CRM and Platform course: five units, the ordered lesson list for each unit, quiz passing scores and attempts, and what counts as completion.",
};

// The curriculum is read from the API on every request so quiz figures and
// lesson lists always reflect the live course.
export const revalidate = 0;

const FALLBACK_DESCRIPTION =
  "A five-unit course covering Salesforce platform fundamentals, CRM functionality, Apex programming and Visualforce — structured lessons, a quiz at the end of each unit, and an academy course-completion certificate when you finish.";

const FALLBACK_REQUIREMENTS = [
  "Complete every required lesson in all five units.",
  "Pass every required unit quiz.",
];

export default async function CoursePage() {
  // Never crash if the backend is down: fall back to the static outline.
  let course: CourseOverview | null = null;
  try {
    course = await api.get<CourseOverview>(`/courses/${COURSE_SLUG}`, {
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    course = null;
  }

  const units = course?.units?.length ? course.units : FALLBACK_UNITS;
  const live = Boolean(course?.units?.length);
  const totalLessons = units.reduce((sum, unit) => sum + unit.lessonCount, 0);
  const quizCount = units.filter((unit) => unit.quiz !== null).length;
  const requirements = course?.completionRequirements?.length
    ? course.completionRequirements
    : FALLBACK_REQUIREMENTS;

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        {/* ------------------------------------------------------ page header */}
        <section className="border-b border-line bg-white">
          <div className="container-page py-10 sm:py-14">
            <Badge tone="brand">Course</Badge>
            <h1 className="mt-4 max-w-3xl break-words text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              {course?.title ?? "Salesforce CRM and Platform"}
            </h1>
            <p className="mt-4 max-w-3xl break-words text-sm leading-relaxed text-muted sm:text-base">
              {course?.description ?? FALLBACK_DESCRIPTION}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="brand" className="px-3 py-1.5 text-sm">
                {units.length} units
              </Badge>
              {totalLessons > 0 ? (
                <Badge tone="neutral" className="px-3 py-1.5 text-sm">
                  {totalLessons} lessons
                </Badge>
              ) : null}
              {quizCount > 0 ? (
                <Badge tone="neutral" className="px-3 py-1.5 text-sm">
                  {quizCount} unit quizzes
                </Badge>
              ) : null}
            </div>

            {course?.id ? (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <EnrollButton courseId={course.id} />
                <LinkButton href="/login" variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign in
                </LinkButton>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/signup" size="lg" className="w-full sm:w-auto">
                  Start Learning
                </LinkButton>
                <LinkButton href="/login" variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign in
                </LinkButton>
              </div>
            )}
          </div>
        </section>

        {!live ? (
          <div className="container-page pt-6">
            <Alert tone="warning" title="Live course data is unavailable right now">
              We could not reach the course service, so this page is showing the standard
              five-unit structure. Lesson lists and quiz scores will appear again once the service
              is back.
            </Alert>
          </div>
        ) : null}

        {/* ---------------------------------------------------- unit outline */}
        <section aria-labelledby="outline-heading" className="py-10 sm:py-14">
          <div className="container-page">
            <div className="max-w-4xl">
              <h2
                id="outline-heading"
                className="break-words text-2xl font-bold tracking-tight text-navy sm:text-3xl"
              >
                Course outline
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
                Work through the units in order. Every lesson is marked as required or optional,
                and each unit quiz shows its passing score before you start.
              </p>

              <div className="mt-8 space-y-4 sm:space-y-6">
                {units.map((unit, index) => (
                  <article key={unit.slug} className="card p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">Unit {index + 1}</Badge>
                      {unit.lessonCount > 0 ? (
                        <Badge tone="neutral">{unit.lessonCount} lessons</Badge>
                      ) : null}
                      {unit.quiz ? (
                        <Badge tone="success">Pass at {unit.quiz.passingPercentage}%</Badge>
                      ) : null}
                    </div>

                    <h3 className="mt-4 break-words text-xl font-bold text-navy">
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

                    {unit.lessons.length > 0 ? (
                      <ol className="mt-4 space-y-2">
                        {unit.lessons.map((lesson, lessonIndex) => (
                          <li
                            key={lesson.id}
                            className="flex items-start gap-3 rounded-xl bg-bg px-4 py-3"
                          >
                            <span
                              className="mt-0.5 shrink-0 text-xs font-bold text-muted"
                              aria-hidden="true"
                            >
                              {lessonIndex + 1}.
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="break-words text-sm font-semibold text-ink">
                                  {lesson.title}
                                </span>
                                <Badge tone={lesson.isRequired ? "brand" : "neutral"}>
                                  {lesson.isRequired ? "Required" : "Optional"}
                                </Badge>
                              </span>
                              {lesson.summary ? (
                                <span className="mt-1 block break-words text-xs leading-relaxed text-muted">
                                  {lesson.summary}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : null}

                    <div className="mt-6">
                      <Link
                        href={`/course/${unit.slug}`}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
                      >
                        Open unit
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {/* ----------------------------------------- completion rules */}
              <Card className="mt-8">
                <CardHeader
                  title="What counts as completion"
                  subtitle="You need both of these before a certificate can be issued."
                />
                <ul className="space-y-2.5">
                  {requirements.map((requirement) => (
                    <li key={requirement} className="flex items-start gap-2.5 text-sm text-muted">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span className="break-words">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* -------------------------------------------------- bottom CTA */}
              <Card className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold text-navy">
                    Ready to start with Unit 1?
                  </h3>
                  <p className="mt-2 break-words text-sm text-muted">
                    Create an account to track your progress, or sign in if you already have one.
                  </p>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
                  <LinkButton href="/signup" className="w-full sm:w-auto">
                    Start Learning
                  </LinkButton>
                  <LinkButton href="/login" variant="outline" className="w-full sm:w-auto">
                    Sign in
                  </LinkButton>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
