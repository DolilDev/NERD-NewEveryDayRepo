// Pure, DOM-free building blocks for real-time sync. Keeping these out of the
// DOM wiring makes them straightforward to unit-test.

export interface CursorState {
  value: string;
  selStart: number;
  selEnd: number;
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

/**
 * Replace the local value with remote content while keeping the caret/selection
 * in a sensible, always-valid place. Pure: no DOM access.
 *
 * Each selection index is mapped across the edit — indices up to the first
 * point of divergence are kept as-is, indices after it shift by the length
 * delta — then clamped to the new length so the result can never be out of
 * range (covers remote-longer, remote-shorter and overflowing-selection cases).
 */
export function applyRemote(
  currentValue: string,
  selStart: number,
  selEnd: number,
  remoteValue: string,
): CursorState {
  const newLen = remoteValue.length;
  const delta = newLen - currentValue.length;
  const prefix = commonPrefixLength(currentValue, remoteValue);

  const map = (pos: number): number => {
    const shifted = pos <= prefix ? pos : pos + delta;
    return Math.max(0, Math.min(shifted, newLen));
  };

  return { value: remoteValue, selStart: map(selStart), selEnd: map(selEnd) };
}

/** Trailing-edge debounce: fn runs once, `ms` after the last call. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: A): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}

export interface RemoteBufferOptions {
  /** How long after the last keystroke the typing lock releases (ms). */
  lockMs: number;
  /** Invoked when remote content should actually be applied. */
  onApply: (content: string) => void;
}

/**
 * Typing-lock buffer for incoming remote content.
 *
 * While the local user is actively typing, remote updates are buffered (only
 * the latest is kept) rather than applied — this avoids yanking the document
 * out from under the caret mid-keystroke. Once the lock releases (`lockMs`
 * after the last keystroke) any buffered content is applied.
 */
export class RemoteBuffer {
  private typing = false;
  private buffered: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: RemoteBufferOptions) {}

  get isTyping(): boolean {
    return this.typing;
  }

  /** Register a local keystroke; (re)engages the typing lock. */
  keystroke(): void {
    this.typing = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.release(), this.options.lockMs);
  }

  /** Apply remote content now, or buffer it until the lock releases. */
  receive(content: string): void {
    if (this.typing) {
      this.buffered = content;
    } else {
      this.options.onApply(content);
    }
  }

  private release(): void {
    this.typing = false;
    this.timer = null;
    if (this.buffered !== null) {
      const pending = this.buffered;
      this.buffered = null;
      this.options.onApply(pending);
    }
  }
}
