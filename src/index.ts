import { readFileSync, writeFileSync } from "fs-extra";
import type { ReWriteFileSyncOptions, UpdateResult } from "./types";
import { bgWhiteBright, grayBold, whiteBold } from "./logger";
import pc from "picocolors";
import { replaceAll } from "./utils";

export function reWriteFileSync(
  path: string,
  options: ReWriteFileSyncOptions
): void {
  const encoding: BufferEncoding = options.encoding || "utf8";
  const separator: string = options.separator || "\n";
  const removeEmpty = options.removeEmpty || false;
  const fileContent = readFileSync(path, { encoding });
  const chunks = fileContent.split(separator);
  const shouldPrintChunks = options.debug;
  const shouldBailOnFirstMatch =
    ("bailOnFirstMatch" in options && options.bailOnFirstMatch === true) ||
    false;

  // DEBUG MODE
  if (shouldPrintChunks) {
    console.log(
      bgWhiteBright(pc.blackBright("------ RWFS: DEBUG MODE ------"))
    );
    console.log(
      pc.gray("Chunks Size: "),
      pc.bold(pc.whiteBright(chunks.length))
    );
    console.log(pc.gray("Separator: "), pc.bold(pc.redBright(separator)));
    chunks.forEach((chunk, index) => {
      const chunkNumber = index + 1;
      const header = `--- Chunk ${chunkNumber} ---`;
      const footer = `--- End Chunk ${chunkNumber} ---`;
      console.log(
        "\n" +
          whiteBold(header) +
          "\n\n" +
          replaceAll(JSON.stringify(chunk), {
            "\\n": pc.greenBright("\\n"),
            "\\r": pc.greenBright("\\r"),
            [separator]: pc.redBright(separator),
          }) +
          "\n\n" +
          grayBold(footer) +
          "\n\n"
      );
    });
  }

  // create context for each chunk
  const createContext = (
    idx: number
  ): { chunk: string; prevChunk?: string; nextChunk?: string } => ({
    chunk: chunks[idx] as string,
    prevChunk: idx > 0 ? chunks[idx - 1] : undefined,
    nextChunk: idx < chunks.length - 1 ? chunks[idx + 1] : undefined,
  });

  let updatedChunks: UpdateResult[];

  if ("updates" in options && Array.isArray(options.updates)) {
    // Overload with multiple update functions.
    updatedChunks = chunks.map((_, idx) => {
      const context = createContext(idx);
      let newChunk: UpdateResult = context.chunk;
      for (const { constraint, update } of options.updates) {
        if (
          typeof constraint === "function" &&
          constraint(context, separator)
        ) {
          newChunk = update(context, separator);
        }
      }
      return newChunk;
    });
  } else if ("constraint" in options && "update" in options) {
    // Overload with a single constraint/update pair.
    let bailed = false;
    updatedChunks = chunks.map((_, idx) => {
      const context = createContext(idx);
      if (bailed) return context.chunk;
      if (options.constraint(context, separator)) {
        bailed = shouldBailOnFirstMatch && true;
        return options.update(context, separator);
      }
      return context.chunk;
    });
  } else {
    // no valid update option provided: leave content unchanged.
    updatedChunks = chunks;
  }

  const finalChunks = (
    removeEmpty
      ? updatedChunks.filter((chunk) => Boolean(chunk))
      : updatedChunks
  ).filter((chunk) => typeof chunk !== "object");

  writeFileSync(path, finalChunks.join(separator), encoding);
  // rwfs is matching more than one chunk for the rewrite
  // because `getChunks` preserves the separator within the chunk, replacing the content gets rid of the separator as well
  // since the separator is already passed to the `constraint` and `update` callback(s), we can decide to split using `String.split()`
  // the separator is never lost
  //? unlike String.split(separator), `getChunks` preserves the separator within the chunks hence the reason why we join with empty-string("")
  // writeFileSync(path, finalChunks.join(""), encoding);
}

// todo: test this function
export function getChunks(content: string, sep: string, normalize?: boolean) {
  const token = "lofo--";
  const normalizedContent = normalize
    ? content.replaceAll("\n", "LF")
    : content;
  return normalizedContent.replaceAll(sep, token + sep).split(token);
}

export { reWriteFileSync as rwfs };
