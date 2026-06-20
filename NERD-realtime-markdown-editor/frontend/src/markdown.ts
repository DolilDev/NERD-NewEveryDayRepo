// Pure Markdown -> HTML rendering with highlight.js syntax highlighting for
// fenced code blocks. Kept side-effect free (beyond one-time marked config) so
// it can be unit-tested in isolation.
import hljs from "highlight.js";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
  // Emit `class="hljs language-xxx"` so the highlight.js theme styles apply.
  langPrefix: "hljs language-",
  highlight: (code: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

/**
 * Render a Markdown string to an HTML string, highlighting fenced code blocks.
 *
 * Pure function: same input -> same output, no DOM access. The caller is
 * responsible for inserting the result into the page.
 */
export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown ?? "") as string;
}
