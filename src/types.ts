/**
 * Result type for chunk update operations.
 *
 * - **string**: Replace the chunk with this new content
 * - **{ deleteChunk: true }**: Remove the chunk entirely from the output
 *
 * @example
 * // Replace chunk content
 * return "new content";
 *
 * @example
 * // Delete the chunk
 * return { deleteChunk: true };
 */
export type UpdateResult = string | { deleteChunk: true };

/**
 * A single rule that defines when and how to transform a chunk.
 * Rules consist of a constraint (condition) and an update (transformation).
 *
 * @example
 * ```ts
 * const rule: UpdateRule = {
 *   constraint: ({ chunk, prevChunk }) =>
 *     chunk.includes("import") && prevChunk?.includes("export"),
 *   update: ({ chunk }) =>
 *     chunk.replace("import", "require")
 * };
 * ```
 */
export type UpdateRule = {
  /**
   * Predicate function that determines whether this rule should apply to the current chunk.
   * Access the current chunk, surrounding chunks, and position information to make decisions.
   *
   * @param context - Context object providing chunk information and position
   * @param context.chunk - The current chunk being evaluated
   * @param context.prevChunk - The previous chunk (undefined if this is the first chunk)
   * @param context.nextChunk - The next chunk (undefined if this is the last chunk)
   * @param context.index - Zero-based position of this chunk in the file
   * @param separator - The separator string used to split the file (e.g., "\n")
   * @returns `true` to apply the update function; `false` to skip this chunk
   *
   * @example
   * // Match chunks containing specific text
   * constraint: ({ chunk }) => chunk.includes("TODO")
   *
   * @example
   * // Match based on position
   * constraint: ({ index }) => index === 0
   *
   * @example
   * // Match based on surrounding context
   * constraint: ({ chunk, prevChunk }) =>
   *   chunk.startsWith("function") && prevChunk?.includes("export")
   */
  constraint: (
    context: {
      /** The current chunk being processed. */
      chunk: string;
      /** The previous chunk, if any. */
      prevChunk?: string;
      /** The next chunk, if any. */
      nextChunk?: string;
      /** Zero-based index of the current chunk. */
      index: number;
    },
    separator?: string
  ) => boolean;

  /**
   * Transformation function to apply when the constraint returns `true`.
   * Return a string to replace the chunk's content, or `{ deleteChunk: true }` to remove it.
   *
   * @param context - Context object providing chunk information and position
   * @param context.chunk - The current chunk to transform
   * @param context.prevChunk - The previous chunk (undefined if this is the first chunk)
   * @param context.nextChunk - The next chunk (undefined if this is the last chunk)
   * @param context.index - Zero-based position of this chunk in the file
   * @param separator - The separator string used to split the file (e.g., "\n")
   * @returns New chunk content (string) or deletion signal ({ deleteChunk: true })
   *
   * @example
   * // Simple replacement
   * update: ({ chunk }) => chunk.replace("old", "new")
   *
   * @example
   * // Conditional transformation
   * update: ({ chunk, index }) =>
   *   index === 0 ? `# Header\n${chunk}` : chunk
   *
   * @example
   * // Delete the chunk
   * update: () => ({ deleteChunk: true })
   */
  update: (
    context: {
      /** The current chunk being processed. */
      chunk: string;
      /** The previous chunk, if any. */
      prevChunk?: string;
      /** The next chunk, if any. */
      nextChunk?: string;
      /** Zero-based index of the current chunk. */
      index: number;
    },
    separator?: string
  ) => UpdateResult;
};

/**
 * Common options shared across single and multiple update modes.
 */
type FileRewriteCommonOptions = {
  /**
   * String used to split file content into chunks for processing.
   * @default "\n"
   * @example
   * separator: "\n"  // Split by newlines (default)
   * separator: ","   // Split by commas
   * separator: "---" // Split by custom delimiter
   */
  separator?: string;

  /**
   * Character encoding used when reading and writing the file.
   * @default "utf8"
   * @example
   * encoding: "utf8"   // Default encoding
   * encoding: "ascii"  // ASCII encoding
   * encoding: "base64" // Base64 encoding
   */
  encoding?: BufferEncoding;

  /**
   * Remove empty or falsy chunks from the final output after all processing is complete.
   * Useful for cleaning up files after deletions or transformations that produce empty chunks.
   * @default false
   * @example
   * removeEmpty: true // Filters out "", null, undefined, false, 0
   */
  removeEmpty?: boolean;

  /**
   * Enable debug mode to print detailed, color-coded chunk information to the console.
   * Shows chunk size, separator visualization, and content of each chunk being processed.
   * @default false
   * @example
   * debug: true // Displays all chunks being processed with formatting
   */
  debug?: boolean;

  /**
   * Process chunks in reverse order (from last to first).
   * When enabled, chunks are reversed before processing, allowing you to work
   * from the end of the file towards the beginning. By default, the output is
   * restored to the original order unless `preserveInvertedOrder` is true.
   * @default false
   * @example
   * invert: true // Process from end of file to beginning
   */
  invert?: boolean;

  /**
   * When used with `invert`, preserve the reversed order in the final output.
   * If `false` (default), chunks are un-reversed before writing back to the file.
   * If `true`, the reversed order is maintained in the output.
   * This option has no effect unless `invert` is `true`.
   * @default false
   * @example
   * // Process in reverse but restore original order (default)
   * invert: true, preserveInvertedOrder: false
   *
   * @example
   * // Process in reverse and keep reversed output
   * invert: true, preserveInvertedOrder: true
   */
  preserveInvertedOrder?: boolean;

  /**
   * Control which chunks are displayed when debug mode is enabled.
   * Prevents overwhelming console output for files with many chunks.
   *
   * - **number**: Show only the first N chunks (e.g., `10` shows chunks 1-10)
   * - **object**: Show a specific range using one-based indices
   *   - `start`: First chunk to display (inclusive, 1-based)
   *   - `end`: Last chunk to display (inclusive, 1-based)
   *
   * @default 10
   * @example
   * debugOutputLimit: 5                    // Show first 5 chunks
   * debugOutputLimit: { start: 10, end: 20 } // Show chunks 10-20
   * debugOutputLimit: { start: 1, end: 100 } // Show all chunks (if file has 100 chunks)
   */
  debugOutputLimit?: number | { start: number; end: number };
};

