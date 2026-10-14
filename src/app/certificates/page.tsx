"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Download,
  ExternalLink,
  Lock,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert, Badge, Card, EmptyState, PageLoader, ProgressBar } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";
import type { CertificateListItem, DashboardData } from "@/types";

/**
 * Certificates area for students.
 * A certificate only exists once the backend has verified every requirement,
 * so this page never "issues" anything itself.
 */
export default function CertificatesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [certificates, setCertificates] = useState<CertificateListItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login?next=/certificates");
  }, [authLoading, isAuthenticated, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, dash] = await Promise.all([
        api.get<CertificateListItem[]>("/student/certificates"),
        api.get<DashboardData>("/student/dashboard").catch(() => null),
      ]);
      setCertificates(list);
      setDashboard(dash);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  const download = async (certificate: CertificateListItem) => {
    setBusyId(certificate.id);
    setNotice(null);
    try {
      await api.download(`/student/certificates/${certificate.id}/download`, `${certificate.certificateNumber}.pdf`);
    } catch (caught) {
      setNotice({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setBusyId(null);
    }
  };

  const resend = async (certificateId: number) => {
    setBusyId(certificateId);
    setNotice(null);
    try {
      const result = await api.post<{ sent: boolean; message: string }>(
        `/student/certificates/${certificateId}/resend-email`,
      );
      setNotice({ tone: result.sent ? "success" : "danger", text: result.message });
    } catch (caught) {
      setNotice({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setBusyId(null);
    }
  };

  const showContent = isAuthenticated && !authLoading;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 py-8">
        <div className="container-page mx-auto max-w-4xl">
          {authLoading || loading ? (
            <PageLoader label="Loading certificates" />
          ) : !showContent ? (
            <EmptyState
              title="Sign in to see your certificates"
              description="Certificates are issued to registered students who complete the course."
              action={<LinkButton href="/login">Sign in</LinkButton>}
            />
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-navy sm:text-3xl">Your certificates</h1>
                <p className="mt-1 text-sm text-muted">
                  Academy-issued course-completion certificates. These are not official Salesforce certifications.
                </p>
              </div>

              {error ? (
                <Alert tone="danger" title="We could not load your certificates" onDismiss={() => setError(null)}>
                  {error}
                  <button type="button" onClick={() => void load()} className="mt-2 flex items-center gap-1.5 font-semibold underline">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
                  </button>
                </Alert>
              ) : null}

              {notice ? <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Alert> : null}

              {certificates.length === 0 ? (
                <Card>
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg">
                      <Lock className="h-6 w-6 text-muted" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-navy">No certificate yet</h2>
                      <p className="mt-1 max-w-md text-sm text-muted">
                        Complete every required lesson and pass all five unit quizzes. Your certificate is generated
                        automatically the moment the last requirement is met.
                      </p>
                    </div>
                    {dashboard ? (
                      <div className="w-full max-w-md">
                        <ProgressBar value={dashboard.progress.percent} label="Overall progress" />
                        <p className="mt-2 text-xs text-muted">
                          {dashboard.progress.lessons.requiredCompleted}/{dashboard.progress.lessons.requiredTotal} required
                          lessons · {dashboard.progress.quizzes.passed}/{dashboard.progress.quizzes.requiredTotal} quizzes passed
                        </p>
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <LinkButton href="/course">Continue learning</LinkButton>
                      <LinkButton href="/dashboard" variant="outline">Go to dashboard</LinkButton>
                    </div>
                  </div>
                </Card>
              ) : (
                <ul className="space-y-4">
                  {certificates.map((certificate) => (
                    <li key={certificate.id}>
                      <Card>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Award className="h-5 w-5 text-success" aria-hidden="true" />
                              <h2 className="text-base font-bold text-navy">{certificate.courseTitle}</h2>
                              <Badge tone="success">Issued</Badge>
                              <EmailBadge status={certificate.emailStatus} />
                            </div>
                            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                              <div className="flex gap-2">
                                <dt className="text-muted">Certificate ID</dt>
                                <dd className="font-mono font-semibold text-navy">{certificate.certificateNumber}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="text-muted">Issued</dt>
                                <dd className="text-ink">{certificate.issuedAtFormatted}</dd>
                              </div>
                            </dl>
                            <p className="mt-2 text-xs text-muted">
                              Verify any time at{" "}
                              <Link href={`/verify-certificate/${certificate.verificationId}`} className="font-medium text-brand underline underline-offset-2">
                                the public verification page
                              </Link>
                              .
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                            <Button onClick={() => void download(certificate)} loading={busyId === certificate.id}>
                              <Download className="h-4 w-4" aria-hidden="true" />
                              Download PDF
                            </Button>
                            <button
                              type="button"
                              onClick={() => void resend(certificate.id)}
                              disabled={busyId === certificate.id}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-3.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand disabled:opacity-60"
                            >
                              <MailCheck className="h-4 w-4" aria-hidden="true" />
                              E-mail it again
                            </button>
                            <Link
                              href={`/certificates/${certificate.id}`}
                              className="inline-flex min-h-10 items-center gap-1.5 px-1 text-sm font-medium text-muted hover:text-brand"
                            >
                              Certificate details <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-line bg-white px-4 py-3 text-xs text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <p>
                  Certificates are generated only after the server confirms every required lesson and quiz. Each one
                  carries a unique verification ID that anyone can check on the verification page.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function EmailBadge({ status }: { status: string }) {
  if (status === "accepted") return <Badge tone="success">E-mail sent</Badge>;
  if (status === "failed") return <Badge tone="danger">E-mail failed</Badge>;
  if (status === "retrying") return <Badge tone="warning">E-mail retrying</Badge>;
  return <Badge tone="neutral">E-mail queued</Badge>;
}
