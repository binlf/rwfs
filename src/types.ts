/**
 * Result of an update operation on a chunk.
 * - Return a string to replace the chunk's content.
 * - Return `{ deleteChunk: true }` to remove the chunk entirely.
 */
export type UpdateResult = string | { deleteChunk: true };

/**
 * A single rule describing when and how to update a chunk.
 */
export type UpdateRule = {
  /**
   * Predicate to decide whether this rule should apply to the current chunk.
   *
   * @param context Context object for the current chunk (current, prev/next, and index).
   * @param separator The separator string currently being used to split the file.
   * @returns true to apply the update; false to skip.
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
   * Transformation to run when `constraint` returns true.
   *
   * @param context Context object for the current chunk (current, prev/next, and index).
   * @param separator The separator string currently being used to split the file.
   * @returns The new chunk content, or `{ deleteChunk: true }` to remove it.
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
  /** File encoding used when reading and writing. Defaults to 'utf8'. */
  separator?: string;
  /** String used to split content into chunks. Defaults to '\n'. */
  encoding?: BufferEncoding;
  /** Remove falsy/empty chunks after processing. Defaults to false. */
  removeEmpty?: boolean;
  /** Enable verbose, colored debug output. Defaults to false. */
  debug?: boolean;
  /**
   * Limit which chunks are printed in debug mode.
   * - If a number: show the first N chunks.
   * - If an object: `{ start, end }` inclusive one-based index range.
   */
  debugOutputLimit?: number | { start: number; end: number };
};

/**
 * Options for single-rule mode, where one constraint/update pair is used.
 */
export type ReWriteFileSyncOptionsSingle = {
  /** Predicate to decide whether to update a given chunk. */
  constraint: UpdateRule["constraint"];
  /** Transformation to run when the constraint matches. */
  update: UpdateRule["update"];
  /**
   * When true, stop evaluating after the first matching chunk.
   * Only applies to single-rule mode.
   */
  bailOnFirstMatch?: boolean;
} & FileRewriteCommonOptions;

/**
 * Options for multi-rule mode, where multiple constraint/update pairs are evaluated.
 */
export type ReWriteFileSyncOptionsMultiple = {
  /**
   * The ordered list of update rules. Each rule's constraint is evaluated per chunk.
   */
  updates: UpdateRule[];
} & FileRewriteCommonOptions;

/**
 * Union of supported configuration modes.
 */
export type ReWriteFileSyncOptions =
  | ReWriteFileSyncOptionsSingle
  | ReWriteFileSyncOptionsMultiple;

export type ChunkContext = {
  chunk: string;
  nextChunk?: string;
  prevChunk?: string;
  index: number;
};

// if `bailOnFirstMatch` is available for `OptionsMulti`, once a constraint/update pair has matched a chunk sucessfully
// it's removed from the `updates` array so the same callback pair doesn't run on any other chunk
