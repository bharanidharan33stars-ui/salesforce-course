import React from "react";

/**
 * Safe Markdown renderer.
 *
 * Administrator-authored lesson content is rendered into React elements - the
 * HTML is never injected as a string, so hostile content cannot execute script
 * (no dangerouslySetInnerHTML anywhere in this project).
 *
 * Supported subset: ## / ### headings, paragraphs, "- " and "* " bullet lists,
 * "1. " numbered lists, "> " blockquotes, ``` fenced code blocks, pipe tables,
 * and inline `code`, **bold**, *italic* and [links](https://...).
 */

type Block =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; code: string; language: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "table"; header: string[]; rows: string[][] };

function isSafeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|\/)/i.test(href.trim());
}

/** Inline formatting -> React nodes. All text stays as strings (auto-escaped). */
export function renderInline(text: string, keyPrefix = "i"): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${counter++}`;

    if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (linkMatch && isSafeHref(linkMatch[2])) {
        nodes.push(
          <a key={key} href={linkMatch[2]} target="_blank" rel="noopener noreferrer nofollow">
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function parseTable(lines: string[], startIndex: number): { block: Block; next: number } | null {
  const header = lines[startIndex].split("|").map((c) => c.trim()).filter((c) => c !== "");
  const separator = lines[startIndex + 1] ?? "";
  if (!/^\s*\|?[\s:|-]+\|?\s*$/.test(separator) || !separator.includes("-")) return null;

  const rows: string[][] = [];
  let index = startIndex + 2;
  while (index < lines.length && lines[index].trim().startsWith("|")) {
    rows.push(lines[index].split("|").map((c) => c.trim()).filter((c) => c !== ""));
    index += 1;
  }
  return { block: { type: "table", header, rows }, next: index };
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    // Fenced code block
    const fence = /^```(\w*)\s*$/.exec(trimmed);
    if (fence) {
      const language = fence[1] || "text";
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1; // closing fence
      blocks.push({ type: "code", code: code.join("\n"), language });
      continue;
    }

    // Headings
    const heading = /^(#{2,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 2 | 3, text: heading[2].trim() });
      index += 1;
      continue;
    }

    // Table
    if (trimmed.startsWith("|")) {
      const table = parseTable(lines, index);
      if (table) {
        blocks.push(table.block);
        index = table.next;
        continue;
      }
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", lines: quote });
      continue;
    }

    // Lists
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        if (ordered && /^\d+\.\s+/.test(current)) {
          items.push(current.replace(/^\d+\.\s+/, ""));
          index += 1;
        } else if (!ordered && /^[-*]\s+/.test(current)) {
          items.push(current.replace(/^[-*]\s+/, ""));
          index += 1;
        } else if (current && items.length > 0 && /^[-*]\s+|^[-*]\s/.test(lines[index - 1] ?? "")) {
          // continuation line of the previous bullet
          items[items.length - 1] += ` ${current}`;
          index += 1;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // Paragraph
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() !== "" && !/^(#{2,3}\s|```|[-*]\s|\d+\.\s|>\s?|\|)/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length > 0) blocks.push({ type: "paragraph", lines: paragraph });
    else index += 1; // safety: never loop forever
  }

  return blocks;
}

export function Markdown({ content, className }: { content: string | null | undefined; className?: string }) {
  if (!content || !content.trim()) {
    return <p className="text-muted">This lesson has no content yet.</p>;
  }

  const blocks = parseBlocks(content);

  return (
    <div className={className ?? "lesson-prose"}>
      {blocks.map((block, blockIndex) => {
        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2 key={blockIndex}>{renderInline(block.text, `h-${blockIndex}`)}</h2>
            ) : (
              <h3 key={blockIndex}>{renderInline(block.text, `h-${blockIndex}`)}</h3>
            );
          case "paragraph":
            return (
              <p key={blockIndex}>
                {block.lines.map((line, lineIndex) => (
                  <React.Fragment key={lineIndex}>
                    {lineIndex > 0 ? " " : null}
                    {renderInline(line, `p-${blockIndex}-${lineIndex}`)}
                  </React.Fragment>
                ))}
              </p>
            );
          case "list":
            return block.ordered ? (
              <ol key={blockIndex}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item, `l-${blockIndex}-${itemIndex}`)}</li>
                ))}
              </ol>
            ) : (
              <ul key={blockIndex}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item, `l-${blockIndex}-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          case "code":
            return (
              <pre key={blockIndex} data-language={block.language}>
                <code>{block.code}</code>
              </pre>
            );
          case "blockquote":
            return (
              <blockquote key={blockIndex}>
                {block.lines.map((line, lineIndex) => (
                  <p key={lineIndex}>{renderInline(line, `q-${blockIndex}-${lineIndex}`)}</p>
                ))}
              </blockquote>
            );
          case "table":
            return (
              <table key={blockIndex}>
                <thead>
                  <tr>
                    {block.header.map((cell, cellIndex) => (
                      <th key={cellIndex}>{renderInline(cell, `t-${blockIndex}-h-${cellIndex}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{renderInline(cell, `t-${blockIndex}-${rowIndex}-${cellIndex}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
