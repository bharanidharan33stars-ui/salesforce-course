"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Award, Download, ExternalLink, MailCheck } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Alert, Badge, Card, PageLoader } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";
import type { CertificateDetail } from "@/types";

export default function CertificateDetailPage() {
  const params = useParams<{ certificateId: string }>();
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCertificate(await api.get<CertificateDetail>(`/student/certificates/${params.certificateId}`));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [params.certificateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = async () => {
    if (!certificate) return;
    setBusy(true);
    setNotice(null);
    try {
      await api.download(`/student/certificates/${certificate.id}/download`, `${certificate.certificateNumber}.pdf`);
    } catch (caught) {
      setNotice({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!certificate) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await api.post<{ sent: boolean; message: string }>(
        `/student/certificates/${certificate.id}/resend-email`,
      );
      setNotice({ tone: result.sent ? "success" : "danger", text: result.message });
    } catch (caught) {
      setNotice({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 py-8">
        <div className="container-page mx-auto max-w-2xl">
          {loading ? (
            <PageLoader label="Loading certificate" />
          ) : error || !certificate ? (
            <div className="space-y-4">
              <Alert tone="danger" title="Certificate not found">{error}</Alert>
              <LinkButton href="/certificates" variant="outline">Back to certificates</LinkButton>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-navy">Certificate details</h1>
                <Link href="/certificates" className="text-sm font-medium text-brand underline underline-offset-2">
                  All certificates
                </Link>
              </div>

              {notice ? <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Alert> : null}

              <Card>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                    <Award className="h-6 w-6 text-success" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-navy">{certificate.courseTitle}</h2>
                    <p className="text-sm text-muted">Awarded to {certificate.holderName}</p>
                  </div>
                </div>

                <dl className="mt-5 divide-y divide-line text-sm">
                  <Row label="Certificate number" value={certificate.certificateNumber} mono />
                  <Row label="Issued on" value={new Date(String(certificate.issuedAt).replace(" ", "T")).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
                  <Row label="PDF status" value={certificate.pdfStatus === "generated" ? "Ready" : certificate.pdfStatus === "failed" ? "Generation failed" : "Preparing"} />
                  <Row label="E-mail status" value={certificate.emailStatus} />
                  <Row label="E-mail sent" value={certificate.emailSentAt ? new Date(String(certificate.emailSentAt).replace(" ", "T")).toLocaleString("en-GB") : "Not sent yet"} />
                </dl>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => void download()} loading={busy}>
                    <Download className="h-4 w-4" aria-hidden="true" /> Download PDF
                  </Button>
                  <button
                    type="button"
                    onClick={() => void resend()}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-5 text-sm font-semibold text-ink hover:border-brand hover:text-brand disabled:opacity-60"
                  >
                    <MailCheck className="h-4 w-4" aria-hidden="true" /> E-mail it to me
                  </button>
                </div>
              </Card>

              <Card>
                <h2 className="text-base font-bold text-navy">Public verification</h2>
                <p className="mt-1 text-sm text-muted">
                  Share this link so anyone can confirm the certificate is genuine. It shows the holder, course and
                  issue date - nothing else.
                </p>
                <a
                  href={certificate.verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-10 items-center gap-2 break-all rounded-lg bg-bg px-3 py-2 text-sm font-medium text-brand underline underline-offset-2"
                >
                  {certificate.verifyUrl}
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </Card>

              <p className="text-xs text-muted">
                Academy-issued course-completion certificate. This is not an official Salesforce certification.
              </p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-medium text-navy ${mono ? "font-mono" : ""} sm:text-right`}>{value || "—"}</dd>
    </div>
  );
}
