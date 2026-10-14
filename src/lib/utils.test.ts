import { describe, expect, it } from "vitest";
import { cn, formatDate, formatRelative, initials } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("a", false, "b", null, undefined)).toBe("a b");
    expect(cn()).toBe("");
  });
});

describe("initials", () => {
  it("returns up to two upper-case initials", () => {
    expect(initials("Grace Brewster Hopper")).toBe("GB");
    expect(initials("ada")).toBe("A");
    expect(initials("  ")).toBe("");
  });
});

describe("formatDate", () => {
  it("formats a date string as day month year", () => {
    expect(formatDate("2026-03-09 10:30:00")).toBe("9 March 2026");
  });

  it("returns a dash for empty values and passes through invalid input", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(undefined)).toBe("-");
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatRelative", () => {
  it("describes recent timestamps in plain language", () => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60_000);
    expect(formatRelative(tenMinutesAgo.toISOString())).toBe("10 min ago");

    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60_000);
    expect(formatRelative(twoDaysAgo.toISOString())).toBe("2 days ago");
  });

  it("falls back to a dash when there is no timestamp", () => {
    expect(formatRelative(null)).toBe("-");
  });
});