/**
 * Options for single-rule mode, where one constraint/update pair is used.
 * Use this mode when you have a single transformation to apply to matching chunks.
 *
 * @example
 * ```ts
 * rwfs("file.txt", {
 *   constraint: ({ chunk }) => chunk.includes("TODO"),
 *   update: ({ chunk }) => chunk.replace("TODO", "DONE"),
 *   bailOnFirstMatch: true // Stop after first TODO found
 * });
 * ```
 */
export type ReWriteFileSyncOptionsSingle = {
  /**
   * Predicate function that determines whether a chunk should be updated.
   * Return `true` to apply the update function to this chunk.
   * @example
   * constraint: ({ chunk }) => chunk.startsWith("import")
   */
  constraint: UpdateRule["constraint"];

  /**
   * Transformation function to apply when the constraint returns `true`.
   * Return a string to replace the chunk, or `{ deleteChunk: true }` to remove it.
   * @example
   * update: ({ chunk }) => chunk.toUpperCase()
   */
  update: UpdateRule["update"];

  /**
   * Stop processing chunks after the first match is found and updated.
   * Performance optimization for cases where only one chunk needs updating.
   * Only applies to single-rule mode (not available for multi-rule mode).
   * @default false
   * @example
   * bailOnFirstMatch: true // Exit early after first match
   */
  bailOnFirstMatch?: boolean;
} & FileRewriteCommonOptions;

/**
 * Options for multi-rule mode, where multiple constraint/update pairs are evaluated.
 * Use this mode when you need to apply different transformations based on different conditions.
 * All rules are evaluated for each chunk in the order they are defined.
 *
 * @example
 * ```ts
 * rwfs("file.txt", {
 *   updates: [
 *     {
 *       constraint: ({ chunk }) => chunk.includes("TODO"),
 *       update: ({ chunk }) => chunk.replace("TODO", "DONE")
 *     },
 *     {
 *       constraint: ({ chunk }) => chunk.trim() === "",
 *       update: () => ({ deleteChunk: true })
 *     }
 *   ]
 * });
 * ```
 */
export type ReWriteFileSyncOptionsMultiple = {
  /**
   * Array of update rules to apply. Each chunk is evaluated against all rules in order.
   * If multiple constraints match the same chunk, all corresponding updates are applied sequentially.
   * @example
   * updates: [
   *   { constraint: (ctx) => ctx.chunk.includes("old"), update: (ctx) => ctx.chunk.replace("old", "new") },
   *   { constraint: (ctx) => ctx.chunk.length > 100, update: (ctx) => ctx.chunk.slice(0, 100) }
   * ]
   */
  updates: UpdateRule[];
} & FileRewriteCommonOptions;

/**
 * Union of all supported configuration modes for `reWriteFileSync`/`rwfs`.
 * Choose between single-rule mode (one constraint/update pair) or multi-rule mode (array of rules).
 *
 * @see {@link ReWriteFileSyncOptionsSingle} for single-rule mode
 * @see {@link ReWriteFileSyncOptionsMultiple} for multi-rule mode
 */
export type ReWriteFileSyncOptions =
  | ReWriteFileSyncOptionsSingle
  | ReWriteFileSyncOptionsMultiple;

/**
 * Context object passed to constraint and update functions.
 * Provides information about the current chunk and its surrounding context.
 *
 * @example
 * ```ts
 * const context: ChunkContext = {
 *   chunk: "current line",
 *   prevChunk: "previous line",
 *   nextChunk: "next line",
 *   index: 5
 * };
 * ```
 */
export type ChunkContext = {
  /** The current chunk being processed. */
  chunk: string;
  /** The next chunk in the sequence (undefined if this is the last chunk). */
  nextChunk?: string;
  /** The previous chunk in the sequence (undefined if this is the first chunk). */
  prevChunk?: string;
  /** Zero-based index indicating the position of this chunk in the file. */
  index: number;
};

// if `bailOnFirstMatch` is available for `OptionsMulti`, once a constraint/update pair has matched a chunk sucessfully
// it's removed from the `updates` array so the same callback pair doesn't run on any other chunk
