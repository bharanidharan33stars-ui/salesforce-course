import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight, RotateCw } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Alert, Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { FALLBACK_UNITS } from "@/components/home/curriculum-section";
import { api } from "@/lib/api-client";
import { UNIT_SLUGS } from "@/lib/constants";
import type { UnitDetail } from "@/types";

export const metadata: Metadata = {
  title: "Course unit",
  description:
    "One unit of the five-unit Salesforce course: the ordered lesson list with required and optional lessons, the quiz passing score and attempt limit, and links to the previous and next units.",
};

// Unit data is read from the API on every request so lesson lists stay current.
export const revalidate = 0;

interface UnitPageProps {
  params: Promise<{ unitSlug: string }>;
}

/** Pre-render the five known unit paths; unknown slugs fall through to notFound(). */
export function generateStaticParams() {
  return UNIT_SLUGS.map((unitSlug) => ({ unitSlug }));
}

export default async function UnitPage({ params }: UnitPageProps) {
  const { unitSlug } = await params;

  if (!(UNIT_SLUGS as readonly string[]).includes(unitSlug)) notFound();

  const unitIndex = UNIT_SLUGS.findIndex((slug) => slug === unitSlug);
  const fallbackUnit = FALLBACK_UNITS[unitIndex];

  // Never crash if the backend is down: render the shell with a clear notice.
  let detail: UnitDetail | null = null;
  let failed = false;
  try {
    detail = await api.get<UnitDetail>(`/units/${unitSlug}`, {
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    detail = null;
    failed = true;
  }

  const unit = detail?.unit ?? {
    title: fallbackUnit.title,
    description: fallbackUnit.description,
    slug: unitSlug,
    sortOrder: unitIndex + 1,
  };
  const lessons = detail
    ? [...detail.lessons].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const requiredCount = lessons.filter((lesson) => lesson.isRequired).length;
  const quiz = detail?.quiz ?? null;

  const prev =
    detail?.prevUnit ??
    (unitIndex > 0
      ? { title: FALLBACK_UNITS[unitIndex - 1].title, slug: UNIT_SLUGS[unitIndex - 1] }
      : null);
  const next =
    detail?.nextUnit ??
    (unitIndex < UNIT_SLUGS.length - 1
      ? { title: FALLBACK_UNITS[unitIndex + 1].title, slug: UNIT_SLUGS[unitIndex + 1] }
      : null);

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="bg-white">
        <div className="container-page py-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            {/* ------------------------------------------------- unit header */}
            <Link
              href="/course"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All units
            </Link>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">
                Unit {unitIndex + 1} of {UNIT_SLUGS.length}
              </Badge>
              {quiz ? <Badge tone="success">Quiz · Pass at {quiz.passingPercentage}%</Badge> : null}
            </div>

            <h1 className="mt-4 break-words text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              {unit.title}
            </h1>
            {unit.description ? (
              <p className="mt-4 max-w-3xl break-words text-sm leading-relaxed text-muted sm:text-base">
                {unit.description}
              </p>
            ) : null}

            {failed ? (
              <div className="mt-6">
                <Alert tone="danger" title="We could not load this unit right now">
                  <span className="block break-words">
                    The course service did not respond, so the lesson list below is not available.
                  </span>
                  <Link
                    href={`/course/${unitSlug}`}
                    className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:text-brand-dark"
                  >
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    Try again
                  </Link>
                </Alert>
              </div>
            ) : null}

            {/* ----------------------------------------------------- lessons */}
            {detail ? (
              <Card className="mt-8">
                <CardHeader
                  title="Lessons"
                  subtitle={
                    lessons.length > 0
                      ? `${lessons.length} lessons · ${requiredCount} required`
                      : undefined
                  }
                />
                {lessons.length > 0 ? (
                  <ol className="space-y-3">
                    {lessons.map((lesson, index) => (
                      <li
                        key={lesson.id}
                        className="flex items-start gap-3 rounded-xl border border-line bg-bg px-4 py-3.5 transition-colors hover:border-brand/40"
                      >
                        <span
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-xs font-bold text-brand"
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/learn/${unitSlug}/${lesson.slug}`}
                              className="break-words text-sm font-semibold text-ink underline-offset-2 hover:text-brand hover:underline"
                            >
                              {lesson.title}
                            </Link>
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
                        <Link
                          href={`/learn/${unitSlug}/${lesson.slug}`}
                          aria-label={`Open lesson: ${lesson.title}`}
                          className="mt-0.5 inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                        >
                          Open
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState
                    title="No lessons to show yet"
                    description="The lessons for this unit have not been published. Check back soon or contact us if you think this is wrong."
                  />
                )}
              </Card>
            ) : null}

            {/* ------------------------------------------------------- quiz */}
            {quiz ? (
              <Card className="mt-6">
                <CardHeader
                  title="Unit quiz"
                  subtitle={quiz.title}
                  action={
                    <Badge tone={quiz.isRequired ? "brand" : "neutral"}>
                      {quiz.isRequired ? "Required" : "Optional"}
                    </Badge>
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-bg px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Passing score
                    </p>
                    <p className="mt-1 text-lg font-bold text-navy">{quiz.passingPercentage}%</p>
                  </div>
                  <div className="rounded-xl bg-bg px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Maximum attempts
                    </p>
                    <p className="mt-1 text-lg font-bold text-navy">{quiz.maxAttempts}</p>
                  </div>
                </div>
                <p className="mt-4 break-words text-sm leading-relaxed text-muted">
                  Sign in to take the quiz once you have worked through this unit&apos;s lessons.
                  Your attempts and best score are tracked on your dashboard.
                </p>
              </Card>
            ) : null}

            {/* ---------------------------------------------- prev / next unit */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {prev ? (
                <Link
                  href={`/course/${prev.slug}`}
                  className="group flex min-h-11 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5 transition-colors hover:border-brand"
                >
                  <ArrowLeft
                    className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-brand"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted">Previous unit</span>
                    <span className="mt-1 block break-words text-sm font-semibold text-navy">
                      {prev.title}
                    </span>
                  </span>
                </Link>
              ) : (
                <div aria-hidden="true" className="hidden sm:block" />
              )}
              {next ? (
                <Link
                  href={`/course/${next.slug}`}
                  className="group flex min-h-11 items-center justify-end gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-right transition-colors hover:border-brand"
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-muted">Next unit</span>
                    <span className="mt-1 block break-words text-sm font-semibold text-navy">
                      {next.title}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-brand"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <div aria-hidden="true" className="hidden sm:block" />
              )}
            </div>

            {/* --------------------------------------------------------- CTAs */}
            <Card className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold text-navy">
                  Start learning this unit
                </h2>
                <p className="mt-2 break-words text-sm text-muted">
                  Create an account to save your progress, or sign in to continue where you left
                  off.
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
                <LinkButton href="/signup" className="w-full sm:w-auto">
                  Create account
                </LinkButton>
                <LinkButton href="/login" variant="outline" className="w-full sm:w-auto">
                  Sign in
                </LinkButton>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
