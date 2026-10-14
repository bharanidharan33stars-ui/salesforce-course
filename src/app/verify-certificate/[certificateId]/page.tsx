"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, CalendarCheck2, GraduationCap, Search, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Alert, Card, PageLoader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import type { PublicVerification } from "@/types";

/**
 * Public verification result.
 * Shows only what a verifier needs: holder, course, issue date, number.
 * No e-mail address, no user id, no internal identifiers.
 */
export default function VerifyResultPage() {
  const params = useParams<{ certificateId: string }>();
  const [result, setResult] = useState<PublicVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.get<PublicVerification>(`/public/certificates/${params.certificateId}/verify`));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [params.certificateId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 py-10 sm:py-16">
        <div className="container-page mx-auto max-w-2xl">
          {loading ? (
            <PageLoader label="Checking certificate" />
          ) : error || !result ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <Card className="text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft">
                  <XCircle className="h-7 w-7 text-danger" aria-hidden="true" />
                </span>
                <h1 className="text-2xl font-bold text-navy">Certificate not found</h1>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                  {error ?? "No certificate matches this verification ID."} Double-check the code on the certificate
                  and try again.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <LinkButton href="/verify-certificate">
                    <Search className="h-4 w-4" aria-hidden="true" /> Try another ID
                  </LinkButton>
                  <LinkButton href="/" variant="outline">Back to home</LinkButton>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
              <Card className="text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft">
                  <BadgeCheck className="h-7 w-7 text-success" aria-hidden="true" />
                </span>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-sm font-semibold text-success">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Verified — certificate is genuine
                </div>
                <h1 className="text-2xl font-bold text-navy sm:text-3xl">{result.holderName}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  has successfully completed the course
                </p>
                <p className="mt-1 text-lg font-bold text-brand">{result.courseTitle}</p>
              </Card>

              <Card>
                <dl className="divide-y divide-line text-sm">
                  <Row icon={<UserRound className="h-4 w-4 text-brand" aria-hidden="true" />} label="Holder" value={result.holderName} />
                  <Row icon={<GraduationCap className="h-4 w-4 text-brand" aria-hidden="true" />} label="Course" value={result.courseTitle} />
                  <Row icon={<CalendarCheck2 className="h-4 w-4 text-brand" aria-hidden="true" />} label="Issued on" value={result.issuedAtFormatted} />
                  <Row icon={<BadgeCheck className="h-4 w-4 text-brand" aria-hidden="true" />} label="Issued by" value={result.academyName} />
                  <Row icon={<ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />} label="Certificate number" value={result.certificateNumber} mono />
                </dl>
              </Card>

              {result.footerNote ? (
                <p className="text-center text-xs leading-relaxed text-muted">{result.footerNote}</p>
              ) : null}

              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <LinkButton href="/verify-certificate" variant="outline">
                  <Search className="h-4 w-4" aria-hidden="true" /> Verify another
                </LinkButton>
                <LinkButton href="/course" variant="ghost">Learn about this course</LinkButton>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="flex items-center gap-2 text-muted">
        {icon}
        {label}
      </dt>
      <dd className={`break-words font-medium text-navy sm:text-right ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
