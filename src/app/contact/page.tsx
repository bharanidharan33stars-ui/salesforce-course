import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, Send, Users } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { api } from "@/lib/api-client";
import type { PublicSettings } from "@/types";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Questions about the Salesforce course, your account or a certificate? Find the support e-mail address and a message form that opens your own mail app.",
};

export const revalidate = 0;

/** Used when the settings endpoint cannot be reached. */
const FALLBACK_SUPPORT_EMAIL = "support@localhost";

/** Reads the support e-mail from the API, falling back when it is unavailable. */
async function getSupportEmail(): Promise<string> {
  try {
    const settings = await api.get<PublicSettings>("/public/settings", {
      signal: AbortSignal.timeout(3000),
    });
    if (settings?.supportEmail) return settings.supportEmail;
  } catch {
    // Backend unavailable — use the fallback address.
  }
  return FALLBACK_SUPPORT_EMAIL;
}

/**
 * There is no contact-form backend: this server action builds a mailto: link
 * from the submitted fields and redirects the browser to it, which opens the
 * visitor's own mail application with the message pre-filled. Nothing is
 * stored on the site.
 */
async function openMailClient(formData: FormData): Promise<void> {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  // The fields are `required` in the form; this is the server-side backstop.
  if (!name || !email || !message) return;

  const supportEmail = await getSupportEmail();
  const subject = `Website enquiry from ${name}`;
  const body = `Name: ${name}\nE-mail: ${email}\n\n${message}`;
  redirect(
    `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  );
}

export default async function ContactPage() {
  const supportEmail = await getSupportEmail();
  const mailtoHref = `mailto:${supportEmail}`;

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="container-page py-10 sm:py-14">
        <div className="max-w-2xl">
          <Badge tone="brand">Contact</Badge>
          <h1 className="mt-4 break-words text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Get in touch
          </h1>
          <p className="mt-4 break-words text-sm leading-relaxed text-muted sm:text-base">
            Questions about the course, your account or a certificate? Send us a message and we
            will reply by e-mail.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* -------------------------------------------------- contact info */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader title="Support e-mail" />
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"
                aria-hidden="true"
              >
                <Mail className="h-5 w-5" />
              </span>
              <a
                href={mailtoHref}
                className="mt-4 inline-flex min-h-11 break-all text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
              >
                {supportEmail}
              </a>
              <p className="mt-2 break-words text-sm leading-relaxed text-muted">
                Use this address directly if you prefer your own mail app, or if the button on
                this page does nothing on your device.
              </p>
            </Card>

            <Card>
              <CardHeader title="What to include" />
              <ul className="space-y-2.5 text-sm leading-relaxed text-muted">
                <li className="flex items-start gap-2.5">
                  <Users
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  <span className="break-words">
                    The e-mail address of your account, if your question is about it.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Send className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="break-words">
                    The unit or lesson you were working on, and what you expected to happen.
                  </span>
                </li>
              </ul>
            </Card>
          </div>

          {/* ---------------------------------------------------- contact form */}
          <div className="lg:col-span-3">
            <form action={openMailClient} className="card p-5 sm:p-6">
              <CardHeader
                title="Send a message"
                subtitle="It opens in your own mail app, already addressed to us."
              />

              <div className="space-y-4">
                <Input
                  label="Your name"
                  name="name"
                  autoComplete="name"
                  placeholder="Alex Student"
                  required
                />
                <Input
                  label="Your e-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="alex@example.com"
                  required
                />
                <Textarea
                  label="Message"
                  name="message"
                  rows={6}
                  placeholder="How can we help?"
                  required
                />
              </div>

              <div className="mt-6">
                <Button type="submit" size="lg" fullWidth>
                  Open message in mail app
                </Button>
              </div>

              <p className="mt-4 break-words text-xs leading-relaxed text-muted">
                This form does not store anything on this website. Submitting builds a{" "}
                <span className="font-medium text-ink">mailto:</span> link from the fields above
                and hands it to your device, which opens your default mail application addressed
                to{" "}
                <a href={mailtoHref} className="font-medium text-brand hover:underline">
                  {supportEmail}
                </a>
                . Nothing is sent until you press send in your mail app — and if no mail app
                opens, just e-mail that address directly.
              </p>
            </form>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
