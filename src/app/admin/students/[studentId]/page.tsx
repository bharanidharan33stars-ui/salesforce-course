"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { AdminStudentDetail } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageLoader,
  ProgressBar,
} from "@/components/ui/primitives";

function statusBadge(status: AdminStudentDetail["user"]["status"]) {
  return status === "active" ? (
    <Badge tone="success">Active</Badge>
  ) : (
    <Badge tone="danger">Disabled</Badge>
  );
}

export default function AdminStudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId ?? "";

  const [data, setData] = useState<AdminStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<AdminStudentDetail>(`/admin/students/${studentId}`));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () => () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    },
    [],
  );

  // Auto-dismiss the success message after 5 seconds.
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const handleToggleStatus = async () => {
    if (!data) return;
    const nextStatus = data.user.status === "active" ? "disabled" : "active";

    // Two-step confirmation: first press arms, second press (within 3s) confirms.
    if (!confirming) {
      setConfirming(true);
      setActionError(null);
      confirmTimer.current = window.setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setConfirming(false);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    setSaving(true);
    setActionError(null);
    try {
      await api.patch(`/admin/students/${data.user.id}/status`, { status: nextStatus });
      setData({ ...data, user: { ...data.user, status: nextStatus } });
      setSuccess(
        nextStatus === "disabled"
          ? `${data.user.fullName}'s account has been disabled. They can no longer sign in.`
          : `${data.user.fullName}'s account has been re-enabled.`,
      );
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading student" />;

  if (error || !data) {
    return (
      <div className="space-y-4 animate-fade-up">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to students
        </Link>
        <Alert tone="danger" title="Could not load this student">
          <p>{error ?? "Student not found."}</p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  const { user, progress, quizAttempts, certificate } = data;
  const isDisabled = user.status === "disabled";

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-3">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to students
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-bold text-navy">{user.fullName}</h1>
              {statusBadge(user.status)}
            </div>
            <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
          </div>
          <Button
            variant={isDisabled ? "primary" : "danger"}
            size="sm"
            onClick={() => void handleToggleStatus()}
            disabled={saving}
            loading={saving}
            className="shrink-0 self-start sm:self-auto"
          >
            {confirming
              ? `Confirm — ${isDisabled ? "enable" : "disable"}?`
              : isDisabled
                ? "Enable account"
                : "Disable account"}
          </Button>
        </div>
      </div>

      {actionError ? (
        <Alert tone="danger" title="Action failed" onDismiss={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      {success ? (
        <Alert tone="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {/* Profile */}
      <Card>
        <CardHeader title="Profile" />
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Full name</dt>
            <dd className="mt-1 text-sm font-medium text-ink">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">E-mail</dt>
            <dd className="mt-1 break-all text-sm font-medium text-ink">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Status</dt>
            <dd className="mt-1">{statusBadge(user.status)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              E-mail verified
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : "Not verified"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Account created
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Enrolled</dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {progress?.enrolledAt ? formatDate(progress.enrolledAt) : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Overall progress */}
      <Card>
        <CardHeader
          title="Overall progress"
          subtitle={
            progress
              ? `Course completion is based on required lessons and quizzes.`
              : "This student has not enrolled yet."
          }
        />
        {progress ? (
          <div className="space-y-5">
            <ProgressBar
              value={progress.percent}
              label="Course progress"
              tone={progress.percent >= 100 ? "success" : "brand"}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-bg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Lessons</p>
                <p className="mt-1 text-lg font-bold text-navy">
                  {progress.lessons.requiredCompleted} / {progress.lessons.requiredTotal}
                </p>
                <p className="text-xs text-muted">required lessons completed</p>
              </div>
              <div className="rounded-xl border border-line bg-bg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Quizzes</p>
                <p className="mt-1 text-lg font-bold text-navy">
                  {progress.quizzes.passed} / {progress.quizzes.requiredTotal}
                </p>
                <p className="text-xs text-muted">required quizzes passed</p>
              </div>
              <div className="rounded-xl border border-line bg-bg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Units</p>
                <p className="mt-1 text-lg font-bold text-navy">
                  {progress.totals.completedUnits} / {progress.totals.units}
                </p>
                <p className="text-xs text-muted">units complete</p>
              </div>
            </div>
            {progress.completedAt ? (
              <p className="text-sm text-muted">
                Course completed on{" "}
                <span className="font-semibold text-ink">{formatDate(progress.completedAt)}</span>.
              </p>
            ) : null}

            {/* Unit-by-unit */}
            <div>
              <h3 className="mb-3 text-sm font-bold text-navy">Unit-by-unit progress</h3>
              {progress.units.length === 0 ? (
                <p className="text-sm text-muted">No units to display.</p>
              ) : (
                <ul className="space-y-3">
                  {progress.units.map((unit) => (
                    <li key={unit.unitId} className="rounded-xl border border-line p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 break-words text-sm font-semibold text-ink">
                          {unit.title}
                        </p>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          {unit.quizPassed ? <Badge tone="success">Quiz passed</Badge> : null}
                          {unit.complete ? (
                            <Badge tone="brand">Complete</Badge>
                          ) : (
                            <Badge tone="neutral">In progress</Badge>
                          )}
                        </div>
                      </div>
                      <ProgressBar
                        value={unit.requiredCompleted}
                        max={unit.requiredTotal}
                        label="Required items"
                        showValue
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No progress yet"
            description="Once this student enrols, their lesson and quiz progress will appear here."
          />
        )}
      </Card>

      {/* Quiz attempts */}
      <Card>
        <CardHeader
          title="Quiz attempt history"
          subtitle={`Every submitted attempt, oldest first.`}
        />
        {quizAttempts.length === 0 ? (
          <EmptyState
            title="No quiz attempts"
            description="This student has not submitted any quizzes yet."
          />
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">Attempt #</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Score</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Result</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {quizAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td className="px-4 py-3 font-medium text-ink">#{attempt.attemptNumber}</td>
                      <td className="px-4 py-3 font-medium text-ink">{attempt.score}%</td>
                      <td className="px-4 py-3">
                        {attempt.passed ? (
                          <Badge tone="success">Pass</Badge>
                        ) : (
                          <Badge tone="danger">Fail</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {attempt.submittedAt ? formatDate(attempt.submittedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <ul className="space-y-2 md:hidden">
              {quizAttempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      Attempt #{attempt.attemptNumber} · {attempt.score}%
                    </p>
                    <p className="text-xs text-muted">
                      {attempt.submittedAt ? formatDate(attempt.submittedAt) : "—"}
                    </p>
                  </div>
                  {attempt.passed ? (
                    <Badge tone="success">Pass</Badge>
                  ) : (
                    <Badge tone="danger">Fail</Badge>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* Certificate */}
      <Card>
        <CardHeader title="Certificate" />
        {certificate ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Certificate number
              </dt>
              <dd className="mt-1 break-all font-mono text-sm font-medium text-ink">
                {certificate.certificateNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Issued</dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {formatDate(certificate.issuedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">PDF</dt>
              <dd className="mt-1">
                <Badge tone={certificate.pdfStatus === "generated" ? "success" : "warning"}>
                  {certificate.pdfStatus}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">E-mail</dt>
              <dd className="mt-1">
                <Badge tone={certificate.emailStatus === "sent" ? "success" : "warning"}>
                  {certificate.emailStatus}
                </Badge>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="rounded-xl border border-dashed border-line bg-bg px-4 py-6 text-center text-sm font-medium text-muted">
            Not issued
          </p>
        )}
      </Card>
    </div>
  );
}
