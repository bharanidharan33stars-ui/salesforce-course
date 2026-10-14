"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { cn, formatDate } from "@/lib/utils";
import type { AdminStudentListItem, Paginated } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert, Badge, Card, EmptyState, PageLoader } from "@/components/ui/primitives";

const PAGE_SIZE = 20;

function statusBadge(status: AdminStudentListItem["status"]) {
  return status === "active" ? (
    <Badge tone="success">Active</Badge>
  ) : (
    <Badge tone="danger">Disabled</Badge>
  );
}

export default function AdminStudentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminStudentListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        await api.get<Paginated<AdminStudentListItem>>("/admin/students", {
          query: { page, pageSize: PAGE_SIZE, search },
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  // If the result set shrank (e.g. after searching), clamp back into range.
  useEffect(() => {
    if (data && data.totalPages > 0 && page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data, page]);

  if (loading && !data) return <PageLoader label="Loading students" />;

  if (error && !data) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-navy">Students</h1>
          <p className="mt-1 text-sm text-muted">Everyone enrolled in the academy.</p>
        </div>
        <Alert tone="danger" title="Could not load students">
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

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-navy">Students</h1>
        <p className="mt-1 text-sm text-muted">
          {total > 0 ? `${total} student${total === 1 ? "" : "s"} registered.` : "Everyone enrolled in the academy."}
        </p>
      </div>

      {error ? (
        <Alert tone="danger" title="Could not refresh the list" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute bottom-3.5 left-3.5 h-4 w-4 text-muted"
          aria-hidden="true"
        />
        <Input
          label="Search students"
          type="search"
          placeholder="Search by name or e-mail…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="pl-10"
          autoComplete="off"
        />
      </div>

      {items.length === 0 && !loading ? (
        <EmptyState
          title={search ? "No students match your search" : "No students yet"}
          description={
            search
              ? `Nothing found for “${search}”. Try a different name or e-mail.`
              : "Students will appear here as soon as they sign up."
          }
        />
      ) : (
        <div aria-busy={loading} className={cn("space-y-4 transition-opacity", loading && "opacity-60")}>
          {/* Desktop: table */}
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">Student</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Enrolled</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Completed</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Certificate</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {items.map((student) => (
                    <tr key={student.id} className="transition-colors hover:bg-bg/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-navy">{student.fullName}</p>
                        <p className="text-xs text-muted">{student.email}</p>
                      </td>
                      <td className="px-4 py-3">{statusBadge(student.status)}</td>
                      <td className="px-4 py-3 text-ink">
                        {student.enrolledAt ? formatDate(student.enrolledAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {student.completedAt ? formatDate(student.completedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink">
                        {student.certificateNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold text-brand transition-colors hover:border-brand hover:bg-brand-soft"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="space-y-3 md:hidden">
            {items.map((student) => (
              <li key={student.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-navy">{student.fullName}</p>
                      <p className="break-all text-xs text-muted">{student.email}</p>
                    </div>
                    {statusBadge(student.status)}
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-muted">Enrolled</dt>
                      <dd className="mt-0.5 text-ink">
                        {student.enrolledAt ? formatDate(student.enrolledAt) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted">Completed</dt>
                      <dd className="mt-0.5 text-ink">
                        {student.completedAt ? formatDate(student.completedAt) : "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-muted">Certificate</dt>
                      <dd className="mt-0.5 break-all font-mono text-ink">
                        {student.certificateNumber ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-brand transition-colors hover:border-brand hover:bg-brand-soft"
                  >
                    View
                  </Link>
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
