"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { formatRelative } from "@/lib/utils";
import type { AdminDashboard } from "@/types";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, CardHeader, EmptyState, PageLoader } from "@/components/ui/primitives";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </Card>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<AdminDashboard>("/admin/dashboard"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader label="Loading dashboard" />;

  if (error) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-navy">Overview</h1>
          <p className="mt-1 text-sm text-muted">Academy activity at a glance.</p>
        </div>
        <Alert tone="danger" title="Could not load the dashboard">
          <p>{error}</p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  const passRate =
    data.quiz.totalAttempts > 0
      ? Math.round((data.quiz.passedAttempts / data.quiz.totalAttempts) * 100)
      : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-navy">Overview</h1>
        <p className="mt-1 text-sm text-muted">Academy activity at a glance.</p>
      </div>

      {data.emailDeliveryMode === "development" ? (
        <Alert tone="warning" title="E-mail delivery is in development mode">
          <p>
            SMTP is not configured on this deployment, so certificate e-mails are{" "}
            <strong>not actually sent</strong>. Instead they are written to files under{" "}
            <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">backend/storage/mail</code>{" "}
            where you can open them manually.
          </p>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 sm:grid-cols-3">
        <StatCard label="Total students" value={String(data.totalStudents)} />
        <StatCard label="Enrolled" value={String(data.enrolledStudents)} />
        <StatCard label="Active (last 7 days)" value={String(data.activeStudentsLast7Days)} />
        <StatCard label="Courses completed" value={String(data.completedCourses)} />
        <StatCard label="Certificates issued" value={String(data.certificatesIssued)} />
        <StatCard
          label="Quiz pass rate"
          value={passRate === null ? "—" : `${passRate}%`}
          hint={
            data.quiz.totalAttempts > 0
              ? `${data.quiz.passedAttempts} of ${data.quiz.totalAttempts} attempts passed`
              : "No quiz attempts yet"
          }
        />
        <StatCard
          label="E-mail issues"
          value={String(data.emailIssues)}
          hint={
            data.emailIssues > 0
              ? "Certificate e-mails that encountered a problem"
              : "No delivery problems detected"
          }
        />
        <StatCard
          label="Students with a pass"
          value={String(data.quiz.studentsWithAPass)}
          hint="Students who have passed at least one required quiz"
        />
      </div>

      <Card>
        <CardHeader
          title="Recent activity"
          subtitle="The latest actions recorded in the academy."
        />
        {data.recentActivity.length === 0 ? (
          <EmptyState
            title="No recent activity"
            description="Enrolments, lesson completions, quiz attempts and certificate issues will appear here."
            action={
              <span className="inline-flex items-center gap-2 text-sm text-muted">
                <Users className="h-4 w-4" aria-hidden="true" />
                Check back once students start learning.
              </span>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-ink">{item.action}</p>
                  {item.entityType ? (
                    <p className="mt-0.5 text-xs text-muted">
                      {item.entityType}
                      {item.entityId ? ` · #${item.entityId}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.entityType ? (
                    <Badge tone="neutral">{item.entityType}</Badge>
                  ) : null}
                  <span className="text-xs text-muted">{formatRelative(item.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
