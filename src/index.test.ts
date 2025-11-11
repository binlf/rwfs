import { rwfs } from "./index";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const testFile = path.join(process.cwd(), "file.txt");

describe("rwfs", () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    // Create a temporary directory and file for each test
    tempDir = mkdtempSync(path.join(tmpdir(), "rwfs-test-"));
    tempFile = path.join(tempDir, "test.txt");
  });

  afterEach(() => {
    // Clean up temp files
    try {
      const fs = require("node:fs");
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore cleanup errors
    }
  });

  describe("invert option", () => {
    it("should process chunks in reverse order and restore original order by default", () => {
      // Create a test file with numbered lines
      const content = "line1\nline2\nline3\nline4";
      writeFileSync(tempFile, content, "utf8");

      // Track the order of chunks processed
      const processedChunks: string[] = [];

      rwfs(tempFile, {
        invert: true,
        constraint: () => true,
        update: ({ chunk }) => {
          processedChunks.push(chunk);
          return chunk;
        },
      });

      // Chunks are processed in reverse order
      expect(processedChunks).toEqual(["line4", "line3", "line2", "line1"]);

      // But the output is restored to original order
      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe(content);
    });

    it("should preserve inverted order when preserveInvertedOrder is true", () => {
      const content = "line1\nline2\nline3\nline4";
      writeFileSync(tempFile, content, "utf8");

      const processedChunks: string[] = [];

      rwfs(tempFile, {
        invert: true,
        preserveInvertedOrder: true,
        constraint: () => true,
        update: ({ chunk }) => {
          processedChunks.push(chunk);
          return chunk;
        },
      });

      // Chunks are processed in reverse order
      expect(processedChunks).toEqual(["line4", "line3", "line2", "line1"]);

      // And the output maintains the reversed order
      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("line4\nline3\nline2\nline1");
    });

    it("should correctly update chunks when processing in reverse order with default behavior", () => {
      // Create a test file with specific content
      const content = "first\nsecond\nthird";
      writeFileSync(tempFile, content, "utf8");

      // Modify the last chunk (which is processed first due to invert)
      rwfs(tempFile, {
        invert: true,
        constraint: ({ chunk }) => chunk === "third",
        update: ({ chunk }) => `MODIFIED-${chunk}`,
      });

      const result = readFileSync(tempFile, "utf8");
      // Output is restored to original order with modification applied
      expect(result).toBe("first\nsecond\nMODIFIED-third");
    });

    it("should update and preserve inverted order when preserveInvertedOrder is true", () => {
      const content = "first\nsecond\nthird";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        invert: true,
        preserveInvertedOrder: true,
        constraint: ({ chunk }) => chunk === "third",
        update: ({ chunk }) => `MODIFIED-${chunk}`,
      });

      const result = readFileSync(tempFile, "utf8");
      // Output maintains reversed order with modification
      expect(result).toBe("MODIFIED-third\nsecond\nfirst");
    });

    it("should work with bailOnFirstMatch in inverted mode", () => {
      const content = "line1\nline2\nline3\nline4";
      writeFileSync(tempFile, content, "utf8");

      let matchCount = 0;

      rwfs(tempFile, {
        invert: true,
        bailOnFirstMatch: true,
        constraint: ({ chunk }) => chunk.startsWith("line"),
        update: ({ chunk }) => {
          matchCount++;
          return chunk.toUpperCase();
        },
      });

      // Should only match once (line4, the first chunk in reversed order)
      expect(matchCount).toBe(1);

      const result = readFileSync(tempFile, "utf8");
      // Output restored to original order, only last line modified
      expect(result).toBe("line1\nline2\nline3\nLINE4");
    });
  });
});

// rwfs(testFile, {
//   debug: true,
//   debugOutputLimit: { start: 2, end: 4 },
//   constraint: () => true,
//   update: ({ chunk }) => chunk,
//   separator: " ",
// });

// // object range form
// rwfs(testFile, {
//   debug: true,
//   debugOutputLimit: { start: 1, end: 1 },
//   constraint: () => true,
//   update: ({ chunk }) => chunk,
// });

// rwfs(testFile, {
//   debug: true,
//   debugOutputLimit: { start: 2, end: 10 },
//   constraint: () => true,
//   update: ({ chunk }) => chunk,
// });
