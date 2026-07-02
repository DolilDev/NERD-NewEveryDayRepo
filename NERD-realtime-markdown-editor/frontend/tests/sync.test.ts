import { applyRemote, RemoteBuffer } from "../src/sync";

describe("applyRemote (cursor-safe restore)", () => {
  it("keeps the caret when remote text is longer (appended after caret)", () => {
    const r = applyRemote("hello", 5, 5, "hello world");
    expect(r.value).toBe("hello world");
    expect(r.selStart).toBe(5);
    expect(r.selEnd).toBe(5);
  });

  it("clamps the caret when remote text is shorter", () => {
    const r = applyRemote("hello world", 11, 11, "hello");
    expect(r.value).toBe("hello");
    expect(r.selStart).toBe(5);
    expect(r.selEnd).toBe(5);
  });

  it("clamps a selection index that exceeds the new length", () => {
    const r = applyRemote("abcdef", 2, 50, "ab");
    expect(r.value).toBe("ab");
    expect(r.selStart).toBe(2);
    expect(r.selEnd).toBe(2);
  });

  it("keeps a caret that sits before the edit when text is appended", () => {
    const r = applyRemote("hello", 2, 2, "hello world");
    expect(r.selStart).toBe(2);
    expect(r.selEnd).toBe(2);
  });
});

describe("RemoteBuffer (typing lock)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("applies remote content immediately when not typing", () => {
    const applied: string[] = [];
    const buf = new RemoteBuffer({ lockMs: 400, onApply: (c) => applied.push(c) });
    buf.receive("X");
    expect(applied).toEqual(["X"]);
  });

  it("buffers remote content while typing and applies it after the lock releases", () => {
    const applied: string[] = [];
    const buf = new RemoteBuffer({ lockMs: 400, onApply: (c) => applied.push(c) });

    buf.keystroke();
    expect(buf.isTyping).toBe(true);

    buf.receive("REMOTE");
    expect(applied).toEqual([]); // buffered, not applied yet

    jest.advanceTimersByTime(399);
    expect(applied).toEqual([]); // still locked

    jest.advanceTimersByTime(1); // lock releases at 400ms
    expect(applied).toEqual(["REMOTE"]);
    expect(buf.isTyping).toBe(false);
  });

  it("keeps only the latest buffered content", () => {
    const applied: string[] = [];
    const buf = new RemoteBuffer({ lockMs: 400, onApply: (c) => applied.push(c) });

    buf.keystroke();
    buf.receive("first");
    buf.receive("second");

    jest.advanceTimersByTime(400);
    expect(applied).toEqual(["second"]);
  });

  it("re-arms the lock on each keystroke", () => {
    const applied: string[] = [];
    const buf = new RemoteBuffer({ lockMs: 400, onApply: (c) => applied.push(c) });

    buf.keystroke();
    buf.receive("x");
    jest.advanceTimersByTime(300);

    buf.keystroke(); // resets the 400ms window
    jest.advanceTimersByTime(300);
    expect(applied).toEqual([]); // only 300ms since the last keystroke

    jest.advanceTimersByTime(100); // now 400ms since the last keystroke
    expect(applied).toEqual(["x"]);
  });
});
