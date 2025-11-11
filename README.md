# rwfs 🔄

A utility for rewriting file contents synchronously with flexible chunk-based operations.

## Features

- ✅ Chunk-based file content manipulation with context awareness
- ✅ Support for single or multiple update operations
- ✅ Debug mode with colored output and configurable limits (numeric or range-based)
- ✅ Configurable separators and encoding
- ✅ Access to previous and next chunks for contextual operations
- ✅ Reverse processing mode (process chunks from end to beginning)
- ✅ Chunk deletion support
- ✅ Early exit with `bailOnFirstMatch` optimization
- ✅ TypeScript support with full type safety and comprehensive JSDoc comments

## Installation

```bash
bun install rwfs
```

## Usage

```typescript
import { rwfs } from "rwfs";
// or
import { reWriteFileSync } from "rwfs";

// Single update operation
rwfs("path/to/file.txt", {
  constraint: ({ chunk, index, prevChunk, nextChunk }, separator) => {
    return chunk.includes("foo");
  },
  update: ({ chunk, index, prevChunk, nextChunk }, separator) => {
    return chunk.replace("foo", "bar");
  },
});

// Multiple update operations
rwfs("path/to/file.txt", {
  updates: [
    {
      constraint: ({ chunk }) => chunk.startsWith("#"),
      update: ({ chunk }) => chunk.toLowerCase(),
    },
    {
      constraint: ({ chunk }) => chunk.trim().length === 0,
      update: () => ({ deleteChunk: true }),
    },
  ],
  removeEmpty: true,
});

// Context-aware operations
rwfs("path/to/file.txt", {
  constraint: ({ chunk, prevChunk, nextChunk, index }) => {
    // Access to surrounding chunks and position
    return index > 0 && prevChunk?.includes("header");
  },
  update: ({ chunk, nextChunk }) => {
    // Transform based on context
    return nextChunk
      ? `${chunk} (followed by: ${nextChunk.slice(0, 10)}...)`
      : chunk;
  },
});

// Debug mode with custom output limit
rwfs("path/to/file.txt", {
  constraint: ({ chunk }) => chunk.includes("test"),
  update: ({ chunk }) => chunk.toUpperCase(),
  debug: true,
  debugOutputLimit: 5, // Show only first 5 chunks in debug output
});

// Debug mode with a range (object)
rwfs("path/to/file.txt", {
  constraint: () => true,
  update: ({ chunk }) => chunk,
  debug: true,
  debugOutputLimit: { start: 10, end: 12 }, // Show chunks 10 through 12 (1-based, inclusive)
});

// Process chunks in reverse order (output restored to original order)
rwfs("path/to/file.txt", {
  invert: true, // Process from end to beginning
  constraint: ({ chunk, index }) => {
    // index 0 is now the last chunk
    return chunk.includes("footer");
  },
  update: ({ chunk }) => chunk.toUpperCase(),
});

// Process in reverse and keep reversed output
rwfs("path/to/file.txt", {
  invert: true,
  preserveInvertedOrder: true, // Keep the file reversed after processing
  constraint: () => true,
  update: ({ chunk }) => chunk,
});
```

## Context Object

The `constraint` and `update` functions receive a context object with the following properties:

| Property    | Type      | Description                       |
| ----------- | --------- | --------------------------------- |
| `chunk`     | `string`  | The current chunk being processed |
| `index`     | `number`  | The zero-based index of the chunk |
| `prevChunk` | `string?` | The previous chunk (if exists)    |
| `nextChunk` | `string?` | The next chunk (if exists)        |

## Options

| Option                  | Type                       | Description                                                                                              | Default  |
| ----------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| `separator`             | `string`                   | String used to split file content into chunks                                                            | `'\n'`   |
| `encoding`              | `BufferEncoding`           | Character encoding used when reading and writing the file                                                | `'utf8'` |
| `removeEmpty`           | `boolean`                  | Remove empty or falsy chunks from the final output after processing                                      | `false`  |
| `debug`                 | `boolean`                  | Enable debug mode with detailed, color-coded chunk information                                           | `false`  |
| `debugOutputLimit`      | `number \| { start, end }` | Limit chunks shown in debug mode. Number = first N chunks; object = 1-based inclusive range              | `10`     |
| `invert`                | `boolean`                  | Process chunks in reverse order (last to first). By default, output is restored to original order        | `false`  |
| `preserveInvertedOrder` | `boolean`                  | When used with `invert`, preserve the reversed order in the output. Only applies when `invert` is `true` | `false`  |
| `bailOnFirstMatch`      | `boolean`                  | Stop processing after the first match (single-rule mode only)                                            | `false`  |

