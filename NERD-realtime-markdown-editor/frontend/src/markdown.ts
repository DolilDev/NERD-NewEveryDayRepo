// Pure Markdown -> HTML rendering, kept dependency-light and side-effect free
// so it can be unit-tested in isolation.
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Render a Markdown string to an HTML string.
 *
 * Pure function: same input -> same output, no DOM access. The caller is
 * responsible for inserting the result into the page.
 */
export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown ?? "") as string;
}
