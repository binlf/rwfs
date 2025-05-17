# rwfs 🔄

A utility for rewriting file contents with flexible chunk-based operations.

## Features

- Chunk-based file content manipulation
- Support for single or multiple update operations
- Debug mode for inspecting chunks
- Configurable separators and encoding
- TypeScript support

## Installation

```bash
bun install rwfs
```

## Usage

```typescript
import { rwfs } from "rwfs";

// Single update operation
rwfs("path/to/file.txt", {
  constraint: ({ chunk }) => chunk.includes("foo"),
  update: ({ chunk }) => chunk.replace("foo", "bar"),
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
```

## Options

| Option             | Description                                      | Default |
| ------------------ | ------------------------------------------------ | ------- |
| `encoding`         | File encoding                                    | 'utf8'  |
| `separator`        | Chunk separator                                  | '\n'    |
| `removeEmpty`      | Remove empty chunks                              | false   |
| `debug`            | Enable debug mode                                | false   |
| `bailOnFirstMatch` | Stop after first match (single update mode only) | false   |

## License

MIT © binlf

This project was created using [Bun](https://bun.sh).