## Update Result

The `update` function can return either:

- A `string` - The new content for the chunk
- An object `{ deleteChunk: true }` - To delete the chunk entirely

```typescript
// Replace content
update: ({ chunk }) => chunk.replace("old", "new");

// Delete chunk
update: ({ chunk }) => ({ deleteChunk: true });

// Conditional deletion
update: ({ chunk }) => {
  if (chunk.trim().length === 0) {
    return { deleteChunk: true };
  }
  return chunk;
};
```

## Additional Utilities

### `getChunks`

A utility function to split content into chunks while preserving separators:

```typescript
import { getChunks } from "rwfs";

const content = "line1\nline2\nline3";
const chunks = getChunks(content, "\n");
// Returns chunks with separators preserved
```

## Debug Mode

When `debug: true` is enabled, `rwfs` provides colored terminal output showing:

- Total number of chunks
- The separator being used (with escape sequences visible)
- Content of each chunk (limited by `debugOutputLimit`)
  - If an object range is provided, only the specified 1-based inclusive range is printed
- Chunk boundaries with clear visual markers

When a range is used, a summary line is shown:

```
📍 Showing chunks X-Y of TOTAL (N shown)
```

For a numeric limit that truncates output, a clamp notice is shown:

```
⚠️  Output limited to first N chunks (M more chunks not shown)
```

The debug output uses colors to highlight:

- Newlines and carriage returns in green
- Separators in red
- Chunk numbers and boundaries in white/gray

<details>
<summary><h2>Examples</h2></summary>

### Remove Comments

```typescript
rwfs("code.js", {
  constraint: ({ chunk }) => chunk.trim().startsWith("//"),
  update: () => ({ deleteChunk: true }),
  removeEmpty: true,
});
```

### Add Line Numbers

```typescript
rwfs("file.txt", {
  constraint: ({ chunk }) => chunk.trim().length > 0,
  update: ({ chunk, index }) => `${index + 1}: ${chunk}`,
});
```

### Process File in Reverse

```typescript
// Process last-to-first, output restored to original order
rwfs("log.txt", {
  invert: true,
  bailOnFirstMatch: true, // Stop after finding the first (last) match
  constraint: ({ chunk }) => chunk.startsWith("[ERROR]"),
  update: ({ chunk }) => chunk.replace("[ERROR]", "[ERROR-RESOLVED]"),
});

// Reverse the entire file (flip line order)
rwfs("file.txt", {
  invert: true,
  preserveInvertedOrder: true, // Keep reversed order
  constraint: () => true,
  update: ({ chunk }) => chunk,
});
```

### Context-Aware Processing

```typescript
rwfs("markdown.md", {
  updates: [
    {
      // Add spacing after headers
      constraint: ({ chunk, nextChunk }) =>
        chunk.startsWith("#") && nextChunk && !nextChunk.startsWith("#"),
      update: ({ chunk }) => chunk + "\n",
    },
    {
      // Remove empty lines between consecutive headers
      constraint: ({ chunk, prevChunk, nextChunk }) =>
        chunk.trim() === "" &&
        prevChunk?.startsWith("#") &&
        nextChunk?.startsWith("#"),
      update: () => ({ deleteChunk: true }),
    },
  ],
});
```

### Debug with Specific Range

```typescript
// Inspect only chunks 50-60 in a large file
rwfs("large-file.txt", {
  debug: true,
  debugOutputLimit: { start: 50, end: 60 },
  constraint: ({ chunk }) => chunk.includes("keyword"),
  update: ({ chunk }) => chunk.toUpperCase(),
});
```

### Conditional Deletion

```typescript
// Remove all empty lines and lines with only whitespace
rwfs("source.txt", {
  constraint: ({ chunk }) => chunk.trim().length === 0,
  update: () => ({ deleteChunk: true }),
  removeEmpty: true,
});
```

### Multi-Rule Transformation

```typescript
rwfs("data.csv", {
  separator: ",",
  updates: [
    // Trim whitespace from all chunks
    {
      constraint: () => true,
      update: ({ chunk }) => chunk.trim(),
    },
    // Replace empty values with "N/A"
    {
      constraint: ({ chunk }) => chunk === "",
      update: () => "N/A",
    },
    // Uppercase specific columns (assuming first chunk is header)
    {
      constraint: ({ index }) => index > 0,
      update: ({ chunk }) => chunk.toUpperCase(),
    },
  ],
});
```

</details>

## License

MIT © binlf

This project was created using [Bun](https://bun.sh).
