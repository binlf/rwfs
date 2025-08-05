import { rwfs } from "./index";
import { describe, expect, mock } from "bun:test";
import path from "node:path";

const testFile = path.join(process.cwd(), "file.txt");

rwfs(testFile, {
  debug: true,
  debugOutputLimit: 2,
  constraint: () => true,
  update: ({ chunk, index }) => chunk,
});
