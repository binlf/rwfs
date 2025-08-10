import { rwfs } from "./index";
import { describe, expect, mock } from "bun:test";
import path from "node:path";

const testFile = path.join(process.cwd(), "file.txt");

rwfs(testFile, {
  debug: true,
  debugOutputLimit: 20,
  constraint: () => true,
  update: ({ chunk, index }) => chunk,
});

// rwfs(testFile, {
//   debug: true,
//   debugOutputLimit: { start: 2, end: 4 },
//   constraint: () => true,
//   update: ({ chunk }) => chunk,
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
