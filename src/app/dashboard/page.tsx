"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Circle,
  Download,
  MailCheck,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert, Badge, Card, CardHeader, EmptyState, PageLoader, ProgressBar } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";
import { formatDate, formatRelative } from "@/lib/utils";
import type { DashboardData } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<DashboardData>("/student/dashboard"));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Enrols the signed-in student, then refreshes so the stats appear. */
  const enroll = async () => {
    if (!data) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      await api.post(`/courses/${data.course.id}/enroll`);
      await load();
    } catch (caught) {
      setEnrollError(errorMessage(caught));
    } finally {
      setEnrolling(false);
    }
  };

  const downloadCertificate = async (certificateId: number, certificateNumber: string) => {
    setDownloading(true);
    try {
      await api.download(`/student/certificates/${certificateId}/download`, `${certificateNumber}.pdf`);
    } catch (caught) {
      setResendMessage({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setDownloading(false);
    }
  };

  const resendEmail = async (certificateId: number) => {
    setResending(true);
    setResendMessage(null);
    try {
      const result = await api.post<{ sent: boolean; simulated: boolean; message: string }>(
        `/student/certificates/${certificateId}/resend-email`,
      );
      setResendMessage({ tone: result.sent ? "success" : "danger", text: result.message });
    } catch (caught) {
      setResendMessage({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setResending(false);
    }
  };

  if (loading) return <PageLoader label="Loading your progress" />;
  if (error) {
    return (
      <Alert tone="danger" title="We could not load your dashboard" onDismiss={() => setError(null)}>
        {error}
        <button type="button" onClick={() => void load()} className="mt-2 flex items-center gap-1.5 font-semibold text-danger underline">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </button>
      </Alert>
    );
  }
  if (!data) return null;

  const { progress, course, certificate, lastLesson } = data;
  const lessonsRemaining = progress.lessons.requiredTotal - progress.lessons.requiredCompleted;
  const quizzesRemaining = progress.quizzes.requiredTotal - progress.quizzes.passed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Welcome back, {user?.fullName?.split(" ")[0] ?? "student"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {progress.completedAt
            ? `You completed this course on ${formatDate(progress.completedAt)}.`
            : "Pick up where you left off and keep your momentum going."}
        </p>
      </div>

      {certificate ? (
        <Alert tone="success" title="Course completed — your certificate is ready">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Certificate <span className="font-semibold">{certificate.certificateNumber}</span> was issued on{" "}
              {formatDate(certificate.issuedAt)}. {data.emailDeliveryNote}
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void downloadCertificate(certificate.id, certificate.certificateNumber)}
                disabled={downloading}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-success px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {downloading ? "Preparing…" : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => void resendEmail(certificate.id)}
                disabled={resending}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink disabled:opacity-60"
              >
                <MailCheck className="h-4 w-4" aria-hidden="true" />
                {resending ? "Sending…" : "E-mail it to me"}
              </button>
            </div>
          </div>
          {resendMessage ? (
            <p className={`mt-2 text-sm font-medium ${resendMessage.tone === "success" ? "text-success" : "text-danger"}`}>
              {resendMessage.text}
            </p>
          ) : null}
        </Alert>
      ) : null}

      {/* Overall progress / enrollment */}
      {!progress.enrolled ? (
        <Card>
          <CardHeader
            title={course.title}
            subtitle="Enrol to start tracking your lessons, quizzes and certificate progress."
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              loading={enrolling}
              onClick={() => void enroll()}
            >
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              {enrolling ? "Enrolling…" : "Enroll in the course"}
            </Button>
            <LinkButton href="/course" variant="outline" size="lg">
              View course outline first
            </LinkButton>
          </div>
          {enrollError ? <Alert tone="danger" className="mt-4" onDismiss={() => setEnrollError(null)}>{enrollError}</Alert> : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={course.title}
          subtitle={
            progress.enrolled
              ? `Enrolled since ${formatDate(progress.enrolledAt)}`
              : "You are not enrolled yet."
          }
          action={<Badge tone={progress.completedAt ? "success" : "brand"}>{progress.completedAt ? "Completed" : "In progress"}</Badge>}
        />
        <ProgressBar value={progress.percent} label="Overall course progress" tone={progress.completedAt ? "success" : "brand"} />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Units complete"
            value={`${progress.totals.completedUnits}/${progress.totals.units}`}
            icon={<BookOpenCheck className="h-4 w-4 text-brand" aria-hidden="true" />}
          />
          <StatTile
            label="Required lessons left"
            value={`${lessonsRemaining}`}
            icon={<CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" />}
          />
          <StatTile
            label="Quizzes passed"
            value={`${progress.quizzes.passed}/${progress.quizzes.requiredTotal}`}
            icon={<Award className="h-4 w-4 text-brand" aria-hidden="true" />}
          />
          <StatTile
            label="Certificate"
            value={certificate ? "Issued" : "Locked"}
            icon={<Award className={`h-4 w-4 ${certificate ? "text-success" : "text-muted"}`} aria-hidden="true" />}
          />
        </div>
      </Card>

      {/* Continue learning */}
      <Card>
        <CardHeader
          title="Continue learning"
          subtitle={lastLesson ? `Last opened: ${lastLesson.lesson_title} (${formatRelative(lastLesson.last_accessed_at)})` : "Start with your first lesson."}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <LinkButton href={data.continueUrl} fullWidth className="sm:w-auto">
            {lastLesson ? "Continue" : "Start learning"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </LinkButton>
          <LinkButton href="/course" variant="outline" fullWidth className="sm:w-auto">
            View course outline
          </LinkButton>
        </div>
      </Card>

      {/* Units */}
      <Card>
        <CardHeader title="Your units" subtitle="Every unit needs its required lessons completed and its quiz passed." />
        <ul className="divide-y divide-line">
          {progress.units.map((unit) => (
            <li key={unit.unitId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link href={`/course/${unit.slug}`} className="font-semibold text-navy hover:text-brand">
                  {unit.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {unit.requiredCompleted}/{unit.requiredTotal} required lessons ·{" "}
                  {unit.quizPassed ? "quiz passed" : "quiz pending"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {unit.complete ? (
                  <Badge tone="success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Complete
                  </Badge>
                ) : (
                  <Badge tone="neutral">
                    <Circle className="h-3.5 w-3.5" aria-hidden="true" /> In progress
                  </Badge>
                )}
                <Link
                  href={`/course/${unit.slug}`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Quizzes */}
      <Card>
        <CardHeader
          title="Unit quizzes"
          subtitle={`${quizzesRemaining} quiz${quizzesRemaining === 1 ? "" : "zes"} still to pass before your certificate is unlocked.`}
        />
        {progress.quizzes.items.length === 0 ? (
          <EmptyState title="No quizzes yet" description="Quizzes appear here once your instructor publishes them." />
        ) : (
          <ul className="divide-y divide-line">
            {progress.quizzes.items.map((quiz) => (
              <li key={quiz.quizId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{quiz.unitTitle}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Pass mark {quiz.passingPercentage}% · {quiz.attempts} attempt{quiz.attempts === 1 ? "" : "s"} used
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {quiz.passed ? (
                    <Badge tone="success">Passed</Badge>
                  ) : quiz.attempts > 0 ? (
                    <Badge tone="warning">Retry needed</Badge>
                  ) : (
                    <Badge tone="neutral">Not attempted</Badge>
                  )}
                  <Link
                    href={`/quizzes/${quiz.quizId}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {quiz.passed ? "Review" : quiz.attempts > 0 ? "Try again" : "Start"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </motion.div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-bg px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-navy">{value}</p>
    </div>
  );
}
