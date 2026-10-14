import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge, Card } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What the Salesforce Learning Academy stores about you — name, e-mail, progress and quiz attempts — how sessions and cookies work, and how to request deletion of your data.",
};

const SHORT_VERSION = [
  "We store your name, e-mail address, lesson progress and quiz attempts.",
  "Sign-in uses an HTTP-only session cookie; we do not set advertising or analytics cookies.",
  "We never sell or rent your personal information.",
  "Certificates are publicly verifiable, so their details are visible to anyone with the link.",
  "Contact us at any time to get a copy of your data or delete your account.",
];

const STORAGE_ITEMS = [
  "Your name and e-mail address, plus a hashed form of your password that we never display back to you.",
  "Your learning records: which lessons you started and completed and when, your quiz attempts and scores, and your enrolment and completion status.",
  "Certificate records: the certificate number, your name as printed on it, the course title and the issue date.",
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <Badge tone="brand">Legal</Badge>
          <h1 className="mt-4 break-words text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Privacy policy
          </h1>
          <p className="mt-4 break-words text-sm leading-relaxed text-muted sm:text-base">
            This policy covers the Salesforce Learning Academy website — a college learning
            platform for the Salesforce course. It is written in plain language on purpose.
          </p>

          <Card className="mt-8">
            <h2 className="text-lg font-bold text-navy">The short version</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted">
              {SHORT_VERSION.map((item) => (
                <li key={item} className="break-words">
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <div className="mt-10 space-y-8">
            <section aria-labelledby="privacy-what-we-store">
              <h2 id="privacy-what-we-store" className="break-words text-xl font-bold text-navy">
                What we store
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted">
                {STORAGE_ITEMS.map((item) => (
                  <li key={item} className="break-words">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="privacy-how-we-use-it">
              <h2 id="privacy-how-we-use-it" className="break-words text-xl font-bold text-navy">
                How we use it
              </h2>
              <p className="mt-4 break-words text-sm leading-relaxed text-muted">
                Only to run the platform: show your dashboard and progress, decide when you have
                met the completion requirements, issue and verify certificates, and send the
                transactional e-mails that go with your account — e-mail verification, password
                resets and delivering a certificate you requested. We do not use your information
                to advertise to you.
              </p>
            </section>

            <section aria-labelledby="privacy-cookies">
              <h2 id="privacy-cookies" className="break-words text-xl font-bold text-navy">
                Sessions and cookies
              </h2>
              <p className="mt-4 break-words text-sm leading-relaxed text-muted">
                When you sign in we keep your session in a cookie called{" "}
                <code className="rounded border border-line bg-bg px-1.5 py-0.5 text-xs">
                  sla.sid
                </code>{" "}
                that is HTTP-only — scripts running on the page cannot read it — and it expires
                after 7 days. A second cookie holds a token that lets the site check that form
                submissions really come from this site. The site does not set advertising or
                analytics cookies.
              </p>
            </section>

            <section aria-labelledby="privacy-sharing">
              <h2 id="privacy-sharing" className="break-words text-xl font-bold text-navy">
                Sharing and selling
              </h2>
              <p className="mt-4 break-words text-sm leading-relaxed text-muted">
                We do not sell, rent or trade your personal information, and we do not share it
                for marketing. The only disclosure that happens is what the service itself needs —
                for example sending the certificate e-mail you asked for — or where the law
                requires us to.
              </p>
            </section>

            <section aria-labelledby="privacy-certificates">
              <h2 id="privacy-certificates" className="break-words text-xl font-bold text-navy">
                Certificates are publicly verifiable
              </h2>
              <p className="mt-4 break-words text-sm leading-relaxed text-muted">
                Certificates are only created when you request one. Requesting one means your
                name, the course title, the certificate number and the issue date appear on the
                public verification page, so anyone you share the link with can confirm that the
                certificate is genuine. Your e-mail address and quiz scores are never published.
              </p>
            </section>

            <section aria-labelledby="privacy-rights">
              <h2 id="privacy-rights" className="break-words text-xl font-bold text-navy">
                Your rights
              </h2>
              <p className="mt-4 break-words text-sm leading-relaxed text-muted">
                You can ask for a copy of your data, ask us to correct it, or ask us to delete
                your account and progress. Send your request through the{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                  contact page
                </Link>{" "}
                and we will confirm it is you before acting. One honest caveat: if you already
                hold a certificate, its verification record may be kept or explicitly revoked
                rather than silently erased, so certificates that are out there do not become
                uncheckable — we will tell you which applies to your account.
              </p>
            </section>

            <section aria-labelledby="privacy-changes">
              <h2 id="privacy-changes" className="break-words text-xl font-bold text-navy">
                Changes to this policy
              </h2>
              <p className="mt-4 break-words text-sm leading-relaxed text-muted">
                If the way we handle data changes, we will update this page so it always reflects
                what the platform actually does. Questions about it are welcome on the{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                  contact page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
