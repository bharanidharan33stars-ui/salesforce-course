"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileCode2,
  FileText,
  Loader2,
  Lock,
  PlayCircle,
  Video,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Markdown } from "@/lib/markdown";
import { Alert, Badge, Card, PageLoader, ProgressBar } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import type { LessonContext, LessonActionResult } from "@/types";

const CONTENT_ICONS = {
  article: FileText,
  code: FileCode2,
  video: Video,
  document: FileText,
} as const;

export default function LessonPage() {
  const params = useParams<{ unitSlug: string; lessonSlug: string }>();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const reduceMotion = useReducedMotion();

  const [context, setContext] = useState<LessonContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [certificateUnlocked, setCertificateUnlocked] = useState(false);
  const startedLessonIdRef = useRef<number | null>(null);
  const activeChipRef = useRef<HTMLAnchorElement | null>(null);
  const activeSlug = context?.lesson.slug;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<LessonContext>(
        `/student/lessons/unit/${encodeURIComponent(params.unitSlug)}/${encodeURIComponent(params.lessonSlug)}`,
      );
      setContext(data);
      return data;
    } catch (caught) {
      setError(errorMessage(caught));
      return null;
    } finally {
      setLoading(false);
    }
  }, [params.unitSlug, params.lessonSlug]);

  // Load the lesson, then record that it was opened (progress tracking).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await load();
      if (cancelled || !data || !isAuthenticated) return;
      if (startedLessonIdRef.current === data.lesson.id) return;
      startedLessonIdRef.current = data.lesson.id;
      try {
        await api.post<LessonActionResult>(`/student/lessons/${data.lesson.id}/start`);
      } catch {
        /* progress tracking must never block reading the lesson */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, isAuthenticated]);

  // Keep the active lesson chip visible inside the mobile scroll strip.
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeSlug, reduceMotion]);

  const markComplete = async () => {
    if (!context) return;
    setCompleting(true);
    try {
      const result = await api.post<LessonActionResult>(
        `/student/lessons/${context.lesson.id}/complete`,
      );
      setContext((current) => (current ? { ...current, status: result.status, completedAt: result.completedAt } : current));
      setJustCompleted(result.status === "completed");
      setCertificateUnlocked(result.certificateIssued);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setCompleting(false);
    }
  };

  if (authLoading || loading) return <PageLoader label="Opening lesson" />;
  if (error && !context) {
    // Signed-out visitor followed a lesson link: offer the sign-in path
    // instead of showing a raw API error.
    if (!isAuthenticated) {
      return (
        <Card className="mx-auto max-w-lg text-center">
          <h1 className="text-xl font-bold text-navy">Sign in to open this lesson</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Lessons live in the course area, so we need to know who you are first. It only takes a moment.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton
              href={`/login?next=${encodeURIComponent(`/learn/${params.unitSlug}/${params.lessonSlug}`)}`}
            >
              Sign in
            </LinkButton>
            <LinkButton href="/signup" variant="outline">
              Create an account
            </LinkButton>
          </div>
        </Card>
      );
    }
    return (
      <div className="space-y-4">
        <Alert tone="danger" title="This lesson could not be loaded">
          {error}
        </Alert>
        <LinkButton href="/course" variant="outline">
          Back to course
        </LinkButton>
      </div>
    );
  }
  if (!context) return null;

  const { lesson, unit, course, prev, next, unitLessons, completionRule } = context;
  const ContentIcon = CONTENT_ICONS[lesson.contentType] ?? FileText;
  const isCompleted = context.status === "completed";
  const requiresManualCompletion = completionRule !== "auto";

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      {/* Lesson navigator - horizontal touch strip on mobile, sticky list on desktop */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">In this unit</p>
              <p className="mt-1 truncate text-sm font-bold text-navy">{unit.title}</p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand tabular-nums">
              {unitLessons.filter((l) => l.status === "completed").length}/{unitLessons.length}
            </span>
          </div>

          <ProgressBar
            className="mt-3"
            value={unitLessons.filter((l) => l.status === "completed").length}
            max={unitLessons.length}
            label="Lessons"
            showValue={false}
          />

          <div className="relative mt-3">
            <ul className="scroll-strip -mx-1 flex gap-2 px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-x-visible lg:px-0 lg:pb-0">
              {unitLessons.map((item, index) => {
                const active = item.slug === lesson.slug;
                const completed = item.status === "completed";
                return (
                  <li key={item.id} className="shrink-0 lg:shrink">
                    <Link
                      ref={active ? activeChipRef : undefined}
                      href={`/learn/${unit.slug}/${item.slug}`}
                      className={cn(
                        "relative flex min-h-11 max-w-[13rem] items-center gap-2 rounded-full border px-3.5 text-sm transition-colors duration-200 lg:max-w-none lg:rounded-xl",
                        active
                          ? "border-brand font-semibold text-white shadow-md shadow-brand/30"
                          : "border-line bg-surface text-ink hover:border-brand/40 hover:text-brand active:scale-[0.98]",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="active-lesson-pill"
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-brand to-brand-dark lg:rounded-xl"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      ) : null}
                      <span className="relative z-10 flex min-w-0 items-center gap-2">
                        {completed ? (
                          <CheckCircle2
                            className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-success")}
                            aria-hidden="true"
                          />
                        ) : (
                          <span
                            className={cn(
                              "w-4 shrink-0 text-center text-xs font-bold",
                              active ? "text-white/90" : "text-muted",
                            )}
                          >
                            {index + 1}
                          </span>
                        )}
                        <span className="truncate">{item.title}</span>
                        {!item.isRequired ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              active ? "bg-white/20 text-white" : "bg-bg text-muted",
                            )}
                          >
                            opt
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {/* Right-edge fade: hints that the strip scrolls sideways on mobile. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent lg:hidden"
            />
          </div>
        </Card>
      </aside>

      {/* Lesson body */}
      <motion.article
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="min-w-0"
      >
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted">
          <Link href="/course" className="hover:text-brand">Course</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href={`/course/${unit.slug}`} className="hover:text-brand">{unit.title}</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-ink">{lesson.title}</span>
        </nav>

        <Card className="p-5 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="brand">
              <ContentIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {lesson.contentType}
            </Badge>
            {lesson.isRequired === 1 ? (
              <Badge tone="neutral">Required</Badge>
            ) : (
              <Badge tone="neutral">Optional</Badge>
            )}
            {isCompleted ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Completed
              </Badge>
            ) : null}
          </div>

          {/* Colourful lesson banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-dark p-5 text-white shadow-lg shadow-brand/25 sm:p-7">
            <div
              aria-hidden="true"
              className="animate-float pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10"
            />
            <div
              aria-hidden="true"
              className="animate-float pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-white/10"
              style={{ animationDelay: "1.6s" }}
            />
            <p className="relative text-xs font-semibold uppercase tracking-widest text-white/75">
              {unit.title}
            </p>
            <h1 className="relative mt-1.5 text-2xl font-extrabold leading-tight sm:text-4xl">
              {lesson.title}
            </h1>
            {lesson.summary ? (
              <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                {lesson.summary}
              </p>
            ) : null}
            <div className="relative mt-4 h-1 w-20 rounded-full bg-white/40" />
          </div>

          <div className="mt-6">
            <Markdown content={lesson.content} />
          </div>

          {lesson.resourceUrl ? (
            <div className="mt-6 rounded-xl border border-line bg-bg p-4">
              <p className="text-sm font-semibold text-navy">Extra resource</p>
              <a
                href={lesson.resourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-brand underline underline-offset-2"
              >
                Open the recommended documentation
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          ) : null}

          {/* Completion */}
          <div className="mt-7 border-t border-line pt-5 sm:mt-8 sm:pt-6">
            {certificateUnlocked ? (
              <Alert
                tone="success"
                title="Congratulations — you completed the course!"
                className="animate-pop"
              >
                Your certificate has been generated and queued for e-mail delivery.
                <div className="mt-3">
                  <LinkButton href="/certificates" size="sm">View my certificates</LinkButton>
                </div>
              </Alert>
            ) : null}

            {isCompleted ? (
              <div className="flex flex-wrap items-center gap-3">
                <motion.p
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-success"
                >
                  <CheckCircle2 className="h-5 w-5 animate-pop" aria-hidden="true" />
                  Lesson completed
                  {context.completedAt ? ` on ${new Date(String(context.completedAt).replace(" ", "T")).toLocaleDateString("en-GB")}` : ""}
                </motion.p>
                <LinkButton href="/dashboard" variant="ghost" size="sm">
                  Back to dashboard
                </LinkButton>
              </div>
            ) : requiresManualCompletion ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <motion.div
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  className="inline-flex"
                >
                  <Button onClick={() => void markComplete()} loading={completing} size="lg">
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    {completing ? "Saving…" : "Mark lesson as complete"}
                  </Button>
                </motion.div>
                <p className="text-xs text-muted">
                  A lesson counts as complete only when you confirm it here.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">This lesson completes automatically once opened.</p>
            )}

            {justCompleted && !certificateUnlocked ? (
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-success"
              >
                <CheckCircle2 className="h-5 w-5 animate-pop" aria-hidden="true" />
                Progress saved. Nice work!
              </motion.p>
            ) : null}
          </div>

          {/* Prev / next */}
          <div className="mt-7 flex flex-col gap-3 border-t border-line pt-5 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
            {prev ? (
              <motion.div
                whileHover={reduceMotion ? undefined : { x: -4 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className="w-full sm:inline-flex sm:w-auto"
              >
                <Link
                  href={`/learn/${prev.unitSlug}/${prev.slug}`}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-center text-sm font-semibold leading-snug text-ink transition-colors hover:border-brand hover:text-brand sm:w-auto sm:justify-start sm:py-0 sm:text-left"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words whitespace-normal">{prev.title}</span>
                </Link>
              </motion.div>
            ) : (
              <span />
            )}

            {next ? (
              <motion.div
                whileHover={reduceMotion ? undefined : { x: 4 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className="w-full sm:inline-flex sm:w-auto"
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => router.push(`/learn/${next.unitSlug}/${next.slug}`)}
                >
                  <span className="min-w-0 break-words whitespace-normal">{next.title}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Button>
              </motion.div>
            ) : (
              <LinkButton href={`/course/${unit.slug}`} variant="outline" size="lg" className="w-full sm:w-auto">
                Back to unit
              </LinkButton>
            )}
          </div>

          {!next && unitLessons.every((item) => item.status === "completed") ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Finish the unit quiz to unlock the next step.
            </p>
          ) : null}
        </Card>
      </motion.article>
    </div>
  );
}
