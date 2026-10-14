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
import { Alert, Badge, Card, PageLoader } from "@/components/ui/primitives";
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
      {/* Lesson sidebar - collapses into a horizontal list on mobile */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">In this unit</p>
          <p className="mt-1 text-sm font-bold text-navy">{unit.title}</p>
          <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {unitLessons.map((item, index) => {
              const active = item.slug === lesson.slug;
              return (
                <li key={item.id} className="shrink-0 lg:shrink">
                  <Link
                    href={`/learn/${unit.slug}/${item.slug}`}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors",
                      active ? "bg-brand-soft font-semibold text-brand" : "text-ink hover:bg-bg",
                    )}
                  >
                    {item.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <span className="w-4 shrink-0 text-center text-xs text-muted">{index + 1}</span>
                    )}
                    <span className="max-w-[14rem] truncate lg:max-w-none">{item.title}</span>
                    {!item.isRequired ? <span className="text-[10px] text-muted">(optional)</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
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

          <h1 className="text-2xl font-bold text-navy sm:text-3xl">{lesson.title}</h1>
          {lesson.summary ? <p className="mt-2 text-base leading-relaxed text-muted">{lesson.summary}</p> : null}

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
          <div className="mt-8 border-t border-line pt-6">
            {certificateUnlocked ? (
              <Alert tone="success" title="Congratulations — you completed the course!">
                Your certificate has been generated and queued for e-mail delivery.
                <div className="mt-3">
                  <LinkButton href="/certificates" size="sm">View my certificates</LinkButton>
                </div>
              </Alert>
            ) : null}

            {isCompleted ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  Lesson completed
                  {context.completedAt ? ` on ${new Date(String(context.completedAt).replace(" ", "T")).toLocaleDateString("en-GB")}` : ""}
                </p>
                <LinkButton href="/dashboard" variant="ghost" size="sm">
                  Back to dashboard
                </LinkButton>
              </div>
            ) : requiresManualCompletion ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button onClick={() => void markComplete()} loading={completing} size="lg">
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  {completing ? "Saving…" : "Mark lesson as complete"}
                </Button>
                <p className="text-xs text-muted">
                  A lesson counts as complete only when you confirm it here.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">This lesson completes automatically once opened.</p>
            )}

            {justCompleted && !certificateUnlocked ? (
              <p className="mt-3 text-sm font-medium text-success">Progress saved. Nice work!</p>
            ) : null}
          </div>

          {/* Prev / next */}
          <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            {prev ? (
              <Link
                href={`/learn/${prev.unitSlug}/${prev.slug}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="max-w-[10rem] truncate">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}

            {next ? (
              <Button
                size="lg"
                onClick={() => router.push(`/learn/${next.unitSlug}/${next.slug}`)}
              >
                <span className="max-w-[10rem] truncate">{next.title}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <LinkButton href={`/course/${unit.slug}`} variant="outline" size="lg">
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
