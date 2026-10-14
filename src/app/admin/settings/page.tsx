"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, ServerCog } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { AdminSettingsResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Badge, Card, CardHeader, PageLoader } from "@/components/ui/primitives";

type SmtpStatus = AdminSettingsResponse["smtp"];

const DEFAULTS: Record<string, string> = {
  academy_name: "",
  academy_logo_text: "",
  support_email: "",
  course_title: "",
  certificate_signer: "",
  certificate_footer_note: "",
  lesson_completion_rule: "manual",
  require_email_verification_for_certificate: "false",
  email_verification_required_for_login: "false",
  quiz_default_passing_percentage: "70",
  ai_assistant_enabled: "true",
};

function mergeSettings(raw: Record<string, string>): Record<string, string> {
  const merged: Record<string, string> = { ...DEFAULTS };
  for (const [key, value] of Object.entries(raw ?? {})) {
    merged[key] = String(value);
  }
  return merged;
}

const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export default function AdminSettingsPage() {
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [smtp, setSmtp] = useState<SmtpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AdminSettingsResponse>("/admin/settings");
      setForm(mergeSettings(data.settings));
      setSmtp(data.smtp ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-dismiss the success message.
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const setField = (key: string, value: string) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;

    const passPct = Number(form.quiz_default_passing_percentage);
    if (!Number.isFinite(passPct) || passPct < 1 || passPct > 100) {
      setSaveError("The quiz default passing percentage must be a whole number between 1 and 100.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSuccess(null);

    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(form)) {
      payload[key] = String(value).trim();
    }
    payload.quiz_default_passing_percentage = String(Math.round(passPct));

    try {
      // The backend schema (adminSettingsSchema) expects the keys at the top
      // level - nesting them under `settings:` fails validation with a 400.
      const result = await api.put<AdminSettingsResponse>("/admin/settings", payload);
      if (result?.settings) {
        setForm(mergeSettings(result.settings));
        if (result.smtp) setSmtp(result.smtp);
      } else {
        setForm(payload);
      }
      setSuccess("Settings saved.");
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading settings" />;

  if (error || !form) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-navy">Settings</h1>
          <p className="mt-1 text-sm text-muted">Academy configuration and e-mail status.</p>
        </div>
        <Alert tone="danger" title="Could not load settings">
          <p>{error ?? "No settings returned by the server."}</p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Configure the academy branding, certificate details and learning rules.
        </p>
      </div>

      {saveError ? (
        <Alert tone="danger" title="Could not save settings" onDismiss={() => setSaveError(null)}>
          {saveError}
        </Alert>
      ) : null}

      {success ? (
        <Alert tone="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {/* SMTP status (read-only) */}
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <ServerCog className="h-5 w-5 text-brand" aria-hidden="true" />
              E-mail delivery
            </span>
          }
          subtitle="Read-only status of the outgoing mail configuration."
          action={
            smtp ? (
              smtp.configured ? (
                <Badge tone="success">Configured</Badge>
              ) : (
                <Badge tone="warning">Not configured</Badge>
              )
            ) : null
          }
        />
        {smtp ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Mode</dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {smtp.mode === "smtp" ? "SMTP" : "Development"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Host</dt>
              <dd className="mt-1 break-all text-sm font-medium text-ink">
                {smtp.host ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Port</dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {smtp.port ? smtp.port : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">From</dt>
              <dd className="mt-1 break-all text-sm font-medium text-ink">
                {smtp.from || "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted">—</p>
        )}
        {smtp && smtp.mode === "development" ? (
          <div className="mt-4">
            <Alert tone="warning" title="Development mode">
              SMTP is not configured, so certificate e-mails are written to files under{" "}
              <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">backend/storage/mail</code>{" "}
              instead of being sent.
            </Alert>
          </div>
        ) : null}
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader title="Academy" subtitle="Branding and contact details shown across the site." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Academy name"
              value={form.academy_name}
              onChange={(event) => setField("academy_name", event.target.value)}
              required
            />
            <Input
              label="Logo text"
              hint="Short text shown in place of a logo image."
              value={form.academy_logo_text}
              onChange={(event) => setField("academy_logo_text", event.target.value)}
            />
            <Input
              label="Support e-mail"
              type="email"
              value={form.support_email}
              onChange={(event) => setField("support_email", event.target.value)}
            />
            <Input
              label="Course title"
              value={form.course_title}
              onChange={(event) => setField("course_title", event.target.value)}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Certificate" subtitle="Signer and footer printed on issued certificates." />
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Certificate signer"
              value={form.certificate_signer}
              onChange={(event) => setField("certificate_signer", event.target.value)}
            />
            <Textarea
              label="Certificate footer note"
              rows={3}
              value={form.certificate_footer_note}
              onChange={(event) => setField("certificate_footer_note", event.target.value)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Require e-mail verification for certificate"
                hint="When yes, students must verify their e-mail address before a certificate is issued."
                value={form.require_email_verification_for_certificate}
                onChange={(event) =>
                  setField("require_email_verification_for_certificate", event.target.value)
                }
                options={YES_NO}
              />
              <Input
                label="Quiz default passing percentage"
                type="number"
                min={1}
                max={100}
                inputMode="numeric"
                hint="Whole number between 1 and 100, used as the default for new quizzes."
                value={form.quiz_default_passing_percentage}
                onChange={(event) => setField("quiz_default_passing_percentage", event.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Learning rules"
            subtitle="How lessons are completed and how students sign in."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Lesson completion rule"
              hint={
                form.lesson_completion_rule === "auto"
                  ? "Auto: a lesson is completed as soon as it is opened."
                  : "Manual: a lesson is only complete when the student clicks “Mark as complete”."
              }
              value={form.lesson_completion_rule}
              onChange={(event) => setField("lesson_completion_rule", event.target.value)}
              options={[
                { value: "manual", label: "Manual — student marks complete" },
                { value: "auto", label: "Auto — completed when opened" },
              ]}
            />
            <Select
              label="Require e-mail verification to sign in"
              hint="When yes, unverified accounts cannot sign in."
              value={form.email_verification_required_for_login}
              onChange={(event) =>
                setField("email_verification_required_for_login", event.target.value)
              }
              options={YES_NO}
            />
            <Select
              label="AI assistant"
              hint="Shows or hides the in-lesson AI assistant for students."
              value={form.ai_assistant_enabled}
              onChange={(event) => setField("ai_assistant_enabled", event.target.value)}
              options={YES_NO}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={saving}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
