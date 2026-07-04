// Minimal ambient types for marked v4. The package ships no declarations of its
// own, and we deliberately avoid pulling in @types/marked as an extra
// dependency — so we declare just the surface this project uses.
declare module "marked" {
  export interface MarkedOptions {
    gfm?: boolean;
    breaks?: boolean;
    langPrefix?: string;
    highlight?: (code: string, lang: string) => string;
  }

  export interface Marked {
    parse(src: string, options?: MarkedOptions): string;
    setOptions(options: MarkedOptions): Marked;
  }

  export const marked: Marked;
}
