"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, RefreshCw, Search } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { API_URL } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { AdminCertificateItem, Paginated } from "@/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Alert, Badge, Card, EmptyState, PageLoader } from "@/components/ui/primitives";

const PAGE_SIZE = 20;

type CertificatesResponse = Paginated<AdminCertificateItem> & {
  emailDeliveryMode?: "smtp" | "development";
};

function statusTone(value: string): "success" | "warning" | "danger" | "neutral" {
  const v = value.toLowerCase();
  if (["sent", "generated", "issued", "complete", "completed"].includes(v)) return "success";
  if (["pending", "processing", "queued"].includes(v)) return "warning";
  if (["failed", "error"].includes(v)) return "danger";
  return "neutral";
}

function statusLabel(value: string): string {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function StatusBadge({ value }: { value: string }) {
  return <Badge tone={statusTone(value)}>{statusLabel(value)}</Badge>;
}

export default function AdminCertificatesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CertificatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  // Debounce the search box by 300ms and jump back to page 1.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await api.get<CertificatesResponse>("/admin/certificates", {
          query: { page, pageSize: PAGE_SIZE, search, status },
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  // If the result set shrank, clamp back into range.
  useEffect(() => {
    if (data && data.totalPages > 0 && page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data, page]);

  // Auto-dismiss the retry confirmation.
  useEffect(() => {
    if (!retryMessage) return;
    const timer = window.setTimeout(() => setRetryMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [retryMessage]);

  const handleRetryEmail = async (id: number) => {
    setRetryingId(id);
    setRetryError(null);
    setRetryMessage(null);
    try {
      const result = await api.post<unknown>(`/admin/certificates/${id}/retry-email`);
      const message =
        typeof result === "string" && result.trim()
          ? result
          : ((result as { message?: string } | null)?.message ??
            "Certificate e-mail queued for retry.");
      setRetryMessage(message);
    } catch (err) {
      setRetryError(errorMessage(err));
    } finally {
      setRetryingId(null);
    }
  };

  const openDownload = (id: number) => {
    window.open(`${API_URL}/admin/certificates/${id}/download`, "_blank", "noopener,noreferrer");
  };

  if (loading && !data) return <PageLoader label="Loading certificates" />;

  if (error && !data) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-navy">Certificates</h1>
          <p className="mt-1 text-sm text-muted">Every certificate issued by the academy.</p>
        </div>
        <Alert tone="danger" title="Could not load certificates">
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

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const devMode = data?.emailDeliveryMode === "development";

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-navy">Certificates</h1>
        <p className="mt-1 text-sm text-muted">
          {total > 0
            ? `${total} certificate${total === 1 ? "" : "s"} issued.`
            : "Every certificate issued by the academy."}
        </p>
      </div>

      {devMode ? (
        <Alert tone="warning" title="E-mail delivery is in development mode">
          <p>
            SMTP is not configured on this deployment, so certificate e-mails are{" "}
            <strong>not actually sent</strong>. They are written to files under{" "}
            <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">backend/storage/mail</code>{" "}
            instead. Use “Retry e-mail” to queue a certificate again and generate a new file.
          </p>
        </Alert>
      ) : null}

      {retryError ? (
        <Alert tone="danger" title="Retry failed" onDismiss={() => setRetryError(null)}>
          {retryError}
        </Alert>
      ) : null}

      {retryMessage ? (
        <Alert tone="success" onDismiss={() => setRetryMessage(null)}>
          {retryMessage}
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Could not refresh the list" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:max-w-2xl sm:grid-cols-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute bottom-3.5 left-3.5 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <Input
            label="Search certificates"
            type="search"
            placeholder="Search by number, holder or e-mail…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <Select
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "sent", label: "Sent" },
            { value: "failed", label: "Failed" },
          ]}
        />
      </div>

      {items.length === 0 && !loading ? (
        <EmptyState
          title={search || status ? "No certificates match your filters" : "No certificates yet"}
          description={
            search || status
              ? "Try clearing the search box or choosing a different status."
              : "Certificates appear here once students complete the course."
          }
        />
      ) : (
        <div aria-busy={loading} className={cn("space-y-4 transition-opacity", loading && "opacity-60")}>
          {/* Desktop: table */}
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">Number</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Holder</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Issued</th>
                    <th scope="col" className="px-4 py-3 font-semibold">PDF</th>
                    <th scope="col" className="px-4 py-3 font-semibold">E-mail</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {items.map((cert) => (
                    <tr key={cert.id} className="transition-colors hover:bg-bg/60">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">
                        {cert.certificateNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{cert.holderName}</p>
                        <p className="break-all text-xs text-muted">{cert.email}</p>
                      </td>
                      <td className="px-4 py-3 text-ink">{formatDate(cert.issuedAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge value={cert.pdfStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge value={cert.emailStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDownload(cert.id)}
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            Download
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleRetryEmail(cert.id)}
                            loading={retryingId === cert.id}
                            disabled={retryingId !== null}
                          >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            Retry e-mail
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="space-y-3 md:hidden">
            {items.map((cert) => (
              <li key={cert.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all font-mono text-xs font-semibold text-navy">
                        {cert.certificateNumber}
                      </p>
                      <p className="mt-1 break-words font-bold text-ink">{cert.holderName}</p>
                      <p className="break-all text-xs text-muted">{cert.email}</p>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-semibold text-muted">Issued</dt>
                      <dd className="text-ink">{formatDate(cert.issuedAt)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-semibold text-muted">PDF</dt>
                      <dd><StatusBadge value={cert.pdfStatus} /></dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-semibold text-muted">E-mail</dt>
                      <dd><StatusBadge value={cert.emailStatus} /></dd>
                    </div>
                  </dl>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button variant="outline" size="sm" fullWidth onClick={() => openDownload(cert.id)}>
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => void handleRetryEmail(cert.id)}
                      loading={retryingId === cert.id}
                      disabled={retryingId !== null}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Retry e-mail
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      {total > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted">
            Page <span className="font-semibold text-ink">{Math.min(page, totalPages)}</span> of{" "}
            <span className="font-semibold text-ink">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
