import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge, Card } from "@/components/ui/primitives";
import { ACADEMY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The terms that apply when you study the Salesforce course here: fair account use, honest quiz attempts, what our academy certificate is (and is not), and how the service is provided.",
};

const TERMS_SECTIONS: { id: string; title: string; paragraphs: string[] }[] = [
  {
    id: "terms-agreement",
    title: "Accepting these terms",
    paragraphs: [
      "These terms apply when you use the Salesforce Learning Academy website and study its Salesforce course. By creating an account or using the site you accept them. If you do not accept them, please do not use the site.",
    ],
  },
  {
    id: "terms-account",
    title: "Your account",
    paragraphs: [
      "Give an accurate name and a working e-mail address — certificates are issued with the name on your account, and e-mails are sent to its address. Keep your password to yourself: you are responsible for what happens under your account, so contact us promptly if you think it has been misused.",
      "Accounts are personal. We may suspend an account that breaks these terms, including accounts used to interfere with the site or other people's access to it.",
    ],
  },
  {
    id: "terms-studying",
    title: "Studying and quizzes",
    paragraphs: [
      "Work through the lessons and quizzes in your own effort. Quizzes are open-book checks of understanding — having someone else take them for you defeats the purpose of the certificate and may lead to it being withdrawn.",
      "Marking a lesson complete when you have not studied it, or otherwise gaming your progress, means your record no longer describes what you actually did.",
    ],
  },
  {
    id: "terms-content",
    title: "Course content and certificates",
    paragraphs: [
      "Lessons and course materials are for your own learning. Please do not republish or sell them wholesale; short quotations with credit are fine.",
      "The certificate you can earn is an academy-issued course-completion certificate. It is not an official Salesforce certification, it is not issued or endorsed by Salesforce, and it should never be presented as one. Certificates can be checked on the public verification page, and we may correct or withdraw a certificate that was issued in error or whose requirements were not genuinely met.",
    ],
  },
  {
    id: "terms-acceptable-use",
    title: "Acceptable use",
    paragraphs: [
      "Do not try to break the site or other people's accounts: no unauthorised access attempts, no flooding or scraping that degrades the service, and no using the contact form for spam. Use the platform as intended and keep it usable for everyone studying alongside you.",
    ],
  },
  {
    id: "terms-availability",
    title: "Availability and changes",
    paragraphs: [
      "We may add, edit or remove lessons, quizzes and features, and take the site offline for maintenance. We aim to keep the course available, but we cannot promise it will be online without interruption, and we may retire the course — if that happens we will say so on this site and by e-mail where we can.",
    ],
  },
  {
    id: "terms-liability",
    title: "Responsibility",
    paragraphs: [
      "The course is provided for learning. To the extent the law allows, we are not responsible for losses resulting from relying on the course content for decisions, or from being unable to access the site. Nothing in these terms limits responsibility that cannot be limited by law.",
    ],
  },
  {
    id: "terms-changes",
    title: "Changes to these terms",
    paragraphs: [
      "We will update this page when these terms change, and continued use of the site after an update means you accept the revised terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <Badge tone="brand">Legal</Badge>
          <h1 className="mt-4 break-words text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Terms of use
          </h1>
          <p className="mt-4 break-words text-sm leading-relaxed text-muted sm:text-base">
            Short, plain terms for using {ACADEMY_NAME} and studying its Salesforce course. They
            are meant to be read, not skipped.
          </p>

          <Card className="mt-8">
            <p className="break-words text-sm leading-relaxed text-muted">
              The one thing worth reading if you read nothing else: the certificate from this
              course is <span className="font-semibold text-navy">issued by the academy</span> to
              confirm you completed the course — it is not an official Salesforce certification.
            </p>
          </Card>

          <div className="mt-10 space-y-8">
            {TERMS_SECTIONS.map((section) => (
              <section key={section.id} aria-labelledby={section.id}>
                <h2 id={section.id} className="break-words text-xl font-bold text-navy">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 break-words text-sm leading-relaxed text-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            <section aria-labelledby="terms-contact">
              <h2 id="terms-contact" className="break-words text-xl font-bold text-navy">
                Questions
              </h2>
              <p className="mt-4 break-words text-sm leading-relaxed text-muted">
                Anything unclear? Ask us on the{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                  contact page
                </Link>{" "}
                and we will explain — and if you believe these terms should treat something
                differently, we would rather hear about it than not.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
