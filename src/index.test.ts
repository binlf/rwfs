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

  describe("insertion (splice) operations", () => {
    it("should insert content before a chunk using insertBefore", () => {
      const content = "line1\nline2\nline3";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        constraint: ({ chunk }) => chunk === "line2",
        update: () => ({ insertBefore: "NEW_LINE" }),
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("line1\nNEW_LINE\nline2\nline3");
    });

    it("should insert content after a chunk using insertAfter", () => {
      const content = "line1\nline2\nline3";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        constraint: ({ chunk }) => chunk === "line2",
        update: () => ({ insertAfter: "NEW_LINE" }),
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("line1\nline2\nNEW_LINE\nline3");
    });

    it("should insert before the first chunk", () => {
      const content = "line1\nline2\nline3";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        constraint: ({ index }) => index === 0,
        update: () => ({ insertBefore: "HEADER" }),
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("HEADER\nline1\nline2\nline3");
    });

    it("should insert after the last chunk", () => {
      const content = "line1\nline2\nline3";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        constraint: ({ nextChunk }) => nextChunk === undefined,
        update: () => ({ insertAfter: "FOOTER" }),
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("line1\nline2\nline3\nFOOTER");
    });

    it("should insert based on sibling chunk content (prevChunk)", () => {
      const content = "// SECTION_START\ncontent here\n// SECTION_END";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        constraint: ({ prevChunk }) =>
          prevChunk?.includes("SECTION_START") ?? false,
        update: () => ({ insertBefore: "// Inserted after section start" }),
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe(
        "// SECTION_START\n// Inserted after section start\ncontent here\n// SECTION_END"
      );
    });

    it("should insert based on sibling chunk content (nextChunk)", () => {
      const content = "line1\nline2\n// END";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        constraint: ({ nextChunk }) => nextChunk?.includes("END") ?? false,
        update: () => ({ insertAfter: "// Inserted before END" }),
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("line1\nline2\n// Inserted before END\n// END");
    });

    it("should handle multiple insertions in one pass", () => {
      const content = "a\nb\nc";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        constraint: () => true,
        update: ({ chunk }) => ({ insertAfter: `${chunk}-after` }),
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("a\na-after\nb\nb-after\nc\nc-after");
    });

    it("should work with multi-rule mode for insertions", () => {
      const content = "start\nmiddle\nend";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        updates: [
          {
            constraint: ({ chunk }) => chunk === "start",
            update: () => ({ insertAfter: "after-start" }),
          },
          {
            constraint: ({ chunk }) => chunk === "end",
            update: () => ({ insertBefore: "before-end" }),
          },
        ],
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("start\nafter-start\nmiddle\nbefore-end\nend");
    });

    it("should work with insertions and invert option", () => {
      const content = "line1\nline2\nline3";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        invert: true,
        constraint: ({ chunk }) => chunk === "line3",
        update: () => ({ insertAfter: "INSERTED" }),
      });

      const result = readFileSync(tempFile, "utf8");
      // Processed in reverse (line3 first), then restored to original order
      expect(result).toBe("line1\nline2\nline3\nINSERTED");
    });

    it("should work with bailOnFirstMatch and insertion", () => {
      const content = "match\nmatch\nmatch";
      writeFileSync(tempFile, content, "utf8");

      let insertCount = 0;

      rwfs(tempFile, {
        bailOnFirstMatch: true,
        constraint: ({ chunk }) => chunk === "match",
        update: () => {
          insertCount++;
          return { insertBefore: "INSERTED" };
        },
      });

      expect(insertCount).toBe(1);
      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("INSERTED\nmatch\nmatch\nmatch");
    });

    it("should handle mixed operations (replace, delete, insert)", () => {
      const content = "keep\ndelete_me\nreplace_me\ninsert_before_me";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        updates: [
          {
            constraint: ({ chunk }) => chunk === "delete_me",
            update: () => ({ deleteChunk: true }),
          },
          {
            constraint: ({ chunk }) => chunk === "replace_me",
            update: () => "REPLACED",
          },
          {
            constraint: ({ chunk }) => chunk === "insert_before_me",
            update: () => ({ insertBefore: "INSERTED" }),
          },
        ],
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("keep\nREPLACED\nINSERTED\ninsert_before_me");
    });

    it("should preserve empty inserted content when removeEmpty is false", () => {
      const content = "line1\nline2";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        removeEmpty: false,
        constraint: ({ index }) => index === 0,
        update: () => ({ insertAfter: "" }),
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("line1\n\nline2");
    });

    it("should remove empty inserted content when removeEmpty is true", () => {
      const content = "line1\nline2";
      writeFileSync(tempFile, content, "utf8");

      rwfs(tempFile, {
        removeEmpty: true,
        constraint: ({ index }) => index === 0,
        update: () => ({ insertAfter: "" }),
      });

      const result = readFileSync(tempFile, "utf8");
      expect(result).toBe("line1\nline2");
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
