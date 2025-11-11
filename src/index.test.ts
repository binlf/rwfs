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
    it("should process chunks in reverse order when invert is true", () => {
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
        debug: true,
      });

      expect(processedChunks).toEqual(["line4", "line3", "line2", "line1"]);
      // Verify the file content is correctly reconstructed
      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe(processedChunks.join("\n"));
    });

    it("should correctly update chunks when processing in reverse order", () => {
      // Create a test file with specific content
      const content = "first\nsecond\nthird";
      writeFileSync(tempFile, content, "utf8");

      // Add a prefix based on the chunk content
      rwfs(tempFile, {
        invert: true,
        constraint: ({ chunk }) => chunk === "third",
        update: ({ chunk }) => `MODIFIED-${chunk}`,
        debug: true,
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("MODIFIED-third\nsecond\nfirst");
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
