# rwfs 🔄

A utility for rewriting file contents synchronously with flexible chunk-based operations.

## Features

- ✅ Chunk-based file content manipulation with context awareness
- ✅ Support for single or multiple update operations
- ✅ Debug mode with colored output and configurable limits
- ✅ Configurable separators and encoding
- ✅ Access to previous and next chunks for contextual operations
- ✅ Chunk deletion support
- ✅ TypeScript support with full type safety

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

| Option             | Description                                                                                                       | Default |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | ------- |
| `encoding`         | File encoding                                                                                                     | 'utf8'  |
| `separator`        | Chunk separator                                                                                                   | '\n'    |
| `removeEmpty`      | Remove empty chunks after processing                                                                              | false   |
| `debug`            | Enable debug mode with colored output                                                                             | false   |
| `debugOutputLimit` | Limit chunks shown in debug mode. Number = first N; or object `{ start, end }` to show a 1-based, inclusive range | 10      |
| `bailOnFirstMatch` | Stop after first match (single update mode only)                                                                  | false   |

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

</details>

## License

MIT © binlf

This project was created using [Bun](https://bun.sh).
