// string output of delete signal
export type UpdateResult = string | { deleteChunk: true };

export type UpdateRule = {
  constraint: (
    chunks: {
      chunk: string;
      prevChunk?: string;
      nextChunk?: string;
      index: number;
    },
    separator?: string
  ) => boolean;
  update: (
    chunks: {
      chunk: string;
      prevChunk?: string;
      nextChunk?: string;
      index: number;
    },
    separator?: string
  ) => UpdateResult;
};

type FileRewriteCommonOptions = {
  separator?: string;
  encoding?: BufferEncoding;
  removeEmpty?: boolean;
  debug?: boolean;
  debugOutputLimit?: number;
};

export type ReWriteFileSyncOptionsSingle = {
  constraint: UpdateRule["constraint"];
  update: UpdateRule["update"];
  bailOnFirstMatch?: boolean;
} & FileRewriteCommonOptions;

export type ReWriteFileSyncOptionsMultiple = {
  updates: UpdateRule[];
} & FileRewriteCommonOptions;

export type ReWriteFileSyncOptions =
  | ReWriteFileSyncOptionsSingle
  | ReWriteFileSyncOptionsMultiple;

// if `bailOnFirstMatch` is available for `OptionsMulti`, once a constraint/update pair has matched a chunk sucessfully
// it's removed from the `updates` array so the same callback pair doesn't run on any other chunk
