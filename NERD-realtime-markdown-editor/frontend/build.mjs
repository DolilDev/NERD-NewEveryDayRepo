// esbuild build script: bundles the TypeScript client into dist/ and copies
// the static assets (index.html, styles.css) plus a highlight.js theme.
//
// Run with: npm run build
import { build } from "esbuild";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const srcDir = join(root, "src");
const distDir = join(root, "dist");
const entry = join(srcDir, "main.ts");

mkdirSync(distDir, { recursive: true });

// Copy static assets when they exist (HTML shell + base stylesheet).
for (const file of ["index.html", "styles.css"]) {
  const from = join(srcDir, file);
  if (existsSync(from)) copyFileSync(from, join(distDir, file));
}

// Copy a highlight.js theme into the build so fenced code blocks are styled.
const hljsTheme = join(root, "node_modules", "highlight.js", "styles", "github.css");
if (existsSync(hljsTheme)) copyFileSync(hljsTheme, join(distDir, "hljs.css"));

if (existsSync(entry)) {
  await build({
    entryPoints: [entry],
    bundle: true,
    outfile: join(distDir, "bundle.js"),
    format: "iife",
    platform: "browser",
    target: ["es2019"],
    sourcemap: true,
    logLevel: "info",
  });
  console.log("Built dist/bundle.js");
} else {
  console.warn("No src/main.ts found yet — skipped JS bundle.");
}
