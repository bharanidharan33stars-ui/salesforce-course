"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/** Public page where anyone can paste a verification ID or a full link. */
export default function VerifyCertificatePage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Paste a certificate number link or verification ID.");
      return;
    }

    // Accept a full URL and extract the trailing segment.
    const match = /([0-9a-f]{32})/i.exec(trimmed);
    if (!match) {
      setError("That does not look like a valid verification ID (32 hexadecimal characters).");
      return;
    }
    setError(null);
    router.push(`/verify-certificate/${match[1].toLowerCase()}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 py-10 sm:py-16">
        <div className="container-page mx-auto max-w-xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mb-6 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
                <ShieldCheck className="h-7 w-7 text-brand" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold text-navy sm:text-3xl">Verify a certificate</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Enter the verification ID printed on the certificate, or paste the full verification link, to confirm
                that it was genuinely issued by the academy.
              </p>
            </div>

            <Card>
              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Verification ID or link"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="e.g. 3f9c1a2b4d5e6f708192a3b4c5d6e7f8"
                  error={error ?? undefined}
                  hint="The ID is a long code of letters and numbers shown under the certificate details."
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button type="submit" size="lg" fullWidth>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Verify certificate
                </Button>
              </form>
            </Card>

            <p className="mt-6 text-center text-sm text-muted">
              Looking for your own certificates?{" "}
              <Link href="/certificates" className="font-medium text-brand underline underline-offset-2">
                Open your dashboard
              </Link>
            </p>
          </motion.div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
