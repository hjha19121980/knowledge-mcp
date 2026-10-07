import { describe, expect, it } from "vitest";
import { chunkText } from "../src/utils/chunking.js";

describe("chunkText", () => {
  it("uses the configured size and overlap while preserving all text", () => {
    const text = "a".repeat(2_100);
    const chunks = chunkText(text);
    expect(chunks.map((chunk) => chunk.length)).toEqual([1_000, 1_000, 500]);
    expect(chunks[0]!.slice(-200)).toBe(chunks[1]!.slice(0, 200));
    expect(chunks[1]!.slice(-200)).toBe(chunks[2]!.slice(0, 200));
  });

  it("handles blank content and rejects invalid chunk configuration", () => {
    expect(chunkText("  ")).toEqual([]);
    expect(() => chunkText("text", 10, 10)).toThrow();
  });
});
