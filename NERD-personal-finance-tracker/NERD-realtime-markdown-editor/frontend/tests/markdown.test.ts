import { renderMarkdown } from "../src/markdown";

describe("renderMarkdown", () => {
  it("renders basic Markdown to HTML", () => {
    const html = renderMarkdown("# Title\n\nSome **bold** text.");
    expect(html).toContain("<h1");
    expect(html).toContain("Title");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("renders fenced code blocks", () => {
    const html = renderMarkdown("```js\nconst x = 1;\n```");
    // Structure that survives later syntax-highlighting: a <pre>, a language
    // class, and the keyword text still present somewhere in the output.
    expect(html).toMatch(/<pre/);
    expect(html).toContain("language-js");
    expect(html).toContain("const");
  });

  it("returns an empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
