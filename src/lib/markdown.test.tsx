import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown, renderInline } from "@/lib/markdown";

/**
 * The Markdown renderer is the only place administrator-authored content is
 * turned into UI. Because it produces React elements (never raw HTML), a
 * hostile lesson body must come out as inert text.
 */

describe("Markdown safety", () => {
  it("renders script tags as inert text, never as elements", () => {
    const { container } = render(
      <Markdown content={'<script>alert("xss")</script>\n\nHello'} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain('<script>alert("xss")</script>');
    expect(container.textContent).toContain("Hello");
  });

  it("ignores inline event handlers in links", () => {
    const { container } = render(
      <Markdown content={'[click](javascript:alert(1)) and [ok](https://example.com)'} />,
    );
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    const safe = container.querySelector('a[href="https://example.com"]');
    expect(safe).not.toBeNull();
    expect(safe?.getAttribute("rel")).toContain("noopener");
  });

  it("keeps onerror attributes out of the DOM", () => {
    const { container } = render(
      <Markdown content={'<img src=x onerror="alert(1)">'} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
  });

  it("escapes HTML inside inline code", () => {
    const { container } = render(<Markdown content={"`<b>bold</b>`"} />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("code")?.textContent).toBe("<b>bold</b>");
  });
});

describe("Markdown structure", () => {
  it("renders h2 and h3 headings", () => {
    const { container } = render(
      <Markdown content={"## Section\n\n### Subsection\n\nText"} />,
    );
    expect(container.querySelector("h2")?.textContent).toBe("Section");
    expect(container.querySelector("h3")?.textContent).toBe("Subsection");
  });

  it("renders bullet and numbered lists", () => {
    const { container } = render(
      <Markdown content={"- one\n- two\n\n1. first\n2. second"} />,
    );
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
  });

  it("renders fenced code blocks with their content preserved", () => {
    const { container } = render(
      <Markdown content={"```apex\nSystem.debug('hi');\n```"} />,
    );
    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.getAttribute("data-language")).toBe("apex");
    expect(pre?.textContent).toBe("System.debug('hi');");
  });

  it("renders pipe tables with a header row", () => {
    const { container } = render(
      <Markdown content={"| A | B |\n| --- | --- |\n| 1 | 2 |"} />,
    );
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelectorAll("td")).toHaveLength(2);
  });

  it("renders blockquotes", () => {
    const { container } = render(<Markdown content={"> Important note"} />);
    expect(container.querySelector("blockquote")?.textContent).toContain("Important note");
  });

  it("shows a friendly placeholder for empty content", () => {
    render(<Markdown content={""} />);
    expect(screen.getByText(/no content yet/i)).toBeInTheDocument();
  });

  it("renders bold and italic inline formatting", () => {
    const { container } = render(<Markdown content={"**bold** and *italic*"} />);
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
  });
});

describe("renderInline", () => {
  it("returns nodes without dropping plain text between tokens", () => {
    const nodes = renderInline("before `code` after");
    const text = nodes.map((node) => (typeof node === "string" ? node : "")).join("");
    expect(text).toContain("before");
    expect(text).toContain("after");
  });
});
